import { Game } from './game/Game.js';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('🛥️ LOGICAL - Miami Vice Edition loading...');
  
  const canvas = document.getElementById('game-canvas');
  const game = new Game(canvas);
  
  // Start button handler
  document.getElementById('start-btn').addEventListener('click', () => {
    document.getElementById('start-screen').classList.add('hidden');
    game.start();
  });
  
  // Retry button handler  
  document.getElementById('retry-btn').addEventListener('click', () => {
    document.getElementById('game-over').classList.add('hidden');
    game.restart();
  });
  
  // Next level button handler
  document.getElementById('next-btn').addEventListener('click', () => {
    document.getElementById('level-complete').classList.add('hidden');
    game.nextLevel();
  });
  
  // Also allow spacebar/enter to start
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'Enter') {
      const startScreen = document.getElementById('start-screen');
      const gameOver = document.getElementById('game-over');
      const levelComplete = document.getElementById('level-complete');
      
      if (!startScreen.classList.contains('hidden')) {
        startScreen.classList.add('hidden');
        game.start();
        e.preventDefault();
      } else if (!gameOver.classList.contains('hidden')) {
        gameOver.classList.add('hidden');
        game.restart();
        e.preventDefault();
      } else if (!levelComplete.classList.contains('hidden')) {
        levelComplete.classList.add('hidden');
        game.nextLevel();
        e.preventDefault();
      }
    }
  });
  
  // Initialize the game (but don't start gameplay yet)
  game.init();
});

