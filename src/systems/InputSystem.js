import * as THREE from 'three';
import { DIRECTIONS, WHEEL_RADIUS } from '../utils/constants.js';

export class InputSystem {
  constructor(game) {
    this.game = game;
    this.keys = {};
    
    // Raycasting
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    
    // Touch/drag state
    this.touchStartPos = null;
    this.touchStartTime = 0;
    this.touchedWheelIndex = -1;
    this.isDragging = false;
    this.dragDirection = null;
    this.dragIndicator = null;
    
    // Thresholds
    this.dragThreshold = 25; // pixels
    this.tapMaxDuration = 250; // ms
    
    this.setupListeners();
  }
  
  setupListeners() {
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
    document.addEventListener('keyup', (e) => this.onKeyUp(e));
    
    const canvas = this.game.canvas;
    
    // Touch events
    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
    canvas.addEventListener('touchcancel', (e) => this.cancelGesture());
    
    // Mouse events
    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
  }
  
  // ============ TOUCH GESTURES ============
  
  onTouchStart(event) {
    if (!this.game.isRunning || this.game.isPaused) return;
    if (event.touches.length === 0) return;
    
    const touch = event.touches[0];
    this.startGesture(touch.clientX, touch.clientY);
    event.preventDefault();
  }
  
  onTouchMove(event) {
    if (!this.game.isRunning || this.game.isPaused) return;
    if (!this.touchStartPos || event.touches.length === 0) return;
    
    const touch = event.touches[0];
    this.updateGesture(touch.clientX, touch.clientY);
    event.preventDefault();
  }
  
  onTouchEnd(event) {
    if (!this.game.isRunning || this.game.isPaused) return;
    this.endGesture();
    event.preventDefault();
  }
  
  onMouseDown(event) {
    if (!this.game.isRunning || this.game.isPaused) return;
    this.startGesture(event.clientX, event.clientY);
  }
  
  onMouseMove(event) {
    if (!this.game.isRunning || this.game.isPaused) return;
    if (!this.touchStartPos) return;
    this.updateGesture(event.clientX, event.clientY);
  }
  
  onMouseUp(event) {
    if (!this.game.isRunning || this.game.isPaused) return;
    this.endGesture();
  }
  
  startGesture(clientX, clientY) {
    this.touchStartPos = { x: clientX, y: clientY };
    this.touchStartTime = Date.now();
    this.isDragging = false;
    this.dragDirection = null;
    
    // Find which wheel was touched
    this.touchedWheelIndex = this.getWheelAtPosition(clientX, clientY);
    
    if (this.touchedWheelIndex >= 0) {
      this.game.selectWheel(this.touchedWheelIndex);
    }
  }
  
  updateGesture(clientX, clientY) {
    if (!this.touchStartPos || this.touchedWheelIndex < 0) return;
    
    const dx = clientX - this.touchStartPos.x;
    const dy = clientY - this.touchStartPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > this.dragThreshold) {
      this.isDragging = true;
      
      // Determine direction (4-way)
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      
      let newDirection;
      if (angle >= -45 && angle < 45) {
        newDirection = DIRECTIONS.RIGHT;
      } else if (angle >= 45 && angle < 135) {
        newDirection = DIRECTIONS.BOTTOM;
      } else if (angle >= -135 && angle < -45) {
        newDirection = DIRECTIONS.TOP;
      } else {
        newDirection = DIRECTIONS.LEFT;
      }
      
      if (newDirection !== this.dragDirection) {
        this.dragDirection = newDirection;
        this.showDirectionIndicator(this.touchedWheelIndex, this.dragDirection);
      }
    }
  }
  
  endGesture() {
    if (!this.touchStartPos) return;
    
    const duration = Date.now() - this.touchStartTime;
    
    if (this.isDragging && this.dragDirection !== null && this.touchedWheelIndex >= 0) {
      // SWIPE = Eject ball in that direction! 🎯
      console.log(`Swipe eject: direction ${this.dragDirection}`);
      const wheel = this.game.wheels[this.touchedWheelIndex];
      if (wheel) {
        this.game.ejectBallFromWheel(wheel, this.dragDirection);
      }
    } else if (this.touchedWheelIndex >= 0 && duration < this.tapMaxDuration) {
      // TAP = Rotate wheel! ⚙️
      console.log(`Tap rotate wheel ${this.touchedWheelIndex}`);
      this.game.rotateSelectedWheel();
    }
    
    this.hideDirectionIndicator();
    this.touchStartPos = null;
    this.touchedWheelIndex = -1;
    this.isDragging = false;
    this.dragDirection = null;
  }
  
  cancelGesture() {
    this.hideDirectionIndicator();
    this.touchStartPos = null;
    this.touchedWheelIndex = -1;
    this.isDragging = false;
    this.dragDirection = null;
  }
  
  getWheelAtPosition(clientX, clientY) {
    this.pointer.x = (clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(clientY / window.innerHeight) * 2 + 1;
    
    const camera = this.game.sceneManager.camera;
    this.raycaster.setFromCamera(this.pointer, camera);
    
    let closestWheelIndex = -1;
    let closestDist = WHEEL_RADIUS * 2;
    
    for (let i = 0; i < this.game.wheels.length; i++) {
      const wheel = this.game.wheels[i];
      const ray = this.raycaster.ray;
      const rayOrigin = ray.origin.clone();
      const rayDir = ray.direction.clone();
      
      const t = (0.5 - rayOrigin.y) / rayDir.y;
      const hitPoint = rayOrigin.clone().add(rayDir.clone().multiplyScalar(t));
      const dx = hitPoint.x - wheel.x;
      const dz = hitPoint.z - wheel.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance < closestDist) {
        closestDist = distance;
        closestWheelIndex = i;
      }
    }
    
    return closestWheelIndex;
  }
  
  showDirectionIndicator(wheelIndex, direction) {
    const wheel = this.game.wheels[wheelIndex];
    if (!wheel) return;
    
    this.hideDirectionIndicator();
    
    // Arrow indicator
    const arrowLength = 2.5;
    const arrowWidth = 0.4;
    
    let dx = 0, dz = 0;
    switch (direction) {
      case DIRECTIONS.TOP: dz = -1; break;
      case DIRECTIONS.BOTTOM: dz = 1; break;
      case DIRECTIONS.LEFT: dx = -1; break;
      case DIRECTIONS.RIGHT: dx = 1; break;
    }
    
    const geometry = new THREE.BoxGeometry(
      dx !== 0 ? arrowLength : arrowWidth,
      0.3,
      dz !== 0 ? arrowLength : arrowWidth
    );
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xffd700, // Gold!
      transparent: true,
      opacity: 0.8
    });
    
    this.dragIndicator = new THREE.Mesh(geometry, material);
    this.dragIndicator.position.set(
      wheel.x + dx * (WHEEL_RADIUS + arrowLength / 2),
      0.7,
      wheel.z + dz * (WHEEL_RADIUS + arrowLength / 2)
    );
    
    this.game.sceneManager.scene.add(this.dragIndicator);
  }
  
  hideDirectionIndicator() {
    if (this.dragIndicator) {
      this.game.sceneManager.scene.remove(this.dragIndicator);
      this.dragIndicator.geometry.dispose();
      this.dragIndicator.material.dispose();
      this.dragIndicator = null;
    }
  }
  
  // ============ KEYBOARD ============
  
  onKeyDown(event) {
    if (event.repeat) return;
    
    if (!this.game.isRunning || this.game.isPaused) {
      if (event.code === 'KeyP' || event.code === 'Escape') {
        this.game.pause();
      }
      return;
    }
    
    if (this.keys[event.code]) return;
    this.keys[event.code] = true;
    
    // WASD - Navigate
    if (event.code === 'KeyW') { this.game.navigateWheel('up'); event.preventDefault(); return; }
    if (event.code === 'KeyS') { this.game.navigateWheel('down'); event.preventDefault(); return; }
    if (event.code === 'KeyA') { this.game.navigateWheel('left'); event.preventDefault(); return; }
    if (event.code === 'KeyD') { this.game.navigateWheel('right'); event.preventDefault(); return; }
    
    // SPACE - Rotate
    if (event.code === 'Space') {
      this.game.rotateSelectedWheel();
      event.preventDefault();
      return;
    }
    
    // ARROWS - Eject ball
    const wheel = this.game.wheels[this.game.selectedWheelIndex];
    if (wheel) {
      if (event.code === 'ArrowUp') { this.game.ejectBallFromWheel(wheel, DIRECTIONS.TOP); event.preventDefault(); return; }
      if (event.code === 'ArrowDown') { this.game.ejectBallFromWheel(wheel, DIRECTIONS.BOTTOM); event.preventDefault(); return; }
      if (event.code === 'ArrowLeft') { this.game.ejectBallFromWheel(wheel, DIRECTIONS.LEFT); event.preventDefault(); return; }
      if (event.code === 'ArrowRight') { this.game.ejectBallFromWheel(wheel, DIRECTIONS.RIGHT); event.preventDefault(); return; }
    }
    
    if (event.code === 'KeyP' || event.code === 'Escape') {
      this.game.pause();
      event.preventDefault();
    }
  }
  
  onKeyUp(event) {
    this.keys[event.code] = false;
  }
}

