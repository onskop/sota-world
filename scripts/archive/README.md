# Archive - AI Connector Scripts

## Preserved Files from Newspaper App

These files contain the Vercel AI Gateway integration and AI content generation logic. Kept for future reference when rebuilding AI features for the Smart Notepad app.

### `updateContent.ts`
- **Purpose**: Generate content using Vercel AI Gateway (OpenAI-compatible API)
- **Key Features**:
  - Auto-corrects Vercel AI Gateway URLs
  - Comprehensive error handling with fallback to mock content
  - JSON parsing and validation
  - Structured data extraction (KPIs, timelines, funding data)
- **Environment Variables Used**:
  - `VERCEL_AI_GATEWAY_URL`
  - `VERCEL_AI_GATEWAY_API_KEY`
- **Can be adapted for**: Note summarization, research actions, AI tool execution

### `data.ts` & `types.ts`
- Old file-based data access layer
- TypeScript type definitions for newspaper app
- **Note**: These are replaced by Supabase database queries in the new app

## Future Use Cases

When implementing AI features for Smart Notepad:
1. Use the AI Gateway integration pattern from `updateContent.ts`
2. Adapt the error handling and fallback logic
3. Keep the JSON parsing and validation approach
4. Modify prompts for note-specific tasks (summarize, research, extract)

---
**Archived**: 2026-01-24
