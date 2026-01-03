import * as THREE from 'three';

export class MouseSystem {
  constructor(game) {
    this.game = game;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    // Current hover state
    this.hoveredWheel = null;
    this.hoveredBall = null;
    
    // Rotation cooldown
    this.rotationLocked = false;
    this.rotationLockTime = 150; // Fast rotation!
    
    this.setupListeners();
  }
  
  setupListeners() {
    const canvas = this.game.canvas;
    
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('click', (e) => this.onLeftClick(e));
    canvas.addEventListener('contextmenu', (e) => this.onRightClick(e));
    
    // Prevent context menu on right click
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Keyboard controls still available as backup
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
  }
  
  updateMousePosition(event) {
    const rect = this.game.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }
  
  onMouseMove(event) {
    this.updateMousePosition(event);
    
    if (!this.game.isRunning || this.game.isPaused) return;
    
    this.updateHoverState();
  }
  
  updateHoverState() {
    const camera = this.game.sceneManager.camera;
    const scene = this.game.sceneManager.scene;
    
    this.raycaster.setFromCamera(this.mouse, camera);
    
    // Check for wheel hover
    const wheelMeshes = this.game.wheels.map(w => w.wheelMesh);
    const wheelIntersects = this.raycaster.intersectObjects(wheelMeshes, true);
    
    // Check for ball hover (balls in wheels)
    const ballMeshes = this.game.wheels.flatMap(w => 
      w.slotBalls.filter(b => b !== null).map(b => b.mesh)
    );
    const ballIntersects = this.raycaster.intersectObjects(ballMeshes, true);
    
    // Reset previous hover
    if (this.hoveredWheel) {
      this.hoveredWheel.setHovered(false);
    }
    if (this.hoveredBall) {
      this.hoveredBall.setHovered(false);
    }
    
    this.hoveredWheel = null;
    this.hoveredBall = null;
    
    // Priority: balls over wheels
    if (ballIntersects.length > 0) {
      const ballMesh = this.findParentBallMesh(ballIntersects[0].object);
      const ball = this.findBallByMesh(ballMesh);
      if (ball && ball.isPlaced) {
        this.hoveredBall = ball;
        ball.setHovered(true);
        this.game.canvas.style.cursor = 'pointer';
        return;
      }
    }
    
    if (wheelIntersects.length > 0) {
      const wheelMesh = this.findParentWheelMesh(wheelIntersects[0].object);
      const wheel = this.findWheelByMesh(wheelMesh);
      if (wheel) {
        // Cleared wheels can still be hovered and rotated!
        this.hoveredWheel = wheel;
        wheel.setHovered(true);
        this.game.canvas.style.cursor = 'grab';
        return;
      }
    }
    
    this.game.canvas.style.cursor = 'default';
  }
  
  findParentBallMesh(object) {
    let current = object;
    while (current) {
      if (current.geometry?.type === 'SphereGeometry') {
        return current;
      }
      current = current.parent;
    }
    return object;
  }
  
  findParentWheelMesh(object) {
    let current = object;
    while (current) {
      // Check if this is a wheel mesh (cylinder at root level)
      const isWheelMesh = this.game.wheels.some(w => 
        w.wheelMesh === current || w.wheelMesh === current.parent
      );
      if (isWheelMesh) {
        return current;
      }
      current = current.parent;
    }
    return object;
  }
  
  findBallByMesh(mesh) {
    for (const wheel of this.game.wheels) {
      for (const ball of wheel.slotBalls) {
        if (ball && (ball.mesh === mesh || ball.mesh === mesh.parent)) {
          return ball;
        }
      }
    }
    // Also check balls in pipes
    for (const ball of this.game.balls) {
      if (ball.mesh === mesh || ball.mesh === mesh.parent) {
        return ball;
      }
    }
    return null;
  }
  
  findWheelByMesh(mesh) {
    for (const wheel of this.game.wheels) {
      if (wheel.wheelMesh === mesh || 
          wheel.wheelMesh === mesh.parent ||
          wheel.wheelMesh.children.includes(mesh)) {
        return wheel;
      }
    }
    return null;
  }
  
  findWheelContainingBall(ball) {
    for (const wheel of this.game.wheels) {
      const slotIndex = wheel.slotBalls.indexOf(ball);
      if (slotIndex !== -1) {
        return { wheel, slotIndex };
      }
    }
    return null;
  }
  
  onLeftClick(event) {
    if (!this.game.isRunning || this.game.isPaused) return;
    
    this.updateMousePosition(event);
    this.updateHoverState();
    
    // Left click on ball = eject it!
    if (this.hoveredBall && this.hoveredBall.isPlaced) {
      const result = this.findWheelContainingBall(this.hoveredBall);
      if (result) {
        console.log(`LEFT CLICK: Ejecting ball from wheel ${result.wheel.index}, slot ${result.slotIndex}`);
        this.game.ejectBallFromSlot(result.wheel, result.slotIndex);
      }
    }
  }
  
  onRightClick(event) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!this.game.isRunning || this.game.isPaused) return;
    
    if (this.rotationLocked) {
      console.log('RIGHT CLICK: BLOCKED by rotation lock');
      return;
    }
    
    this.updateMousePosition(event);
    this.updateHoverState();
    
    // Right click on wheel = rotate (cleared wheels can still rotate!)
    if (this.hoveredWheel) {
      console.log(`>>> RIGHT CLICK: Attempting to rotate wheel ${this.hoveredWheel.index} at ${Date.now()}`);
      const success = this.hoveredWheel.rotate(true); // Clockwise
      if (success !== false) {
        this.lockRotation();
      }
    }
  }
  
  lockRotation() {
    this.rotationLocked = true;
    setTimeout(() => {
      this.rotationLocked = false;
    }, this.rotationLockTime);
  }
  
  // Keyboard backup controls
  onKeyDown(event) {
    // CRITICAL: Block all repeated keys
    if (event.repeat) {
      event.preventDefault();
      return;
    }
    
    if (!this.game.isRunning || this.game.isPaused) {
      if (event.code === 'KeyP' || event.code === 'Escape') {
        this.game.pause();
      }
      return;
    }
    
    // A/S to select wheels (backup)
    if (event.code === 'KeyA' || event.code === 'ArrowLeft') {
      this.game.selectPrevWheel();
      event.preventDefault();
      return;
    }
    if (event.code === 'KeyS' || event.code === 'ArrowRight') {
      this.game.selectNextWheel();
      event.preventDefault();
      return;
    }
    
    // K/L to rotate (backup)
    if (this.rotationLocked) {
      console.log(`KEYBOARD: BLOCKED by rotation lock`);
      event.preventDefault();
      return;
    }
    
    if (event.code === 'KeyK' || event.code === 'ArrowUp') {
      const wheel = this.game.wheels[this.game.selectedWheelIndex];
      if (wheel) {
        console.log(`>>> KEYBOARD K: Attempting to rotate wheel ${wheel.index} at ${Date.now()}`);
        const success = wheel.rotate(false); // Counter-clockwise
        if (success !== false) {
          this.lockRotation();
        }
      }
      event.preventDefault();
      return;
    }
    if (event.code === 'KeyL' || event.code === 'ArrowDown') {
      const wheel = this.game.wheels[this.game.selectedWheelIndex];
      if (wheel) {
        console.log(`>>> KEYBOARD L: Attempting to rotate wheel ${wheel.index} at ${Date.now()}`);
        const success = wheel.rotate(true); // Clockwise
        if (success !== false) {
          this.lockRotation();
        }
      }
      event.preventDefault();
      return;
    }
  }
}

