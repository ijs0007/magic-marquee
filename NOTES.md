# Magic Marquee — handoff notes

## Phase 1 (2026-06-26) — switcher + accent. Review & push when ready.

### 1A · Two-way switcher
Added **Credits** as a destination in the header switcher (`public/index.html`): `&middot;` dot + `<a ... data-app="credits">Credits</a>` after Marquee, matching the existing entry shape. Generic hostname snippet, so it's a normal link in Marquee — no JS change.

Footer version bumped `v3.22` → `v3.23`.

### 1B · Accent — **no change needed**
Marquee's suite identity accent (`:root --accent` and the `mp_accent` default) is **already blue `#2f80ff`**, the new target. No accent edit required.

**Note (code vs. the old CLAUDE.md table):** CLAUDE.md used to list Marquee as orange `#f45911`, but the code was already blue — the rotation was partly applied earlier. Code wins; left blue. ✅ CLAUDE.md accent table now updated across all four repos to match.

### Note on the orange `#f45911` still in the file
Several `#f45911` orange instances remain in `index.html` — but these are **thumbnail-design feature colors** (the "Brand" border preset, the star glyph, the "Bold Punch" look, `borderCustom`), not the suite accent. Correctly left untouched.

### Validation
- Switcher: 1 Credits entry; anchors/spans/nav/div/button all tag-balanced ✅
- No deploy — yours to push.

---

## Phase 2 (2026-06-26) — header → fast menu (Marquee). Review/test/push.

**Goal:** top-right shows only the **app switcher + a hamburger (☰)**; everything else lives in the ☰ menu. Footer `v3.23` → **`v3.24`**.

### What was up top, and where it went
Marquee's top-right (`.hbtns`) had the **switcher** + three buttons: **Help `?`**, **Accent 🎨**, **Theme 🌙**. Marquee had no existing menu, so I built one (its own, themed with Marquee's vars).

Used the **proxy pattern** (same as MSM): the three real buttons stay in the DOM but are hidden (`display:none`); the new ☰ menu's items call each real button's `.click()`. So all existing behavior is **unchanged**:
- ❔ **How it works** → toggles the help panel (still renders in normal flow below the header).
- 🎨 **Accent color** → opens the accent-swatch popover (unchanged).
- 🌙/☀️ **Dark/Light mode** → flips theme; the menu label syncs to the current theme each time the menu opens.
- ↩ **Log out** → grayed-out, disabled placeholder (Marquee is a satellite; real sign-out is Suite Pass / MSM's job).

### Result
Top-right now = **switcher + ☰** only. On phones (≤560px) the switcher + ☰ wrap to their own row under the brand (Credits-style).

### Validation
- Both inline `<script>` blocks `node --check`'d ✅
- Tag-balance (a/span/nav/div/button) all balanced ✅
- ⚠️ Couldn't run a live browser this session (Chrome extension not connected). **Please device-test** on desktop + iPhone Safari portrait: open ☰, confirm Help panel, Accent swatches, and Dark/Light all still work from the menu, the switcher still hops to all four apps, top-right shows only switcher + ☰, and Log out reads grayed/un-clickable.
- No deploy — yours to push.

---

## Unified header + logo badge task (2026-06-27) — Marquee. v3.24 → v3.25.

Applied the **same canonical header** as the other apps (`public/index.html`):
- **Part 1:** converted the old `.hrow`/`.hbtns` one-row header into the canonical `<header>` —
  two rows (badge + `Magic Marquee` wordmark; then the switcher), full-width divider underneath
  (Marquee was **missing** the divider — now added). Hamburger pinned top-right (absolute). The
  hidden proxy buttons + `#fastMenu` stay as header children; `#accentPop`/`#helpPanel` still
  render below the header in normal flow (unchanged).
- **Part 2:** boxed logo badge — `.brand-badge` (30×30, 1.5px blue border, dark fill) with an
  inline-SVG **play triangle** in the accent color. Wordmark unified to 27px (blue gradient kept).
- **Part 3:** mobile (≤560px) centers brand + switcher; hamburger stays top-right.
- **Part 5:** the ☰ Dark/Light item now flips in place and **keeps the menu open**. ⚠️ Subtlety:
  Marquee uses the *proxy* pattern (the menu item `.click()`s the hidden real `#themeToggle`), and
  that synthetic click bubbles to the close-on-outside-click handler — so it would slam the menu
  shut. Fix: re-open the menu immediately after the proxied click (synchronous, no flicker). (Same
  fix applied to MSM, which is also proxy-based; Reel/Credits move the toggle *into* the menu so
  they never had the problem.)
- Part 4 N/A (Marquee is blue, already correct).

**Validation:** both inline scripts `node --check`'d ✅; tags balanced ✅; no `.hrow`/`.hbtns`/
`.star` leftovers. ⚠️ Couldn't run a live browser — please device-test on desktop + iPhone Safari
portrait: badge renders, two-row + divider, mobile centered, ☰ → Help panel / Accent swatches /
Dark-light (menu stays open) all work, switcher hops all four apps.
