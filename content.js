// Medium Trending Topics Finder - Real Live DOM Scanner (Stories, Top Publications & Top Writers)
(function () {
    'use strict';

    let currentStories = [];
    let currentPublications = [];
    let currentWriters = [];
    let activeTab = 'stories';
    let isLoading = true;
    let lastUrl = window.location.href;
    let rescanTimer = null;

    function parseCompactNumber(text) {
        if (!text) return 0;
        const clean = text.trim().toUpperCase().replace(/,/g, '');
        const match = clean.match(/^([\d.]+)\s*([KM])?$/);
        if (!match) {
            const digits = parseInt(clean.replace(/[^\d]/g, ''), 10);
            return Number.isNaN(digits) ? 0 : digits;
        }
        const num = parseFloat(match[1]);
        if (match[2] === 'M') return Math.round(num * 1000000);
        if (match[2] === 'K') return Math.round(num * 1000);
        return Math.round(num);
    }

    function formatCompact(n) {
        if (!n || n <= 0) return '0';
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return n.toLocaleString();
    }

    function getCurrentTagSlug() {
        const match = window.location.pathname.match(/^\/tag\/([^/]+)/);
        return match ? match[1] : 'home-feed';
    }

    function isStoryUrl(href) {
        if (!href) return false;
        const clean = href.split('?')[0];
        if (clean.includes('/tag/') || clean.includes('/plans') || clean.includes('/membership')) return false;
        return /-[0-9a-f]{8,12}$/i.test(clean) || /\/@[^/]+\/[^/]+/.test(clean) || /\/p\/[0-9a-f]+/i.test(clean);
    }

    function findCardContainer(el) {
        const explicit = el.closest('article, [data-testid="post-preview"]');
        if (explicit) return explicit;
        let node = el;
        for (let i = 0; i < 5 && node && node.parentElement; i++) {
            node = node.parentElement;
            if (node.id === 'mtr-radar-panel') return null;
        }
        return node;
    }

    function extractMetricsFromCard(card) {
        let claps = 0;
        let comments = 0;

        card.querySelectorAll('button, a, span, div[aria-label], svg[aria-label]').forEach((el) => {
            const aria = ((el.getAttribute('aria-label') || '') + ' ' + (el.getAttribute('title') || '')).toLowerCase();
            if (!aria) return;
            const host = el.tagName.toLowerCase() === 'svg' ? (el.closest('button, a, div') || el.parentElement) : el;
            const txt = (host?.textContent || '').trim();
            if ((aria.includes('clap') || aria.includes('applaud')) && /\d/.test(txt)) {
                claps = Math.max(claps, parseCompactNumber(txt));
            } else if ((aria.includes('response') || aria.includes('comment')) && /\d/.test(txt)) {
                comments = Math.max(comments, parseCompactNumber(txt));
            }
        });

        if (claps === 0 && comments === 0) {
            const numTokens = [];
            card.querySelectorAll('button, a, span').forEach((el) => {
                if (el.children.length > 0) return;
                const t = (el.textContent || '').trim();
                if (/^[\d.,]+[KM]?$/i.test(t) && !t.includes('·')) {
                    const val = parseCompactNumber(t);
                    if (val > 0 && !numTokens.includes(val)) numTokens.push(val);
                }
            });
            if (numTokens.length >= 1) claps = numTokens[0];
            if (numTokens.length >= 2) comments = numTokens[1];
        }

        return { claps, comments };
    }

    function extractAuthorAndPubFromCard(card) {
        let authorName = '';
        let authorUrl = '';
        let pubName = '';
        let pubUrl = '';

        const links = Array.from(card.querySelectorAll('a[href]'));
        for (const a of links) {
            const href = (a.getAttribute('href') || '').split('?')[0];
            const text = (a.textContent || '').trim();
            if (!text || text.length > 60) continue;

            if (/^\/@[^/]+$/.test(href) || /^https:\/\/medium\.com\/@[^/]+$/.test(href)) {
                if (!authorName) {
                    authorName = text;
                    authorUrl = href.startsWith('http') ? href : `https://medium.com${href}`;
                }
            } else if (
                /^\/[a-z0-9-]+$/i.test(href) &&
                !['/plans', '/membership', '/about', '/creators', '/jobs'].includes(href) &&
                !href.startsWith('/tag/')
            ) {
                if (!pubName && text !== authorName) {
                    pubName = text;
                    pubUrl = `https://medium.com${href}`;
                }
            }
        }

        return { authorName, authorUrl, pubName, pubUrl };
    }

    function extractWhoToFollowFromDOM() {
        const writersMap = new Map();
        const pubsMap = new Map();

        // Scan DOM elements matching Medium's "Writer · 59K followers" or "Publication · 329K followers"
        const allNodes = document.querySelectorAll('span, p, div');
        allNodes.forEach((node) => {
            if (node.closest('#mtr-radar-panel') || node.children.length > 2) return;
            const txt = (node.textContent || '').trim();
            const match = txt.match(/^(Writer|Publication)\s*[·•]\s*([\d.,]+[KM]?)\s+followers?/i);
            if (!match) return;

            const kind = match[1].toLowerCase();
            const followers = parseCompactNumber(match[2]);

            // Walk up to find the card containing the entity name & link
            let container = node.parentElement;
            let linkEl = null;
            for (let i = 0; i < 4 && container; i++) {
                const candidate = Array.from(container.querySelectorAll('a[href]')).find((a) => {
                    const h = (a.getAttribute('href') || '').split('?')[0];
                    const t = (a.textContent || '').trim();
                    return t && t.length > 1 && !/follow/i.test(t) && !h.includes('/tag/');
                });
                if (candidate) {
                    linkEl = candidate;
                    break;
                }
                container = container.parentElement;
            }
            if (!linkEl) return;

            const name = linkEl.textContent.trim();
            const rawHref = linkEl.getAttribute('href').split('?')[0];
            const url = rawHref.startsWith('http') ? rawHref : `https://medium.com${rawHref}`;

            if (kind === 'publication') {
                if (!pubsMap.has(name.toLowerCase())) {
                    pubsMap.set(name.toLowerCase(), {
                        name,
                        url,
                        followers,
                        storiesInFeed: 0,
                        totalClaps: 0,
                        totalComments: 0,
                        source: 'Top Ranked (Who to follow)'
                    });
                }
            } else {
                if (!writersMap.has(name.toLowerCase())) {
                    writersMap.set(name.toLowerCase(), {
                        name,
                        url,
                        followers,
                        storiesInFeed: 0,
                        totalClaps: 0,
                        totalComments: 0,
                        source: 'Top Writer (Who to follow)'
                    });
                }
            }
        });

        return { writersMap, pubsMap };
    }

    function runLiveDOMExtraction() {
        const seenUrls = new Set();
        const stories = [];
        const { writersMap, pubsMap } = extractWhoToFollowFromDOM();

        document.querySelectorAll('h2, h3').forEach((heading) => {
            if (heading.closest('#mtr-radar-panel')) return;
            const title = (heading.textContent || '').trim();
            if (!title || title.length < 6) return;

            let linkEl = heading.closest('a[href]');
            const card = findCardContainer(heading);
            if (!card) return;

            if (!linkEl || !isStoryUrl(linkEl.getAttribute('href'))) {
                linkEl = Array.from(card.querySelectorAll('a[href]')).find(a => isStoryUrl(a.getAttribute('href')));
            }
            if (!linkEl) return;

            const rawHref = linkEl.getAttribute('href') || '';
            const url = rawHref.startsWith('http') ? rawHref.split('?')[0] : `https://medium.com${rawHref.split('?')[0]}`;
            if (seenUrls.has(url)) return;
            seenUrls.add(url);

            const { claps, comments } = extractMetricsFromCard(card);
            const { authorName, authorUrl, pubName, pubUrl } = extractAuthorAndPubFromCard(card);
            const score = claps + (comments * 5);

            stories.push({ title, url, claps, comments, score, authorName, pubName });

            if (authorName) {
                const key = authorName.toLowerCase();
                if (!writersMap.has(key)) {
                    writersMap.set(key, {
                        name: authorName,
                        url: authorUrl || url,
                        followers: 0,
                        storiesInFeed: 0,
                        totalClaps: 0,
                        totalComments: 0,
                        source: 'Feed Writer'
                    });
                }
                const w = writersMap.get(key);
                w.storiesInFeed += 1;
                w.totalClaps += claps;
                w.totalComments += comments;
                if (w.source.includes('Who to follow') && w.storiesInFeed > 0) {
                    w.source = 'Top Writer + Feed';
                }
            }

            if (pubName) {
                const key = pubName.toLowerCase();
                if (!pubsMap.has(key)) {
                    pubsMap.set(key, {
                        name: pubName,
                        url: pubUrl || url,
                        followers: 0,
                        storiesInFeed: 0,
                        totalClaps: 0,
                        totalComments: 0,
                        source: 'Feed Publication'
                    });
                }
                const p = pubsMap.get(key);
                p.storiesInFeed += 1;
                p.totalClaps += claps;
                p.totalComments += comments;
                if (p.source.includes('Who to follow') && p.storiesInFeed > 0) {
                    p.source = 'Top Pub + Feed';
                }
            }
        });

        currentStories = stories;
        currentWriters = Array.from(writersMap.values());
        currentPublications = Array.from(pubsMap.values());
    }

    function getTrendSignal(story) {
        if (story.comments >= 30) return '💬 High Debate';
        if (story.claps >= 1000) return '🔥 Viral Claps';
        if (story.score >= 200) return '⚡ Rising';
        return '✨ Active';
    }

    function renderSkeletonLoader() {
        const kpiRow = document.getElementById('mtr-kpi-row');
        const listEl = document.getElementById('mtr-story-list');
        if (!kpiRow || !listEl) return;

        kpiRow.innerHTML = Array(4).fill(0).map((_, i) => `
            <div class="mtr-kpi ${i === 0 ? 'hero' : i === 1 ? 'mint' : i === 3 ? 'peach' : ''}">
                <div class="mtr-skeleton-line sm"></div>
                <div class="mtr-skeleton-line lg"></div>
            </div>
        `).join('');

        listEl.innerHTML = Array(4).fill(0).map(() => `
            <div class="mtr-story-card mtr-skeleton-card">
                <div class="mtr-story-left">
                    <div class="mtr-skeleton-circle"></div>
                    <div style="flex:1;">
                        <div class="mtr-skeleton-line md"></div>
                        <div class="mtr-skeleton-line sm" style="margin-top:8px;"></div>
                    </div>
                </div>
                <div class="mtr-story-stats">
                    <div class="mtr-skeleton-pill"></div>
                    <div class="mtr-skeleton-pill"></div>
                </div>
            </div>
        `).join('');
    }

    function renderPanel() {
        const container = document.getElementById('mtr-radar-panel');
        if (!container) return;

        const titleEl = container.querySelector('.mtr-title-group h2');
        if (titleEl) {
            titleEl.textContent = `Medium Trending Topics Finder — #${getCurrentTagSlug()}`;
        }

        if (isLoading) {
            renderSkeletonLoader();
            return;
        }

        const sortBy = document.getElementById('mtr-sort-select')?.value || 'score';
        const kpiRow = document.getElementById('mtr-kpi-row');
        const listEl = document.getElementById('mtr-story-list');
        listEl.innerHTML = '';

        if (activeTab === 'stories') {
            const sorted = [...currentStories].sort((a, b) => b[sortBy] - a[sortBy]);
            const totalClaps = sorted.reduce((s, x) => s + x.claps, 0);
            const totalComments = sorted.reduce((s, x) => s + x.comments, 0);
            const topScore = sorted.length ? sorted[0].score : 0;

            kpiRow.innerHTML = `
                <div class="mtr-kpi hero"><div class="mtr-kpi-label">Top Engagement Score</div><div class="mtr-kpi-val">${topScore.toLocaleString()}</div></div>
                <div class="mtr-kpi mint"><div class="mtr-kpi-label">Stories Scanned</div><div class="mtr-kpi-val">${sorted.length}</div></div>
                <div class="mtr-kpi"><div class="mtr-kpi-label">Total Claps</div><div class="mtr-kpi-val">${totalClaps.toLocaleString()}</div></div>
                <div class="mtr-kpi peach"><div class="mtr-kpi-label">Total Comments</div><div class="mtr-kpi-val">${totalComments.toLocaleString()}</div></div>
            `;

            if (sorted.length === 0) {
                listEl.innerHTML = `<div class="mtr-story-card" style="justify-content:center;color:#5c6b73;">No stories detected yet. Scroll down on Medium, then click <strong>Rescan Feed</strong>.</div>`;
            } else {
                sorted.slice(0, 20).forEach((story, idx) => {
                    const card = document.createElement('div');
                    card.className = 'mtr-story-card';
                    card.innerHTML = `
                        <div class="mtr-story-left">
                            <div class="mtr-rank-orb">#${idx + 1}</div>
                            <div style="min-width:0;">
                                <a class="mtr-story-link" href="${story.url}" target="_blank" rel="noopener noreferrer"></a>
                                <div class="mtr-story-tags">
                                    <span>${getTrendSignal(story)}</span>
                                    ${story.pubName ? `<span>· ${story.pubName}</span>` : ''}
                                    ${story.authorName ? `<span>· by ${story.authorName}</span>` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="mtr-story-stats">
                            <span class="mtr-stat-pill">👏 ${story.claps.toLocaleString()}</span>
                            <span class="mtr-stat-pill">💬 ${story.comments.toLocaleString()}</span>
                            <span class="mtr-stat-pill score">⚡ ${story.score.toLocaleString()}</span>
                        </div>
                    `;
                    card.querySelector('.mtr-story-link').textContent = story.title;
                    listEl.appendChild(card);
                });
            }
        } else if (activeTab === 'publications') {
            const sorted = [...currentPublications].sort((a, b) => {
                if (sortBy === 'claps') return b.totalClaps - a.totalClaps;
                if (sortBy === 'comments') return b.totalComments - a.totalComments;
                return (b.followers + b.totalClaps * 10) - (a.followers + a.totalClaps * 10);
            });
            const totalFollowers = sorted.reduce((s, x) => s + x.followers, 0);
            const totalClaps = sorted.reduce((s, x) => s + x.totalClaps, 0);
            const topName = sorted.length ? sorted[0].name : 'None';

            kpiRow.innerHTML = `
                <div class="mtr-kpi hero"><div class="mtr-kpi-label">Top Publication</div><div class="mtr-kpi-val" style="font-size:19px;">${topName}</div></div>
                <div class="mtr-kpi mint"><div class="mtr-kpi-label">Publications Found</div><div class="mtr-kpi-val">${sorted.length}</div></div>
                <div class="mtr-kpi"><div class="mtr-kpi-label">Visible Followers</div><div class="mtr-kpi-val">${formatCompact(totalFollowers)}</div></div>
                <div class="mtr-kpi peach"><div class="mtr-kpi-label">Feed Claps</div><div class="mtr-kpi-val">${formatCompact(totalClaps)}</div></div>
            `;

            if (sorted.length === 0) {
                listEl.innerHTML = `<div class="mtr-story-card" style="justify-content:center;color:#5c6b73;">No publications found yet. Scroll down or open a Medium tag page with "Who to follow".</div>`;
            } else {
                sorted.forEach((pub, idx) => {
                    const card = document.createElement('div');
                    card.className = 'mtr-story-card';
                    card.innerHTML = `
                        <div class="mtr-story-left">
                            <div class="mtr-rank-orb">#${idx + 1}</div>
                            <div style="min-width:0;">
                                <a class="mtr-story-link" href="${pub.url}" target="_blank" rel="noopener noreferrer"></a>
                                <div class="mtr-story-tags">
                                    <span>${pub.source}</span>
                                    <span>· ${pub.storiesInFeed} stories in feed</span>
                                </div>
                            </div>
                        </div>
                        <div class="mtr-story-stats">
                            ${pub.followers > 0 ? `<span class="mtr-stat-pill">👥 ${formatCompact(pub.followers)}</span>` : ''}
                            <span class="mtr-stat-pill">👏 ${formatCompact(pub.totalClaps)}</span>
                            <span class="mtr-stat-pill score">💬 ${pub.totalComments}</span>
                        </div>
                    `;
                    card.querySelector('.mtr-story-link').textContent = pub.name;
                    listEl.appendChild(card);
                });
            }
        } else if (activeTab === 'writers') {
            const sorted = [...currentWriters].sort((a, b) => {
                if (sortBy === 'claps') return b.totalClaps - a.totalClaps;
                if (sortBy === 'comments') return b.totalComments - a.totalComments;
                return (b.followers + b.totalClaps * 10 + b.totalComments * 50) - (a.followers + a.totalClaps * 10 + a.totalComments * 50);
            });
            const topWritersCount = sorted.filter(w => w.followers > 0).length;
            const totalClaps = sorted.reduce((s, x) => s + x.totalClaps, 0);
            const topName = sorted.length ? sorted[0].name : 'None';

            kpiRow.innerHTML = `
                <div class="mtr-kpi hero"><div class="mtr-kpi-label">Top Writer</div><div class="mtr-kpi-val" style="font-size:19px;">${topName}</div></div>
                <div class="mtr-kpi mint"><div class="mtr-kpi-label">Writers Found</div><div class="mtr-kpi-val">${sorted.length}</div></div>
                <div class="mtr-kpi"><div class="mtr-kpi-label">Who-to-Follow Writers</div><div class="mtr-kpi-val">${topWritersCount}</div></div>
                <div class="mtr-kpi peach"><div class="mtr-kpi-label">Writer Claps</div><div class="mtr-kpi-val">${formatCompact(totalClaps)}</div></div>
            `;

            if (sorted.length === 0) {
                listEl.innerHTML = `<div class="mtr-story-card" style="justify-content:center;color:#5c6b73;">No writers detected yet. Scroll down and click <strong>Rescan Feed</strong>.</div>`;
            } else {
                sorted.forEach((w, idx) => {
                    const card = document.createElement('div');
                    card.className = 'mtr-story-card';
                    card.innerHTML = `
                        <div class="mtr-story-left">
                            <div class="mtr-rank-orb">#${idx + 1}</div>
                            <div style="min-width:0;">
                                <a class="mtr-story-link" href="${w.url}" target="_blank" rel="noopener noreferrer"></a>
                                <div class="mtr-story-tags">
                                    <span>${w.source}</span>
                                    <span>· ${w.storiesInFeed} stories in feed</span>
                                </div>
                            </div>
                        </div>
                        <div class="mtr-story-stats">
                            ${w.followers > 0 ? `<span class="mtr-stat-pill">👥 ${formatCompact(w.followers)}</span>` : ''}
                            <span class="mtr-stat-pill">👏 ${formatCompact(w.totalClaps)}</span>
                            <span class="mtr-stat-pill score">💬 ${w.totalComments}</span>
                        </div>
                    `;
                    card.querySelector('.mtr-story-link').textContent = w.name;
                    listEl.appendChild(card);
                });
            }
        }

        try {
            if (chrome?.storage?.local) {
                chrome.storage.local.set({
                    mtrLatestScan: {
                        tag: getCurrentTagSlug(),
                        timestamp: Date.now(),
                        stories: [...currentStories].sort((a, b) => b.score - a.score).slice(0, 10)
                    }
                });
            }
        } catch (_) {}
    }

    function runScan(showLoader = true) {
        if (showLoader) {
            isLoading = true;
            renderPanel();
        }
        setTimeout(() => {
            runLiveDOMExtraction();
            isLoading = false;
            renderPanel();
        }, showLoader ? 550 : 50);
    }

    function scheduleAutoScan() {
        clearTimeout(rescanTimer);
        rescanTimer = setTimeout(() => runScan(false), 700);
    }

    function exportCSV() {
        let rows = [];
        if (activeTab === 'stories') {
            rows = [['Rank', 'Title', 'Claps', 'Comments', 'Score', 'Author', 'Publication', 'URL']];
            currentStories.forEach((s, i) => rows.push([i + 1, `"${s.title.replace(/"/g, '""')}"`, s.claps, s.comments, s.score, `"${s.authorName}"`, `"${s.pubName}"`, s.url]));
        } else if (activeTab === 'publications') {
            rows = [['Rank', 'Publication', 'Followers', 'Stories in Feed', 'Total Claps', 'Total Comments', 'Source', 'URL']];
            currentPublications.forEach((p, i) => rows.push([i + 1, `"${p.name.replace(/"/g, '""')}"`, p.followers, p.storiesInFeed, p.totalClaps, p.totalComments, `"${p.source}"`, p.url]));
        } else {
            rows = [['Rank', 'Writer', 'Followers', 'Stories in Feed', 'Total Claps', 'Total Comments', 'Source', 'URL']];
            currentWriters.forEach((w, i) => rows.push([i + 1, `"${w.name.replace(/"/g, '""')}"`, w.followers, w.storiesInFeed, w.totalClaps, w.totalComments, `"${w.source}"`, w.url]));
        }
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `medium-${activeTab}-${getCurrentTagSlug()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function injectRadarPanel() {
        if (document.getElementById('mtr-radar-panel')) return;
        const main = document.querySelector('main') || document.body;

        const panel = document.createElement('section');
        panel.id = 'mtr-radar-panel';
        panel.innerHTML = `
            <div class="mtr-header">
                <div class="mtr-brand-wrap">
                    <div class="mtr-3d-orb"></div>
                    <div class="mtr-title-group">
                        <h2>Medium Trending Topics Finder — #${getCurrentTagSlug()}</h2>
                        <p>Live DOM scan · Stories, Top Publications &amp; Top Writers</p>
                    </div>
                </div>
                <div class="mtr-controls">
                    <select class="mtr-select" id="mtr-sort-select">
                        <option value="score">Sort: Primary Score</option>
                        <option value="claps">Sort: Most Claps</option>
                        <option value="comments">Sort: Most Comments</option>
                    </select>
                    <button class="mtr-btn" id="mtr-rescan-btn">Rescan Feed</button>
                    <button class="mtr-btn mtr-btn-primary" id="mtr-export-btn">Export CSV</button>
                </div>
            </div>
            <div class="mtr-tabs">
                <button class="mtr-tab-btn active" data-tab="stories">🔥 Trending Stories</button>
                <button class="mtr-tab-btn" data-tab="publications">🏛️ Top Publications</button>
                <button class="mtr-tab-btn" data-tab="writers">✍️ Top Writers</button>
            </div>
            <div class="mtr-kpi-row" id="mtr-kpi-row"></div>
            <div class="mtr-story-list" id="mtr-story-list"></div>
        `;

        main.insertBefore(panel, main.firstChild);

        panel.querySelectorAll('.mtr-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                activeTab = btn.getAttribute('data-tab');
                panel.querySelectorAll('.mtr-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderPanel();
            });
        });

        document.getElementById('mtr-sort-select').addEventListener('change', renderPanel);
        document.getElementById('mtr-rescan-btn').addEventListener('click', () => runScan(true));
        document.getElementById('mtr-export-btn').addEventListener('click', exportCSV);

        // Start in loading state while Medium hydrates its SPA feed
        renderPanel();
        setTimeout(() => runScan(true), 1200);
        setTimeout(() => runScan(false), 2800);

        const observer = new MutationObserver((mutations) => {
            const addedOutsidePanel = mutations.some(m => !m.target.closest?.('#mtr-radar-panel') && m.addedNodes.length > 0);
            if (addedOutsidePanel) scheduleAutoScan();
        });
        observer.observe(main, { childList: true, subtree: true });

        setInterval(() => {
            if (window.location.href !== lastUrl) {
                lastUrl = window.location.href;
                runScan(true);
            }
        }, 1000);
    }

    setTimeout(injectRadarPanel, 900);
})();
