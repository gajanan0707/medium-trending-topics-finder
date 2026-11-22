document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('topic-form');
    const input = document.getElementById('topic-input');
    const listEl = document.getElementById('trending-list');
    const cacheTag = document.getElementById('cache-tag');

    function showLoadingState(tag) {
        cacheTag.textContent = tag ? `Scanning #${tag}...` : 'Scanning topic...';
        listEl.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const item = document.createElement('div');
            item.className = 'skeleton-story';
            item.innerHTML = `
                <div class="skeleton-bar skeleton-title"></div>
                <div class="skeleton-bar skeleton-meta"></div>
            `;
            listEl.appendChild(item);
        }
    }

    function openTagPage(rawTag) {
        const slug = rawTag.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        if (!slug) return;
        showLoadingState(slug);
        setTimeout(() => {
            chrome.tabs.create({ url: `https://medium.com/tag/${slug}` });
        }, 180);
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        openTagPage(input.value);
    });

    document.querySelectorAll('.chip[data-tag]').forEach(btn => {
        btn.addEventListener('click', () => {
            openTagPage(btn.getAttribute('data-tag'));
        });
    });

    chrome.storage.local.get(['mtrLatestScan'], (res) => {
        const scan = res.mtrLatestScan;
        if (!scan || !Array.isArray(scan.stories) || scan.stories.length === 0) return;

        cacheTag.textContent = `#${scan.tag} · ${scan.stories.length} stories`;
        listEl.innerHTML = '';

        scan.stories.slice(0, 6).forEach(story => {
            const a = document.createElement('a');
            a.className = 'story-item';
            a.href = story.url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';

            const title = document.createElement('div');
            title.className = 'story-title';
            title.textContent = story.title;

            const meta = document.createElement('div');
            meta.className = 'story-meta';
            meta.textContent = `👏 ${story.claps}  ·  💬 ${story.comments}  ·  ⚡ ${story.score} score`;

            a.appendChild(title);
            a.appendChild(meta);
            listEl.appendChild(a);
        });
    });
});
