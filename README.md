# Medium Trending Topics Finder 🚀

Discover trending Medium articles, top publications, and top writers ranked by **Claps**, **Comments**, **Followers**, and **Engagement Velocity**—built with a **tactile Soft 3D Claymorphic UI** and running **100% locally** in your browser with zero external servers or trackers.

---

## ✨ Features at a Glance

- **🎯 3-in-1 In-Page Intelligence Overlay**: Automatically injects a tactile 3D Bento dashboard on any Medium tag page (`medium.com/tag/*`) and the homepage feed.
  - 🔥 **Trending Stories**: Ranks stories by claps, comments, and engagement velocity.
  - 🏛️ **Top Publications**: Surfaces publication leaders with follower counts and active feed story presence.
  - ✍️ **Top Writers**: Tracks top topic authors from both the sidebar and live feed aggregation.
- **⚡ Dual Live Data Pipeline**:
  - **Medium "Who to follow" Sidebar**: Scans verified topic badges (e.g. `Writer · 59K followers` or `Publication · 329K followers`) to capture authentic audience reach.
  - **Feed Story Aggregation**: Inspects every loaded card to sum `storiesInFeed`, `totalClaps`, and `totalComments`.
  - **Smart Merge**: Entities found in both are merged into hybrid badges: `Top Writer + Feed` and `Top Pub + Feed`.
- **📐 3 Specialized Ranking Formulas**:
  - **Stories**: $\text{Score} = \text{Claps} + (\text{Comments} \times 5)$
  - **Top Publications**: $\text{Score} = \text{Followers} + (\text{Total Feed Claps} \times 10)$
  - **Top Writers**: $\text{Score} = \text{Followers} + (\text{Total Feed Claps} \times 10) + (\text{Total Feed Comments} \times 50)$
- **🏷️ Automated Trend Signals**: Identifies story performance tiers on the fly:
  - 💬 **High Debate** ($\ge 30$ responses)
  - 🔥 **Viral Claps** ($\ge 1{,}000$ claps)
  - ⚡ **Rising** ($\ge 200$ engagement score)
  - ✨ **Active** (consistent reader momentum)
- **🎨 Soft 3D Tactile Claymorphism UI**: Custom-designed aesthetic with pastel clay tones (cream, mint, teal, peach), inset lighting, 3D concentric orbs, and soft pill badges.
- **📊 1-Click Tab-Aware CSV Data Export**: Download structured `.csv` reports for Stories, Publications, or Writers for research, publication pitching, or content strategy.
- **🎛️ Dynamic In-Feed Sorting**: Re-rank loaded entities instantly by **Primary Score**, **Most Claps**, or **Most Comments**.
- **🔍 Quick-Jump Extension Popup**:
  - Direct search bar to jump to any Medium topic slug.
  - Instant tag chips (`technology`, `artificial-intelligence`, `programming`, `python`, `writing`).
  - Offline scan history cache viewer using Chrome's local storage.
- **🔒 100% Private & Local**: Zero telemetry, zero analytics tracking, zero third-party APIs. Your browsing data never leaves your browser.

---

## 📸 In-Page Dashboard Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│  🟢 Medium Trending Topics Finder — #artificial-intelligence          │
│  Live DOM scan · Stories, Top Publications & Top Writers               │
│                                                                        │
│  [ 🔥 Trending Stories ]  [ 🏛️ Top Publications ]  [ ✍️ Top Writers ]   │
│  [ Sort: Primary Score ▼ ]     [ ↻ Rescan Feed ]    [ 📥 Export CSV ]  │
├─────────────────┬─────────────────┬──────────────────┬─────────────────┤
│ TOP SCORE / PUB │ TOTAL SCANNED   │ TOTAL CLAPS      │ TOTAL COMMENTS  │
│ 4,820           │ 24              │ 18,340           │ 596             │
├─────────────────┴─────────────────┴──────────────────┴─────────────────┤
│  #1  The Future of Autonomous Agents       [🔥 Viral Claps]  👏 2.4K 💬 148 ⚡ 3,140 │
│  #2  Towards Data Science                  [Top Pub + Feed]  👥 690K 👏 6.5K 💬 341  │
│  #3  Cassie Kozyrkov                       [Top Writer+Feed] 👥 120K 👏 3.4K 💬 184  │
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
