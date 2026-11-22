# Medium Trending Radar 🚀

Discover trending Medium articles, high-performing stories, and market opportunity topics ranked by **Claps**, **Comments**, and **Engagement Velocity**—built with a **tactile Soft 3D Claymorphic UI** and running **100% locally** in your browser with zero external servers or trackers.

---

## ✨ Features at a Glance

- **🎯 Real-Time In-Page Analytics Overlay**: Automatically injects a tactile 3D Bento dashboard on any Medium tag page (`medium.com/tag/*`) and the homepage feed.
- **⚡ Smart Engagement Scoring Algorithm**:
  $$\text{Engagement Score} = \text{Claps} + (\text{Comments} \times 5)$$
  *Comments are weighted 5× heavier than claps to highlight genuine conversation and high-resonance topics.*
- **🏷️ Automated Trend Signals**: Identifies story performance tiers on the fly:
  - 💬 **High Debate** ($\ge 30$ responses)
  - 🔥 **Viral Claps** ($\ge 1{,}000$ claps)
  - ⚡ **Rising** ($\ge 200$ engagement score)
  - ✨ **Active** (consistent reader momentum)
- **🎨 Soft 3D Tactile Claymorphism UI**: Custom-designed aesthetic with pastel clay tones (cream, mint, teal, peach), inset lighting, 3D concentric orbs, and soft pill badges.
- **📡 Coordinated Radar & Shimmer Loaders**:
  - Live pulsing radar beacon indicator in the panel header (`Radar scanning...`).
  - Tactile depressed button state with spinner feedback during manual scans.
  - Smooth claymorphic skeleton cards during Medium's async GraphQL feed hydration to prevent layout shifts.
- **📊 1-Click CSV Data Export**: Download structured `.csv` reports with Rank, Title, Claps, Comments, Engagement Score, Trend Signal, and Story URLs for research, content strategy, or lead generation.
- **🎛️ Dynamic In-Feed Sorting**: Re-rank loaded articles instantly by **Engagement Score**, **Most Claps**, or **Most Comments**.
- **🔍 Quick-Jump Extension Popup**:
  - Direct search bar to jump to any Medium topic slug.
  - Instant tag chips (`technology`, `artificial-intelligence`, `programming`, `python`, `writing`).
  - Offline scan history cache viewer using Chrome's local storage.
- **🔒 100% Private & Local**: Zero telemetry, zero analytics tracking, zero third-party APIs. Your browsing data never leaves your browser.

---

## 📸 In-Page Dashboard Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│  🟢 Medium Trending Radar — #artificial-intelligence    [Radar scanning]│
│  Ranked by claps, comments, and engagement velocity                    │
│                                                                        │
│  [ Sort: Engagement Score ▼ ]  [ ↻ Rescan Feed ]  [ 📥 Export CSV ]     │
├─────────────────┬─────────────────┬──────────────────┬─────────────────┤
│ TOP SCORE       │ STORIES SCANNED │ TOTAL CLAPS      │ TOTAL COMMENTS  │
│ 4,820           │ 24              │ 18,340           │ 596             │
├─────────────────┴─────────────────┴──────────────────┴─────────────────┤
│  #1  The Future of Autonomous Agents       [🔥 Viral Claps]  👏 2.4K 💬 148 ⚡ 3,140 │
│  #2  Why Clean Architecture Still Matters [💬 High Debate]   👏 890  💬 62  ⚡ 1,200 │
│  #3  Mastering PyTorch in 2026            [⚡ Rising]        👏 420  💬 18  ⚡ 510   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Project Structure

```
medium-trending-radar-extension/
├── manifest.json       # Manifest V3 extension configuration & permissions
├── content.js          # In-page feed scraper, DOM observer, and radar UI injector
├── styles.css          # Soft 3D Claymorphic styling & shimmer animation keyframes
├── popup.html          # Extension toolbar popup interface
├── popup.js            # Quick topic navigation & storage cache retrieval
├── README.md           # Documentation & setup guide
└── icon*.png           # Extension toolbar & store icons (16px, 48px, 128px)
```

---

## 🚀 Installation & Local Setup

The extension is pure vanilla JavaScript, HTML, and CSS (no Node.js build step or npm packages required):

1. **Clone or Download** this repository:
   ```bash
   git clone https://github.com/your-username/medium-trending-radar-extension.git
   ```
2. Open Google Chrome (or any Chromium browser like Brave, Edge, or Arc).
3. Navigate to `chrome://extensions` in the address bar.
4. Toggle **Developer mode** on (top-right corner).
5. Click the **Load unpacked** button (top-left corner).
6. Select the `medium-trending-radar-extension` directory.
7. Pin **Medium Trending Radar** to your Chrome toolbar.

---

## 💡 How to Use

### 1. Researching Topics Directly on Medium
1. Navigate to any Medium tag page (e.g., `https://medium.com/tag/technology`, `https://medium.com/tag/python`, `https://medium.com/tag/ai`).
2. The radar panel will automatically appear at the top of the feed with a subtle radar beacon and skeleton shimmer state.
3. As Medium hydrates the stories, the dashboard populates with ranked cards, KPI totals, and engagement metrics.
4. Scroll down the feed to load more stories—the built-in `MutationObserver` automatically captures and indexes newly loaded cards.
5. Click **Rescan Feed** anytime to force a fresh index pass, or switch the dropdown to sort by **Most Claps** or **Most Comments**.
6. Click **Export CSV** to download a spreadsheet of all captured stories.

### 2. Using the Toolbar Popup
1. Click the **Medium Trending Radar** icon in your browser extensions bar.
2. Click any popular topic chip (`technology`, `artificial-intelligence`, etc.) or type a custom topic in the search box and press **Scan ↗**.
3. View the top 6 cached stories from your previous scan directly in the popup without navigating away.

---

## 🎨 Design System: Soft 3D Claymorphism

The UI is built with a cohesive, tactile claymorphism aesthetic:

| Token / Element | CSS Value | Description |
| :--- | :--- | :--- |
| **Cream Card** | `#fbf7f1` | Warm tactile card background |
| **Clay Mint** | `#cde8d9` | Positive highlight & beacon badge accent |
| **Clay Teal** | `#a9d1da` / `#88bec9` | 3D brand orb and secondary pills |
| **Clay Peach** | `#f6d5be` | Warmer accent for #1 top rank orb |
| **Deep Clay Accent** | `#2f7d6d` / `#266c5d` | Interactive button states & hover links |
| **Clay 3D Shadow** | `0 18px 36px -14px ... inset 2px 2px 6px ...` | Tactile elevation with ambient & inset light |
| **Pill Shadow** | `0 8px 18px -6px ... inset 2px 2px 4px ...` | Embossed look for badges & buttons |

---

## 🔐 Permissions & Privacy

This extension complies strictly with Manifest V3 and follows the principle of least privilege:

- `permissions: ["storage"]`: Saves the latest scan summary locally (`chrome.storage.local`) so you can preview top stories in the extension popup. No data ever leaves your device.
- `content_scripts`: Statically declared to match only `https://medium.com/tag/*` and `https://medium.com/` to inspect publicly visible story previews (titles, claps, responses) and inject the local overlay panel.
- **Audited Least Privilege**: Does not request `activeTab`, `host_permissions`, `tabs`, cookies, background workers, or external network access.
- **Privacy Guarantee**: No data, browsing history, or identifiers are transmitted externally. Everything is processed purely inside your local browser tab.

---

## 📄 License

MIT License. Free for personal, commercial, and research use.
