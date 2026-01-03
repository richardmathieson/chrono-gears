import * as THREE from 'three';
import { BALL_COLORS } from '../utils/constants.js';

export class Bin {
  constructor(x, z, direction, acceptedColors = 'ALL') {
    this.x = x;
    this.z = z;
    this.direction = direction; // Which direction balls enter from
    this.acceptedColors = acceptedColors; // 'ALL' or array of color names like ['TEAL', 'CORAL']
    this.connectedPipe = null;
    
    this.group = new THREE.Group();
    this.createMesh();
  }
  
  createMesh() {
    // Bin body - square container
    const binGeom = new THREE.BoxGeometry(1.5, 0.5, 1.5);
    const binMat = new THREE.MeshBasicMaterial({ color: 0x444444 });
    const bin = new THREE.Mesh(binGeom, binMat);
    bin.position.y = 0.25;
    this.group.add(bin);
    
    // Inner dark area
    const innerGeom = new THREE.BoxGeometry(1.2, 0.4, 1.2);
    const innerMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const inner = new THREE.Mesh(innerGeom, innerMat);
    inner.position.y = 0.3;
    this.group.add(inner);
    
    // Color indicator ring/border
    this.updateColorIndicator();
    
    this.group.position.set(this.x, 0, this.z);
  }
  
  updateColorIndicator() {
    // Remove old indicator if exists
    if (this.colorRing) {
      this.group.remove(this.colorRing);
    }
    
    // Determine color to show
    let indicatorColor;
    if (this.acceptedColors === 'ALL') {
      indicatorColor = 0xffffff; // White for "accepts all"
    } else if (Array.isArray(this.acceptedColors) && this.acceptedColors.length === 1) {
      indicatorColor = BALL_COLORS[this.acceptedColors[0]];
    } else {
      indicatorColor = 0xffffff; // Multiple specific colors - show white
    }
    
    // Ring around the bin
    const ringGeom = new THREE.TorusGeometry(1.0, 0.1, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ 
      color: indicatorColor,
      transparent: true,
      opacity: 0.8
    });
    this.colorRing = new THREE.Mesh(ringGeom, ringMat);
    this.colorRing.position.y = 0.5;
    this.colorRing.rotation.x = -Math.PI / 2;
    this.group.add(this.colorRing);
  }
  
  // Check if this bin accepts the given color
  acceptsColor(colorName) {
    if (this.acceptedColors === 'ALL') {
      return true;
    }
    if (Array.isArray(this.acceptedColors)) {
      return this.acceptedColors.includes(colorName);
    }
    return false;
  }
  
  // Called when a ball arrives at the bin
  receiveBall(ball) {
    if (this.acceptsColor(ball.colorName)) {
      console.log(`BIN: ${ball.colorName} ball accepted! EXPLODING!`);
      return { accepted: true };
    } else {
      console.log(`BIN: ${ball.colorName} ball REJECTED! Bouncing back.`);
      return { accepted: false };
    }
  }
  
  addToScene(scene) {
    scene.add(this.group);
  }
  
  removeFromScene(scene) {
    scene.remove(this.group);
  }
  
  getPosition() {
    return { x: this.x, z: this.z };
  }
}

