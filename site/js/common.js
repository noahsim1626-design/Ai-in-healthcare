async function loadIndex() {
  const res = await fetch('./index.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load index');
  const data = await res.json();
  return Array.isArray(data.posts) ? data.posts : [];
}

function todayInLosAngeles() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function escapeHTML(input = '') {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderTags(tags = []) {
  return `<div class="tags">${tags.map((tag) => `<span class="tag">${escapeHTML(tag)}</span>`).join('')}</div>`;
}
