# 5. Screen Inventory and User Journeys

**Status:** Proposed — awaiting founder approval

---

## 5.1 Personas

| Persona | Role in PartnerOS | What they want |
|---|---|---|
| **Priya — Head of Partnerships** | Owner / Admin | Set up the workspace, control who sees what, prove partners drive revenue (R2). |
| **Marco — Partner Manager** | Editor | Keep partner profiles and content current; get sellers to actually use them. |
| **Sam — Account Executive** | Viewer | "Which partner should I bring into this deal, and what do I say?" — fast, trustworthy answers. |
| **Lee — IT / Security Admin** | Admin | SSO, access reviews, audit log. |

(All personas are fictional.)

## 5.2 Navigation

```
┌──────────────────────────────────────────────────────────────────────┐
│ [Tenant switcher ▾]   Search…                     Ask AI   [Avatar ▾] │
├────────────┬─────────────────────────────────────────────────────────┤
│ Home       │                                                         │
│ Partners   │                                                         │
│ Sales plays│                 (page content)                          │
│ Content    │                                                         │
│ Assistant  │                                                         │
│ Pipeline*  │   * Release 2                                           │
│ ────────── │                                                         │
│ Settings†  │   † Admins only                                         │
└────────────┴─────────────────────────────────────────────────────────┘
```

## 5.3 Screen inventory

**Who:** V viewer · E editor · A admin · O owner. **Rel:** release.

### Access & onboarding
| # | Screen | Route | Who | Rel | Purpose / key elements |
|---|---|---|---|---|---|
| S-01 | Sign in | `/sign-in` | public | 1 | Redirect to auth provider; SSO "Continue with company login" by email domain. |
| S-02 | Accept invitation | `/invite/[token]` | public → signed in | 1 | Shows tenant name & role; accept / decline. |
| S-03 | Choose workspace | `/tenants` | any | 1 | Shown if user belongs to >1 tenant. |
| S-04 | No access | `/no-access` | any | 1 | Friendly page when user has no tenant. |

### Core
| # | Screen | Route | Who | Rel | Purpose / key elements |
|---|---|---|---|---|---|
| S-10 | Home | `/` | V+ | 1 | Ask-AI box, recently updated partners & plays, items awaiting my review (E+), ingest failures (E+). |
| S-11 | Global search results | `/search?q=` | V+ | 1 | Grouped results (partners, plays, documents) with snippets. |
| S-20 | Partner directory | `/partners` | V+ | 1 | Table/cards; filters: tier, status, industry, region, capability; "New partner" (E+). |
| S-21 | Partner profile | `/partners/[id]` | V+ | 1 | Tabs: Overview · Value props · Sales plays · Content · Contacts · Pipeline (R2). "Ask about this partner" button. |
| S-22 | Partner create/edit | `/partners/new`, `/partners/[id]/edit` | E+ | 1 | Form with validation; archive. |
| S-23 | Value proposition editor | drawer on S-21 | E+ | 1 | Title, audience, body (Markdown), status, approve. |
| S-30 | Sales plays library | `/plays` | V+ | 1 | Filter by segment, partner. |
| S-31 | Sales play detail | `/plays/[id]` | V+ | 1 | Trigger signals, steps, linked partners & content, citations-ready. |
| S-32 | Sales play editor | `/plays/new`, `/plays/[id]/edit` | E+ | 1 | Step builder. |
| S-40 | Content library | `/content` | V+ | 1 | Documents I can see; filters; status badges (E+ see drafts); lock icon for restricted. |
| S-41 | Upload document | modal on S-40 | E+ | 1 | Drag-drop, metadata, partner link, visibility. Shows processing progress. |
| S-42 | Document detail | `/content/[id]` | V+ | 1 | Preview, versions, status timeline, download, access panel (E+/A). |
| S-43 | Review queue | `/content/review` | E+ | 1 | Items `in_review`; approve / reject with comment. |

### AI assistant
| # | Screen | Route | Who | Rel | Purpose / key elements |
|---|---|---|---|---|---|
| S-50 | Assistant | `/assistant`, `/assistant/[conversationId]` | V+ | 1 | Conversation list; chat; streamed answer; numbered citations that open the source at the right page; "No approved content found" state with suggestions; 👍/👎. |
| S-51 | Partner finder | `/assistant/recommend` | V+ | 1 | Describe the customer need + filters → ranked partner cards, each with reasons and citations; "Open profile" / "Open play". |
| S-52 | Citation viewer | side panel in S-50 | V+ | 1 | Shows quoted passage highlighted in source. |

### Settings (admin)
| # | Screen | Route | Who | Rel | Purpose / key elements |
|---|---|---|---|---|---|
| S-60 | Workspace settings | `/settings` | A+ | 1 | Name, AI on/off, four-eyes approval toggle. |
| S-61 | Members | `/settings/members` | A+ | 1 | List, change role, disable, invite. |
| S-62 | Groups | `/settings/groups` | A+ | 1 | Create groups, add members (used for restricted docs). |
| S-63 | SSO | `/settings/sso` | A+ | 1 | Configure via auth provider's admin portal link. |
| S-64 | Audit log | `/settings/audit` | A+ | 1 | Filterable, exportable CSV. |
| S-65 | AI feedback | `/settings/ai-feedback` | A+ | 1 | 👎 answers with question, cited sources → fix content. |
| S-66 | Integrations | `/settings/integrations` | A+ | 2 | Connect Salesforce, status, last sync, sync now, disconnect. |
| S-67 | CRM mapping | `/settings/integrations/salesforce/mapping` | E+ | 2 | Suggest and confirm partner ↔ CRM account matches. |

### Pipeline (Release 2)
| # | Screen | Route | Who | Rel | Purpose / key elements |
|---|---|---|---|---|---|
| S-70 | Pipeline overview | `/pipeline` | V+ | 2 | Sourced/influenced pipeline by partner, stage, quarter; every figure shows "as of" time and links to records. |
| S-71 | Partner pipeline tab | tab on S-21 | V+ | 2 | Opportunities list for this partner. |

### System states (every screen)
Loading skeletons · empty states with a next action · permission-denied ·
not-found · error with request ID · offline banner.

## 5.4 User journeys

### J-1 — Priya sets up her workspace (Admin, R1)
1. Receives a welcome invitation as owner → **S-02** accept → **S-01** sign in.
2. Lands on **S-10 Home**, sees an onboarding checklist: *Invite team · Add
   first partner · Upload content · Ask your first question*.
3. **S-61** invites Marco (editor) and Sam (viewer).
4. **S-62** creates group "Leadership".
5. *Success:* Team members receive invitations; audit log shows each invite.

### J-2 — Marco adds a partner and publishes content (Editor, R1)
1. **S-20** → "New partner" → **S-22** fills in *Quillstone Security*, tier,
   industries, capabilities → saved.
2. On **S-21** adds a value proposition "SOC 2 readiness for fintech" → approves it.
3. **S-41** uploads "Quillstone datasheet.pdf", links to partner, visibility =
   tenant. Sees *Scanning → Extracting → Indexing → Ready* progress.
4. Submits for review; (if four-eyes off) approves on **S-43**.
5. Uploads "Quillstone pricing.pdf" with visibility = restricted → group
   Leadership.
6. *Success:* Datasheet appears in Sam's content library and AI answers;
   pricing doc does **not** appear for Sam anywhere.

### J-3 — Sam asks a grounded question (Viewer, R1)
1. On **S-10** types "Who can help a fintech prospect get SOC 2 ready fast?"
2. **S-50** shows status "Searching approved content…", then a streamed answer
   with citations [1][2].
3. Clicks [1] → **S-52** shows the highlighted datasheet passage on page 2.
4. Clicks 👍.
5. *Success:* Answer visible in < 5 s; every sentence traceable to a source.

### J-4 — Sam asks something we have no content for (Viewer, R1)
1. Asks "What's Quillstone's revenue?"
2. **S-50** replies: "I couldn't find approved content that answers this." plus
   related links (e.g. Quillstone profile).
3. *Success:* No invented number. Logged with `grounding_status = no_evidence`;
   appears in **S-65** so Marco sees content gaps.

### J-5 — Sam finds a partner for a deal (Viewer, R1)
1. **S-51**: need = "Healthcare client migrating data warehouse to the cloud,
   EMEA". Filters: region EMEA.
2. Gets 3 ranked partner cards, each with 2–3 cited reasons and the relevant
   sales play.
3. Opens the play **S-31** and follows the steps.
4. *Success:* Every recommendation has at least one citation; partners with
   no supporting content are not recommended.

### J-6 — Lee reviews access (Admin, R1)
1. **S-61** filters by role; disables a departed employee.
2. **S-64** filters audit log by that user — sees their last downloads.
3. *Success:* Disabled user's next request fails immediately (not after token
   expiry beyond 15 min).

### J-7 — Priya connects Salesforce (Admin, R2)
1. **S-66** → "Connect Salesforce" → explanation that access is read-only and a
   read-only integration user is recommended → Salesforce consent → back.
2. First sync runs; progress and record counts shown.
3. Marco confirms partner ↔ account matches on **S-67**.
4. *Success:* Status "Connected — last synced 2 min ago"; zero write calls in
   Salesforce's API usage log.

### J-8 — Priya reports partner-sourced pipeline (Admin/Viewer, R2)
1. **S-70** filters this quarter → sees sourced pipeline by partner.
2. Asks the assistant "How much pipeline did Quillstone influence this quarter?"
3. Answer quotes the computed figure **with "as of" time and a link** to the
   pipeline view; if the partner isn't mapped, says so instead of guessing.
4. *Success:* Every figure equals the SQL total over synced records.
