#!/usr/bin/env node
/**
 * Simple Automated Test - Validates core functionality
 */

const io = require('socket.io-client');

async function testGame() {
  console.log('\n🎮 SIMPLE AUTOMATED GAME TEST\n');
  console.log('This will automatically test your game without any manual interaction!\n');
  console.log('='*50 + '\n');
  
  const results = {
    serverConnection: false,
    playerJoin: false,
    gameStart: false,
    questionReceived: false,
    answerSubmitted: false,
    gameProgression: false
  };
  
  try {
    // Test 1: Connect to server
    console.log('📡 Test 1: Connecting to server...');
    const socket = io('http://localhost:3000', {
      reconnection: false,
      timeout: 5000
    });
    
    await new Promise((resolve, reject) => {
      socket.on('connect', () => {
        console.log('✅ Connected to server');
        results.serverConnection = true;
        resolve();
      });
      socket.on('connect_error', (err) => {
        console.log('❌ Connection failed:', err.message);
        reject(err);
      });
    });
    
    // Test 2: Join as player
    console.log('\n👤 Test 2: Joining game as "TestPlayer"...');
    await new Promise((resolve) => {
      socket.emit('player:join', { playerName: 'TestPlayer 🤖' }, (response) => {
        if (response && response.success) {
          console.log('✅ Joined successfully!');
          console.log(`   Player ID: ${response.playerId}`);
          console.log(`   Token: ${response.token?.slice(0, 10)}...`);
          results.playerJoin = true;
          results.playerId = response.playerId;
          results.token = response.token;
          resolve();
        } else {
          console.log('❌ Join failed:', response?.error);
          resolve();
        }
      });
    });
    
    // Test 3: Try to start game
    console.log('\n🚀 Test 3: Starting game...');
    await new Promise((resolve) => {
      socket.emit('player:start', { 
        token: results.token 
      }, (response) => {
        if (response && response.success) {
          console.log('✅ Game started!');
          results.gameStart = true;
        } else {
          console.log('⚠️ Start failed (might need more players):', response?.error);
        }
        resolve();
      });
    });
    
    // Test 4: Listen for game updates
    console.log('\n📊 Test 4: Monitoring game state...');
    let updateCount = 0;
    socket.on('game:update', (state) => {
      updateCount++;
      if (updateCount === 1) {
        console.log('✅ Receiving game updates');
        console.log(`   Current state: ${state.state}`);
        console.log(`   Players: ${state.players?.length || 0}`);
        results.gameProgression = true;
      }
      
      if (state.state === 'ASKING' && !results.questionReceived) {
        console.log('✅ Question received!');
        results.questionReceived = true;
        
        // Auto-answer
        setTimeout(() => {
          console.log('\n🎯 Test 5: Submitting answer...');
          socket.emit('player:answer', {
            playerId: results.playerId,
            answer: 0,
            token: results.token
          }, (response) => {
            if (response && response.success) {
              console.log('✅ Answer submitted successfully');
              results.answerSubmitted = true;
            } else {
              console.log('⚠️ Answer failed:', response?.error);
            }
          });
        }, 1000);
      }
    });
    
    // Wait a bit for updates
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Disconnect
    socket.disconnect();
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
  
  // Final Report
  console.log('\n' + '='*50);
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='*50 + '\n');
  
  const tests = [
    { name: 'Server Connection', pass: results.serverConnection },
    { name: 'Player Join', pass: results.playerJoin },
    { name: 'Game Start', pass: results.gameStart },
    { name: 'Game Updates', pass: results.gameProgression },
    { name: 'Question Received', pass: results.questionReceived },
    { name: 'Answer Submitted', pass: results.answerSubmitted }
  ];
  
  tests.forEach(test => {
    const icon = test.pass ? '✅' : '❌';
    console.log(`${icon} ${test.name}: ${test.pass ? 'PASSED' : 'FAILED'}`);
  });
  
  const passedCount = tests.filter(t => t.pass).length;
  const totalCount = tests.length;
  const percentage = Math.round((passedCount / totalCount) * 100);
  
  console.log('\n' + '='*50);
  console.log(`OVERALL: ${passedCount}/${totalCount} tests passed (${percentage}%)`);
  
  if (percentage === 100) {
    console.log('🎉 PERFECT! Your game is working flawlessly!');
  } else if (percentage >= 80) {
    console.log('✅ GOOD! Core functionality is working well.');
  } else if (percentage >= 50) {
    console.log('⚠️ PARTIAL SUCCESS. Some features need attention.');
  } else {
    console.log('❌ NEEDS WORK. Several issues detected.');
  }
  
  console.log('='*50 + '\n');
  
  if (!results.gameStart) {
    console.log('💡 TIP: The game might need multiple players to start.');
    console.log('        Try running this test multiple times in parallel!');
  }
  
  console.log('\n✅ Automated test complete!\n');
  process.exit(0);
}

// Run test
testGame().catch(console.error);