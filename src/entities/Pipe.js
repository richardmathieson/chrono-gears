import * as THREE from 'three';
import { PIPE_WIDTH, WHEEL_RADIUS, SLOT_DISTANCE, PIPE_GREEN, DESERT_DARK } from '../utils/constants.js';

export class Pipe {
  constructor(startX, startZ, endX, endZ, isSource = false) {
    // Visual pipe endpoints (wheel centers)
    this.startX = startX;
    this.startZ = startZ;
    this.endX = endX;
    this.endZ = endZ;
    this.isSource = isSource;
    
    // Calculate direction and visual length
    const dx = endX - startX;
    const dz = endZ - startZ;
    this.visualLength = Math.sqrt(dx * dx + dz * dz);
    this.angle = Math.atan2(dz, dx);
    
    // Normalized direction
    this.dirX = dx / this.visualLength;
    this.dirZ = dz / this.visualLength;
    
    // Ball travel endpoints - these will be adjusted when wheels connect
    // Balls should stop at wheel EDGE (slot position), not center
    this.ballStartX = startX;
    this.ballStartZ = startZ;
    this.ballEndX = endX;
    this.ballEndZ = endZ;
    this.length = this.visualLength; // Ball travel length (adjusted later)
    
    // Connected wheels (at start and end)
    this.startWheel = null;
    this.endWheel = null;
    this.startDirection = null;
    this.endDirection = null;
    
    // Connected bin (at end only)
    this.endBin = null;
    
    // Balls currently in this pipe
    this.balls = [];
    
    this.group = new THREE.Group();
    this.createMesh();
  }
  
  createMesh() {
    // DESERT STRIKE GREEN PIPES! 🚁
    const pipeHeight = 0.6;
    const pipeWidth = 0.8;

    // Main green pipe body - cylindrical
    const segments = Math.max(4, Math.floor(this.visualLength / 2));
    for (let i = 0; i < segments; i++) {
      const t = i / (segments - 1);
      const x = this.startX + (this.endX - this.startX) * t;
      const z = this.startZ + (this.endZ - this.startZ) * t;

      const segmentGeom = new THREE.CylinderGeometry(pipeWidth / 2, pipeWidth / 2, 0.3, 8);
      const segmentMat = new THREE.MeshBasicMaterial({ color: PIPE_GREEN });
      const segment = new THREE.Mesh(segmentGeom, segmentMat);
      segment.position.set(x, pipeHeight / 2, z);
      segment.rotation.z = Math.PI / 2;
      segment.rotation.y = -this.angle;
      this.group.add(segment);
    }

    // Dark inner channel
    const innerGeom = new THREE.BoxGeometry(this.visualLength, 0.2, pipeWidth * 0.5);
    const innerMat = new THREE.MeshBasicMaterial({ color: DESERT_DARK });
    const inner = new THREE.Mesh(innerGeom, innerMat);
    inner.position.set(
      (this.startX + this.endX) / 2,
      pipeHeight / 2,
      (this.startZ + this.endZ) / 2
    );
    inner.rotation.y = -this.angle;
    this.group.add(inner);

    if (this.isSource) {
      this.createSourceIndicator();
    }
  }
  
  createSourceIndicator() {
    // DISPENSER MACHINE! 🏭
    // A box that balls go INTO from queue, and pop OUT one at a time
    
    // Main dispenser body
    const bodyGeom = new THREE.BoxGeometry(1.4, 0.6, 1.4);
    const bodyMat = new THREE.MeshBasicMaterial({ color: 0x555555 });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.set(this.startX, 0.3, this.startZ);
    this.group.add(body);
    
    // Top darker section
    const topGeom = new THREE.BoxGeometry(1.5, 0.15, 1.5);
    const topMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const top = new THREE.Mesh(topGeom, topMat);
    top.position.set(this.startX, 0.65, this.startZ);
    this.group.add(top);
    
    // Input hole on top (where queue balls "enter")
    const holeGeom = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16);
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const hole = new THREE.Mesh(holeGeom, holeMat);
    hole.position.set(this.startX, 0.7, this.startZ);
    this.group.add(hole);
    
    // Output indicator ring (where balls come out)
    const ringGeom = new THREE.TorusGeometry(0.5, 0.08, 8, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x66ff66 }); // Green = go!
    this.spawnRing = new THREE.Mesh(ringGeom, ringMat);
    this.spawnRing.position.set(this.startX, 0.65, this.startZ);
    this.spawnRing.rotation.x = -Math.PI / 2;
    this.group.add(this.spawnRing);
  }
  
  addToScene(scene) {
    scene.add(this.group);
  }
  
  removeFromScene(scene) {
    scene.remove(this.group);
  }
  
  // Connect this pipe to wheels - and adjust ball travel endpoints
  connectToWheel(wheel, atStart, direction) {
    if (atStart) {
      this.startWheel = wheel;
      this.startDirection = direction;
      
      // Adjust ball start position to wheel edge (slot position)
      // Ball should stop at the slot, not go to center
      this.ballStartX = wheel.x + this.dirX * SLOT_DISTANCE;
      this.ballStartZ = wheel.z + this.dirZ * SLOT_DISTANCE;
    } else {
      this.endWheel = wheel;
      this.endDirection = direction;
      
      // Adjust ball end position to wheel edge (slot position)
      // Ball should stop at the slot, not go to center
      this.ballEndX = wheel.x - this.dirX * SLOT_DISTANCE;
      this.ballEndZ = wheel.z - this.dirZ * SLOT_DISTANCE;
    }
    
    // Recalculate ball travel length
    const dx = this.ballEndX - this.ballStartX;
    const dz = this.ballEndZ - this.ballStartZ;
    this.length = Math.sqrt(dx * dx + dz * dz);
    
    wheel.connectPipe(direction, this);
  }
  
  // Connect this pipe to a bin
  connectToBin(bin, direction) {
    this.endBin = bin;
    bin.connectedPipe = this;
    
    // Adjust ball end position to stop at bin edge
    // No wheel adjustment needed - ball goes to bin center
    this.ballEndX = bin.x;
    this.ballEndZ = bin.z;
    
    // Recalculate ball travel length
    const dx = this.ballEndX - this.ballStartX;
    const dz = this.ballEndZ - this.ballStartZ;
    this.length = Math.sqrt(dx * dx + dz * dz);
  }
  
  // Get spawn position (start of ball travel path)
  getSpawnPosition() {
    return { x: this.ballStartX, z: this.ballStartZ };
  }
  
  // Get position along pipe for ball travel (0 = start, 1 = end)
  // Uses adjusted ball endpoints, not visual pipe endpoints
  getPositionAlongPipe(t) {
    return {
      x: this.ballStartX + (this.ballEndX - this.ballStartX) * t,
      z: this.ballStartZ + (this.ballEndZ - this.ballStartZ) * t
    };
  }
  
  // Add a ball to this pipe
  addBall(ball, fromStart = true) {
    ball.currentPipe = this;
    ball.pipeProgress = fromStart ? 0 : 1;
    ball.movingForward = fromStart;
    this.balls.push(ball);
  }
  
  // Remove a ball from this pipe
  removeBall(ball) {
    const index = this.balls.indexOf(ball);
    if (index !== -1) {
      this.balls.splice(index, 1);
    }
    ball.currentPipe = null;
  }
  
  // Update animation
  update(deltaTime) {
    if (this.spawnRing) {
      const time = Date.now() * 0.003;
      const scale = 1 + Math.sin(time) * 0.15;
      const opacity = 0.4 + Math.sin(time) * 0.2;
      
      this.spawnRing.scale.set(scale, scale, 1);
      this.spawnRing.material.opacity = opacity;
    }
  }
  
  getDirectionFromWheel(wheel) {
    if (wheel === this.startWheel) {
      return this.startDirection;
    } else if (wheel === this.endWheel) {
      return this.endDirection;
    }
    return null;
  }
}

