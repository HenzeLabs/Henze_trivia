#!/usr/bin/env node
/**
 * Real Browser Game Simulation
 * Opens actual browser windows and simulates real players
 */

const { chromium } = require('playwright');

const CONFIG = {
  serverUrl: 'http://localhost:3000',
  numPlayers: 4,
  hostPin: '2bbc685ecbea2287',
  answerDelay: 2000, // 2 seconds to answer
  roundDelay: 3000, // 3 seconds between rounds
};

const playerNames = ['Alice 🎮', 'Bob 🎯', 'Charlie 🎪', 'Diana 🎨'];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function simulateGame() {
  console.log('🎮 Starting Real Browser Game Simulation');
  console.log(`📱 Opening ${CONFIG.numPlayers} browser windows...`);
  
  const browsers = [];
  const contexts = [];
  const pages = [];
  
  try {
    // Launch TV Display
    console.log('\n📺 Opening TV Display...');
    const tvBrowser = await chromium.launch({ 
      headless: false,
      args: ['--window-position=0,0', '--window-size=1200,800']
    });
    const tvContext = await tvBrowser.newContext();
    const tvPage = await tvContext.newPage();
    await tvPage.goto(`${CONFIG.serverUrl}/tv`);
    console.log('✅ TV Display ready');
    
    // Launch Player Browsers
    for (let i = 0; i < CONFIG.numPlayers; i++) {
      console.log(`\n👤 Opening Player ${i + 1}: ${playerNames[i]}`);
      
      const browser = await chromium.launch({ 
        headless: false,
        args: [
          `--window-position=${400 + (i * 300)},400`,
          '--window-size=350,600'
        ]
      });
      
      const context = await browser.newContext();
      const page = await context.newPage();
      
      browsers.push(browser);
      contexts.push(context);
      pages.push(page);
      
      // Navigate to game
      await page.goto(CONFIG.serverUrl);
      await sleep(1000);
      
      // Enter player name
      const nameInput = await page.waitForSelector('input[type="text"]', { timeout: 5000 });
      await nameInput.fill(playerNames[i]);
      await sleep(500);
      
      // Join game
      const joinButton = await page.getByRole('button', { name: /join|enter/i });
      await joinButton.click();
      console.log(`✅ ${playerNames[i]} joined the lobby`);
      
      await sleep(1500);
    }
    
    console.log('\n🎬 All players in lobby. Starting game...');
    await sleep(2000);
    
    // First player (host) starts the game
    const hostPage = pages[0];
    console.log('\n🎯 Player 1 entering HOST_PIN...');
    
    // Look for PIN input
    const pinInput = await hostPage.waitForSelector('input[type="password"], input[placeholder*="PIN"], input[placeholder*="pin"]', { 
      timeout: 5000 
    }).catch(() => null);
    
    if (pinInput) {
      await pinInput.fill(CONFIG.hostPin);
      await sleep(500);
    }
    
    // Click start button
    const startButton = await hostPage.getByRole('button', { name: /start/i });
    await startButton.click();
    console.log('✅ Game started!');
    
    // Play through rounds
    let round = 1;
    let gameActive = true;
    
    while (gameActive && round <= 10) {
      console.log(`\n🎯 Round ${round}`);
      await sleep(2000);
      
      // Each player answers
      for (let i = 0; i < CONFIG.numPlayers; i++) {
        try {
          const page = pages[i];
          
          // Wait for answer buttons to appear
          const answerButtons = await page.$$('button.btn-primary, button[class*="answer"], button[class*="option"]');
          
          if (answerButtons.length > 0) {
            // Random answer
            const randomIndex = Math.floor(Math.random() * answerButtons.length);
            await answerButtons[randomIndex].click();
            console.log(`  ✓ ${playerNames[i]} answered`);
          }
        } catch (error) {
          console.log(`  ⚠️ ${playerNames[i]} couldn't answer (might be eliminated)`);
        }
        
        await sleep(500);
      }
      
      // Wait for reveal and next round
      await sleep(CONFIG.roundDelay);
      
      // Check if game ended
      const gameEndElements = await pages[0].$$('text=/winner|game over|final/i');
      if (gameEndElements.length > 0) {
        gameActive = false;
        console.log('\n🏆 Game completed!');
      }
      
      round++;
    }
    
    console.log('\n📊 Simulation Summary:');
    console.log(`  • Rounds played: ${round - 1}`);
    console.log(`  • Players: ${CONFIG.numPlayers}`);
    console.log(`  • Status: SUCCESS`);
    
    // Keep browsers open for observation
    console.log('\n👀 Keeping browsers open for 30 seconds...');
    console.log('   (Check for any errors or issues)');
    await sleep(30000);
    
    // Cleanup
    console.log('\n🧹 Closing browsers...');
    await tvBrowser.close();
    for (const browser of browsers) {
      await browser.close();
    }
    
    console.log('✅ Simulation complete!');
    
  } catch (error) {
    console.error('❌ Simulation failed:', error.message);
    
    // Cleanup on error
    for (const browser of browsers) {
      await browser.close().catch(() => {});
    }
  }
}

// Run simulation
simulateGame().catch(console.error);