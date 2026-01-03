import * as THREE from 'three';
import {
  WHEEL_RADIUS,
  WHEEL_SLOT_COUNT,
  SLOT_DISTANCE,
  BALL_COLORS,
  METAL_GRAY,
  METAL_DARK,
  PIPE_GREEN,
  DIRECTIONS
} from '../utils/constants.js';

export class Wheel {
  constructor(x, z, index, requiredColor = null) {
    this.x = x;
    this.z = z;
    this.index = index;
    
    this.requiredColor = requiredColor;
    
    this.slots = [null, null, null, null];
    this.slotBalls = [null, null, null, null];
    this.connectedPipes = [null, null, null, null];
    
    this.rotationStep = 0;
    this.visualAngle = 0;
    
    this.lastRotationTime = 0;
    this.ROTATION_COOLDOWN = 120;
    
    this.isSelected = false;
    this.isCleared = false;
    this.isHovered = false;

    // Clamp system for visual auto-release feedback
    this.clamps = [];
    this.clampAnimationTime = 0;
    this.isClampReleasing = false;

    this.group = new THREE.Group();
    this.wheelMesh = null;
    this.selectionRing = null;
    this.colorIndicator = null;

    this.createMesh();
  }
  
  createMesh() {
    // 🚁 MILITARY PLATFORM! 🚁
    this.wheelMesh = new THREE.Group();

    // Base platform - metal gray
    const discGeom = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.4, 8);
    const discMat = new THREE.MeshBasicMaterial({ color: METAL_GRAY });
    const disc = new THREE.Mesh(discGeom, discMat);
    disc.position.y = 0.2;
    this.wheelMesh.add(disc);


    // Dark rim
    const rimGeom = new THREE.TorusGeometry(WHEEL_RADIUS - 0.1, 0.12, 8, 8);
    const rimMat = new THREE.MeshBasicMaterial({ color: METAL_DARK });
    const rim = new THREE.Mesh(rimGeom, rimMat);
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.42;
    this.wheelMesh.add(rim);

    // Center hub
    const hubGeom = new THREE.CylinderGeometry(0.6, 0.6, 0.5, 8);
    const hubMat = new THREE.MeshBasicMaterial({ color: METAL_DARK });
    const hub = new THREE.Mesh(hubGeom, hubMat);
    hub.position.y = 0.25;
    this.wheelMesh.add(hub);

    // Metal supports (cross pattern)
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const supportGeom = new THREE.BoxGeometry(WHEEL_RADIUS * 1.6, 0.3, 0.3);
      const supportMat = new THREE.MeshBasicMaterial({ color: METAL_DARK });
      const support = new THREE.Mesh(supportGeom, supportMat);
      support.rotation.y = -angle;
      support.position.y = 0.2;
      this.wheelMesh.add(support);
    }
    
    // 4 SLOT HOLES for balls
    const slotAngles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
    
    for (let i = 0; i < WHEEL_SLOT_COUNT; i++) {
      const angle = slotAngles[i];
      const slotX = Math.cos(angle) * SLOT_DISTANCE;
      const slotZ = Math.sin(angle) * SLOT_DISTANCE;
      
      // Dark slot hole
      const slotGeom = new THREE.CylinderGeometry(0.55, 0.55, 0.35, 16);
      const slotMat = new THREE.MeshBasicMaterial({ color: 0x0a0a08 });
      const slot = new THREE.Mesh(slotGeom, slotMat);
      slot.position.set(slotX, 0.18, slotZ);
      this.wheelMesh.add(slot);
      
      // Metal rim around slot
      const slotRimGeom = new THREE.TorusGeometry(0.58, 0.08, 8, 16);
      const slotRimMat = new THREE.MeshBasicMaterial({ color: METAL_GRAY });
      const slotRim = new THREE.Mesh(slotRimGeom, slotRimMat);
      slotRim.rotation.x = -Math.PI / 2;
      slotRim.position.set(slotX, 0.32, slotZ);
      this.wheelMesh.add(slotRim);
    }
    
    this.group.add(this.wheelMesh);
    
    // SELECTION RING - green military indicator!
    const selectionGeom = new THREE.TorusGeometry(WHEEL_RADIUS + 0.5, 0.12, 8, 32);
    const selectionMat = new THREE.MeshBasicMaterial({
      color: PIPE_GREEN,
      transparent: true,
      opacity: 0
    });
    this.selectionRing = new THREE.Mesh(selectionGeom, selectionMat);
    this.selectionRing.position.y = 0.2;
    this.selectionRing.rotation.x = -Math.PI / 2;
    this.group.add(this.selectionRing);

    // CLAMPS - Visual indicators for auto-release! 🔒
    // Four clamps positioned at each cardinal direction
    const clampPositions = [
      { angle: -Math.PI / 2, name: 'top' },    // TOP
      { angle: 0, name: 'right' },             // RIGHT
      { angle: Math.PI / 2, name: 'bottom' },  // BOTTOM
      { angle: Math.PI, name: 'left' }         // LEFT
    ];

    clampPositions.forEach(({ angle, name }) => {
      const clampGroup = new THREE.Group();

      // Clamp arms - military metal bars
      const armGeom = new THREE.BoxGeometry(0.8, 0.25, 0.15);
      const armMat = new THREE.MeshBasicMaterial({ color: METAL_DARK });

      const leftArm = new THREE.Mesh(armGeom, armMat);
      leftArm.position.set(-0.3, 0, 0);
      clampGroup.add(leftArm);

      const rightArm = new THREE.Mesh(armGeom, armMat);
      rightArm.position.set(0.3, 0, 0);
      clampGroup.add(rightArm);

      // Green indicator pin in center
      const pinGeom = new THREE.CylinderGeometry(0.15, 0.15, 0.3, 8);
      const pinMat = new THREE.MeshBasicMaterial({ color: PIPE_GREEN });
      const pin = new THREE.Mesh(pinGeom, pinMat);
      clampGroup.add(pin);

      // Position clamp at edge of wheel
      const distance = WHEEL_RADIUS + 0.6;
      clampGroup.position.set(
        Math.cos(angle) * distance,
        0.4,
        Math.sin(angle) * distance
      );
      clampGroup.rotation.y = -angle;

      this.wheelMesh.add(clampGroup);
      this.clamps.push({ group: clampGroup, leftArm, rightArm, defaultX: 0.3 });
    });

    // COLOR INDICATOR - shows required color
    if (this.requiredColor) {
      const indicatorColor = BALL_COLORS[this.requiredColor];
      const indicatorGeom = new THREE.TorusGeometry(WHEEL_RADIUS - 0.4, 0.12, 8, 32);
      const indicatorMat = new THREE.MeshBasicMaterial({
        color: indicatorColor,
        transparent: true,
        opacity: 0.8
      });
      this.colorIndicator = new THREE.Mesh(indicatorGeom, indicatorMat);
      this.colorIndicator.position.y = 0.35;
      this.colorIndicator.rotation.x = -Math.PI / 2;
      this.group.add(this.colorIndicator);
    }
    
    this.group.position.set(this.x, 0, this.z);
  }
  
  addToScene(scene) { scene.add(this.group); }
  removeFromScene(scene) { scene.remove(this.group); }
  
  setSelected(selected) {
    this.isSelected = selected;
    this.selectionRing.material.opacity = selected ? 0.9 : 0;
  }
  
  connectPipe(direction, pipe) {
    this.connectedPipes[direction] = pipe;
  }
  
  // Check if there's a pipe in a given world direction
  hasPipeInDirection(worldDir) {
    return this.connectedPipes[worldDir] !== null;
  }
  
  rotate(clockwise) {
    const now = Date.now();
    if (now - this.lastRotationTime < this.ROTATION_COOLDOWN) return false;
    
    this.lastRotationTime = now;
    
    if (clockwise) {
      this.rotationStep = (this.rotationStep + 1) % 4;
    } else {
      this.rotationStep = (this.rotationStep + 3) % 4;
    }
    
    return true;
  }
  
  worldDirToSlot(worldDir) {
    return (worldDir - this.rotationStep + 4) % 4;
  }
  
  slotToWorldDir(slotIndex) {
    return (slotIndex + this.rotationStep) % 4;
  }
  
  update(deltaTime) {
    // Animate rotation
    const targetAngle = this.rotationStep * (Math.PI / 2);
    let diff = targetAngle - this.visualAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    if (Math.abs(diff) > 0.01) {
      this.visualAngle += diff * Math.min(1, 12 * deltaTime);
    } else {
      this.visualAngle = targetAngle;
    }

    while (this.visualAngle < 0) this.visualAngle += Math.PI * 2;
    while (this.visualAngle >= Math.PI * 2) this.visualAngle -= Math.PI * 2;

    this.wheelMesh.rotation.y = -this.visualAngle;

    // Selection pulse
    if (this.isSelected && !this.isCleared) {
      const pulse = 0.6 + Math.sin(Date.now() * 0.006) * 0.3;
      this.selectionRing.material.opacity = pulse;
    }

    // Animate clamps!
    this.updateClamps(deltaTime);

    this.updateBallPositions();
  }

  triggerClampRelease() {
    this.isClampReleasing = true;
    this.clampAnimationTime = 0;
  }

  updateClamps(deltaTime) {
    if (this.isClampReleasing) {
      this.clampAnimationTime += deltaTime;

      const duration = 0.4; // 400ms animation
      const progress = Math.min(this.clampAnimationTime / duration, 1);

      // Ease out cubic for smooth animation
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      // Open clamps (arms move outward)
      const openAmount = easeProgress * 0.5; // Move 0.5 units outward

      this.clamps.forEach(clamp => {
        clamp.leftArm.position.x = -0.3 - openAmount;
        clamp.rightArm.position.x = 0.3 + openAmount;
      });

      // Close clamps again after opening
      if (progress >= 1) {
        this.isClampReleasing = false;
        // Reset to closed position
        this.clamps.forEach(clamp => {
          clamp.leftArm.position.x = -0.3;
          clamp.rightArm.position.x = 0.3;
        });
      }
    }
  }
  
  updateBallPositions() {
    const slotAngles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
    
    for (let i = 0; i < WHEEL_SLOT_COUNT; i++) {
      const ball = this.slotBalls[i];
      if (ball && ball.isPlaced) {
        const worldAngle = slotAngles[i] + this.visualAngle;
        const localX = Math.cos(worldAngle) * SLOT_DISTANCE;
        const localZ = Math.sin(worldAngle) * SLOT_DISTANCE;
        ball.mesh.position.set(this.x + localX, 0.5, this.z + localZ);
      }
    }
  }
  
  // Get balls that could auto-flow (facing a track with empty destination)
  getBallsReadyToFlow(game) {
    const flowableBalls = [];
    
    for (let slot = 0; slot < 4; slot++) {
      const ball = this.slotBalls[slot];
      if (!ball) continue;
      
      // What world direction is this slot facing?
      const worldDir = this.slotToWorldDir(slot);
      
      // Is there a pipe in that direction?
      const pipe = this.connectedPipes[worldDir];
      if (!pipe) continue; // Ball is "parked" - no track here
      
      // Where does this pipe lead?
      const targetWheel = (pipe.startWheel === this) ? pipe.endWheel : pipe.startWheel;
      const targetDir = (pipe.startWheel === this) ? pipe.endDirection : pipe.startDirection;
      
      if (!targetWheel) continue;
      
      // Is the target slot empty?
      if (targetWheel.canAcceptBallFromWorld(targetDir)) {
        flowableBalls.push({
          ball,
          slot,
          worldDir,
          pipe,
          targetWheel,
          targetDir,
          wheel: this  // Include reference to source wheel
        });
      }
    }
    
    return flowableBalls;
  }
  
  canAcceptBallFromWorld(worldDir) {
    const slot = this.worldDirToSlot(worldDir);
    return this.slots[slot] === null;
  }
  
  getBallInSlot(direction) {
    const slot = this.worldDirToSlot(direction);
    return this.slotBalls[slot];
  }
  
  removeBallFromSlot(direction) {
    const slot = this.worldDirToSlot(direction);
    const ball = this.slotBalls[slot];
    this.slots[slot] = null;
    this.slotBalls[slot] = null;
    if (ball) ball.isPlaced = false;
    return ball;
  }
  
  placeBallInSlot(direction, ball) {
    const slot = this.worldDirToSlot(direction);
    this.slots[slot] = ball.colorName;
    this.slotBalls[slot] = ball;
    ball.isPlaced = true;
    
    // Position immediately
    const slotAngles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
    const worldAngle = slotAngles[slot] + this.visualAngle;
    const localX = Math.cos(worldAngle) * SLOT_DISTANCE;
    const localZ = Math.sin(worldAngle) * SLOT_DISTANCE;
    ball.mesh.position.set(this.x + localX, 0.5, this.z + localZ);
  }
  
  getPipeInDirection(direction) {
    return this.connectedPipes[direction];
  }
  
  getSlotWorldPosition(slotIndex) {
    const slotAngles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
    const worldAngle = slotAngles[slotIndex] + this.visualAngle;
    return {
      x: this.x + Math.cos(worldAngle) * SLOT_DISTANCE,
      z: this.z + Math.sin(worldAngle) * SLOT_DISTANCE
    };
  }
  
  isFull() {
    return this.slots.every(s => s !== null);
  }
  
  checkForMatch() {
    const filledSlots = this.slots.filter(s => s !== null);
    if (filledSlots.length !== 4) return null;
    
    const firstColor = filledSlots[0];
    if (!filledSlots.every(c => c === firstColor)) return null;
    
    if (this.requiredColor && firstColor !== this.requiredColor) return null;
    
    return {
      color: firstColor,
      balls: this.slotBalls.filter(b => b !== null)
    };
  }
  
  clearSlots() {
    this.slots = [null, null, null, null];
    this.slotBalls = [null, null, null, null];
  }
  
  markCleared() {
    this.isCleared = true;
    this.selectionRing.material.color.setHex(0x00ff00);
    this.selectionRing.material.opacity = 0.5;
  }
  
  getPosition() { return { x: this.x, z: this.z }; }
}

