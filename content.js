// Medium Trending Radar - Soft 3D Content Script (Universal DOM + SPA Observer)
(function () {
    'use strict';

    let currentStories = [];
    let lastUrl = window.location.href;
    let rescanTimer = null;
    let isScanning = false;

    function renderSkeletonCards(listEl, count = 4) {
        if (!listEl) return;
        listEl.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const card = document.createElement('div');
            card.className = 'mtr-story-card mtr-skeleton-card';
            card.innerHTML = `
                <div class="mtr-story-left">
                    <div class="mtr-skeleton-orb"></div>
                    <div style="min-width:0; flex:1;">
                        <div class="mtr-skeleton-bar mtr-skel-title"></div>
                        <div class="mtr-skeleton-bar mtr-skel-tag"></div>
                    </div>
                </div>
                <div class="mtr-story-stats">
                    <div class="mtr-skeleton-bar mtr-skel-pill"></div>
                    <div class="mtr-skeleton-bar mtr-skel-pill"></div>
                    <div class="mtr-skeleton-bar mtr-skel-pill score"></div>
                </div>
            `;
            listEl.appendChild(card);
        }
    }

    function setScanningUI(active) {
        isScanning = active;
        const panel = document.getElementById('mtr-radar-panel');
        if (!panel) return;

        const rescanBtn = document.getElementById('mtr-rescan-btn');
        if (rescanBtn) {
            if (active) {
                rescanBtn.classList.add('is-scanning');
                rescanBtn.innerHTML = '<span class="mtr-spinner"></span> Scanning...';
                rescanBtn.disabled = true;
            } else {
                rescanBtn.classList.remove('is-scanning');
                rescanBtn.textContent = 'Rescan Feed';
                rescanBtn.disabled = false;
            }
        }

        const titleHeader = panel.querySelector('.mtr-title-group h2');
        if (titleHeader) {
            let badge = titleHeader.querySelector('.mtr-scanning-badge');
            if (active) {
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'mtr-scanning-badge';
                    badge.innerHTML = `
                        <span class="mtr-radar-beacon">
                            <span class="mtr-radar-beacon-ring"></span>
                            <span class="mtr-radar-beacon-dot"></span>
                        </span>
                        Radar scanning...
                    `;
                    titleHeader.appendChild(badge);
                }
            } else if (badge) {
                badge.remove();
            }
        }
    }

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

        const candidates = card.querySelectorAll('button, a, span, div[aria-label], svg[aria-label]');
        candidates.forEach((el) => {
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

    function getTrendSignal(story) {
        if (story.comments >= 30) return '💬 High Debate';
        if (story.claps >= 1000) return '🔥 Viral Claps';
        if (story.score >= 200) return '⚡ Rising';
        return '✨ Active';
    }

    function extractStoriesFromDOM() {
        const seenUrls = new Set();
        const extracted = [];

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
            const score = claps + (comments * 5);
            extracted.push({ title, url, claps, comments, score });
        });

        return extracted;
    }

    function renderPanel() {
        const container = document.getElementById('mtr-radar-panel');
        if (!container) return;

        const titleEl = container.querySelector('.mtr-title-group h2');
        if (titleEl) {
            const badge = titleEl.querySelector('.mtr-scanning-badge');
            titleEl.textContent = `Medium Trending Radar — #${getCurrentTagSlug()}`;
            if (badge && isScanning) {
                titleEl.appendChild(badge);
            }
        }

        const listEl = document.getElementById('mtr-story-list');

        if (isScanning && currentStories.length === 0) {
            renderSkeletonCards(listEl, 4);
            return;
        }

        const sortBy = document.getElementById('mtr-sort-select')?.value || 'score';
        const sorted = [...currentStories].sort((a, b) => b[sortBy] - a[sortBy]);

        const totalClaps = sorted.reduce((sum, s) => sum + s.claps, 0);
        const totalComments = sorted.reduce((sum, s) => sum + s.comments, 0);
        const topScore = sorted.length ? sorted[0].score : 0;

        document.getElementById('mtr-kpi-count').textContent = sorted.length;
        document.getElementById('mtr-kpi-claps').textContent = totalClaps.toLocaleString();
        document.getElementById('mtr-kpi-comments').textContent = totalComments.toLocaleString();
        document.getElementById('mtr-kpi-top').textContent = topScore.toLocaleString();

        listEl.innerHTML = '';

        if (sorted.length === 0) {
            listEl.innerHTML = `<div class="mtr-story-card" style="justify-content:center;color:#5c6b73;padding:22px;text-align:center;">
                <div>
                    <div style="font-weight:700;color:#1e293b;margin-bottom:4px;">No stories detected yet</div>
                    Scroll down to load stories in #${getCurrentTagSlug()}, then click <strong>Rescan Feed</strong>.
                </div>
            </div>`;
        } else {
            sorted.slice(0, 15).forEach((story, idx) => {
                const card = document.createElement('div');
                card.className = 'mtr-story-card';
                card.innerHTML = `
                    <div class="mtr-story-left">
                        <div class="mtr-rank-orb">#${idx + 1}</div>
                        <div style="min-width:0;">
                            <a class="mtr-story-link" href="${story.url}" target="_blank" rel="noopener noreferrer"></a>
                            <div class="mtr-story-tags">
                                <span>${getTrendSignal(story)}</span>
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

        try {
            if (chrome?.storage?.local) {
                chrome.storage.local.set({
                    mtrLatestScan: {
                        tag: getCurrentTagSlug(),
                        timestamp: Date.now(),
                        stories: sorted.slice(0, 10)
                    }
                });
            }
        } catch (_) {}
    }

    function runScan(isManual = false) {
        setScanningUI(true);

        const executeExtract = () => {
            currentStories = extractStoriesFromDOM();
            setScanningUI(false);
            renderPanel();
        };

        if (isManual) {
            setTimeout(executeExtract, 450);
        } else {
            executeExtract();
        }
    }

    function scheduleAutoScan() {
        clearTimeout(rescanTimer);
        rescanTimer = setTimeout(runScan, 800);
    }

    function exportCSV() {
        const rows = [['Rank', 'Title', 'Claps', 'Comments', 'Engagement Score', 'Signal', 'URL']];
        currentStories.forEach((s, i) => {
            rows.push([i + 1, `"${s.title.replace(/"/g, '""')}"`, s.claps, s.comments, s.score, getTrendSignal(s), s.url]);
        });
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `medium-trending-${getCurrentTagSlug()}.csv`;
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
                        <h2>Medium Trending Radar — #${getCurrentTagSlug()}</h2>
                        <p>Ranked by claps, comments, and engagement velocity</p>
                    </div>
                </div>
                <div class="mtr-controls">
                    <select class="mtr-select" id="mtr-sort-select">
                        <option value="score">Sort: Engagement Score</option>
                        <option value="claps">Sort: Most Claps</option>
                        <option value="comments">Sort: Most Comments</option>
                    </select>
                    <button class="mtr-btn" id="mtr-rescan-btn">Rescan Feed</button>
                    <button class="mtr-btn mtr-btn-primary" id="mtr-export-btn">Export CSV</button>
                </div>
            </div>
            <div class="mtr-kpi-row">
                <div class="mtr-kpi hero">
                    <div class="mtr-kpi-label">Top Engagement Score</div>
                    <div class="mtr-kpi-val" id="mtr-kpi-top">0</div>
                </div>
                <div class="mtr-kpi mint">
                    <div class="mtr-kpi-label">Stories Scanned</div>
                    <div class="mtr-kpi-val" id="mtr-kpi-count">0</div>
                </div>
                <div class="mtr-kpi">
                    <div class="mtr-kpi-label">Total Claps</div>
                    <div class="mtr-kpi-val" id="mtr-kpi-claps">0</div>
                </div>
                <div class="mtr-kpi peach">
                    <div class="mtr-kpi-label">Total Comments</div>
                    <div class="mtr-kpi-val" id="mtr-kpi-comments">0</div>
                </div>
            </div>
            <div class="mtr-story-list" id="mtr-story-list"></div>
        `;

        main.insertBefore(panel, main.firstChild);

        document.getElementById('mtr-sort-select').addEventListener('change', renderPanel);
        document.getElementById('mtr-rescan-btn').addEventListener('click', () => runScan(true));
        document.getElementById('mtr-export-btn').addEventListener('click', exportCSV);

        const listEl = document.getElementById('mtr-story-list');
        setScanningUI(true);
        renderSkeletonCards(listEl, 4);

        runScan();
        // Catch async hydration after initial render
        setTimeout(() => runScan(), 1200);
        setTimeout(() => runScan(), 2500);

        const observer = new MutationObserver((mutations) => {
            const addedOutsidePanel = mutations.some(m => !m.target.closest?.('#mtr-radar-panel') && m.addedNodes.length > 0);
            if (addedOutsidePanel) scheduleAutoScan();
        });
        observer.observe(main, { childList: true, subtree: true });

        setInterval(() => {
            if (window.location.href !== lastUrl) {
                lastUrl = window.location.href;
                scheduleAutoScan();
            }
        }, 1000);
    }

    setTimeout(injectRadarPanel, 1200);
})();
