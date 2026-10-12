# PartnerOS — Design Pack

PartnerOS is a multi-tenant B2B SaaS platform for partnership teams: partner
profiles, value propositions, sales plays and approved content, with a
source-grounded AI assistant, and (Release 2) read-only Salesforce pipeline
intelligence.

**Status:** Design phase. No application code yet. Implementation starts after
these documents are approved.

> This folder is self-contained and unrelated to the CalCalculate app at the
> repository root. The plan is to move it into its own repository (see
> decision D1 in the architecture document).

## Documents

| # | Document | What it answers |
|---|---|---|
| 1 | [Product architecture](docs/01-architecture.md) | What are the pieces, how do they talk, how is each tenant's data kept separate, how does the AI avoid making things up? |
| 2 | [Database design (ER)](docs/02-data-model.md) | What tables exist, how they relate, how the database itself enforces isolation. |
| 3 | [API specification](docs/03-api-spec.md) | Every endpoint, who may call it, error format, permission matrix. |
| 4 | [Security threat model](docs/04-threat-model.md) | What could go wrong, what stops it, and which test proves it. |
| 5 | [Screens & user journeys](docs/05-screens-and-journeys.md) | Every screen, who sees it, and step-by-step journeys for each persona. |
| 6 | [Engineering backlog](docs/06-backlog.md) | Prioritised work by milestone, with acceptance criteria. |
| 7 | [Local setup](docs/07-local-setup.md) | How to run everything on your computer (once Milestone 1 exists). |
| 8 | [Milestone 1 proposal](docs/08-milestone-1.md) | The first thing we build, how you'll test it, and what I need from you. |

## Decisions awaiting approval

| # | Decision | Recommendation | Needed by |
|---|---|---|---|
| D1 | Code location | New private repo `partneros` | Milestone 1 |
| D2 | Managed auth provider | Decide before M4 (WorkOS or Auth0 lead for SSO); local stub until then | Milestone 4 |
| D3 | Embedding model | Open-source locally; benchmark vs hosted before production | Milestone 5 |
| D4 | Cloud hosting | Defer until something is worth deploying | Milestone 7 |
| D5 | Anthropic account & data terms | You create the account; review retention terms before real data | Milestone 5 |

Diagrams use [Mermaid](https://mermaid.js.org/), which GitHub renders
automatically when you view these files on github.com.
