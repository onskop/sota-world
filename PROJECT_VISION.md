# Smart Notepad - Project Vision & Direction

## Core Concept
A smart notepad application that serves as a personal knowledge hub with AI-powered agentic capabilities. Built as an experiment to integrate agentic functions piece by piece, one small functionality at a time.

## Development Approach
**Complete rehaul philosophy**: Start fresh, build incrementally, ship small working features rather than big-bang releases.

## Key Features

### 1. Multi-Modal Note Capture
- **Text notes**: Traditional typing/editing
- **Voice notes**: Record audio, automatic transcription
- Both modes create searchable, actionable notes

### 2. Organization System
- **Categories**: User-created folders/categories for grouping notes
- **Tags**: Flexible tagging system
- **Smart categorization**: AI-suggested categories based on content

### 3. Agentic Actions on Notes
Notes aren't just static - users can perform actions on them:
- **Research more**: Expand on a topic using AI
- **Summarize**: Generate concise summaries
- **Add to list**: Extract items to specific lists (movies, tasks, etc.)
- **Delete**: Remove notes
- **Custom actions**: User-defined workflows

### 4. Function Calling & Tool System
- **Function definitions**: OpenAI/Anthropic-compatible function schemas
- **Manageable tools**: Users can view, edit, and create custom tools
- **Skill library**: Pre-built skills (research, summarize, extract) + custom user skills
- **Tool marketplace vision**: Eventually share tools between users

### 5. Automation
- **Trigger rules**: Automatic actions based on note content, keywords, categories
- **Scheduled actions**: Run tools on a schedule
- **Agentic chains**: Actions that trigger other actions

## Technical Foundation

### Multi-Tenancy
- Built from day one to support **multiple paying users**
- Row Level Security (RLS) in database for complete data isolation
- Subscription tiers (free, pro, unlimited)
- Usage tracking and limits

### Database Schema Highlights
```
profiles          → User profiles (extends Supabase auth)
notes             → Core content with embeddings for semantic search
categories        → Hierarchical folder structure
tool_definitions  → Custom function calling schemas
note_actions      → Execution history of agentic actions
automation_rules  → Trigger-based automation
subscriptions     → Billing and feature access
```

### Tech Stack
- **Framework**: Next.js 14 App Router
- **Auth**: Supabase Auth (Google OAuth)
- **Database**: Supabase PostgreSQL with RLS
- **Storage**: Supabase Storage (voice recordings, attachments)
- **AI Framework**: Vercel AI SDK 6 (tool calling, agent orchestration)
- **AI Models**:
  - **Transcription**: OpenAI Whisper (via Vercel AI SDK, direct OpenAI API)
  - **Agent Execution**: Vercel AI Gateway (for chat completions, GPT-4o, etc.)
  - **Alternative Providers**: Grok (deep search, reasoning), Claude (future)
- **Styling**: Tailwind CSS with dark-first glassmorphism design

## Current Implementation: AI Agents & Tools System (2026-01-24)

### Completed (Auth Foundation)
✅ Google OAuth authentication
✅ Multi-tenant database schema with Row Level Security
✅ Protected dashboard routes
✅ Admin approval system
✅ Admin account with permanent unlimited tier
✅ Legacy newspaper app code cleaned up

### Phase 1: Voice Recording & Transcription ✅ DONE (2026-01-23)
✅ Browser-based audio recording (MediaRecorder API)
✅ Voice recording metadata storage (voice_recordings table)
✅ Transcription via OpenAI Whisper (via Vercel AI SDK)
✅ `/dashboard/voice-command` UI with 3-step workflow: Record → Transcribe → Execute
✅ Database schema with RLS policies

**Key deviation**: Transcription uses OpenAI directly (not via Vercel AI Gateway, which doesn't support /audio/transcriptions endpoint)

### Phase 0: Router Architecture - Database Migration ✅ DONE (2026-01-24)
**Architectural Pivot**: Shifted from note-centric to router-based Personal Intelligence Hub

✅ Renamed `subscriptions` → `billing_subscriptions` (avoid naming conflict)
✅ Created `lists` table (inbox, shopping, movies, custom types)
✅ Created `list_items` table (content with check/uncheck capability)
✅ Created `tasks` table (content, due_date, status, priority)
✅ Migrated existing notes to lists (preserving all data)
✅ Dropped notes table (cleaner architecture, no legacy data)
✅ Updated voice_recordings with list_item_id reference
✅ Created comprehensive TypeScript types (`lib/supabase/types.ts`)
✅ Migration file: `supabase/migrations/001_lists_and_router.sql`
✅ Updated documentation: `supabase/README.md`

### Phase 1: Router Agent - Intelligent Routing ✅ DONE (2026-01-24)
**Goal**: AI agent that intelligently routes voice input to appropriate destination

✅ 4 intelligent routing tools:
  - `add_to_list` - Adds items to existing lists with fuzzy matching
  - `create_list` - Creates new lists with type inference
  - `create_task` - Creates tasks with deadline parsing
  - `save_to_inbox` - Default fallback for notes/ideas
✅ Context-aware system prompt:
  - Fetches user's existing lists before routing
  - Counts active tasks
  - Provides smart matching examples
✅ Multi-item extraction ("milk, eggs, bread" → 3 separate items)
✅ Intelligent date parsing (tomorrow, next week, etc.)
✅ Fuzzy list matching ("add milk" → Shopping list if it exists)
✅ Fallback to inbox if no tool is called
✅ Updated agent execute route (`app/api/agent/execute/route.ts`)
✅ Files created:
  - `lib/agents/router-tools.ts` (4 tool definitions)
  - `lib/agents/router-system-prompt.ts` (context builder)
  - `TESTING_ROUTER.md` (comprehensive test guide)

**Status**: Router logic complete. Requires database migration before testing.

### Phase 2: Lists UI (Next - In Progress)
- [ ] `/dashboard/lists` - View all lists in grid layout
- [ ] `/dashboard/lists/[id]` - Single list with items
- [ ] `ListCard.tsx` - Reusable list preview component
- [ ] `ListItemRow.tsx` - Checkable item row component
- [ ] Check/uncheck items functionality
- [ ] Manual list/item creation via UI
- [ ] Delete items
- [ ] Update dashboard quick actions

### Phase 3: Tool Management UI
- [ ] Tool creation/editing interface
- [ ] JSON schema editor for tool inputs
- [ ] Tool assignment to agents
- [ ] Manual tool testing interface
- [ ] Grok web search tool integration

### Phase 4: Execution History & Debugging
- [ ] View all past executions
- [ ] Step-by-step execution trace visualization
- [ ] Re-run failed executions
- [ ] Export execution logs

### Phase 5: Human-in-the-Loop Approvals
- [ ] Flag sensitive tools as "needs approval"
- [ ] Approval workflow UI
- [ ] Continue/cancel execution options

### Phase 6: Advanced Features
- [ ] Streaming execution updates (real-time UI)
- [ ] Multi-step agent workflows
- [ ] Automation rules (trigger agents on events)
- [ ] Voice output (TTS for agent responses)

### Phase 7: Grok Integration
- [ ] Direct Grok API for deep search
- [ ] Grok reasoning models for complex tasks
- [ ] Model comparison (GPT-4o vs Grok side-by-side)

## Original Phases (Reference - Superseded)
These were from initial vision but reordered based on actual development priorities:

~~Phase 2: Notes & Categories~~ → Moved to Phase 4+ (notes created as agent action first)
~~Phase 3: Voice Recording~~ → Moved to Phase 1 (core requirement for voice-command workflow)
~~Phase 4: Tools & Actions~~ → Moved to Phase 2-3 (needed for agent execution)

## Access Control & Admin System

### Admin Approval Flow
1. **New User Signup**: User signs up with Google OAuth
2. **Profile Created**: Account status set to "pending"
3. **Pending Page**: User sees waiting screen, no access to dashboard
4. **Admin Approval**: Admin manually approves user in Supabase
5. **Access Granted**: User gets free tier subscription and can access dashboard

### Admin Privileges
- Permanent unlimited tier subscription
- Full access to all features
- Can approve/reject new users (via Supabase dashboard)
- Bypass all usage limits

## Design Philosophy

### User-First
- Built primarily for personal use (by the developer)
- Scaled to accommodate others
- Simple, intuitive UX
- No unnecessary complexity

### Incremental Development
- Small, complete features
- Ship often
- Test with real usage
- Iterate based on needs

### AI Integration
- AI as a tool, not the product
- Actions should be explicit, not magical
- User maintains control
- Transparency in what AI does

### Data Ownership
- Users own their data
- Easy export
- No lock-in
- Privacy-focused

## Success Metrics
1. **Daily usage**: Developer uses it for actual note-taking
2. **Tool creation**: At least 5 custom tools built by user
3. **Automation**: At least 3 active automation rules
4. **Voice adoption**: 20% of notes created via voice
5. **External users**: 10+ paying users (if made public)

## Implementation Notes & Architecture Decisions

### Voice-First AI Agent System (2026-01-24)
Rather than building a traditional note-taking app with AI actions added later, we're building an AI-first system where the primary workflow is:

**Voice Command Loop**: Record → Transcribe → Execute Agent → Save Result

This approach makes sense because:
1. **Voice is a natural input method** for quick note capture
2. **Agent execution is the core feature** - agents decide what to do with notes
3. **Tools are composable** - same tool library used for agent actions and user commands
4. **Debuggable workflow** - user controls each step, can review/edit before execution

### Key Architectural Decisions

#### 1. Transcription API Strategy
- **Decision**: Use OpenAI directly for Whisper transcription, not Vercel AI Gateway
- **Reason**: Vercel AI Gateway only supports `/v1/chat/completions` and similar endpoints, not `/v1/audio/transcriptions`
- **Trade-off**: Need separate OpenAI API key, but gateway still used for agent execution
- **Cost**: ~$0.006/minute via OpenAI, negligible for personal use

#### 2. Single-User vs Multi-Tenant
- **Current**: Multi-tenant architecture built in (RLS, subscription tiers, admin system)
- **Reality**: Developing primarily for single user (yourself)
- **Benefit**: Can simplify later if multi-tenant proves unnecessary, but foundation is ready
- **Note**: No usage limits enforced yet; can add when/if needed

#### 3. Tool Definition Storage
- **Approach**: Store tool definitions as JSON schemas in database
- **Format**: Compatible with Vercel AI SDK tool() function and OpenAI function calling
- **Flexibility**: Users can create tools via UI (Phase 3) or direct database inserts

#### 4. Agent Configuration
- **Model**: Swappable (GPT-4o, Grok, Claude)
- **System Prompt**: User-customizable per agent
- **Tools**: Many-to-many relationship with tools
- **Execution**: Step-by-step with full trace stored for debugging

### Files Created This Session
```
Database:
- supabase/schema.sql (updated with voice_recordings, notes tables)
- supabase/storage-setup.sql (voice-recordings bucket RLS)

Components:
- components/voice/VoiceRecorder.tsx
- components/voice/TranscriptionViewer.tsx

API Routes:
- app/api/voice/transcribe/route.ts

Pages:
- app/dashboard/voice-command/page.tsx

Setup Docs:
- supabase/README.md
```

### Environment Variables Required
```
VERCEL_AI_GATEWAY_API_KEY=vck_...  # Agent execution (Phase 2+)
VERCEL_AI_GATEWAY_URL=https://ai-gateway.vercel.sh/v1/chat/completions
OPENAI_API_KEY=sk-...              # Transcription only (Phase 1)
```

### What's Working
✅ Record audio in browser
✅ Transcribe to text via OpenAI Whisper
✅ Edit transcription before execution
✅ Save to database with RLS

### What's Next (Phase 2)
- Build agent configuration UI
- Implement tool registry
- Create first tool: save_note
- Execute agents with tool calling
- Test full voice → transcribe → execute → save workflow

## Open Questions
- [ ] Should we support collaborative notes/sharing?
- [ ] Mobile app or PWA?
- [ ] Integration with external services (Notion, Obsidian)?
- [ ] Public tool marketplace?
- [ ] Team/organization accounts?
- [ ] How to handle complex multi-step workflows?
- [ ] Persistent agent memory across sessions?

---

**Last Updated**: 2026-01-24
**Current Status**: Phase 1 Complete - Voice recording & transcription working. Phase 2 (Agent execution) ready to start.
