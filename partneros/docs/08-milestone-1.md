# 8. Proposed First Development Milestone (M1)

**Name:** Walking skeleton with proven tenant isolation
**Status:** Proposed — **will not start until you approve**
**Rough effort:** ~2 weeks for one engineer (about 10 working days)

---

## 8.1 Why this first

The riskiest, most expensive-to-fix part of a multi-tenant product is
**tenant isolation**. If we get it wrong and build 50 features on top, fixing
it later means touching all 50. So M1 builds the thinnest possible end-to-end
slice — browser → API → database — with the isolation and permission
machinery fully in place and tested. Every later feature inherits it for free.

M1 deliberately has **no AI, no documents and no real login provider**. Those
come once the foundation is proven.

## 8.2 What's in scope

Backlog items **FND-1 to FND-14** ([06-backlog.md](06-backlog.md#m1--walking-skeleton--tenant-isolation)):

1. **Project scaffold** — monorepo, Makefile, Docker Compose (Postgres +
   pgvector, MinIO, Mailpit, API, worker placeholder, web).
2. **Database foundation** — Alembic migrations; restricted app role;
   `tenants`, `users`, `memberships`, `partners`, `audit_events`, `jobs`;
   Row-Level Security forced on every tenant table; composite foreign keys.
3. **Request pipeline** — token verification, membership lookup, tenant context
   set per transaction, RBAC helper with a central permission table.
4. **Dev-only sign-in** — local token issuer for seeded fake users, built so
   swapping in a real provider later changes configuration, not code paths.
5. **One real feature: partners** — list, create, view, edit, archive, with
   audit events.
6. **Web app skeleton** — dev sign-in page, tenant switcher, partner list and
   create form, role-aware buttons.
7. **Synthetic data** — two fictional tenants with overlapping partner names.
8. **Tests** — isolation (DB + API), permissions, connection-reuse, "every
   table has RLS", "every route has a permission".
9. **CI** — GitHub Actions: lint, typecheck, tests, secret scan, dependency audit.
10. **Docs** — two ADRs (tenancy, monorepo), runbook stub, updated setup guide.

## 8.3 Out of scope for M1

Documents, AI, search, real auth provider, invitations, groups, value
propositions, sales plays, deployment, Salesforce.

## 8.4 Definition of done

- [ ] On a clean machine with Docker: `make up && make migrate && make seed`
      works, and http://localhost:3000 shows the sign-in page.
- [ ] Orbitly users see only Orbitly partners; Fernhill users see only
      Fernhill partners — including the same-named "Quillstone Security".
- [ ] Pasting an Orbitly partner URL while signed in as Fernhill shows "not
      found".
- [ ] Viewer cannot create/edit partners in the UI **or** by calling the API
      directly (403).
- [ ] `make test` passes, including all isolation and permission tests.
- [ ] GitHub Actions CI is green on the pull request.
- [ ] No secrets or real company data in the repository (gitleaks clean).
- [ ] Docs updated; PR description has a "How to test" checklist.

## 8.5 How you'll test it (preview)

1. `make up && make migrate && make seed`
2. Sign in as **editor@orbitly.example.com** → create partner "Test Co."
3. Sign out; sign in as **admin@fernhill.example.com** → "Test Co." is not
   listed. Paste its URL → "Not found".
4. Sign in as **viewer@orbitly.example.com** → "Test Co." is listed; there's
   no "New partner" button.
5. Run `make test-isolation` → all pass. Open the test report to see one test
   per route × role × tenant combination.

## 8.6 Delivery plan (small, reviewable pull requests)

| PR | Contents | You can check |
|---|---|---|
| 1 | Scaffold, Docker Compose, health checks, CI skeleton, gitleaks | `make up` → `/healthz` OK; CI runs |
| 2 | DB roles, migrations, RLS, DB-level isolation tests | `make migrate`; `make test-isolation` |
| 3 | Dev auth, tenant middleware, RBAC helper, `/me` endpoints, API tests | API docs page at `localhost:8000/docs` |
| 4 | Partners API + audit events + seed data | Try endpoints in API docs as different users |
| 5 | Web skeleton: sign-in, tenant switcher, partners list/create | Full click-through above |

Each PR includes what changed, why, and how to test — in plain English.

## 8.7 What I need from you before starting

1. **Approve (or adjust) these documents**, especially:
   - Shared database with Row-Level Security (architecture §1.3).
   - The four roles and permission matrix (API spec §3.3).
   - Milestone order (backlog).
2. **Decision D1 — where the code lives.** This repository is currently a
   calorie-tracker site. Options:
   - **(Recommended)** You create a new private GitHub repo named `partneros`
     and give access; I move this `partneros/` folder there as the first commit.
   - Or keep building inside `partneros/` in this repo for now.
3. **Answer the open question** on four-eyes content approval (on/off by
   default) — can be decided any time before M3.

Nothing in M1 requires paid services, cloud accounts or API keys.
