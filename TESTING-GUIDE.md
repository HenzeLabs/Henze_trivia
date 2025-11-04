# Trivia Murder Party - Testing Guide

## Automated Testing with Tampermonkey

This guide covers installation and usage of the automated testing userscript for full game playthrough testing.

---

## Installation

### Step 1: Install Browser Extension

**Chrome/Edge:**
1. Install [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
2. Click "Add to Chrome"

**Firefox:**
1. Install [Greasemonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/)
2. Click "Add to Firefox"

### Step 2: Install the Auto-Tester Script

1. Click the Tampermonkey icon in your browser toolbar
2. Select **"Create a new script"**
3. Delete all existing content
4. Copy the entire contents of `trivia-game-auto-tester.user.js`
5. Paste into the editor
6. Press **Ctrl+S** (or **Cmd+S** on Mac) to save
7. Close the editor tab

### Step 3: Verify Installation

1. Click the Tampermonkey icon again
2. You should see "Trivia Murder Party - Auto Tester" listed
3. Ensure the toggle is **ON** (green)

---

## Testing on Production

### Single Player Test

1. Navigate to: https://henze-trivia.onrender.com
2. You should see a **green control panel** in the top-right corner
3. Watch the console (F12 → Console tab) for logs:
   ```
   [AUTO-TESTER] Script loaded
   [AUTO-TESTER] Initializing Auto-Tester...
   [AUTO-TESTER] Auto-Tester ready!
   ```

4. The bot will automatically:
   - Fill in name (`AutoBot_1234` with random digits)
   - Click JOIN button
   - Click START GAME button when available
   - Answer questions randomly after 1 second delay

5. Check the control panel for:
   - ✓ Joined
   - ✓ Started
   - Questions count incrementing
   - Correct answers tracking

### Multi-Player Test

To simulate multiple players:

1. Open **2-4 browser windows/tabs** (not incognito - use regular tabs)
2. Navigate to https://henze-trivia.onrender.com in each
3. Each tab will auto-join with a unique `AutoBot_XXXX` name
4. First bot will auto-start the game
5. All bots will answer questions automatically

**Expected Behavior:**
- All bots join lobby successfully
- Game starts when first bot clicks START
- All bots answer each question within 1-2 seconds
- Scoreboard updates correctly
- Game progresses through all 20 rounds

---

## Testing on Localhost

1. Start the dev server:
   ```bash
   cd web-app
   npm run dev
   ```

2. Navigate to: http://localhost:3000
3. The script auto-loads for localhost URLs too
4. Same testing flow as production

---

## Control Panel

The green panel in the top-right corner shows:

```
🤖 AUTO-TESTER
Name: AutoBot_1234
Joined: ✓
Started: ✓
Questions: 5
Correct: 2
[Join: ON] [Start: ON] [Answer: ON]
```

### Toggle Buttons

- **Join: ON/OFF** - Enable/disable auto-joining
- **Start: ON/OFF** - Enable/disable auto-starting
- **Answer: ON/OFF** - Enable/disable auto-answering

Click buttons to toggle features on/off during testing.

---

## Console API

Open browser console (F12) to access manual controls:

### Get Statistics
```javascript
window.triviaAutoTester.getStats()
// Returns: { questionsAnswered: 5, correctAnswers: 2, accuracy: "40.0%" }
```

### Force Actions Manually
```javascript
// Force join (even if auto-join is OFF)
window.triviaAutoTester.forceJoin()

// Force start game
window.triviaAutoTester.forceStart()

// Force answer current question
window.triviaAutoTester.forceAnswer()
```

### View State
```javascript
// Current state
window.triviaAutoTester.state
// Returns: { joined: true, gameStarted: true, questionsAnswered: 5, correctAnswers: 2 }
```

### Modify Configuration
```javascript
// Change answer delay to 2 seconds
window.triviaAutoTester.config.ANSWER_DELAY = 2000

// Disable auto-answer
window.triviaAutoTester.config.AUTO_ANSWER = false
```

---

## Test Scenarios

### Scenario 1: Full Playthrough (Single Player)
**Goal:** Verify bot can complete entire 20-round game

1. Load page with script enabled
2. Bot auto-joins
3. Bot auto-starts
4. Bot answers all 20 questions
5. Check final score and game end screen

**Success Criteria:**
- No JavaScript errors in console
- All 20 questions answered
- Final score displayed correctly
- Game reaches GAME_END state

---

### Scenario 2: Multi-Player Race (4 Bots)
**Goal:** Test concurrent player handling

1. Open 4 browser tabs
2. All bots join lobby
3. First bot starts game
4. All bots answer simultaneously
5. Verify scoreboard updates correctly

**Success Criteria:**
- All 4 players visible in lobby
- Scoreboard shows all 4 players
- Answer submissions don't conflict
- No "Invalid payload" errors

---

### Scenario 3: Manual + Auto Players
**Goal:** Test human player interaction with bots

1. Open 2 tabs:
   - Tab 1: Disable the Tampermonkey script (manual player)
   - Tab 2: Enable the Tampermonkey script (auto bot)
2. Manually join in Tab 1
3. Bot auto-joins in Tab 2
4. Manually start game in Tab 1
5. Mix manual and auto answers

**Success Criteria:**
- Manual and auto players coexist
- Both can answer questions
- Results display correctly for both

---

### Scenario 4: Stress Test (TV + Players)
**Goal:** Test TV display with multiple bots

1. Open tab for TV display: https://henze-trivia.onrender.com/tv
2. Open 3 tabs for players with auto-tester enabled
3. All bots join and play
4. Watch TV display update in real-time

**Success Criteria:**
- TV shows all players in lobby
- TV displays questions correctly
- TV shows answer reveals
- TV scoreboard updates

---

## Troubleshooting

### Bot Not Auto-Joining

**Check:**
1. Tampermonkey icon shows script is enabled (green)
2. Console shows `[AUTO-TESTER] Script loaded`
3. URL matches pattern: `https://henze-trivia.onrender.com/*` or `http://localhost:3000/*`

**Fix:**
- Refresh the page (Ctrl+R)
- Check control panel shows "Join: ON"
- Manually call: `window.triviaAutoTester.forceJoin()`

---

### Bot Not Starting Game

**Check:**
1. Bot successfully joined (control panel shows "Joined: ✓")
2. START GAME button is enabled (not grayed out)
3. Control panel shows "Start: ON"

**Fix:**
- Wait for all players to join
- Check console for errors
- Manually call: `window.triviaAutoTester.forceStart()`

---

### Bot Not Answering Questions

**Check:**
1. Game has started (control panel shows "Started: ✓")
2. Question is visible on screen
3. Answer buttons are enabled
4. Control panel shows "Answer: ON"

**Fix:**
- Check console logs for button detection errors
- Verify buttons have class `btn-primary`
- Manually call: `window.triviaAutoTester.forceAnswer()`

---

### "Invalid Payload" Errors

**Cause:** Server validation rejecting answer submission

**Fix:**
1. Clear browser cache: Ctrl+Shift+R (or Cmd+Shift+R)
2. Run in console:
   ```javascript
   caches.keys().then(k => Promise.all(k.map(n => caches.delete(n)))).then(() => location.reload(true))
   ```
3. Verify you're on latest deployment

---

### Control Panel Not Visible

**Check:**
1. Script loaded successfully (check console)
2. Page is fully loaded
3. No z-index conflicts with game UI

**Fix:**
- Refresh page
- Check browser console for errors
- Panel may be hidden behind game overlay - try minimizing game UI

---

## Expected Console Output

### Successful Run
```
[AUTO-TESTER] [10:30:45] Script loaded
[AUTO-TESTER] [10:30:45] Initializing Auto-Tester...
[AUTO-TESTER] [10:30:45] Configuration: { AUTO_JOIN: true, AUTO_START: true, AUTO_ANSWER: true, ... }
[AUTO-TESTER] [10:30:45] Auto-Tester ready! Control panel added to top-right corner
[AUTO-TESTER] [10:30:47] Attempting to join game...
[AUTO-TESTER] [10:30:47] Setting player name: AutoBot_1234
[AUTO-TESTER] [10:30:47] Clicking element: JOIN GAME
[AUTO-TESTER] [10:30:48] Successfully joined lobby
[AUTO-TESTER] [10:30:50] Looking for START GAME button...
[AUTO-TESTER] [10:30:50] Starting game...
[AUTO-TESTER] [10:30:50] Clicking element: START GAME
[AUTO-TESTER] [10:30:51] Game started!
[AUTO-TESTER] [10:30:53] Found 4 answer options
[AUTO-TESTER] [10:30:54] Auto-selecting answer: B
[AUTO-TESTER] [10:30:54] Clicking element: B.Wine
[AUTO-TESTER] [10:30:54] Questions answered: 1
[AUTO-TESTER] [10:30:57] ✓ Correct! (1/1)
```

---

## Playwright vs Tampermonkey

### Playwright Tests (`npm run test`)
- **Purpose:** Automated CI/CD integration testing
- **Environment:** Headless browser, programmatic control
- **Use Case:** Pre-deployment validation, regression testing
- **Coverage:** Full game flow with multiple clients

### Tampermonkey Auto-Tester
- **Purpose:** Manual QA assistance and exploratory testing
- **Environment:** Real browser with visual feedback
- **Use Case:** Quick smoke tests, UI debugging, load testing
- **Coverage:** Single player experience with optional multi-tab testing

**Use Both:**
- Run Playwright before deployments
- Use Tampermonkey for quick manual verification
- Tampermonkey helps test UI/UX that Playwright can't evaluate

---

## Performance Testing

### Load Test: 10+ Concurrent Players

1. Install script on multiple devices/browsers:
   - Desktop Chrome
   - Desktop Firefox
   - Mobile Safari
   - Mobile Chrome

2. All devices join same game simultaneously
3. Monitor server logs for Socket.IO performance
4. Check for:
   - Connection drops
   - Answer submission delays
   - State sync issues
   - Memory leaks

**Expected:** Server should handle 10+ concurrent players smoothly

---

## Coverage Checklist

Before marking testing complete, verify:

- [ ] Single player full playthrough (20 rounds)
- [ ] Multi-player game (2-4 players)
- [ ] TV display updates correctly
- [ ] Player join/leave handling
- [ ] Answer submission validation
- [ ] Scoreboard accuracy
- [ ] Lives/elimination logic
- [ ] Round progression
- [ ] Game end state
- [ ] Browser cache clearing works
- [ ] Production deployment matches localhost behavior
- [ ] No console errors during full playthrough
- [ ] Control panel toggles work
- [ ] Console API functions work

---

## Next Steps

After successful Tampermonkey testing:

1. **Run Playwright Tests:**
   ```bash
   cd web-app
   npx playwright test tests/production.trivia.test.js --project=chromium
   ```

2. **Deploy to Production:**
   ```bash
   git add .
   git commit -m "Add automated testing userscript"
   git push
   ```

3. **Verify on Render:**
   - Check deployment logs
   - Test with Tampermonkey on production URL
   - Monitor error logs

4. **Share with QA Team:**
   - Provide installation instructions
   - Share this testing guide
   - Set up regular test runs

---

## Reporting Issues

If you encounter bugs during testing:

1. **Capture Console Logs:**
   - Open DevTools (F12)
   - Copy all `[AUTO-TESTER]` logs
   - Screenshot the control panel

2. **Note the State:**
   - What screen were you on?
   - What action triggered the bug?
   - Can you reproduce it?

3. **Check Network Tab:**
   - F12 → Network → WS (WebSocket)
   - Look for failed Socket.IO messages
   - Check for "Invalid payload" responses

4. **Report Format:**
   ```
   Bug: Bot not answering questions after round 5

   Steps to Reproduce:
   1. Load production URL
   2. Let bot complete rounds 1-5
   3. On round 6, bot stops answering

   Expected: Bot answers all 20 rounds
   Actual: Bot stops after round 5

   Console Logs: [paste logs]
   Screenshot: [attach image]
   ```

---

## Advanced Usage

### Custom Player Names
```javascript
// Set custom name before joining
window.triviaAutoTester.config.PLAYER_NAME = "QA_Bot_001"
```

### Slower Answer Speed (for debugging)
```javascript
// Wait 5 seconds before answering
window.triviaAutoTester.config.ANSWER_DELAY = 5000
```

### Semi-Automated Testing
```javascript
// Turn off auto-answer to manually verify questions
window.triviaAutoTester.config.AUTO_ANSWER = false

// Manually trigger answers when ready
window.triviaAutoTester.forceAnswer()
```

---

## Summary

The Tampermonkey auto-tester provides:
- **Instant testing** - No need to manually click through games
- **Multi-player simulation** - Open multiple tabs for concurrent testing
- **Visual feedback** - Control panel shows real-time progress
- **Console control** - Manually trigger actions for debugging
- **Flexible configuration** - Toggle features on/off during testing

**Best Practice:** Combine Tampermonkey testing with Playwright tests for comprehensive coverage.
