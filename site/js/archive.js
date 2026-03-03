(async () => {
  const listRoot = document.getElementById('archive-list');
  const searchInput = document.getElementById('search-input');
  const tagFilter = document.getElementById('tag-filter');

  let posts = [];

  function render(items) {
    if (!items.length) {
      listRoot.innerHTML = '<article class="card">No published posts match your filters.</article>';
      return;
    }

    listRoot.innerHTML = items.map((post) => `
      <article class="card">
        <h2><a href="./article.html?date=${post.date}">${escapeHTML(post.title)}</a></h2>
        <p class="meta">${post.date} · ${escapeHTML(post.source || 'Unknown source')}</p>
        <p><a href="${encodeURI(post.url)}" target="_blank" rel="noopener noreferrer">Original source ↗</a></p>
        ${renderTags(post.tags || [])}
      </article>
    `).join('');
  }

  function applyFilters() {
    const q = searchInput.value.trim().toLowerCase();
    const selectedTag = tagFilter.value;

    const filtered = posts.filter((post) => {
      const haystack = `${post.title} ${post.source} ${(post.tags || []).join(' ')}`.toLowerCase();
      const tagMatch = !selectedTag || (post.tags || []).includes(selectedTag);
      return (!q || haystack.includes(q)) && tagMatch;
    });

    render(filtered);
  }

  try {
    posts = (await loadIndex()).sort((a, b) => b.date.localeCompare(a.date));

    const tags = [...new Set(posts.flatMap((post) => post.tags || []))].sort();
    tags.forEach((tag) => {
      const option = document.createElement('option');
      option.value = tag;
      option.textContent = tag;
      tagFilter.appendChild(option);
    });

    render(posts);
    searchInput.addEventListener('input', applyFilters);
    tagFilter.addEventListener('change', applyFilters);
  } catch (error) {
    listRoot.innerHTML = `<article class="card">Unable to load archive: ${error.message}</article>`;
  }
})();
