# Connections Activity Specification

Implement a "Connections" activity (setup + whiteboard play) in this Next.js app.
Match the existing design patterns from Odd One Out / This or That / What's the Question.

## FEATURES

### A) ROUTES
- `/app/activities/connections/page.tsx` (setup)
- `/app/activities/connections/play/page.tsx` (whiteboard mode)

### B) SETUP PAGE (same structure as Odd One Out)

**Core Setup:**
- "use client"
- Mode toggle: Manual / AI
- Parameters:
  - Number of sets: 3-5 (configurable via +/- buttons)
  - Words per set: Fixed at 4 (not editable)
  - Timer: On/Off with configurable seconds
- Difficulty levels: Sets are ordered from easiest (top) to hardest (bottom)
  - Visual indicator: Teal gradient colors (light = easy, dark = hard)

**Topic Input (AI Mode):**
- Short input field (1-2 words recommended)
- maxLength: 30 characters
- Placeholder: "e.g., sports, kitchen, travel, office..."

**Manual Mode Editor:**
- Each set has:
  - Category label input (e.g., "Types of fruit")
  - 4 word inputs
- Validation: All categories and words must be filled
- Sets can be added (up to 5) or removed (min 3)

**AI Mode:**
- Uses `supabase.functions.invoke('generate-connections')`
- Request body:
  ```json
  { "cefr_level": "B1", "num_sets": 4, "topic": "food" }
  ```
- Expected response:
  ```json
  { 
    "sets": [
      { "category": "Fruits", "words": ["Apple", "Banana", "Orange", "Grape"], "difficulty": 0 },
      ...
    ]
  }
  ```
- AI generates items and categories only; no "correct answer" concept

**Persistence:**
- Save to sessionStorage key: `"connectionsData"`
- Stored data: `{ sets, timerEnabled, timerSeconds }`

**Navigation:**
- "Start Game" button routes to `/activities/connections/play`
- Home button in header returns to homepage
- Info button shows activity information panel

### C) WHITEBOARD PAGE (core gameplay)

**Initialization:**
- Load gameData from sessionStorage (`"connectionsData"`)
- Flatten all sets into a word pool (n sets × 4 words)
- Shuffle words on start

**Grid Display:**
- Responsive 4-column grid
- Large, touch-friendly tiles (aspect-ratio: 1)
- Dynamic font sizing based on word length
- Glass-card styling with teal accent on selection

**Interaction:**
- Teacher taps tiles to select/deselect
- Selected tiles highlighted in teal
- Selection counter shows "Selected: X / 4"
- "Clear" button to deselect all

**Validation (when 4 words selected):**
- Auto-triggers validation after 4th selection
- Matching is order-independent (any 4 words from same set = correct)

**Feedback System:**
- ✅ **Correct**: 
  - "Category Name" toast with trophy icon
  - Success sound
  - Words lock into colored row at top (difficulty color)
  - Remaining words shuffle
  - Selection clears
- ⚠️ **One Away** (3 of 4 correct):
  - "One away!" toast with warning icon
  - Close sound
  - Selection clears
- ⚠️ **Two Away** (2+2 split):
  - "Two away!" toast with warning icon
  - Close sound
  - Selection clears
- ❌ **Wrong** (1 or 0 correct):
  - "Try again" toast
  - Error sound
  - Shake animation on selected tiles
  - Selection clears

**Solved Sets Display:**
- Locked rows appear above the grid
- Sorted by difficulty (easiest first)
- Shows category name and all 4 words
- Color-coded by difficulty level

**Completion State:**
- Victory screen when all sets found
- Shows: 🎉 emoji, "All Connections Found!" message
- Stats: Attempts count, Groups found, Time taken (if timer enabled)
- Buttons: "Play Again" (reset) and "New Game" (back to setup)

**Controls:**
- Shuffle button: Reshuffles remaining unsolved words
- Reset button: Restarts entire game
- Timer display (if enabled): Shows remaining time, pulses red when low
- Theme toggle: Dark/light mode

**Progress Indicator:**
- Progress bar at bottom
- Shows "X / Y groups" solved

### D) EDGE CASES

- **Case handling**: Word matching should be exact (case-sensitive as entered)
- **Missing sessionStorage**: Redirect to setup page
- **Empty sets**: Validate in setup before allowing start
- **Timer expiry**: Timer stops at 0, game continues (no forced end)

### E) UI / STYLE

- Use existing `glass-card` styling
- Use `SkyToggle` for theme switching
- Use `AnimatedPaths` for background
- Use `LabeledToggle` for toggles
- Teal/cyan color scheme (matching app accent colors)
- Difficulty colors gradient:
  - Level 1 (Easiest): `bg-teal-300` (light)
  - Level 2: `bg-teal-400`
  - Level 3: `bg-teal-500`
  - Level 4: `bg-teal-600`
  - Level 5 (Hardest): `bg-teal-700` (dark)

### F) AI EDGE FUNCTION

**Endpoint:** `generate-connections`

**Prompt Guidelines:**
- CEFR-level appropriate vocabulary
- Categories ordered by difficulty (obvious → subtle)
- Some words may appear to fit multiple categories (creates challenge)
- Short words (1-2 words max per item)
- No offensive content

**Response Format:**
```json
{
  "sets": [
    {
      "category": "Clear category name",
      "words": ["Word1", "Word2", "Word3", "Word4"],
      "difficulty": 0
    }
  ]
}
```

---

## DELIVERABLES

- [x] Setup page with manual/AI modes
- [x] Whiteboard page with full gameplay
- [x] AI edge function for generation
- [x] Homepage updated (ready: true)
- [x] No lint/type errors
- [x] Touch-friendly for interactive whiteboards

