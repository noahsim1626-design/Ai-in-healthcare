(async () => {
  const root = document.getElementById('article-root');
  const params = new URLSearchParams(window.location.search);
  const date = params.get('date');

  if (!date) {
    root.querySelector('.card').textContent = 'No date provided. Use /article.html?date=YYYY-MM-DD';
    return;
  }

  try {
    const res = await fetch(`./posts/${date}.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Post not found');
    const post = await res.json();

    document.title = `${post.title} | Daily AI x Healthcare`;

    root.querySelector('.card').outerHTML = `
      <article class="card">
        <h2>${escapeHTML(post.title)}</h2>
        <p class="meta">${post.date} · ${escapeHTML(post.source || 'Unknown source')}</p>
        <p><a href="${encodeURI(post.url)}" target="_blank" rel="noopener noreferrer"><strong>Read the original source ↗</strong></a></p>
        <h3>Summary</h3>
        <p>${escapeHTML(post.summary)}</p>
        <h3>Key takeaways</h3>
        <ul>${(post.key_takeaways || []).map((item) => `<li>${escapeHTML(item)}</li>`).join('')}</ul>
        ${renderTags(post.tags || [])}
        ${post.notes ? `<p class="meta">Note: ${escapeHTML(post.notes)}</p>` : ''}
      </article>
    `;
  } catch (error) {
    root.querySelector('.card').textContent = `Unable to load article: ${error.message}`;
  }
})();
