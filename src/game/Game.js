import * as THREE from 'three';
import { SceneManager } from './SceneManager.js';
import { Wheel } from '../entities/Wheel.js';
import { Ball } from '../entities/Ball.js';
import { Pipe } from '../entities/Pipe.js';
import { Bin } from '../entities/Bin.js';
import { InputSystem } from '../systems/InputSystem.js';
import { LevelManager } from '../systems/LevelManager.js';
import { 
  BALL_COLORS, 
  BALL_COLOR_NAMES,
  GRID_SPACING,
  DIRECTIONS,
  TOP_TRACK_SPEED,
  TRACK_TIMER,
  SPAWN_DELAY,
  AUTO_FLOW_DELAY
} from '../utils/constants.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.sceneManager = null;
    this.inputSystem = null;
    this.levelManager = null;
    
    // Entities
    this.wheels = [];
    this.pipes = [];
    this.balls = [];
    this.bins = [];
    
    // Top track system
    this.topTrack = null;
    this.topTrackBall = null;
    this.topTrackMesh = null;
    
    // Game state
    this.isRunning = false;
    this.isPaused = false;
    this.selectedWheelIndex = 0;
    this.level = 1;
    
    // Ball queue
    this.ballQueue = [];
    this.colorCount = 2;
    
    // AUTO-FLOW SYSTEM! 🔄
    this.autoFlowTimer = 0;
    this.autoFlowInterval = AUTO_FLOW_DELAY / 1000; // Convert to seconds
    
    // Countdown timer
    this.trackTimer = TRACK_TIMER;
    this.trackTimerMax = TRACK_TIMER;
    this.isTimerActive = false;
    
    // Level timer
    this.levelStartTime = 0;
    this.levelTime = 0;
    this.bestTimes = this.loadBestTimes();
    
    // Animation
    this.clock = new THREE.Clock();
    this.lastTime = 0;
  }
  
  loadBestTimes() {
    try {
      const saved = localStorage.getItem('logical-best-times');
      return saved ? JSON.parse(saved) : {};
    } catch (e) { return {}; }
  }
  
  saveBestTimes() {
    try {
      localStorage.setItem('logical-best-times', JSON.stringify(this.bestTimes));
    } catch (e) {}
  }
  
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  }
  
  init() {
    this.sceneManager = new SceneManager(this.canvas);
    this.sceneManager.init();
    
    this.inputSystem = new InputSystem(this);
    this.levelManager = new LevelManager();
    
    this.loadLevel(1);
    this.animate();
    
    console.log('⚙️ STEAMPUNK LOGICAL initialized!');
  }
  
  loadLevel(levelNum) {
    this.level = levelNum;
    this.clearLevel();
    
    const levelData = this.levelManager.getLevel(levelNum);
    this.colorCount = levelData.colorCount || 2;
    
    // Create wheels
    levelData.wheels.forEach((wheelData, index) => {
      const wheel = new Wheel(
        wheelData.x * GRID_SPACING, 
        wheelData.z * GRID_SPACING,
        index,
        wheelData.requiredColor || null
      );
      wheel.addToScene(this.sceneManager.scene);
      this.wheels.push(wheel);
    });
    
    // Create bins
    if (levelData.bins) {
      levelData.bins.forEach((binData) => {
        const bin = new Bin(
          binData.x * GRID_SPACING,
          binData.z * GRID_SPACING,
          binData.direction,
          binData.acceptedColors
        );
        bin.addToScene(this.sceneManager.scene);
        this.bins.push(bin);
      });
    }
    
    // Create pipes
    levelData.pipes.forEach(pipeData => {
      const pipe = new Pipe(
        pipeData.startX * GRID_SPACING,
        pipeData.startZ * GRID_SPACING,
        pipeData.endX * GRID_SPACING,
        pipeData.endZ * GRID_SPACING,
        false
      );
      pipe.addToScene(this.sceneManager.scene);
      this.pipes.push(pipe);
      
      if (pipeData.startWheelIndex !== undefined) {
        const wheel = this.wheels[pipeData.startWheelIndex];
        pipe.connectToWheel(wheel, true, pipeData.startDirection);
      }
      
      if (pipeData.endWheelIndex !== undefined) {
        const wheel = this.wheels[pipeData.endWheelIndex];
        pipe.connectToWheel(wheel, false, pipeData.endDirection);
      }
      
      if (pipeData.endBinIndex !== undefined) {
        const bin = this.bins[pipeData.endBinIndex];
        pipe.connectToBin(bin, pipeData.endDirection);
      }
    });
    
    // Create top track
    if (levelData.topTrack) {
      this.topTrack = {
        startX: levelData.topTrack.startX * GRID_SPACING,
        endX: levelData.topTrack.endX * GRID_SPACING,
        z: levelData.topTrack.z * GRID_SPACING,
        wheelConnections: levelData.topTrack.wheelConnections
      };
      this.createTopTrackMesh();
    }
    
    this.generateBallQueue(50);
    this.updateUI();
    this.selectWheel(0);
    
    console.log(`Level ${levelNum} loaded with AUTO-FLOW enabled!`);
  }
  
  createTopTrackMesh() {
    const trackLength = this.topTrack.endX - this.topTrack.startX;
    
    // Main track - bronze pipe
    const trackGeom = new THREE.BoxGeometry(trackLength, 0.4, 1.0);
    const trackMat = new THREE.MeshBasicMaterial({ color: 0xb87333 });
    const track = new THREE.Mesh(trackGeom, trackMat);
    track.position.set(
      (this.topTrack.startX + this.topTrack.endX) / 2,
      0.2,
      this.topTrack.z
    );
    this.sceneManager.scene.add(track);
    this.topTrackMesh = track;
    
    // Gold trim
    const trimGeom = new THREE.BoxGeometry(trackLength + 0.2, 0.1, 1.1);
    const trimMat = new THREE.MeshBasicMaterial({ color: 0xd4a84b });
    const trim = new THREE.Mesh(trimGeom, trimMat);
    trim.position.copy(track.position);
    trim.position.y = 0.35;
    this.sceneManager.scene.add(trim);
    
    // Connection lines to wheels
    this.topTrack.wheelConnections.forEach(wheelIndex => {
      const wheel = this.wheels[wheelIndex];
      const connLen = Math.abs(wheel.z - this.topTrack.z);
      const connGeom = new THREE.BoxGeometry(0.5, 0.3, connLen);
      const connMat = new THREE.MeshBasicMaterial({ color: 0xcd7f32, transparent: true, opacity: 0.7 });
      const conn = new THREE.Mesh(connGeom, connMat);
      conn.position.set(wheel.x, 0.15, (this.topTrack.z + wheel.z) / 2);
      this.sceneManager.scene.add(conn);
    });
  }
  
  generateBallQueue(count) {
    this.ballQueue = [];
    const colors = BALL_COLOR_NAMES.slice(0, this.colorCount);
    for (let i = 0; i < count; i++) {
      this.ballQueue.push(colors[Math.floor(Math.random() * colors.length)]);
    }
  }
  
  clearLevel() {
    this.wheels.forEach(w => w.removeFromScene(this.sceneManager.scene));
    this.wheels = [];
    this.pipes.forEach(p => p.removeFromScene(this.sceneManager.scene));
    this.pipes = [];
    this.balls.forEach(b => b.removeFromScene(this.sceneManager.scene));
    this.balls = [];
    this.bins.forEach(b => b.removeFromScene(this.sceneManager.scene));
    this.bins = [];
    
    if (this.topTrackBall) {
      this.topTrackBall.removeFromScene(this.sceneManager.scene);
      this.topTrackBall = null;
    }
    this.topTrack = null;
    this.ballQueue = [];
  }
  
  start() {
    this.isRunning = true;
    this.clock.start();
    this.lastTime = this.clock.getElapsedTime();
    this.levelStartTime = this.clock.getElapsedTime();
    this.levelTime = 0;
    
    this.trackTimer = this.trackTimerMax;
    this.isTimerActive = false;
    this.autoFlowTimer = 0;
    
    this.spawnTopTrackBall();
    
    console.log('⚙️ Game started with AUTO-FLOW!');
  }
  
  restart() {
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('level-complete').classList.add('hidden');
    this.loadLevel(this.level);
    this.start();
  }
  
  nextLevel() {
    document.getElementById('level-complete').classList.add('hidden');
    this.level++;
    this.loadLevel(this.level);
    this.start();
  }
  
  pause() { this.isPaused = !this.isPaused; }
  
  // ============ TOP TRACK ============
  
  spawnTopTrackBall() {
    if (!this.topTrack || this.ballQueue.length === 0) return;
    if (this.topTrackBall) return;
    
    const colorName = this.ballQueue.shift();
    const color = BALL_COLORS[colorName];
    
    const ball = new Ball(this.topTrack.startX, this.topTrack.z, color, colorName);
    ball.addToScene(this.sceneManager.scene);
    ball.mesh.position.y = 0.6;
    
    this.topTrackBall = ball;
    this.topTrackBall.trackProgress = 0;
    
    this.trackTimer = this.trackTimerMax;
    this.isTimerActive = true;
    
    console.log(`⚙️ New ball on track: ${colorName}`);
    this.updateNextBallUI();
  }
  
  updateTopTrackBall(deltaTime) {
    if (!this.topTrackBall || !this.topTrack) return;
    
    const trackLength = this.topTrack.endX - this.topTrack.startX;
    const speed = TOP_TRACK_SPEED / trackLength;
    
    this.topTrackBall.trackProgress += speed * deltaTime;
    
    const x = this.topTrack.startX + this.topTrackBall.trackProgress * trackLength;
    this.topTrackBall.mesh.position.x = x;
    this.topTrackBall.mesh.position.z = this.topTrack.z;
    this.topTrackBall.mesh.position.y = 0.6;
    
    // Check if passing over any wheel
    this.topTrack.wheelConnections.forEach(wheelIndex => {
      const wheel = this.wheels[wheelIndex];
      if (Math.abs(x - wheel.x) < 0.5) {
        if (wheel.canAcceptBallFromWorld(DIRECTIONS.TOP)) {
          this.dropBallIntoWheel(wheel);
        }
      }
    });
    
    // Ball reached end
    if (this.topTrackBall && this.topTrackBall.trackProgress >= 1) {
      console.log('Ball reached end of track');
      this.topTrackBall.removeFromScene(this.sceneManager.scene);
      this.topTrackBall = null;
      setTimeout(() => {
        if (this.isRunning) this.spawnTopTrackBall();
      }, SPAWN_DELAY);
    }
  }
  
  dropBallIntoWheel(wheel) {
    if (!this.topTrackBall) return;
    
    const ball = this.topTrackBall;
    this.topTrackBall = null;
    
    wheel.placeBallInSlot(DIRECTIONS.TOP, ball);
    ball.isMoving = false;
    
    console.log(`🎯 Ball dropped into wheel ${wheel.index}!`);
    
    this.trackTimer = this.trackTimerMax;
    this.isTimerActive = false;
    
    setTimeout(() => this.checkMatch(wheel), 100);
    setTimeout(() => {
      if (this.isRunning && !this.topTrackBall) this.spawnTopTrackBall();
    }, SPAWN_DELAY);
  }
  
  // ============ AUTO-FLOW MECHANIC! 🔄 ============
  // Balls automatically move to empty slots on connected wheels!
  // Players "park" balls by rotating to face non-track directions!
  
  checkAutoFlow() {
    // Find all balls that could flow
    let flowHappened = false;
    
    for (const wheel of this.wheels) {
      const flowableBalls = wheel.getBallsReadyToFlow(this);
      
      if (flowableBalls.length > 0) {
        // Flow the first available ball
        const { ball, worldDir, pipe, targetWheel, targetDir } = flowableBalls[0];
        
        // Remove from current wheel
        wheel.removeBallFromSlot(worldDir);
        
        // Start traveling on pipe
        const exitFromStart = (pipe.startWheel === wheel);
        ball.startOnPipe(pipe, exitFromStart);
        
        if (!this.balls.includes(ball)) {
          this.balls.push(ball);
        }
        
        console.log(`🔄 AUTO-FLOW: Ball moving from wheel ${wheel.index} to wheel ${targetWheel.index}`);
        flowHappened = true;
        break; // Only one flow per check to prevent chaos
      }
    }
    
    return flowHappened;
  }
  
  // ============ WHEEL INTERACTION ============
  
  selectWheel(index) {
    if (index < 0) index = this.wheels.length - 1;
    if (index >= this.wheels.length) index = 0;
    
    if (this.wheels[this.selectedWheelIndex]) {
      this.wheels[this.selectedWheelIndex].setSelected(false);
    }
    this.selectedWheelIndex = index;
    if (this.wheels[this.selectedWheelIndex]) {
      this.wheels[this.selectedWheelIndex].setSelected(true);
    }
  }
  
  rotateSelectedWheel() {
    const wheel = this.wheels[this.selectedWheelIndex];
    if (wheel) wheel.rotate(true);
  }
  
  navigateWheel(direction) {
    const current = this.wheels[this.selectedWheelIndex];
    if (!current) return;
    
    let bestWheel = null;
    let bestDistance = Infinity;
    
    for (let i = 0; i < this.wheels.length; i++) {
      if (i === this.selectedWheelIndex) continue;
      const wheel = this.wheels[i];
      const dx = wheel.x - current.x;
      const dz = wheel.z - current.z;
      
      let isInDirection = false;
      switch (direction) {
        case 'up': isInDirection = dz < -0.5; break;
        case 'down': isInDirection = dz > 0.5; break;
        case 'left': isInDirection = dx < -0.5; break;
        case 'right': isInDirection = dx > 0.5; break;
      }
      
      if (isInDirection) {
        const distance = Math.sqrt(dx * dx + dz * dz);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestWheel = i;
        }
      }
    }
    
    if (bestWheel !== null) this.selectWheel(bestWheel);
  }
  
  ejectBallFromWheel(wheel, direction) {
    const ball = wheel.getBallInSlot(direction);
    if (!ball) {
      console.log('No ball in that direction');
      return;
    }
    
    const pipe = wheel.getPipeInDirection(direction);
    if (!pipe) {
      console.log('No pipe in that direction - ball is parked!');
      return;
    }
    
    console.log(`⚙️ Ejecting ${ball.colorName} ball!`);
    
    wheel.removeBallFromSlot(direction);
    const exitFromStart = (pipe.startWheel === wheel);
    ball.startOnPipe(pipe, exitFromStart);
    
    if (!this.balls.includes(ball)) {
      this.balls.push(ball);
    }
  }
  
  // ============ BALL ARRIVAL ============
  
  handleBallArrival(ball, wheel, direction, fromPipe, arrivedAtStart) {
    if (wheel.canAcceptBallFromWorld(direction)) {
      fromPipe.removeBall(ball);
      wheel.placeBallInSlot(direction, ball);
      ball.isMoving = false;
      
      setTimeout(() => this.checkMatch(wheel), 100);
    } else {
      ball.movingForward = !ball.movingForward;
    }
  }
  
  handleBallAtBin(ball, bin, fromPipe) {
    const result = bin.receiveBall(ball);
    
    if (result.accepted) {
      console.log(`🎉 BIN ACCEPTS ${ball.colorName}!`);
      fromPipe.removeBall(ball);
      ball.explode();
      setTimeout(() => {
        ball.removeFromScene(this.sceneManager.scene);
        this.balls = this.balls.filter(b => b !== ball);
      }, 300);
    } else {
      ball.movingForward = !ball.movingForward;
    }
  }
  
  // ============ MATCHING ============
  
  checkMatch(wheel) {
    if (wheel.isCleared) return;
    
    const match = wheel.checkForMatch();
    if (!match) return;
    
    console.log(`🎯 MATCH! ${match.color} x4!`);
    this.createExplosion(wheel);
    
    match.balls.forEach(ball => {
      ball.explode();
      setTimeout(() => {
        ball.removeFromScene(this.sceneManager.scene);
        this.balls = this.balls.filter(b => b !== ball);
      }, 400);
    });
    
    wheel.clearSlots();
    wheel.markCleared();
    this.checkWinCondition();
  }
  
  createExplosion(wheel) {
    const pos = wheel.getPosition();
    const geometry = new THREE.BufferGeometry();
    const particleCount = 50;
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = 0.5;
      positions[i * 3 + 2] = pos.z;
      velocities.push({
        x: (Math.random() - 0.5) * 10,
        y: Math.random() * 8,
        z: (Math.random() - 0.5) * 10
      });
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xffd700,
      size: 0.2,
      transparent: true,
      opacity: 1
    });
    
    const particles = new THREE.Points(geometry, material);
    this.sceneManager.scene.add(particles);
    
    let frame = 0;
    const animateParticles = () => {
      frame++;
      const positions = particles.geometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] += velocities[i].x * 0.016;
        positions[i * 3 + 1] += velocities[i].y * 0.016;
        velocities[i].y -= 15 * 0.016;
        positions[i * 3 + 2] += velocities[i].z * 0.016;
      }
      particles.geometry.attributes.position.needsUpdate = true;
      material.opacity = 1 - (frame / 50);
      
      if (frame < 50) {
        requestAnimationFrame(animateParticles);
      } else {
        this.sceneManager.scene.remove(particles);
        geometry.dispose();
        material.dispose();
      }
    };
    animateParticles();
  }
  
  // ============ WIN/LOSE ============
  
  checkWinCondition() {
    const coloredWheels = this.wheels.filter(w => w.requiredColor !== null);
    let levelComplete = false;
    
    if (coloredWheels.length === 0) {
      levelComplete = this.wheels.every(w => w.isCleared);
    } else {
      levelComplete = coloredWheels.every(w => w.isCleared);
    }
    
    if (levelComplete) {
      console.log('🎉 LEVEL COMPLETE!');
      this.isRunning = false;
      
      const finalTime = this.levelTime;
      const bestKey = `level-${this.level}`;
      const previousBest = this.bestTimes[bestKey];
      const isNewBest = !previousBest || finalTime < previousBest;
      
      if (isNewBest) {
        this.bestTimes[bestKey] = finalTime;
        this.saveBestTimes();
      }
      
      this.showLevelComplete(finalTime, previousBest, isNewBest);
    }
  }
  
  showLevelComplete(time, previousBest, isNewBest) {
    const overlay = document.getElementById('level-complete');
    const timeDisplay = document.getElementById('complete-time');
    const bestDisplay = document.getElementById('complete-best');
    const newBestBadge = document.getElementById('new-best-badge');
    
    if (timeDisplay) timeDisplay.textContent = this.formatTime(time);
    if (bestDisplay) bestDisplay.textContent = isNewBest ? this.formatTime(time) : (previousBest ? this.formatTime(previousBest) : '--:--.-');
    if (newBestBadge) newBestBadge.classList.toggle('hidden', !isNewBest);
    
    overlay.classList.remove('hidden');
  }
  
  gameOver() {
    console.log('💀 TIME UP!');
    this.isRunning = false;
    document.getElementById('game-over').classList.remove('hidden');
  }
  
  // ============ UI ============
  
  updateUI() {
    document.getElementById('level').textContent = this.level.toString().padStart(2, '0');
    
    const coloredWheels = this.wheels.filter(w => w.requiredColor !== null);
    const remaining = coloredWheels.length > 0 
      ? coloredWheels.filter(w => !w.isCleared).length
      : this.wheels.filter(w => !w.isCleared).length;
    document.getElementById('wheels-remaining').textContent = remaining.toString();
  }
  
  updateNextBallUI() {
    const indicator = document.getElementById('next-ball-indicator');
    if (indicator && this.ballQueue.length > 0) {
      const nextColor = BALL_COLORS[this.ballQueue[0]];
      indicator.style.backgroundColor = `#${nextColor.toString(16).padStart(6, '0')}`;
    }
  }
  
  updateTimerUI() {
    const timerEl = document.getElementById('timer');
    if (timerEl) timerEl.textContent = this.formatTime(this.levelTime);
    
    const trackTimerEl = document.getElementById('track-timer');
    if (trackTimerEl) {
      if (this.isTimerActive) {
        trackTimerEl.textContent = this.trackTimer.toFixed(1);
        trackTimerEl.style.color = this.trackTimer < 3 ? '#ff4d4d' : '#d4a84b';
      } else {
        trackTimerEl.textContent = '--';
        trackTimerEl.style.color = '#d4a84b';
      }
    }
  }
  
  // ============ MAIN LOOP ============
  
  animate() {
    requestAnimationFrame(() => this.animate());
    
    const currentTime = this.clock.getElapsedTime();
    const deltaTime = Math.min(currentTime - this.lastTime, 0.1);
    this.lastTime = currentTime;
    
    if (this.isRunning && !this.isPaused) {
      this.levelTime = currentTime - this.levelStartTime;
      
      // Track timer countdown
      if (this.isTimerActive && this.topTrackBall) {
        this.trackTimer -= deltaTime;
        if (this.trackTimer <= 0) {
          this.gameOver();
          return;
        }
      }
      
      // Update top track ball
      this.updateTopTrackBall(deltaTime);
      
      // AUTO-FLOW CHECK! 🔄
      this.autoFlowTimer += deltaTime;
      if (this.autoFlowTimer >= this.autoFlowInterval) {
        this.autoFlowTimer = 0;
        this.checkAutoFlow();
      }
      
      // Update entities
      this.wheels.forEach(wheel => wheel.update(deltaTime));
      this.pipes.forEach(pipe => pipe.update(deltaTime));
      this.balls.forEach(ball => ball.update(deltaTime, this));
      
      this.updateUI();
      this.updateTimerUI();
    }
    
    this.sceneManager.render();
  }
}

