# 6. Prioritized Engineering Backlog

**Status:** Proposed — awaiting founder approval

**How to read this:** Items are grouped into milestones in build order. Each
milestone ends with something you can click through and test. Priorities:
**P0** = required for the milestone, **P1** = should have, **P2** = nice to have.
Sizes are rough: **S** ≈ ½–1 day, **M** ≈ 2–3 days, **L** ≈ 1 week.

| Milestone | Theme | Outcome you can see |
|---|---|---|
| **M1** | Walking skeleton + tenant isolation | Log in locally as fake users from two companies; each sees only its own partners. CI green. |
| **M2** | Partner content | Full partners, value props, sales plays with roles. |
| **M3** | Documents | Upload, process, approve, restrict, download. |
| **M4** | Real auth & team management | Real login provider, invitations, groups, SSO path, audit log UI. |
| **M5** | Search & grounded AI | Search + assistant with citations and refusals. |
| **M6** | Partner recommendations & feedback | Partner finder, feedback loop, evaluation dashboard. |
| **M7** | Production readiness | Hosting, backups, monitoring, security review. *(Needs your approvals.)* |
| **R2-M8–M9** | Salesforce read-only | Connect, sync, map, pipeline views, AI over computed figures. |

---

## M1 — Walking skeleton + tenant isolation

| ID | Pri | Size | Item | Acceptance criteria |
|---|---|---|---|---|
| FND-1 | P0 | S | Monorepo scaffold | `apps/web`, `apps/api`, `infra`, `fixtures`, `docs` exist; `Makefile` with `up`, `down`, `migrate`, `seed`, `test`, `lint`; README explains each. |
| FND-2 | P0 | M | Docker Compose dev environment | `make up` starts postgres (pgvector), minio, mailpit, api, worker, web on a fresh machine with only Docker installed; `/healthz` returns 200; `/readyz` checks DB. |
| FND-3 | P0 | S | Config & secrets hygiene | All config from env vars; `.env.example` with fake values; `.env` git-ignored; gitleaks pre-commit + CI; app refuses to start if a required secret is missing. |
| FND-4 | P0 | M | DB roles, Alembic, first migration | Migration creates `partneros_owner`/`partneros_app` roles, `tenants`, `users`, `memberships`, `partners`, `audit_events`, `jobs`; RLS enabled+forced; composite FKs; `make migrate` and downgrade both work. |
| FND-5 | P0 | M | Tenant context middleware | Each request: verify token → load membership for `X-Tenant-Id` → `SET LOCAL app.tenant_id/app.user_id` in a transaction. Non-member → 404. Missing header on tenant routes → 400. |
| FND-6 | P0 | M | Dev auth stub | Local-only token issuer with seeded fake users; API verifies via JWKS exactly as it will in prod; API refuses `AUTH_MODE=dev` when `ENVIRONMENT=production`. |
| FND-7 | P0 | S | RBAC helper | `require_permission(...)` dependency; permission table in one file; route registry test fails if any route lacks a declared permission. |
| FND-8 | P0 | M | Partners API (basic) | `GET/POST /partners`, `GET/PATCH /partners/{id}`, archive. Viewer read-only; editor write. Audit event on create/update/archive. |
| FND-9 | P0 | M | Synthetic seed data | `make seed` creates tenants Orbitly + Fernhill, 4 users each across roles, ~6 partners each (incl. same-named partner in both). Only fictional names, `example.com` emails. Idempotent. |
| FND-10 | P0 | M | Web skeleton | Next.js + Tailwind; dev sign-in page lists seeded users; tenant switcher; partner list + create form; viewer doesn't see create button; API errors shown with request ID. |
| FND-11 | P0 | M | Isolation & permission test suite | (a) DB test: for every tenant table, with tenant A context, zero B rows visible and inserts with B's id rejected; (b) test fails if any table with `tenant_id` lacks forced RLS; (c) API: every route × {no token, other tenant, each lower role}; (d) pooled-connection reuse test. |
| FND-12 | P0 | S | CI pipeline | GitHub Actions on every PR: lint (ruff, eslint), format check, typecheck (mypy, tsc), unit + integration tests against a Postgres service container, gitleaks, dependency audit. Actions pinned to SHAs. |
| FND-13 | P1 | S | Structured logging | JSON logs with request_id, tenant_id, user_id, route, status, latency; no bodies, no tokens. |
| FND-14 | P1 | S | Docs: ADRs + runbook stub | `docs/adr/0001-tenancy-rls.md`, `0002-monorepo.md`; `docs/runbook.md` with "how to reset local DB". |

## M2 — Partner content

| ID | Pri | Size | Item | Acceptance criteria |
|---|---|---|---|---|
| PC-1 | P0 | M | Partner profile complete | Industries, regions, capabilities, tier, owner, website; filters on list; optimistic-locking `If-Match` → 409 on stale edit. |
| PC-2 | P0 | M | Value propositions | CRUD + approve/archive; viewers see approved only (test). |
| PC-3 | P0 | M | Sales plays | CRUD with ordered steps, segment, triggers, linked partners; approve/archive; viewers see approved only. |
| PC-4 | P1 | S | Partner contacts | CRUD; hard delete; contacts never sent to AI by default. |
| PC-5 | P0 | M | UI: profile, plays library, editors | Screens S-20–S-32 working on desktop and mobile widths; WCAG AA contrast; keyboard navigable. |
| PC-6 | P1 | S | Audit coverage | Every write produces an audit event; test enumerates write routes and asserts an event. |

## M3 — Documents

| ID | Pri | Size | Item | Acceptance criteria |
|---|---|---|---|---|
| DOC-1 | P0 | M | Upload & storage | Multipart upload ≤ 25 MB; type sniffed (PDF/DOCX/PPTX/MD/TXT only); stored at `tenants/{tid}/documents/{uuid}` in private bucket; version row created; job queued. |
| DOC-2 | P0 | M | Job runner | Postgres queue with SKIP LOCKED, retries with backoff, dead-letter after 5 attempts, per-job tenant context; isolation test for workers. |
| DOC-3 | P0 | L | Extraction & chunking | Text extracted with page numbers; ~500-token chunks with overlap; per-file timeouts & limits; failure sets `ingest_status=failed` with reason shown to editors. |
| DOC-4 | P0 | M | Lifecycle | draft → in_review → approved → archived; approve only when ingest ready; approver recorded; archive removes from retrieval immediately. |
| DOC-5 | P0 | M | Document access control | Tenant vs restricted (groups/roles); one shared SQL predicate used by list/detail/download (and later search/AI); test matrix across roles and groups. |
| DOC-6 | P0 | S | Secure download | Authz → 60-s signed URL, attachment disposition; audited; other-tenant/restricted → 404. |
| DOC-7 | P1 | M | Malware scan | ClamAV container in compose; EICAR test file is rejected and never becomes `ready`. |
| DOC-8 | P0 | M | UI: library, upload, detail, review queue | S-40–S-43; progress states; lock icon for restricted. |

## M4 — Real auth & team management *(needs decision D2)*

| ID | Pri | Size | Item | Acceptance criteria |
|---|---|---|---|---|
| AUTH-1 | P0 | M | Managed auth integration | Sign-in via chosen provider; JWT verification against provider JWKS; user upserted by `auth_subject`; dev stub still works locally. |
| AUTH-2 | P0 | M | Invitations | Admin invites by email (mailpit locally); hashed single-use token, 7-day expiry, email must match; accept creates membership; tests for reuse/expiry/mismatch. |
| AUTH-3 | P0 | S | Members management | Change role, disable, remove; can't remove last owner; only owner grants owner; disabled user blocked on next request. |
| AUTH-4 | P0 | S | Groups | CRUD + membership; used by DOC-5. |
| AUTH-5 | P1 | M | SSO path | Admin can configure SAML/OIDC through the provider's admin portal; domain-based routing on sign-in. Documented test with a free test IdP. |
| AUTH-6 | P1 | S | Audit log UI | S-64 with filters and CSV export; app DB role cannot UPDATE/DELETE audit rows (test). |
| AUTH-7 | P1 | S | Security headers | CSP, HSTS, X-Content-Type-Options, frame-ancestors none, Referrer-Policy; test asserts headers. |

## M5 — Search & grounded AI *(needs decisions D3, D5)*

| ID | Pri | Size | Item | Acceptance criteria |
|---|---|---|---|---|
| AI-1 | P0 | M | Embeddings | Embedding provider behind an interface; chunks for documents + approved partners/value props/plays; `embedding_model` stored; re-embed command. |
| AI-2 | P0 | L | Permission-aware hybrid retrieval | Keyword + vector with rank fusion; filtering by tenant (RLS), approval status, current version and document access **inside the query**; Python re-check; tests: restricted, draft, archived, old-version and other-tenant chunks never returned, even when they are the best semantic match. |
| AI-3 | P0 | S | Search API + UI | `/search` and S-11; results only from AI-2. |
| AI-4 | P0 | L | Grounded answer service | Claude call with numbered, delimited sources; structured output with citation IDs; refuse when evidence below threshold without calling Claude; answer streamed via SSE; conversation + citations persisted. |
| AI-5 | P0 | M | Citation & number validation | Drop citations not in the sent set; answer with zero valid citations → `failed_validation`; numbers/currency/percentages must appear in a cited source; unit tests with adversarial model outputs (mocked). |
| AI-6 | P0 | M | Evaluation harness | ≥ 40 synthetic Q&A cases (answerable, unanswerable, tempting numbers, prompt-injection docs, restricted content); runs in CI with a recorded/mocked model and nightly against the real API (opt-in, needs key); thresholds: 0 cross-permission leaks, 0 fabricated numbers, ≥ 90% correct refusals. |
| AI-7 | P0 | M | Assistant UI | S-50/S-52: streaming, citations open source at page, "no content found" state, final validated answer replaces stream. |
| AI-8 | P1 | S | Cost & abuse controls | Per-user rate limit, per-tenant daily token budget, max context size; usage recorded per message. |
| AI-9 | P1 | S | Tenant AI kill switch | Admin can disable AI; endpoints return 403 with explanation. |

## M6 — Recommendations & feedback

| ID | Pri | Size | Item | Acceptance criteria |
|---|---|---|---|---|
| REC-1 | P0 | M | Partner recommendation API | Ranked ≤ N partners, each with reasons each citing ≥ 1 permitted source; partners without evidence excluded; filters respected. |
| REC-2 | P0 | M | Partner finder UI | S-51 with cards, citations, links to plays. |
| REC-3 | P1 | S | Feedback | 👍/👎 + comment; admin review S-65 shows question, answer, sources. |
| REC-4 | P2 | M | Content gap report | List of `no_evidence` questions grouped by topic for editors. |

## M7 — Production readiness *(each item needs your approval: costs money / external accounts)*

| ID | Pri | Size | Item | Acceptance criteria |
|---|---|---|---|---|
| OPS-1 | P0 | L | Infrastructure as code | Staging + production in chosen cloud, defined in code; managed Postgres with pgvector, PITR backups; private buckets; secrets in a secret manager. |
| OPS-2 | P0 | M | CD pipeline | Merge to main → staging deploy; tagged release → production with manual approval; migrations run as owner role in a separate step. |
| OPS-3 | P0 | M | Observability | Error tracking, metrics, uptime check, alerting to email/Slack. |
| OPS-4 | P0 | S | Backup restore drill | Documented and performed once; time-to-restore recorded. |
| OPS-5 | P0 | M | External security review | Pen test or focused review of tenancy, authz, AI; findings triaged. |
| OPS-6 | P1 | S | Policies | Privacy policy, subprocessor list, data retention & deletion runbook. |

## Release 2 — Salesforce read-only

| ID | Pri | Size | Item | Acceptance criteria |
|---|---|---|---|---|
| SF-1 | P0 | M | OAuth connect/disconnect | Signed state + PKCE; tokens envelope-encrypted; disconnect revokes token; tested against a Salesforce Developer Edition org with synthetic data (**free account, needs your approval**). |
| SF-2 | P0 | M | Read-only client | Only query/describe implemented; object/field allow-list; test asserts no non-GET HTTP calls and no write methods exist. |
| SF-3 | P0 | L | Sync worker | Incremental sync by `SystemModstamp`; Accounts & Opportunities into tenant tables; sync_runs recorded; two-tenant isolation test. |
| SF-4 | P0 | M | Partner ↔ account mapping | Suggested matches by domain/name; editor confirms; opportunity-partner attribution (sourced/influenced). |
| SF-5 | P0 | M | Pipeline API & UI | S-70/S-71; totals computed in SQL; `as_of` on every figure; test that UI totals equal SQL totals. |
| SF-6 | P0 | M | AI over pipeline | Computed figures exposed as citable sources; numeric validator ensures any figure in an answer equals a computed source value; unmapped partner → explicit "no data". |
| SF-7 | P1 | S | Data minimisation | Contact PII not synced by default; purge synced data on disconnect (option). |
