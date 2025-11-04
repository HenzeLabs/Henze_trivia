// ==UserScript==
// @name         Trivia Murder Party - Auto Tester
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Automated testing script for full game playthrough
// @author       Claude Code
// @match        https://henze-trivia.onrender.com/*
// @match        http://localhost:3000/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log('[AUTO-TESTER] Script loaded');

    // Configuration
    const CONFIG = {
        AUTO_JOIN: true,
        AUTO_START: true,
        AUTO_ANSWER: true,
        ANSWER_DELAY: 1000, // ms to wait before auto-answering
        PLAYER_NAME: `AutoBot_${Date.now().toString().slice(-4)}`,
        LOG_PREFIX: '[AUTO-TESTER]'
    };

    // State tracking
    const state = {
        joined: false,
        gameStarted: false,
        questionsAnswered: 0,
        correctAnswers: 0,
        totalQuestions: 0
    };

    // Utility: Log with timestamp
    function log(message, data = null) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`${CONFIG.LOG_PREFIX} [${timestamp}] ${message}`, data || '');
    }

    // Utility: Wait for element to appear
    function waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                return resolve(element);
            }

            const observer = new MutationObserver(() => {
                const element = document.querySelector(selector);
                if (element) {
                    observer.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Timeout waiting for element: ${selector}`));
            }, timeout);
        });
    }

    // Utility: Click element safely
    function clickElement(element) {
        if (element && !element.disabled) {
            log(`Clicking element: ${element.textContent?.trim() || element.tagName}`);
            element.click();
            return true;
        }
        return false;
    }

    // Step 1: Auto-join the game
    async function autoJoin() {
        if (state.joined || !CONFIG.AUTO_JOIN) return;

        try {
            log('Attempting to join game...');

            // Check if already joined (in lobby)
            if (document.querySelector('text=Players in Lobby') ||
                document.querySelector('[class*="lobby"]')) {
                log('Already in lobby');
                state.joined = true;
                return;
            }

            // Look for join button
            const joinButton = Array.from(document.querySelectorAll('button'))
                .find(btn => btn.textContent.includes('JOIN'));

            if (joinButton && !joinButton.textContent.includes('JOINED')) {
                // Find and fill name input
                const nameInput = document.querySelector('input[type="text"]') ||
                                 document.querySelector('input[placeholder*="name" i]') ||
                                 document.querySelector('input[placeholder*="Name"]');

                if (nameInput) {
                    log(`Setting player name: ${CONFIG.PLAYER_NAME}`);
                    nameInput.value = CONFIG.PLAYER_NAME;
                    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
                    nameInput.dispatchEvent(new Event('change', { bubbles: true }));

                    // Wait a bit for validation
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

                if (clickElement(joinButton)) {
                    log('Join button clicked');
                    state.joined = true;

                    // Wait for lobby to load
                    await waitForElement('[class*="lobby"], button:contains("START")', 10000)
                        .then(() => log('Successfully joined lobby'))
                        .catch(() => log('Warning: Could not confirm lobby load'));
                }
            }
        } catch (error) {
            log('Error during auto-join:', error);
        }
    }

    // Step 2: Auto-start the game
    async function autoStart() {
        if (state.gameStarted || !CONFIG.AUTO_START || !state.joined) return;

        try {
            log('Looking for START GAME button...');

            const startButton = Array.from(document.querySelectorAll('button'))
                .find(btn => btn.textContent.includes('START GAME'));

            if (startButton && !startButton.disabled) {
                log('Starting game...');
                if (clickElement(startButton)) {
                    state.gameStarted = true;
                    log('Game started!');

                    // Wait for first question
                    await waitForElement('button[class*="btn-primary"]', 15000)
                        .then(() => log('First question loaded'))
                        .catch(() => log('Warning: Could not detect first question'));
                }
            }
        } catch (error) {
            log('Error during auto-start:', error);
        }
    }

    // Step 3: Auto-answer questions
    async function autoAnswer() {
        if (!CONFIG.AUTO_ANSWER || !state.gameStarted) return;

        try {
            // Find answer buttons (they have the btn-primary class)
            const answerButtons = Array.from(document.querySelectorAll('button.btn-primary'))
                .filter(btn => {
                    const text = btn.textContent;
                    return text.match(/^[A-D]\./) && !btn.disabled;
                });

            if (answerButtons.length === 4) {
                log(`Found ${answerButtons.length} answer options`);

                // Wait configured delay
                await new Promise(resolve => setTimeout(resolve, CONFIG.ANSWER_DELAY));

                // Pick a random answer
                const randomIndex = Math.floor(Math.random() * answerButtons.length);
                const selectedButton = answerButtons[randomIndex];
                const answerLetter = selectedButton.textContent.trim()[0];

                log(`Auto-selecting answer: ${answerLetter}`);

                if (clickElement(selectedButton)) {
                    state.questionsAnswered++;
                    log(`Questions answered: ${state.questionsAnswered}`);

                    // Check if answer was correct (we'll know after reveal)
                    setTimeout(() => {
                        const correctIndicator = document.querySelector('[class*="correct"], [style*="rgb(34, 197, 94)"]');
                        if (correctIndicator) {
                            state.correctAnswers++;
                            log(`✓ Correct! (${state.correctAnswers}/${state.questionsAnswered})`);
                        } else {
                            log(`✗ Wrong answer (${state.correctAnswers}/${state.questionsAnswered})`);
                        }
                    }, 3000);
                }
            }
        } catch (error) {
            log('Error during auto-answer:', error);
        }
    }

    // Main loop - check for actions every second
    async function mainLoop() {
        try {
            await autoJoin();
            await autoStart();
            await autoAnswer();
        } catch (error) {
            log('Error in main loop:', error);
        }

        // Schedule next check
        setTimeout(mainLoop, 1000);
    }

    // Add control panel to page
    function createControlPanel() {
        const panel = document.createElement('div');
        panel.id = 'auto-tester-panel';
        panel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.9);
            color: #0f0;
            padding: 15px;
            border: 2px solid #0f0;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            z-index: 999999;
            min-width: 200px;
        `;

        function updatePanel() {
            panel.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 10px; color: #0ff;">
                    🤖 AUTO-TESTER
                </div>
                <div>Name: ${CONFIG.PLAYER_NAME}</div>
                <div>Joined: ${state.joined ? '✓' : '✗'}</div>
                <div>Started: ${state.gameStarted ? '✓' : '✗'}</div>
                <div>Questions: ${state.questionsAnswered}</div>
                <div>Correct: ${state.correctAnswers}</div>
                <div style="margin-top: 10px;">
                    <button id="toggle-auto-join" style="margin: 2px; padding: 5px; font-size: 10px;">
                        Join: ${CONFIG.AUTO_JOIN ? 'ON' : 'OFF'}
                    </button>
                    <button id="toggle-auto-start" style="margin: 2px; padding: 5px; font-size: 10px;">
                        Start: ${CONFIG.AUTO_START ? 'ON' : 'OFF'}
                    </button>
                    <button id="toggle-auto-answer" style="margin: 2px; padding: 5px; font-size: 10px;">
                        Answer: ${CONFIG.AUTO_ANSWER ? 'ON' : 'OFF'}
                    </button>
                </div>
            `;

            // Re-attach event listeners
            document.getElementById('toggle-auto-join')?.addEventListener('click', () => {
                CONFIG.AUTO_JOIN = !CONFIG.AUTO_JOIN;
                updatePanel();
            });
            document.getElementById('toggle-auto-start')?.addEventListener('click', () => {
                CONFIG.AUTO_START = !CONFIG.AUTO_START;
                updatePanel();
            });
            document.getElementById('toggle-auto-answer')?.addEventListener('click', () => {
                CONFIG.AUTO_ANSWER = !CONFIG.AUTO_ANSWER;
                updatePanel();
            });
        }

        document.body.appendChild(panel);
        updatePanel();

        // Update panel every 2 seconds
        setInterval(updatePanel, 2000);
    }

    // Initialize
    log('Initializing Auto-Tester...');
    log('Configuration:', CONFIG);

    // Wait for page to be fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            createControlPanel();
            setTimeout(mainLoop, 2000);
        });
    } else {
        createControlPanel();
        setTimeout(mainLoop, 2000);
    }

    // Expose control functions to console
    window.triviaAutoTester = {
        state,
        config: CONFIG,
        forceJoin: autoJoin,
        forceStart: autoStart,
        forceAnswer: autoAnswer,
        getStats: () => ({
            questionsAnswered: state.questionsAnswered,
            correctAnswers: state.correctAnswers,
            accuracy: state.questionsAnswered > 0
                ? `${((state.correctAnswers / state.questionsAnswered) * 100).toFixed(1)}%`
                : 'N/A'
        })
    };

    log('Auto-Tester ready! Control panel added to top-right corner');
    log('Console API available: window.triviaAutoTester');

})();
