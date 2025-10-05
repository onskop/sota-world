# SOTA World — Frontier Intelligence Hub

Next.js application that publishes daily AI-generated briefings on the state of the art across longevity research, artificial intelligence, pharmaceutical manufacturing, and automation.

## Features
- **AI content automation** powered by Vercel AI Gateway with configurable model and prompts per topic.
- **Bulk generation** batching to minimize gateway spend.
- **Flexible scheduling** (daily/weekly/monthly) via Node Cron, defined through editable JSON config.
- **Historical archives** persisted to local JSON files for easy versioning.
- **Modern UI** with tabbed navigation, glassmorphism styling, and extensive Google Ad placements.
- **SEO optimized** metadata and structured layout for high organic reach.

## Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables in `.env.local` or `.env`:
   ```bash
   VERCEL_AI_GATEWAY_URL=https://gateway.ai.example
   VERCEL_AI_GATEWAY_API_KEY=your-token
   ```
3. Review and edit prompts in `config/ai-config.json`, instructions in `config/instructions.md`, and schedule settings in `config/schedules.json`.
4. Run the content generator manually:
   ```bash
   npm run update:content
   ```
5. Start the scheduler for automatic refreshes:
   ```bash
   npm run schedule
   ```
6. Launch the development server:
   ```bash
   npm run dev
   ```

Generated history files are stored in `data/history/<topic>.json`.

## Deployment Notes
- Set the `metadataBase` and Google Ads publisher IDs before going live.
- Configure Vercel Cron Jobs or a persistent worker to run `npm run schedule` in production.
- Ensure AdSense policies are met when placing sponsored content.
