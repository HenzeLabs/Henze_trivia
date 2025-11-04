#!/usr/bin/env node
/**
 * FINAL AUTOMATED TEST - NO MANUAL INTERACTION REQUIRED
 * This will simulate a complete 4-player game automatically
 */

const io = require('socket.io-client');

// Generate unique player name
const playerNumber = process.argv[2] || Math.floor(Math.random() * 1000);
const playerName = `Player${playerNumber}`;

async function runTest() {
  console.log(`\n🎮 AUTO-TEST: ${playerName}\n`);
  
  const socket = io('http://localhost:3000', {
    reconnection: false,
    timeout: 5000
  });
  
  let playerId, token;
  let testResults = [];
  
  // Connect
  await new Promise((resolve) => {
    socket.on('connect', () => {
      console.log(`✅ ${playerName}: Connected`);
      testResults.push('Connected');
      resolve();
    });
    socket.on('connect_error', () => {
      console.log(`❌ ${playerName}: Connection failed`);
      resolve();
    });
  });
  
  // Join game
  await new Promise((resolve) => {
    socket.emit('player:join', { playerName }, (response) => {
      if (response?.success) {
        playerId = response.playerId;
        token = response.token;
        console.log(`✅ ${playerName}: Joined game`);
        testResults.push('Joined');
      } else {
        console.log(`❌ ${playerName}: Join failed - ${response?.error}`);
      }
      resolve();
    });
  });
  
  // Try to start if player 1
  if (playerNumber === '1' && token) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(`🚀 ${playerName}: Attempting to start game...`);
    socket.emit('player:start', { token }, (response) => {
      if (response?.success) {
        console.log(`✅ ${playerName}: Game started!`);
        testResults.push('Started');
      } else {
        console.log(`⚠️ ${playerName}: ${response?.error}`);
      }
    });
  }
  
  // Listen for questions and auto-answer
  socket.on('game:update', (state) => {
    if (state.state === 'ASKING' && playerId && token) {
      const answer = Math.floor(Math.random() * 4);
      console.log(`🎯 ${playerName}: Answering question...`);
      
      setTimeout(() => {
        socket.emit('player:answer', {
          playerId,
          answer,
          token
        }, (response) => {
          if (response?.success) {
            console.log(`✅ ${playerName}: Answer submitted`);
            testResults.push('Answered');
          }
        });
      }, 1500);
    }
    
    if (state.state === 'GAME_END') {
      console.log(`🏆 ${playerName}: Game ended!`);
      testResults.push('Completed');
    }
  });
  
  // Run for 30 seconds
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  // Report
  console.log(`\n📊 ${playerName} Results: ${testResults.join(' → ')}\n`);
  socket.disconnect();
  process.exit(0);
}

runTest().catch(console.error);