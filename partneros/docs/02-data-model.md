# 2. Database Entity Relationship Design

**Status:** Proposed — awaiting founder approval
**Database:** PostgreSQL 17 with the `pgvector` and `pgcrypto` extensions

---

## 2.1 Conventions (rules every table follows)

| Rule | Why |
|---|---|
| Primary keys are UUIDs (`id uuid default gen_random_uuid()`). | IDs can't be guessed or counted ("we have 42 customers"). |
| Every tenant-owned table has `tenant_id uuid not null`. | Required for Row-Level Security. |
| Every tenant-owned table has RLS **enabled and forced**. | Isolation is enforced by the database, not just the app. |
| Foreign keys between tenant tables include `tenant_id`, e.g. `foreign key (tenant_id, partner_id) references partners (tenant_id, id)`. | The database refuses cross-tenant links. Each table has `unique (tenant_id, id)` to make this possible. |
| `created_at`, `updated_at` (timestamptz, UTC) on every table; `created_by` where a person acts. | Debugging and audit. |
| Soft delete (`archived_at`) for business content; hard delete for personal data on request. | Recover mistakes; still honour deletion requests. |
| Enumerations are Postgres `text` + `check` constraints (not native enums). | Easier to change in migrations. |
| Money is `numeric(18,2)` + `currency char(3)`. Never floats. | Floats round money incorrectly. |
| All schema changes go through numbered **Alembic** migrations, reviewed in PRs. | Repeatable, reversible database history. |

## 2.2 Diagram — Release 1

```mermaid
erDiagram
    TENANTS ||--o{ MEMBERSHIPS : has
    USERS ||--o{ MEMBERSHIPS : "belongs via"
    TENANTS ||--o{ INVITATIONS : sends
    TENANTS ||--o{ GROUPS : has
    GROUPS ||--o{ GROUP_MEMBERS : contains
    MEMBERSHIPS ||--o{ GROUP_MEMBERS : "is in"

    TENANTS ||--o{ PARTNERS : owns
    PARTNERS ||--o{ PARTNER_CONTACTS : has
    PARTNERS ||--o{ VALUE_PROPOSITIONS : has
    PARTNERS ||--o{ SALES_PLAYS : "featured in"
    PARTNERS ||--o{ DOCUMENTS : "related to"

    DOCUMENTS ||--o{ DOCUMENT_VERSIONS : has
    DOCUMENTS ||--o{ DOCUMENT_ACCESS : "restricted by"
    GROUPS ||--o{ DOCUMENT_ACCESS : "granted"
    DOCUMENT_VERSIONS ||--o{ CONTENT_CHUNKS : "split into"

    MEMBERSHIPS ||--o{ CONVERSATIONS : starts
    CONVERSATIONS ||--o{ MESSAGES : contains
    MESSAGES ||--o{ MESSAGE_CITATIONS : cites
    CONTENT_CHUNKS ||--o{ MESSAGE_CITATIONS : "cited by"
    MESSAGES ||--o{ ANSWER_FEEDBACK : receives

    TENANTS ||--o{ AUDIT_EVENTS : logs
    TENANTS ||--o{ JOBS : queues

    TENANTS {
        uuid id PK
        text name
        text slug UK
        text status "active|suspended|deleted"
        jsonb settings
    }
    USERS {
        uuid id PK
        text auth_subject UK "ID from auth provider"
        citext email
        text display_name
        timestamptz last_login_at
    }
    MEMBERSHIPS {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        text role "owner|admin|editor|viewer"
        text status "active|disabled"
    }
    INVITATIONS {
        uuid id PK
        uuid tenant_id FK
        citext email
        text role
        bytea token_hash "hash only"
        timestamptz expires_at
        timestamptz accepted_at
    }
    GROUPS {
        uuid id PK
        uuid tenant_id FK
        text name
    }
    GROUP_MEMBERS {
        uuid tenant_id FK
        uuid group_id FK
        uuid membership_id FK
    }
    PARTNERS {
        uuid id PK
        uuid tenant_id FK
        text name
        text website
        text tier "strategic|select|registered"
        text status "prospect|active|inactive"
        text summary
        text_array industries
        text_array regions
        text_array capabilities
        uuid owner_membership_id FK
        timestamptz archived_at
    }
    PARTNER_CONTACTS {
        uuid id PK
        uuid tenant_id FK
        uuid partner_id FK
        text name
        text title
        citext email
    }
    VALUE_PROPOSITIONS {
        uuid id PK
        uuid tenant_id FK
        uuid partner_id FK
        text title
        text audience
        text body
        text status "draft|approved|archived"
    }
    SALES_PLAYS {
        uuid id PK
        uuid tenant_id FK
        uuid partner_id FK "nullable"
        text name
        text target_segment
        text trigger_signals
        jsonb steps
        text status "draft|approved|archived"
    }
    DOCUMENTS {
        uuid id PK
        uuid tenant_id FK
        uuid partner_id FK "nullable"
        text title
        text kind "deck|datasheet|case_study|battlecard|other"
        text status "draft|in_review|approved|archived"
        text visibility "tenant|restricted"
        uuid current_version_id FK
        uuid approved_by FK
        timestamptz approved_at
    }
    DOCUMENT_VERSIONS {
        uuid id PK
        uuid tenant_id FK
        uuid document_id FK
        int version_number
        text storage_key "tenant-prefixed"
        text mime_type
        bigint size_bytes
        text sha256
        text ingest_status "pending|scanning|extracting|embedding|ready|failed"
        text ingest_error
    }
    DOCUMENT_ACCESS {
        uuid id PK
        uuid tenant_id FK
        uuid document_id FK
        text principal_type "group|role"
        uuid group_id FK "if group"
        text role "if role"
    }
    CONTENT_CHUNKS {
        uuid id PK
        uuid tenant_id FK
        text source_type "document|partner|value_prop|sales_play"
        uuid source_id
        uuid document_version_id FK "nullable"
        int chunk_index
        text text
        int page_number
        tsvector search_tsv
        vector embedding
        text embedding_model
    }
    CONVERSATIONS {
        uuid id PK
        uuid tenant_id FK
        uuid membership_id FK
        text title
    }
    MESSAGES {
        uuid id PK
        uuid tenant_id FK
        uuid conversation_id FK
        text role "user|assistant"
        text kind "answer|recommendation|refusal"
        text content
        jsonb structured "recommendations etc"
        text model
        int input_tokens
        int output_tokens
        text grounding_status "grounded|no_evidence|failed_validation"
    }
    MESSAGE_CITATIONS {
        uuid id PK
        uuid tenant_id FK
        uuid message_id FK
        uuid chunk_id FK
        text source_type
        uuid source_id
        text quoted_text
        int ordinal
    }
    ANSWER_FEEDBACK {
        uuid id PK
        uuid tenant_id FK
        uuid message_id FK
        uuid membership_id FK
        text rating "up|down"
        text comment
    }
    AUDIT_EVENTS {
        uuid id PK
        uuid tenant_id FK
        uuid actor_user_id
        text action "e.g. document.approved"
        text target_type
        uuid target_id
        inet ip
        text request_id
        jsonb details
    }
    JOBS {
        uuid id PK
        uuid tenant_id FK
        text type
        jsonb payload
        text status "queued|running|succeeded|failed|dead"
        int attempts
        timestamptz run_after
        timestamptz locked_at
        text last_error
    }
```

## 2.3 Diagram — Release 2 additions (Salesforce, read-only)

```mermaid
erDiagram
    TENANTS ||--o{ INTEGRATIONS : connects
    INTEGRATIONS ||--|| INTEGRATION_CREDENTIALS : "secured by"
    INTEGRATIONS ||--o{ SYNC_RUNS : runs
    INTEGRATIONS ||--o{ CRM_ACCOUNTS : imports
    INTEGRATIONS ||--o{ CRM_OPPORTUNITIES : imports
    CRM_ACCOUNTS ||--o{ CRM_OPPORTUNITIES : has
    PARTNERS ||--o{ CRM_PARTNER_LINKS : "mapped to"
    CRM_ACCOUNTS ||--o{ CRM_PARTNER_LINKS : "mapped to"
    CRM_OPPORTUNITIES ||--o{ CRM_OPPORTUNITY_PARTNERS : "influenced by"
    PARTNERS ||--o{ CRM_OPPORTUNITY_PARTNERS : influences

    INTEGRATIONS {
        uuid id PK
        uuid tenant_id FK
        text provider "salesforce"
        text status "connected|error|disconnected"
        text instance_url
        text external_org_id
        uuid connected_by FK
        timestamptz last_synced_at
    }
    INTEGRATION_CREDENTIALS {
        uuid integration_id PK
        uuid tenant_id FK
        bytea encrypted_refresh_token
        bytea encrypted_data_key
        text key_id
    }
    SYNC_RUNS {
        uuid id PK
        uuid tenant_id FK
        uuid integration_id FK
        text status
        int records_read
        timestamptz started_at
        timestamptz finished_at
        text error
    }
    CRM_ACCOUNTS {
        uuid id PK
        uuid tenant_id FK
        uuid integration_id FK
        text external_id UK
        text name
        text type
        text industry
        timestamptz external_modified_at
    }
    CRM_OPPORTUNITIES {
        uuid id PK
        uuid tenant_id FK
        uuid integration_id FK
        text external_id UK
        uuid crm_account_id FK
        text name
        text stage
        numeric amount
        char currency
        date close_date
        boolean is_closed
        boolean is_won
        timestamptz external_modified_at
    }
    CRM_PARTNER_LINKS {
        uuid tenant_id FK
        uuid partner_id FK
        uuid crm_account_id FK
        text match_method "manual|domain|name"
    }
    CRM_OPPORTUNITY_PARTNERS {
        uuid tenant_id FK
        uuid crm_opportunity_id FK
        uuid partner_id FK
        text role "sourced|influenced"
    }
```

## 2.4 Notes on the trickier tables

### `users` and `memberships` — why two tables?
A person (user) is global — the same email can belong to several tenants (common
for consultants). What they can *do* lives on the **membership**, which is
tenant-scoped. `users` itself has a special RLS policy: you can see a user row
only if it's you, or the user is a member of your current tenant.

### `content_chunks` — the AI search table
- One row per ~500-token slice of text, from documents **and** from structured
  records (partner profiles, value props, sales plays are turned into text so
  the AI can search them too).
- `embedding vector(N)`: `N` depends on the embedding model (decision D3). We
  store `embedding_model` so we can re-embed safely when switching models.
- `search_tsv` powers keyword search; we combine keyword + vector ("hybrid
  search") because exact names like "SOC 2" or product SKUs are matched better
  by keywords.
- Index: HNSW index on `embedding` (cosine), GIN index on `search_tsv`, and a
  B-tree on `(tenant_id, source_type, source_id)`.
- **Permissions are NOT copied onto chunks.** They're joined at query time from
  `documents` / `document_access` / record status. Copying would risk stale
  permissions — e.g. a document restricted today but still searchable via old
  chunk rows.

### Retrieval permission filter (sketch)
```sql
-- RLS already limits rows to the current tenant.
select c.*
from content_chunks c
left join documents d on c.source_type = 'document' and d.id = c.source_id
where
  (
    c.source_type <> 'document'
    and exists (/* the partner / value prop / play is approved and not archived */)
  )
  or (
    d.status = 'approved'
    and c.document_version_id = d.current_version_id
    and (
      d.visibility = 'tenant'
      or exists (
        select 1 from document_access a
        where a.document_id = d.id
          and (
            (a.principal_type = 'role'  and a.role = :caller_role)
            or (a.principal_type = 'group' and a.group_id = any(:caller_group_ids))
          )
      )
      or :caller_role in ('owner', 'admin')
    )
  )
order by c.embedding <=> :query_embedding
limit 50;
```
The exact rules are covered by automated tests (see backlog item AI-2).

### `audit_events` — append-only
The application database role has `INSERT` and `SELECT` only on this table —
no `UPDATE` or `DELETE` — so even an application bug can't erase history.

### `integration_credentials` — Release 2
Salesforce refresh tokens are encrypted with a per-record data key, and that
data key is itself encrypted by a master key held in a key-management service
("envelope encryption"). A database dump alone can't reveal tokens.

## 2.5 Database roles

| Role | Used by | Powers |
|---|---|---|
| `partneros_owner` | Migrations only (CI/deploy step) | Owns tables, can change schema. Never used by the running app. |
| `partneros_app` | API and workers | Read/write data, **subject to RLS**. No `BYPASSRLS`, not a table owner, cannot change schema. |
| `partneros_readonly` | Support/analytics (later) | `SELECT` only, still subject to RLS. |

## 2.6 Example RLS setup (what a migration will contain)

```sql
alter table partners enable row level security;
alter table partners force row level security;

create policy tenant_isolation on partners
  using      (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
```
- `current_setting(..., true)` returns null when unset → the comparison is
  never true → **zero rows**. Forgetting to set the tenant fails safely.
- `with check` stops writes into another tenant, not just reads.

## 2.7 Synthetic fixtures

Seed data uses only invented companies and people, for example:

- **Tenant "Orbitly"** (a fictional SaaS vendor) with partners *Bluefin Data
  Co.*, *Quillstone Security*, *Harborlight Consulting*.
- **Tenant "Fernhill Software"** with a *different* set of partners — including
  one also called "Quillstone Security", so tests prove same-named records in
  two tenants never mix.
- Documents are short generated Markdown/PDF files with obviously fake facts
  ("Quillstone reduces audit prep time by 37% (synthetic)").
- People use `example.com` emails (reserved for documentation by RFC 2606).
