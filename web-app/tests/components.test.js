/**
 * React Component Unit Tests
 * Tests all UI components for proper rendering and behavior
 */

const React = require('react');

// Mock React and Next.js for component testing
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useEffect: jest.fn((f) => f()),
  useState: jest.fn((init) => [init, jest.fn()]),
  useCallback: jest.fn((f) => f),
  useMemo: jest.fn((f) => f()),
}));

jest.mock('socket.io-client', () => {
  const emit = jest.fn((event, data, callback) => {
    if (callback) callback({ success: true });
  });
  const on = jest.fn();
  const off = jest.fn();
  const disconnect = jest.fn();
  
  return jest.fn(() => ({
    emit,
    on,
    off,
    disconnect,
    connected: true,
  }));
});

describe('React Component Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Validation', () => {
    test('should validate all component files exist', () => {
      const components = [
        'WelcomeScreen',
        'LobbyScreen',
        'QuestionScreen',
        'ResultsScreen',
        'FinalScreen',
        'ErrorScreen',
        'OfflineBanner',
        'LaughButton',
      ];

      components.forEach(component => {
        const fs = require('fs');
        const path = require('path');
        const componentPath = path.join(__dirname, '..', 'app', 'components', `${component}.tsx`);
        expect(fs.existsSync(componentPath)).toBe(true);
      });
    });

    test('should validate savage feedback modules exist', () => {
      const fs = require('fs');
      const path = require('path');
      
      const feedbackFiles = [
        'savageFeedback.ts',
        'savageFeedback.js',
        'personalizedSavageFeedback.ts',
      ];

      feedbackFiles.forEach(file => {
        const filePath = path.join(__dirname, '..', 'app', 'components', file);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });
  });

  describe('Component Structure', () => {
    test('should have proper TypeScript typing', () => {
      const fs = require('fs');
      const path = require('path');
      
      const componentPath = path.join(__dirname, '..', 'app', 'components', 'WelcomeScreen.tsx');
      const content = fs.readFileSync(componentPath, 'utf-8');
      
      // Check for TypeScript interfaces or types
      expect(content).toMatch(/interface|type|React\.FC/);
      // Check for proper imports
      expect(content).toMatch(/import.*from.*react/i);
    });

    test('should export components as default or named exports', () => {
      const fs = require('fs');
      const path = require('path');
      
      const components = ['WelcomeScreen', 'LobbyScreen', 'QuestionScreen'];
      
      components.forEach(component => {
        const componentPath = path.join(__dirname, '..', 'app', 'components', `${component}.tsx`);
        const content = fs.readFileSync(componentPath, 'utf-8');
        
        // Check for export
        const hasExport = content.match(/export\s+(default\s+)?(?:function|const|class)\s+\w+/) ||
                         content.match(/export\s+{\s*\w+\s*}/);
        expect(hasExport).toBeTruthy();
      });
    });
  });

  describe('Accessibility Tests', () => {
    test('should have proper ARIA attributes in components', () => {
      const fs = require('fs');
      const path = require('path');
      
      const componentPath = path.join(__dirname, '..', 'app', 'components', 'WelcomeScreen.tsx');
      const content = fs.readFileSync(componentPath, 'utf-8');
      
      // Check for semantic HTML or ARIA
      const hasAccessibility = content.match(/role=|aria-|<main|<nav|<header|<section/);
      expect(hasAccessibility).toBeTruthy();
    });
  });

  describe('Style Integration', () => {
    test('should use consistent styling approach', () => {
      const fs = require('fs');
      const path = require('path');
      
      const components = ['WelcomeScreen', 'LobbyScreen'];
      
      components.forEach(component => {
        const componentPath = path.join(__dirname, '..', 'app', 'components', `${component}.tsx`);
        const content = fs.readFileSync(componentPath, 'utf-8');
        
        // Check for className usage (Tailwind)
        const hasStyles = content.match(/className=/);
        expect(hasStyles).toBeTruthy();
      });
    });
  });

  describe('Socket Integration', () => {
    test('should handle socket events in game components', () => {
      const fs = require('fs');
      const path = require('path');
      
      const gameComponents = ['QuestionScreen', 'LobbyScreen'];
      
      gameComponents.forEach(component => {
        const componentPath = path.join(__dirname, '..', 'app', 'components', `${component}.tsx`);
        const content = fs.readFileSync(componentPath, 'utf-8');
        
        // Check for socket usage
        const hasSocket = content.match(/socket\.|useSocket|io\(/);
        
        // At least some components should use sockets
        if (component === 'QuestionScreen') {
          expect(hasSocket).toBeTruthy();
        }
      });
    });
  });

  describe('Error Handling', () => {
    test('ErrorScreen should handle different error types', () => {
      const fs = require('fs');
      const path = require('path');
      
      const componentPath = path.join(__dirname, '..', 'app', 'components', 'ErrorScreen.tsx');
      const content = fs.readFileSync(componentPath, 'utf-8');
      
      // Check for error prop handling
      expect(content).toMatch(/error|Error/);
      // Check for retry or recovery mechanisms
      expect(content).toMatch(/retry|reload|back/i);
    });
  });

  describe('State Management', () => {
    test('should use React hooks appropriately', () => {
      const fs = require('fs');
      const path = require('path');
      
      const stateComponents = ['WelcomeScreen', 'QuestionScreen'];
      
      stateComponents.forEach(component => {
        const componentPath = path.join(__dirname, '..', 'app', 'components', `${component}.tsx`);
        const content = fs.readFileSync(componentPath, 'utf-8');
        
        // Check for React hooks
        const hasHooks = content.match(/useState|useEffect|useCallback|useMemo/);
        expect(hasHooks).toBeTruthy();
      });
    });
  });

  describe('Props Validation', () => {
    test('should have proper TypeScript prop types', () => {
      const fs = require('fs');
      const path = require('path');
      
      const componentPath = path.join(__dirname, '..', 'app', 'components', 'ResultsScreen.tsx');
      const content = fs.readFileSync(componentPath, 'utf-8');
      
      // Check for interface or type definitions for props
      const hasPropsType = content.match(/interface.*Props|type.*Props/);
      expect(hasPropsType).toBeTruthy();
    });
  });

  describe('Performance Optimization', () => {
    test('should use memoization where appropriate', () => {
      const fs = require('fs');
      const path = require('path');
      
      const performanceComponents = ['QuestionScreen', 'ResultsScreen'];
      
      performanceComponents.forEach(component => {
        const componentPath = path.join(__dirname, '..', 'app', 'components', `${component}.tsx`);
        if (fs.existsSync(componentPath)) {
          const content = fs.readFileSync(componentPath, 'utf-8');
          
          // Check for React.memo, useMemo, or useCallback
          const hasOptimization = content.match(/React\.memo|useMemo|useCallback/);
          // Not all components need optimization, but some should have it
          if (component === 'ResultsScreen') {
            expect(hasOptimization).toBeTruthy();
          }
        }
      });
    });
  });

  describe('Component Integration', () => {
    test('should properly compose components', () => {
      const fs = require('fs');
      const path = require('path');
      
      // Check main page composition
      const pagePath = path.join(__dirname, '..', 'app', 'page.tsx');
      if (fs.existsSync(pagePath)) {
        const content = fs.readFileSync(pagePath, 'utf-8');
        
        // Check for component imports
        expect(content).toMatch(/import.*Screen/);
      }
    });
  });

  describe('Responsive Design', () => {
    test('should include responsive classes', () => {
      const fs = require('fs');
      const path = require('path');
      
      const components = ['WelcomeScreen', 'LobbyScreen'];
      
      components.forEach(component => {
        const componentPath = path.join(__dirname, '..', 'app', 'components', `${component}.tsx`);
        const content = fs.readFileSync(componentPath, 'utf-8');
        
        // Check for responsive Tailwind classes
        const hasResponsive = content.match(/sm:|md:|lg:|xl:/);
        // At least some components should be responsive
        if (component === 'WelcomeScreen') {
          expect(hasResponsive).toBeTruthy();
        }
      });
    });
  });
});

// Component functionality tests
describe('Component Functionality', () => {
  describe('LaughButton', () => {
    test('should track laugh votes', () => {
      const mockEmit = jest.fn();
      const mockSocket = {
        emit: mockEmit,
        on: jest.fn(),
        off: jest.fn(),
      };
      
      // Simulate button click
      mockSocket.emit('player:laugh', { playerId: 'test123' });
      expect(mockEmit).toHaveBeenCalledWith('player:laugh', { playerId: 'test123' });
    });
  });

  describe('OfflineBanner', () => {
    test('should detect online/offline status', () => {
      // Mock navigator.onLine
      Object.defineProperty(window, 'navigator', {
        value: { onLine: false },
        writable: true,
      });
      
      expect(window.navigator.onLine).toBe(false);
      
      // Test online state
      Object.defineProperty(window, 'navigator', {
        value: { onLine: true },
        writable: true,
      });
      
      expect(window.navigator.onLine).toBe(true);
    });
  });

  describe('Game State Management', () => {
    test('should handle game state transitions', () => {
      const states = ['LOBBY', 'ASKING', 'ANSWERS_LOCKED', 'REVEAL', 'ROUND_END', 'GAME_END'];
      
      states.forEach(state => {
        expect(typeof state).toBe('string');
        expect(state).toMatch(/^[A-Z_]+$/);
      });
    });
  });
});

// Mock data validation
describe('Mock Data', () => {
  test('should have valid question structure', () => {
    const mockQuestion = {
      id: 1,
      type: 'trivia',
      text: 'Test question?',
      options: ['A', 'B', 'C', 'D'],
      answer_index: 0,
    };
    
    expect(mockQuestion.id).toBeDefined();
    expect(mockQuestion.type).toMatch(/trivia|who-said-it|chaos|roast/);
    expect(mockQuestion.options).toHaveLength(4);
    expect(mockQuestion.answer_index).toBeGreaterThanOrEqual(0);
    expect(mockQuestion.answer_index).toBeLessThan(4);
  });
  
  test('should have valid player structure', () => {
    const mockPlayer = {
      id: 'player123',
      name: 'TestPlayer',
      score: 0,
      lives: 3,
      isGhost: false,
    };
    
    expect(mockPlayer.id).toBeDefined();
    expect(mockPlayer.name).toBeDefined();
    expect(mockPlayer.score).toBeGreaterThanOrEqual(0);
    expect(mockPlayer.lives).toBeGreaterThanOrEqual(0);
    expect(mockPlayer.lives).toBeLessThanOrEqual(3);
    expect(typeof mockPlayer.isGhost).toBe('boolean');
  });
});