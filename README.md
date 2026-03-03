# Daily AI x Healthcare

Static, GitHub Pages-based daily publishing workflow for AI + healthcare article summaries.

## What this does
You only need to do one weekly action: create a **Weekly Batch** GitHub issue and paste URLs.

Automation then:
1. Extracts valid URLs from the issue body (supports plain lines, bullet lines, and blank lines).
2. Fetches metadata (title, source/publisher where possible, short snippet only).
3. Uses OpenAI API to generate:
   - neutral summary (150–250 words)
   - 3–5 key takeaways
   - 5–10 tags
4. Schedules one post per day for the next available dates.
5. Writes one JSON post file per day in `site/posts/YYYY-MM-DD.json`.
6. Updates `site/index.json` for home + archive.
7. Commits to `main` and comments a report on the issue.

> **Educational only, not medical advice.**
>
> Summaries are AI-assisted. Always verify with original sources.

## Weekly usage: paste links (step-by-step)
1. Open **Issues → New issue → Weekly Batch**.
2. Paste links in the URL field (one per line recommended).
3. Submit the issue.
4. The `Ingest Weekly Batch` workflow runs automatically for issues labeled `weekly-batch`.
5. Read the bot comment on the issue for scheduled dates and skipped duplicates.

## Required repository secret
Set **OPENAI_API_KEY**:
1. Repo **Settings → Secrets and variables → Actions**.
2. Click **New repository secret**.
3. Name: `OPENAI_API_KEY`.
4. Value: your OpenAI API key.

If the key is missing, ingestion still runs with a metadata-only fallback summary.

## Scheduling rules
- If today (Los Angeles time) is unscheduled, scheduling may start today.
- If today is already scheduled, starts tomorrow.
- Fills forward one per day, skipping occupied dates.
- Uses up to first 7 valid non-duplicate URLs.
- If more than 7 valid URLs are provided, extras are ignored and reported.
- Duplicate URLs (across all history) are skipped and reported.

## Failures / paywalled links
If a URL cannot be fully fetched or appears paywalled:
- A post is still created from available metadata (title/domain/snippet).
- `notes` is populated (example: paywall/fetch failure).
- No full article text is stored.

## Data layout
- `site/posts/YYYY-MM-DD.json`: one post per day.
- `site/index.json`: archive index used by frontend.
- `site/index.html`: Today page.
- `site/archive.html`: searchable, tag-filtered archive.
- `site/article.html?date=YYYY-MM-DD`: permanent date URL for detail view.

## Enable GitHub Pages from Actions
1. Go to **Settings → Pages**.
2. Under **Build and deployment**, select **Source: GitHub Actions**.
3. Push to `main` (or run the deploy workflow manually).

`Deploy GitHub Pages` publishes the `site/` folder using official Pages actions.
