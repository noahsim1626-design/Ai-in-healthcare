#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INDEX_PATH = path.join(ROOT, 'site', 'index.json');
const POSTS_DIR = path.join(ROOT, 'site', 'posts');

function todayInLosAngeles() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function addDays(dateString, days) {
  const d = new Date(`${dateString}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function normalizeUrl(raw) {
  try {
    const u = new URL(raw.trim());
    u.hash = '';
    [...u.searchParams.keys()].forEach((k) => {
      if (k.toLowerCase().startsWith('utm_')) u.searchParams.delete(k);
    });
    if (u.pathname.length > 1) {
      u.pathname = u.pathname.replace(/\/+$/, '');
    }
    return u.toString();
  } catch {
    return null;
  }
}

function extractUrls(body = '') {
  const matches = body.match(/https?:\/\/[^\s<>()\[\]"']+/gi) || [];
  return matches
    .map((u) => u.replace(/[),.;!?]+$/g, ''))
    .map(normalizeUrl)
    .filter(Boolean);
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function fetchMetadata(url) {
  const sourceDomain = new URL(url).hostname.replace(/^www\./, '');
  let title = '';
  let source = sourceDomain;
  let snippet = '';
  let notes = '';

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Daily-AI-Healthcare-Bot/1.0)' },
      redirect: 'follow'
    });

    if (!res.ok) notes = `Source returned HTTP ${res.status}.`;

    const html = await res.text();
    title = (html.match(/<title[^>]*>(.*?)<\/title>/is)?.[1] || '').replace(/\s+/g, ' ').trim();
    const siteName = html.match(/<meta[^>]+property=["']og:site_name["'][^>]*content=["']([^"']+)/i)?.[1]
      || html.match(/<meta[^>]+name=["']publisher["'][^>]*content=["']([^"']+)/i)?.[1];
    const desc = html.match(/<meta[^>]+(?:name=["']description["']|property=["']og:description["'])[^>]*content=["']([^"']+)/i)?.[1] || '';

    if (siteName) source = siteName.trim();
    snippet = desc.replace(/\s+/g, ' ').trim().slice(0, 300);

    if (!title) title = `${sourceDomain} article`;
    if (/paywall|subscribe|subscription/i.test(html.slice(0, 4000))) {
      notes = notes ? `${notes} Possible paywall.` : 'Paywalled; summary based on available metadata/snippet.';
    }
  } catch {
    title = `${sourceDomain} article`;
    notes = 'Fetch failed; summary based on title/domain only.';
  }

  return { title, source, snippet, notes };
}

function fallbackGeneration(meta) {
  const sentence = meta.snippet
    ? `Available metadata suggests: ${meta.snippet}`
    : 'Only limited metadata was available at generation time.';
  return {
    summary: `${meta.title} from ${meta.source} discusses a healthcare AI topic with potential relevance to clinical operations, safety, policy, and implementation. This educational summary is generated from limited available metadata and should be interpreted cautiously. ${sentence} Readers should prioritize the original source for context, methodology, and limitations, especially for claims related to patient outcomes or regulatory impact. Practical implications may include workflow changes, model governance needs, data quality considerations, and implications for multidisciplinary teams. The article appears useful for tracking how AI tools are being framed in healthcare settings, but conclusions should remain evidence-aware and proportional to the underlying data and source credibility.`,
    key_takeaways: [
      'Treat claims as preliminary until validated against full source details and methods.',
      'Assess clinical relevance, safety, and workflow impact before operational adoption.',
      'Confirm regulatory and governance considerations for any patient-facing use.',
      'Use the original article to verify nuance, limitations, and evidentiary strength.'
    ],
    tags: ['AI in healthcare', 'evidence review', 'clinical workflows', 'safety', 'governance']
  };
}

async function generateContent(meta, url) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallbackGeneration(meta);

  const prompt = `Create medically responsible JSON with keys summary, key_takeaways, tags, notes.\nURL: ${url}\nTitle: ${meta.title}\nSource: ${meta.source}\nSnippet: ${meta.snippet || 'N/A'}\nExisting notes: ${meta.notes || 'None'}\nRules: summary 150-250 words, neutral evidence-aware tone, no hype, no medical advice; 3-5 takeaways; 5-10 short tags.`;

  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        input: [
          { role: 'system', content: 'You write responsible healthcare AI summaries as strict JSON only.' },
          { role: 'user', content: prompt }
        ],
        max_output_tokens: 700
      })
    });

    if (!res.ok) return fallbackGeneration(meta);
    const data = await res.json();
    const text = data.output_text || '';
    const jsonText = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const parsed = JSON.parse(jsonText);

    return {
      summary: parsed.summary,
      key_takeaways: Array.isArray(parsed.key_takeaways) ? parsed.key_takeaways.slice(0, 5) : fallbackGeneration(meta).key_takeaways,
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 10) : fallbackGeneration(meta).tags,
      notes: parsed.notes || ''
    };
  } catch {
    return fallbackGeneration(meta);
  }
}

function writeOutput(name, value) {
  if (!process.env.GITHUB_OUTPUT) return;
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}<<EOF\n${value}\nEOF\n`);
}

async function main() {
  const issueBody = process.env.ISSUE_BODY || '';
  const extracted = extractUrls(issueBody);

  const uniqueInput = [];
  const seen = new Set();
  extracted.forEach((u) => {
    if (!seen.has(u)) {
      seen.add(u);
      uniqueInput.push(u);
    }
  });

  const index = readJson(INDEX_PATH, { posts: [] });
  const posts = Array.isArray(index.posts) ? index.posts : [];
  const existingUrls = new Set(posts.map((p) => normalizeUrl(p.url)).filter(Boolean));
  const existingDates = new Set(posts.map((p) => p.date));

  const duplicates = [];
  const accepted = [];
  for (const url of uniqueInput) {
    if (existingUrls.has(url)) {
      duplicates.push(url);
      continue;
    }
    if (accepted.length < 7) accepted.push(url);
  }

  const ignoredOverflow = Math.max(0, uniqueInput.length - duplicates.length - accepted.length);

  let start = todayInLosAngeles();
  if (existingDates.has(start)) start = addDays(start, 1);

  const scheduled = [];
  for (const url of accepted) {
    while (existingDates.has(start)) start = addDays(start, 1);
    const date = start;

    const meta = await fetchMetadata(url);
    const generated = await generateContent(meta, url);
    const post = {
      date,
      title: meta.title,
      source: meta.source,
      url,
      summary: generated.summary,
      key_takeaways: generated.key_takeaways,
      tags: generated.tags,
      generated_at: new Date().toISOString()
    };

    const noteParts = [meta.notes, generated.notes].filter(Boolean);
    if (noteParts.length) post.notes = noteParts.join(' ');

    fs.writeFileSync(path.join(POSTS_DIR, `${date}.json`), JSON.stringify(post, null, 2) + '\n');

    posts.push({ date, title: post.title, source: post.source, url: post.url, tags: post.tags });
    existingUrls.add(url);
    existingDates.add(date);
    scheduled.push({ date, url, title: post.title });
    start = addDays(start, 1);
  }

  posts.sort((a, b) => b.date.localeCompare(a.date));
  fs.writeFileSync(INDEX_PATH, JSON.stringify({ posts }, null, 2) + '\n');

  const changed = scheduled.length > 0;
  const reportLines = [
    '## Weekly batch ingest report',
    `- URLs found: ${extracted.length}`,
    `- Unique valid URLs: ${uniqueInput.length}`,
    `- Scheduled: ${scheduled.length}`,
    `- Duplicates skipped: ${duplicates.length}`,
    `- Ignored beyond first 7 valid non-duplicates: ${ignoredOverflow}`,
    ''
  ];

  if (scheduled.length) {
    reportLines.push('### Scheduled entries');
    scheduled.forEach((s) => reportLines.push(`- ${s.date}: [${s.title}](${s.url})`));
    reportLines.push('');
  }

  if (duplicates.length) {
    reportLines.push('### Skipped duplicates');
    duplicates.forEach((d) => reportLines.push(`- ${d}`));
    reportLines.push('');
  }

  if (!scheduled.length) {
    reportLines.push('No new posts were scheduled. Check URL validity and duplicate status.');
  }

  const report = reportLines.join('\n');
  fs.writeFileSync(path.join(ROOT, 'ingest-report.md'), report + '\n');

  writeOutput('changed', String(changed));
  writeOutput('report', report);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
