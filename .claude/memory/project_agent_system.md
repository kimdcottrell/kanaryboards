---
name: project-agent-system
description: Full implementation plan for the per-task AI agent system using LangGraph JS — orchestrator + subagents, human-in-the-loop, job search, resume tailoring, PDF generation, card movement, comment threads
metadata:
  type: project
---

# Per-Task AI Agent System — Implementation Plan

Planned 2026-05-26. Branch at time of planning: `feature/project-agent`.

**Why:** User wants each task card to be able to launch an AI agent that orchestrates specialized subagents to do autonomous work (search jobs, tailor resumes, generate PDFs, move cards) and hold a multi-turn Q&A session with the user via the task's comment thread.

**How to apply:** When working on any agent, LangGraph, comment thread, or AgentRun feature, use this as the canonical reference. Phases are designed to be tackled in separate sessions.

---

## Data Model Additions

Add to `src/components/context/types.ts`:

```typescript
interface Comment {
  id: string;
  taskId: string;
  author: 'agent' | 'user';
  content: string;
  timestamp: string;
}

interface AgentRun {
  threadId: string;          // LangGraph thread_id — the resume cursor
  status: 'running' | 'awaiting_input' | 'completed' | 'failed';
  interruptPayload?: unknown; // the question the agent is asking right now
}

// Additions to existing Task:
// comments: Comment[];
// agentRun?: AgentRun;
```

Persist `comments` and `agentRun` in localStorage alongside existing Task fields.

---

## New API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/agent/start` | POST | Start a new agent run for a task |
| `/api/agent/resume` | POST | Resume a paused run (send user reply) |
| `/api/agent/status/[threadId]` | GET | SSE stream of agent events |

All streaming via **Server-Sent Events (SSE)**. Event shape: `{ type: 'thinking' | 'tool_call' | 'comment' | 'card_moved' | 'interrupted' | 'done', payload }`.

---

## LangGraph Agent Architecture

**Supervisor pattern.** Top-level orchestrator graph with specialized subgraph agents.

```
START
  ↓
[plannerNode]         — reads task description, decides which agents to invoke
  ↓
[supervisorNode]      — routes to subagents via conditional edges
  ├─→ [jobSearchAgent]       — subgraph: searches job sites, returns listings
  ├─→ [resumeTailorAgent]    — subgraph: rewrites resume for a specific role
  ├─→ [pdfGeneratorAgent]    — subgraph: renders ATS-friendly PDF
  ├─→ [cardMoverNode]        — tool call: moves task to next column
  └─→ [humanFeedbackNode]    — interrupt(): pauses, waits for user reply
        ↓ (on Command({ resume }))
[supervisorNode]      — loops back with user's answer in state
  ↓
[finalizerNode]       — writes summary comment, moves card to "Done"
  ↓
END
```

**Graph state type:**

```typescript
interface AgentState {
  taskId: string;
  taskDescription: string;
  resumeText: string;        // user's base resume (pasted into task description)
  messages: BaseMessage[];   // full conversation history
  findings: JobListing[];    // job search results
  tailoredResume?: string;   // rewritten resume text
  pdfUrl?: string;           // link to generated PDF
  pendingQuestion?: string;  // set when agent wants user input
}
```

**Checkpointer:** Use `MemorySaver` (in-process) for Phase 1–3. Swap for Deno KV checkpointer in Phase 4. Store `threadId` on the `AgentRun` object in localStorage so sessions survive page reloads.

---

## Tool Definitions

Each is a LangChain `tool()` callable by the LLM:

| Tool | Implementation |
|---|---|
| `moveCard(taskId, targetColName)` | Updates `task.colId` via internal API, fires board state update |
| `addComment(taskId, content)` | Appends an agent comment to the task card |
| `searchJobs(query, sites[])` | Uses **Playwright** (already containerized) headless browser to scrape listings |
| `tailorResume(jobDescription, baseResume)` | LLM call via `@langchain/google-genai` with structured output |
| `generatePdf(resumeMarkdown)` | Uses Playwright's `page.pdf()` — no new dependency |
| `askUser(question)` | Calls `interrupt(question)` — suspends graph until user replies |

---

## Human-in-the-Loop Flow

1. Agent calls `askUser("What's your target salary range?")`
2. LangGraph calls `interrupt(question)` — suspends graph, persists state via `MemorySaver` + `threadId`
3. API SSE stream sends `{ type: 'interrupted', payload: { question } }` to UI
4. Task card shows question in comment thread with reply input box
5. User types answer and submits
6. Frontend calls `POST /api/agent/resume` with `{ threadId, reply: "..." }`
7. Backend calls `graph.invoke(new Command({ resume: reply }), { configurable: { thread_id: threadId } })`
8. Agent continues from exactly where it paused, user answer returned by `interrupt()`

Multi-turn: agent can interrupt multiple times, each pause/resume is independent.

**Critical gotchas:**
- Never wrap `interrupt()` in try/catch — LangGraph uses exceptions internally to suspend
- Code before `interrupt()` replays on resume — make it idempotent or put side effects after
- Only pass JSON-serializable values to `interrupt()`

---

## UI Changes

1. **Task card**: "Agent" button (icon) opens agent panel
2. **Agent panel** (in task modal or slide-out drawer):
   - Comment thread with interleaved agent messages and user replies
   - Input box: visible only when `status === 'awaiting_input'`
   - Status bar: "Searching Indeed..." / "Tailoring resume..." / "Waiting for your input"
   - SSE-driven: agent thoughts append in real time as tokens stream
3. **Column badge**: Cards with active `agentRun` show pulsing dot
4. **Card auto-move**: When agent calls `moveCard`, board React context is updated live

---

## Phased Implementation

### Phase 1 — Scaffold (no real intelligence)
- [ ] Add `Comment[]` and `AgentRun` to `Task` type in `types.ts` and reducer
- [ ] Add comment thread UI inside task edit modal
- [ ] Add SSE endpoint skeletons (`/api/agent/start`, `/api/agent/resume`)
- [ ] Wire "Run Agent" button to stub run: posts a comment, moves the card

### Phase 2 — Core LangGraph Graph
- [ ] Set up `StateGraph` with `MemorySaver` checkpointer
- [ ] Implement `plannerNode`, `supervisorNode`, `humanFeedbackNode` using Google Gemini via `@langchain/google-genai`
- [ ] Wire `interrupt()` → SSE → UI reply input → `Command({ resume })`
- [ ] Test full HITL loop end-to-end with job-finding example task

### Phase 3 — Subagent Tools
- [ ] `moveCard` and `addComment` tools (pure state mutations)
- [ ] `searchJobs` tool using Playwright in the existing Docker container
- [ ] `tailorResume` tool (LLM call with structured output via Zod)
- [ ] `generatePdf` tool using Playwright's `page.pdf()`

### Phase 4 — Persistence Upgrade
- [ ] Write a Deno KV checkpointer implementation for LangGraph
- [ ] Swap `MemorySaver` → Deno KV checkpointer
- [ ] Agent threads survive process restarts; `threadId` already stored in localStorage on Task

---

## Open Questions (decide before or during each phase)

1. **Board state backend**: Agent tools need to mutate task state server-side. Current plan: keep localStorage as primary store, expose a server-side in-process Map for the agent API routes to mutate, push deltas to client via SSE. Revisit when adding Deno KV in Phase 4.

2. **Job search provider**: Playwright scraping works but is brittle. Consider a search API (Tavily, SerpAPI) as an alternative. Task description should specify which sites to target, or agent decides.

3. **PDF storage**: Generated PDFs need a download URL. Options: temp file on disk, Deno KV blob. Affects `pdfUrl` field on `AgentState`.
