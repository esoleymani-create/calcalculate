# 7. Local Setup Instructions

**Status:** Planned. These steps describe how local development **will** work
once Milestone 1 is built. Until then, only this documentation exists, and the
commands below won't work yet.

Everything runs on your own computer inside Docker. No cloud accounts, no paid
services, and no real company data are needed.

---

## 7.1 What you need to install (one time)

| Tool | Why | How to check |
|---|---|---|
| **Docker Desktop** (or Docker Engine + Compose v2) | Runs the database, storage and app in containers. | `docker compose version` |
| **Git** | Gets the code. | `git --version` |
| **Make** (built into macOS/Linux; on Windows use WSL2) | Short commands like `make up`. | `make --version` |

That's enough to **run** the app. If you or a developer want to **edit code
with editor autocomplete** outside Docker, also install:

| Tool | Version |
|---|---|
| Node.js | 22 LTS |
| pnpm | 9+ (`corepack enable`) |
| Python | 3.12 |
| uv (Python package manager) | latest |

> Docker Desktop is free for small businesses and personal use; larger
> companies need a paid licence. Check Docker's terms for your situation.

## 7.2 First-time setup

```sh
# 1. Get the code
git clone <repository-url> partneros
cd partneros

# 2. Create your local settings file from the template.
#    .env is ignored by git, so your values never get committed.
cp .env.example .env

# 3. Start everything (first run downloads images; takes a few minutes)
make up

# 4. Create the database tables
make migrate

# 5. Load synthetic demo data (fictional companies only)
make seed
```

Then open **http://localhost:3000**. The local sign-in page lists demo users.
Pick one, e.g.:

| Demo user | Tenant | Role |
|---|---|---|
| `owner@orbitly.example.com` | Orbitly | Owner |
| `editor@orbitly.example.com` | Orbitly | Editor |
| `viewer@orbitly.example.com` | Orbitly | Viewer |
| `admin@fernhill.example.com` | Fernhill Software | Admin |

There are no passwords locally — the dev sign-in stub issues a token for the
user you pick. This stub cannot run in production (the API refuses to start).

## 7.3 What's running

| Service | Address | What it is |
|---|---|---|
| Web app | http://localhost:3000 | The PartnerOS website |
| API | http://localhost:8000 | Backend; interactive docs at http://localhost:8000/docs |
| Worker | (no address) | Processes background jobs |
| PostgreSQL | localhost:5432 | Database (with pgvector) |
| MinIO | http://localhost:9001 | Local stand-in for private cloud storage (console) |
| Mailpit | http://localhost:8025 | Catches emails (invitations) so none are really sent |

## 7.4 Everyday commands

| Command | What it does |
|---|---|
| `make up` | Start everything in the background. |
| `make down` | Stop everything (data is kept). |
| `make logs` | Follow logs from all services (Ctrl+C to stop following). |
| `make migrate` | Apply new database migrations. |
| `make seed` | Load/refresh synthetic demo data (safe to run repeatedly). |
| `make test` | Run all automated tests (API, isolation, permissions, web). |
| `make test-isolation` | Run only the tenant-isolation and permission tests. |
| `make lint` | Check code style and types. |
| `make reset` | **Delete all local data** and start fresh (asks for confirmation). |

## 7.5 Environment variables

The `.env.example` file will contain every setting with a safe placeholder.
Important ones:

| Variable | Local value | Notes |
|---|---|---|
| `ENVIRONMENT` | `development` | `production` disables all dev-only features. |
| `AUTH_MODE` | `dev` | `dev` = local stub; later `oidc` for the real provider. |
| `DATABASE_URL` | points at the local container, using the restricted `partneros_app` role | The app never connects as the table owner. |
| `MIGRATION_DATABASE_URL` | local owner role | Used only by `make migrate`. |
| `S3_ENDPOINT`, `S3_BUCKET` | local MinIO | |
| `ANTHROPIC_API_KEY` | *(empty)* | Not needed until Milestone 5. AI tests use a fake model by default. **Never commit this.** |
| `AI_ENABLED` | `false` | Turn on once you have a key. |

Rules:
- Real secrets go **only** in your local `.env` (and later a cloud secret
  manager) — never in code, issues, chat or screenshots.
- A pre-commit hook (gitleaks) blocks commits that look like they contain a
  secret. Install it once with `make hooks`.

## 7.6 Troubleshooting

| Symptom | Fix |
|---|---|
| `port is already allocated` | Something else uses that port. Stop it, or change the port in `.env`. |
| Web shows "API unreachable" | `make logs` and look at the `api` service; usually a migration is missing → `make migrate`. |
| Database errors after pulling new code | `make migrate`. If it still fails, `make reset` (wipes local data) then `make migrate seed`. |
| Docker is slow on Mac | Give Docker Desktop at least 4 CPUs / 6 GB RAM in its settings. |
| Upload stuck at "Scanning" | The malware-scan container downloads virus definitions on first start; wait a few minutes. |

## 7.7 How you'll test each milestone

Every milestone PR will include a short **"How to test"** section like:

1. `git pull && make up && make migrate && make seed`
2. Sign in as *X*, do *Y*, expect *Z*.
3. Sign in as a user from the other tenant and confirm you **can't** see it.
4. `make test` → all green.
