# Cron Job Setup for Vercel

This project uses Vercel Cron Jobs instead of `node-cron` for scheduled tasks, as Vercel doesn't support long-running processes.

## How it works

1. **Vercel Cron Jobs**: The `vercel.json` file configures a cron job that runs every 30 minutes (`0,30 * * * *`)
2. **API Route**: The `/api/cron` route checks which schedules should run based on the current time
3. **Schedule Logic**: The cron API compares the current time against your configured schedules in `config/schedules.json`

## Configuration

### Schedules (`config/schedules.json`)
Your current schedules:
- **Daily Brief**: Runs at 06:00 UTC daily
- **Weekly Review**: Runs at 07:30 UTC on Mondays (day 1)
- **Monthly Outlook**: Runs at 09:00 UTC on the 1st of each month

### Vercel Cron (`vercel.json`)
- Runs every 30 minutes to catch all scheduled times
- Calls `/api/cron` endpoint

## Security (Optional)

You can add a `CRON_SECRET` environment variable to your Vercel project for additional security. The cron endpoint will verify the `Authorization: Bearer <secret>` header.

## Monitoring

Check your Vercel dashboard's "Functions" tab to see cron job execution logs and any errors.

## Local Development

For local testing, you can manually call the cron endpoint:
```bash
curl http://localhost:3000/api/cron
```

Or use the update script directly:
```bash
npm run update:content
```
