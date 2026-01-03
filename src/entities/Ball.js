import * as THREE from 'three';
import { BALL_RADIUS, BALL_SPEED } from '../utils/constants.js';

export class Ball {
  constructor(x, z, color, colorName) {
    this.color = color;
    this.colorName = colorName;

    // Pipe travel state
    this.currentPipe = null;
    this.pipeProgress = 0;
    this.movingForward = true;
    this.checkedEntry = false;

    // State
    this.isPlaced = false;
    this.isMoving = true;
    this.isExploding = false;

    // Drop animation state
    this.isDropping = false;
    this.dropStartY = 0;
    this.dropVelocityY = 0;
    this.dropTargetWheel = null;
    this.dropDirection = null;
    this.dropCallback = null;

    // Three.js
    this.mesh = null;
    this.glowMesh = null;

    this.createMesh(x, z);
  }
  
  createMesh(x, z) {
    // Simple glowing gem/ball! 💎
    const geometry = new THREE.SphereGeometry(BALL_RADIUS, 24, 24);
    const material = new THREE.MeshBasicMaterial({ color: this.color });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(x, 0.5, z);
    
    // Inner glow (lighter center)
    const glowGeom = new THREE.SphereGeometry(BALL_RADIUS * 0.6, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4
    });
    this.glowMesh = new THREE.Mesh(glowGeom, glowMat);
    this.glowMesh.position.set(0, BALL_RADIUS * 0.2, 0);
    this.mesh.add(this.glowMesh);
    
    // Outer glow ring
    const ringGeom = new THREE.TorusGeometry(BALL_RADIUS * 1.1, 0.05, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.5
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = Math.PI / 2;
    this.mesh.add(ring);
  }
  
  addToScene(scene) { scene.add(this.mesh); }
  removeFromScene(scene) { scene.remove(this.mesh); }
  
  update(deltaTime, game) {
    if (this.isExploding) {
      this.mesh.scale.multiplyScalar(1.08);
      this.mesh.material.opacity = Math.max(0, (this.mesh.material.opacity || 1) - deltaTime * 3);
      return;
    }

    if (this.isDropping) {
      this.updateDropAnimation(deltaTime);
      return;
    }

    if (this.isPlaced) {
      // Gentle float animation
      this.mesh.position.y = 0.5 + Math.sin(Date.now() * 0.004) * 0.03;
      return;
    }
    
    if (!this.currentPipe) return;
    
    if (this.isMoving) {
      const speed = BALL_SPEED * deltaTime;
      const progressDelta = speed / this.currentPipe.length;
      
      if (this.movingForward) {
        this.pipeProgress += progressDelta;
        
        if (this.pipeProgress >= 0.85 && !this.checkedEntry) {
          this.checkedEntry = true;
          const canEnter = this.checkCanEnterWheel(game);
          if (!canEnter) {
            this.movingForward = false;
            this.pipeProgress = 0.85;
            return;
          }
        }
        
        if (this.pipeProgress >= 1) {
          this.pipeProgress = 1;
          this.reachedPipeEnd(game);
          if (!this.currentPipe) return;
        }
      } else {
        this.pipeProgress -= progressDelta;
        this.checkedEntry = false;
        
        if (this.pipeProgress <= 0) {
          this.pipeProgress = 0;
          this.reachedPipeStart(game);
          if (!this.currentPipe) return;
        }
      }
      
      if (this.currentPipe) {
        const pos = this.currentPipe.getPositionAlongPipe(this.pipeProgress);
        this.mesh.position.x = pos.x;
        this.mesh.position.z = pos.z;
        this.mesh.position.y = 0.5;
      }
    }
    
    // Pulse glow
    if (this.glowMesh && !this.isExploding) {
      const pulse = 0.3 + Math.sin(Date.now() * 0.005) * 0.15;
      this.glowMesh.material.opacity = pulse;
    }
  }
  
  checkCanEnterWheel(game) {
    const pipe = this.currentPipe;
    if (!pipe) return true;
    
    if (pipe.endBin) return true;
    
    const wheel = pipe.endWheel;
    if (!wheel) return true;
    
    const direction = pipe.endDirection;
    return wheel.canAcceptBallFromWorld(direction);
  }
  
  reachedPipeEnd(game) {
    const pipe = this.currentPipe;
    
    if (pipe.endBin) {
      game.handleBallAtBin(this, pipe.endBin, pipe);
      return;
    }
    
    const wheel = pipe.endWheel;
    if (wheel) {
      const direction = pipe.endDirection;
      game.handleBallArrival(this, wheel, direction, pipe, false);
    } else {
      this.movingForward = false;
    }
  }
  
  reachedPipeStart(game) {
    const pipe = this.currentPipe;
    
    if (pipe.isSource) {
      game.onBallReturnedToSource(this);
    } else if (pipe.startWheel) {
      const wheel = pipe.startWheel;
      const direction = pipe.startDirection;
      game.handleBallArrival(this, wheel, direction, pipe, true);
    } else {
      this.movingForward = true;
    }
  }
  
  startOnPipe(pipe, fromStart) {
    this.currentPipe = pipe;
    this.pipeProgress = fromStart ? 0 : 1;
    this.movingForward = fromStart;
    this.isPlaced = false;
    this.isMoving = true;
    this.checkedEntry = false;
    pipe.balls.push(this);
  }
  
  startDropAnimation(targetWheel, direction, onComplete) {
    this.isDropping = true;
    this.isMoving = false;
    this.dropStartY = this.mesh.position.y;
    this.dropVelocityY = 0; // Start with horizontal momentum
    this.dropTargetWheel = targetWheel;
    this.dropDirection = direction;
    this.dropCallback = onComplete;

    // Get the final position where ball will land in the wheel
    const slotAngles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
    const slot = targetWheel.worldDirToSlot(direction);
    const worldAngle = slotAngles[slot] + targetWheel.visualAngle;
    const localX = Math.cos(worldAngle) * 1.4; // SLOT_DISTANCE
    const localZ = Math.sin(worldAngle) * 1.4;

    this.dropTargetX = targetWheel.x + localX;
    this.dropTargetZ = targetWheel.z + localZ;
  }

  updateDropAnimation(deltaTime) {
    // Accelerate downward (like going down a hill!)
    const gravity = 15; // Acceleration
    this.dropVelocityY += gravity * deltaTime;

    // Update Y position
    this.mesh.position.y -= this.dropVelocityY * deltaTime;

    // Move toward target slot position
    const speed = 6;
    const dx = this.dropTargetX - this.mesh.position.x;
    const dz = this.dropTargetZ - this.mesh.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 0.1) {
      this.mesh.position.x += (dx / dist) * speed * deltaTime;
      this.mesh.position.z += (dz / dist) * speed * deltaTime;
    }

    // Check if reached destination
    if (this.mesh.position.y <= 0.5) {
      this.mesh.position.y = 0.5;
      this.isDropping = false;
      this.dropVelocityY = 0;

      if (this.dropCallback) {
        this.dropCallback();
        this.dropCallback = null;
      }
    }
  }

  explode() {
    this.isExploding = true;
    this.mesh.material.transparent = true;
  }

  getPosition() {
    return {
      x: this.mesh.position.x,
      y: this.mesh.position.y,
      z: this.mesh.position.z
    };
  }
}

