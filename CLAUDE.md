# CLAUDE.md — J-master / Chia Tiền Bài

## Project Overview

**Chia Tiền Bài** ("Card Game Money Splitting") is a Vietnamese-language single-page web application for tracking balances in card game sessions and managing trip expenses. It has two independent modules:

- **Game module** — scorekeeping for multi-player card games with betting, special rules, and jackpot tracking
- **Trip module** ("Quản Lý Chuyến Đi") — group trip expense tracking with settlement calculation

The entire application lives in one file: `index.html`. There is no backend, no build step, and no external JavaScript dependencies.

## Architecture

- **Single file**: `index.html` (≈1500 lines) containing embedded `<style>` and `<script>`
- **No build tooling**: no npm, no bundler, no TypeScript, no framework
- **No external JS libraries**: vanilla JavaScript only
- **Fonts**: Google Fonts CDN (Bebas Neue, Barlow Condensed, Barlow)
- **Persistence**: browser `localStorage` only
- **Deployment**: GitHub Pages compatible — open the file directly in any browser

## Code Structure

The JavaScript is divided into named sections separated by `// ══════════════════════════════` banners:

| Section | Lines (approx) | Purpose |
|---|---|---|
| STATE | ~498 | Global state definition, `save()`, `load()` |
| SETUP | ~519 | Session creation, player count, saved sessions |
| GAME SCREEN | ~577 | Render loop, scoreboard, winner selection, round submission |
| PLAYER MANAGER | ~744 | Add/remove players, leave/rejoin/freeze |
| ROLLBACK | ~844 | Undo last round via snapshot |
| SUMMARY | ~865 | End-of-session stats |
| HISTORY | ~878 | Round history list |
| EXPORT | ~906 | JSON/text export, clipboard copy |
| IMPORT | ~958 | JSON import |
| UTILITY | ~979 | Modals, toasts, `esc()`, `fmtK()`, `dl()`, `cp()` |
| TRIP | ~1019 | Entire trip management module |

All functions are global scope. The TRIP module begins at line ~1019 and is largely self-contained.

## Data Model

### Game state — localStorage key `baitien_v4`

```js
state = {
  sessions: Session[],   // up to 10 stored sessions (oldest dropped)
  current: Session | null
}

Session = {
  id: string,            // timestamp string
  name: string,          // session display name
  players: Player[],
  defaultBet: number,
  round: number,         // current round number (1-based)
  history: HistoryEvent[],
  jackpot: number,       // accumulated from draw rounds
  snapshot: Session | null  // deep copy saved before each round for rollback
}

Player = {
  name: string,
  balance: number,       // net balance (positive = winning, negative = losing)
  active: boolean,       // false = has left the table
  frozen: boolean        // true = temporarily away (balance frozen)
}

HistoryEvent = {
  type: 'win' | 'draw' | 'join' | 'leave',
  round: number,
  changes: [{ name: string, delta: number }],
  special: boolean,      // Bình or Tứ quý rule applied
  bet: number,
  jackpot: number        // jackpot paid out this round (0 if none)
}
```

### Trip state — localStorage key `trip_v1`

```js
tripState = {
  name: string,
  members: string[],
  fund: [{ id, name, amount }],         // contributions
  expenses: [{ id, name, amount, paidBy, sharedBy[], category }],
  todos: [{ id, text, done }],
  log: [{ icon, text, time }],          // action log
  backup: tripState | null              // for undo
}
```

## CSS Conventions

All colors are CSS custom properties defined in `:root`:

```css
--green, --green-l, --green-d   /* primary accent */
--gold, --gold-l                /* highlight / winners */
--red, --red-l                  /* losers / destructive actions */
--dark                          /* page background */
--text                          /* primary text */
--muted                         /* secondary text */
--surf, --surf2                 /* card surface levels */
--border                        /* border color */
```

Typography rules:
- `Bebas Neue` — headings, large numbers, button labels
- `Barlow Condensed` — compact labels, metadata
- `Barlow` — body text, inputs

Sizing is responsive via `clamp()` rather than media queries. Class names are short and descriptive: `.prow` (player row), `.sbar` (session bar), `.chip`, `.btn-primary`, `.btn-ghost`, `.btn-sm`, `.btn-xs`.

## Key Functions

### State management
| Function | Purpose |
|---|---|
| `save()` | Serialize and persist `state` to localStorage |
| `load()` | Deserialize state; also runs migration for missing fields |

**Rule**: Every function that mutates `state` must call `save()` then trigger a re-render.

### Game rendering
| Function | Purpose |
|---|---|
| `renderGame()` | Master render — calls all sub-renders |
| `renderScoreboard()` | Aggregate scoreboard sorted by balance |
| `renderIndividualStats()` | Per-player head-to-head breakdown |
| `setStatsView(v)` | Toggle between `'agg'` and `'pp'` views |
| `renderWinnerChips()` | Render clickable player chips for winner selection |
| `renderHistory()` | Render round history list |

### Game logic
| Function | Purpose |
|---|---|
| `submitRound()` | Core logic: resolve winner/draw, apply bets, update jackpot, push to history, save snapshot |
| `selW(idx)` | Set selected winner index (stored in `selWinner`) |
| `toggleSp(r)` | Toggle special rule `'binh'` or `'tu'` (stored in `spRule`) |
| `qbet(v)` | Set quick-bet value into the bet input |
| `doRollback()` | Restore `state.current` from `state.current.snapshot` |

### Player management
| Function | Purpose |
|---|---|
| `addPlayer()` | Add a new player mid-session |
| `rejoin(idx)` | Reactivate a player who left |
| `initLeave(idx)` | Open the leave modal for a player |
| `leaveTransfer()` | Transfer balance to another player and mark inactive |
| `leaveSettle()` | Cash out (zero balance) and mark inactive |
| `leaveFreeze()` | Mark player as frozen (temporarily away, balance preserved) |

### Utilities
| Function | Purpose |
|---|---|
| `esc(s)` | HTML-escape a string — **always use for user data in innerHTML** |
| `fmtK(v)` | Format number: `1500` → `"1.5K"` |
| `fmtVND(v)` | Format currency for trip module |
| `toast(msg, type)` | Show a temporary notification (`type`: `'success'` or `''`) |
| `showConfirm(title, msg, cb)` | Generic confirm modal with callback |
| `openModal(id)` / `closeModal(id)` | Show/hide modal by element ID |
| `dl(content, name, type)` | Trigger file download |
| `cp(text)` | Copy text to clipboard |

### Trip module
| Function | Purpose |
|---|---|
| `renderTrip()` | Master trip render |
| `settleDebts(netIn)` | Greedy debt minimization — returns `[{from, to, amount}]` |
| `calcNetBalances()` | Compute net balance per member from fund/expenses |
| `tripLog(icon, text)` | Append an entry to the action log |
| `tripBackup()` | Deep-copy trip state for undo |
| `tripUndo()` | Restore from backup |

## Game Rules Reference

- **Normal round**: one winner selected → winner gains `bet × (active players − 1)`; each loser pays `bet`
- **Special rules** (Bình or Tứ quý): multiply the bet by 2 for that round
- **Draw round**: no winner selected → `bet` accumulates to `jackpot`; the jackpot bar animates
- **Jackpot resolution**: next win round uses `effectiveBet = bet + jackpot`; jackpot resets to 0
- **Player leaving**: three options — transfer balance to another player, cash out (settle to 0), or freeze (stay in state, skip rounds)

## Development Workflow

```bash
# No build step needed — just edit index.html directly
# Test by opening in a browser:
open index.html        # macOS
xdg-open index.html    # Linux
# or serve locally:
python3 -m http.server 8080
```

Branch naming follows the existing pattern: `claude/<feature-name>-<randomSuffix>`

Commit message convention (mixed English/Vietnamese is fine):
```
feat: <description>
fix: <description>
docs: <description>
```

All PRs target the `main` branch.

## Critical Conventions for AI Assistants

1. **Always `esc()` user data** — any player name or user-supplied string rendered via `innerHTML` must be wrapped in `esc()` to prevent XSS.

2. **Save after every mutation** — pattern is always: mutate `state`, call `save()`, call re-render function(s).

3. **Snapshot before mutations** — before applying round changes, the current session is deep-copied into `s.snapshot = JSON.parse(JSON.stringify(s))` to enable rollback.

4. **No modules — all global** — there is no `import`/`export`. All functions are global. Avoid name collisions by using descriptive names. Trip functions are prefixed with `trip` or `renderTrip`.

5. **Keep it single-file** — do not split into separate JS/CSS files. Do not add external JavaScript libraries or npm dependencies.

6. **Vietnamese UI text** — all user-facing strings must be in Vietnamese. Never introduce English text in the UI.

7. **Section headers** — when adding a new logical group of functions, add the banner:
   ```js
   // ══════════════════════════════
   //         SECTION NAME
   // ══════════════════════════════
   ```

8. **Sessions cap** — after adding a session, enforce `if (state.sessions.length > 10) state.sessions.length = 10;`

9. **Render after DOM mutations** — call `renderGame()` or the specific sub-render (e.g. `renderScoreboard()`) after any change that should update the UI. Don't manipulate DOM directly outside of render functions.

10. **Modal pattern** — use `openModal('modal-id')` / `closeModal('modal-id')` to show/hide modals (adds/removes the `.show` class). Confirm dialogs use `showConfirm(title, msg, callback)`.
