(async () => {
  const root = document.getElementById('today-root');
  try {
    const posts = await loadIndex();
    const today = todayInLosAngeles();
    const post = posts.find((item) => item.date === today);

    if (!post) {
      root.querySelector('.card').outerHTML = `
        <article class="card">
          <h2>No article scheduled for today</h2>
          <p>Use the <strong>Weekly Batch</strong> issue template to add a new set of links.</p>
          <p><a href="./archive.html">Open archive</a></p>
        </article>
      `;
      return;
    }

    root.querySelector('.card').outerHTML = `
      <article class="card">
        <h2>${escapeHTML(post.title)}</h2>
        <p class="meta">${post.date} · ${escapeHTML(post.source || 'Unknown source')}</p>
        <p><a href="./article.html?date=${post.date}">Read today’s full summary</a></p>
        <p><a href="${encodeURI(post.url)}" target="_blank" rel="noopener noreferrer">Original source ↗</a></p>
        ${renderTags(post.tags || [])}
      </article>
    `;
  } catch (error) {
    root.querySelector('.card').textContent = `Unable to load content: ${error.message}`;
  }
})();
