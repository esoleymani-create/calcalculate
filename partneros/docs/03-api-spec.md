# 3. API Endpoint Specification

**Status:** Proposed — awaiting founder approval
**Style:** JSON over HTTPS, REST, versioned under `/api/v1`
**Source of truth after implementation:** the OpenAPI document FastAPI
generates at `/api/v1/openapi.json`. This file is the design; the generated spec
is the contract, and CI fails if they drift on endpoints listed here.

---

## 3.1 Conventions

### Authentication
- Every endpoint except health checks and the invitation-accept landing needs
  `Authorization: Bearer <access token>` issued by the auth provider (or the
  local dev stub).
- The API verifies the token signature against the provider's public keys,
  plus issuer, audience and expiry.

### Choosing the tenant
- Header `X-Tenant-Id: <uuid>` selects which of *your* tenants a request is
  for. The server checks you hold an active membership; if not → `404`.
- The header is a *selector*, not a *grant*. Authority always comes from the
  server-side membership lookup.
- Endpoints marked **(no tenant)** below don't need the header.

### Errors — one format everywhere ([RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) "problem details")
```json
{
  "type": "https://docs.partneros.example/errors/forbidden",
  "title": "You don't have permission to do that",
  "status": 403,
  "code": "forbidden",
  "request_id": "req_01J…"
}
```

| Status | Meaning |
|---|---|
| 400 / 422 | The request is malformed or fails validation (details in `errors[]`). |
| 401 | Missing/expired/invalid token. |
| 403 | You're in the tenant, but your role can't do this. |
| 404 | Not found **or** in another tenant **or** a restricted document you can't see. (We deliberately don't distinguish, so attackers can't probe for IDs.) |
| 409 | Conflict (e.g. duplicate name, stale version). |
| 413 | File too large. |
| 429 | Rate limited — see `Retry-After`. |

### Lists
- Cursor pagination: `?limit=25&cursor=<opaque>` → `{ "items": [...], "next_cursor": "…" | null }`. Max `limit` 100.
- Filtering via query parameters; sorting via `?sort=name` / `?sort=-updated_at`.

### Writes
- `PATCH` uses partial JSON. Content records carry `version` (an integer); send
  `If-Match: <version>` to avoid overwriting someone else's edit (`409` if stale).
- `POST` endpoints that create things accept an optional `Idempotency-Key`
  header so a retried request doesn't create duplicates.

### Rate limits (initial, per user)
- General API: 600 requests / minute.
- Assistant messages: 30 / minute and a per-tenant daily token budget
  (protects against runaway AI cost).
- Uploads: 60 / hour.

## 3.2 Endpoints

**Legend — Min role:** `V` viewer, `E` editor, `A` admin, `O` owner, `—` any signed-in user.

### Health
| Method | Path | Min role | Description |
|---|---|---|---|
| GET | `/healthz` | public | Process is alive. |
| GET | `/readyz` | public | Database and storage reachable. No details leaked. |

### Me & tenants
| Method | Path | Min role | Description |
|---|---|---|---|
| GET | `/api/v1/me` | — (no tenant) | Current user profile. |
| GET | `/api/v1/me/tenants` | — (no tenant) | Tenants I belong to, with my role in each. |
| GET | `/api/v1/tenant` | V | Current tenant's name, settings visible to members. |
| PATCH | `/api/v1/tenant` | A | Update name, branding, AI settings. |

### Members, invitations, groups
| Method | Path | Min role | Description |
|---|---|---|---|
| GET | `/api/v1/members` | V | List members (viewers see name/role only). |
| PATCH | `/api/v1/members/{membership_id}` | A | Change role or disable. Only owners can grant/revoke `owner`. Can't remove the last owner. |
| DELETE | `/api/v1/members/{membership_id}` | A | Remove from tenant. |
| POST | `/api/v1/invitations` | A | Invite by email with a role. Token emailed; only its hash is stored. Expires in 7 days. |
| GET | `/api/v1/invitations` | A | Pending invitations. |
| DELETE | `/api/v1/invitations/{id}` | A | Revoke. |
| POST | `/api/v1/invitations/accept` | — (no tenant) | Body `{ token }`. Signed-in user's email must match the invitation. |
| GET / POST | `/api/v1/groups` | V / A | List / create groups. |
| PATCH / DELETE | `/api/v1/groups/{id}` | A | Rename / delete. |
| PUT | `/api/v1/groups/{id}/members` | A | Replace the member list. |

### Partners
| Method | Path | Min role | Description |
|---|---|---|---|
| GET | `/api/v1/partners` | V | List. Filters: `q`, `tier`, `status`, `industry`, `region`, `capability`, `owner`. |
| POST | `/api/v1/partners` | E | Create. |
| GET | `/api/v1/partners/{id}` | V | Profile incl. counts of value props, plays, documents (only ones you can see). |
| PATCH | `/api/v1/partners/{id}` | E | Update. |
| POST | `/api/v1/partners/{id}/archive` | E | Archive (soft delete); removes from AI retrieval. |
| POST | `/api/v1/partners/{id}/restore` | E | Restore. |
| GET / POST | `/api/v1/partners/{id}/contacts` | V / E | List / add partner contacts. |
| PATCH / DELETE | `/api/v1/partner-contacts/{id}` | E | Edit / delete contact (hard delete — personal data). |

### Value propositions & sales plays
| Method | Path | Min role | Description |
|---|---|---|---|
| GET | `/api/v1/partners/{id}/value-propositions` | V | Viewers see `approved` only. |
| POST | `/api/v1/partners/{id}/value-propositions` | E | Create (starts as `draft`). |
| PATCH | `/api/v1/value-propositions/{id}` | E | Edit. |
| POST | `/api/v1/value-propositions/{id}/approve` | E | Mark approved → becomes searchable by AI. |
| POST | `/api/v1/value-propositions/{id}/archive` | E | Archive. |
| GET | `/api/v1/sales-plays` | V | All plays; filter by `partner_id`, `segment`. |
| POST | `/api/v1/sales-plays` | E | Create. |
| GET / PATCH | `/api/v1/sales-plays/{id}` | V / E | Read / edit. |
| POST | `/api/v1/sales-plays/{id}/approve` · `/archive` | E | Lifecycle. |

### Documents
| Method | Path | Min role | Description |
|---|---|---|---|
| GET | `/api/v1/documents` | V | List documents **you are allowed to see**. Filters: `partner_id`, `kind`, `status`, `q`. |
| POST | `/api/v1/documents` | E | `multipart/form-data`: file + metadata. Allowed: PDF, DOCX, PPTX, MD, TXT. Max 25 MB. Returns document with `ingest_status: pending`. |
| GET | `/api/v1/documents/{id}` | V | Metadata, versions, ingest status. |
| PATCH | `/api/v1/documents/{id}` | E | Title, kind, partner link. |
| POST | `/api/v1/documents/{id}/versions` | E | Upload a new version (resets status to `draft`). |
| POST | `/api/v1/documents/{id}/submit` | E | `draft → in_review`. |
| POST | `/api/v1/documents/{id}/approve` | E | `in_review → approved`. Requires ingest `ready`. Approver recorded. |
| POST | `/api/v1/documents/{id}/reject` | E | `in_review → draft` with comment. |
| POST | `/api/v1/documents/{id}/archive` | E | Removes from AI retrieval immediately. |
| GET | `/api/v1/documents/{id}/download` | V | Permission check, then `302` to a signed URL valid 60 s, `Content-Disposition: attachment`. Audited. |
| GET | `/api/v1/documents/{id}/access` | E | Current visibility rules. |
| PUT | `/api/v1/documents/{id}/access` | A (or E who owns it) | `{ visibility: "tenant" \| "restricted", groups: [...], roles: [...] }`. Takes effect for retrieval immediately. |

### Search
| Method | Path | Min role | Description |
|---|---|---|---|
| GET | `/api/v1/search?q=…&types=partner,document,…` | V | Hybrid keyword + semantic search across permitted, approved content. Returns snippets with source links. No AI generation. |

### AI assistant
| Method | Path | Min role | Description |
|---|---|---|---|
| GET | `/api/v1/assistant/conversations` | V | My conversations only. |
| POST | `/api/v1/assistant/conversations` | V | Start a conversation. |
| GET | `/api/v1/assistant/conversations/{id}` | V (owner of conversation) | Messages with citations. |
| DELETE | `/api/v1/assistant/conversations/{id}` | V (owner) | Delete my conversation. |
| POST | `/api/v1/assistant/conversations/{id}/messages` | V | Ask a question. Response is a **Server-Sent Events** stream (see below). |
| POST | `/api/v1/assistant/recommendations` | V | Body `{ "need": "…", "filters": {…}, "max": 5 }`. Returns ranked partners, each with reasons + citations. |
| POST | `/api/v1/assistant/messages/{id}/feedback` | V | `{ rating: "up" \| "down", comment }`. |
| GET | `/api/v1/assistant/feedback` | A | Review feedback to improve content. |

**Assistant message response — final event shape**
```json
{
  "message_id": "…",
  "grounding_status": "grounded",
  "content": "Quillstone Security offers SOC 2 readiness assessments for fintech clients [1]. Their typical engagement is 6 weeks [2].",
  "citations": [
    { "ordinal": 1, "source_type": "document", "source_id": "…", "title": "Quillstone Datasheet (synthetic)", "page": 2, "quote": "…", "url": "/documents/…?page=2" },
    { "ordinal": 2, "source_type": "value_proposition", "source_id": "…", "title": "Quillstone — Fintech compliance", "quote": "…", "url": "/partners/…#vp-…" }
  ],
  "usage": { "input_tokens": 3120, "output_tokens": 210 }
}
```
- `grounding_status` is one of `grounded`, `no_evidence` (we refused — content
  says so plainly), or `failed_validation` (Claude's draft failed our checks;
  user sees a safe "couldn't verify" message).
- Stream events: `status` (e.g. "searching"), `delta` (text chunks), `final`
  (the object above, after validation). The UI must treat only `final` as
  authoritative — if validation fails, it replaces the streamed text.

### Audit
| Method | Path | Min role | Description |
|---|---|---|---|
| GET | `/api/v1/audit-events` | A | Filter by `actor`, `action`, `target_type`, date range. Read-only; no edit/delete endpoints exist. |

### Release 2 — Salesforce (read-only)
| Method | Path | Min role | Description |
|---|---|---|---|
| GET | `/api/v1/integrations` | A | Integration status. |
| POST | `/api/v1/integrations/salesforce/connect` | A | Returns Salesforce authorize URL with a signed `state` (tenant + user + nonce + PKCE). |
| GET | `/api/v1/integrations/salesforce/callback` | — | OAuth redirect target. Validates `state`, stores encrypted tokens, redirects to UI. |
| POST | `/api/v1/integrations/salesforce/sync` | A | Queue a sync now. |
| GET | `/api/v1/integrations/salesforce/sync-runs` | A | Sync history. |
| DELETE | `/api/v1/integrations/salesforce` | A | Disconnect: revoke token at Salesforce, delete credentials, optionally purge synced data. |
| GET / PUT | `/api/v1/partners/{id}/crm-links` | E | View / set which CRM accounts map to this partner. |
| GET | `/api/v1/partners/{id}/pipeline` | V | Opportunities sourced/influenced by this partner. Totals computed server-side with `as_of`. |
| GET | `/api/v1/pipeline/summary` | V | Totals by partner, stage, quarter. All figures from synced records; includes `as_of` and record counts. |

There is intentionally **no** endpoint that writes to Salesforce.

## 3.3 Permission matrix

| Permission | Viewer | Editor | Admin | Owner |
|---|:-:|:-:|:-:|:-:|
| Read approved partners, value props, plays | ✓ | ✓ | ✓ | ✓ |
| Read drafts / in-review content | | ✓ | ✓ | ✓ |
| Read restricted documents | if granted | if granted | ✓ | ✓ |
| Create/edit partners, value props, plays | | ✓ | ✓ | ✓ |
| Upload / approve / archive documents | | ✓ | ✓ | ✓ |
| Change document access rules | | own docs | ✓ | ✓ |
| Use AI assistant & search | ✓ | ✓ | ✓ | ✓ |
| Invite / remove members, manage groups | | | ✓ | ✓ |
| View audit log, AI feedback | | | ✓ | ✓ |
| Manage integrations (R2) | | | ✓ | ✓ |
| Grant/revoke owner, delete tenant | | | | ✓ |

> **Open question for you:** should approving content require a *different*
> person from the uploader ("four-eyes" approval)? It's safer but slower for
> small teams. I suggest making it a per-tenant setting, off by default.

## 3.4 What every endpoint is tested for

Each endpoint gets automated tests covering, at minimum:
1. **No token → 401.**
2. **Wrong tenant → 404** (user from Tenant B asks for Tenant A's record ID).
3. **Insufficient role → 403** (one test per role below the minimum).
4. **Happy path** for the minimum role.
5. **Validation** of bad input → 422.
6. For documents/AI: **restricted content never appears** in list, search,
   download or AI answers for an unauthorised user.

A shared test helper generates cases 1–3 for every route automatically, and a
test fails if a new route is added without being registered in the permission
table — so we can't forget.
