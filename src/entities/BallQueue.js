import * as THREE from 'three';
import { BALL_COLORS, BALL_COLOR_NAMES, BALL_RADIUS } from '../utils/constants.js';

export class BallQueue {
  constructor(colorCount = 2, queueSize = 50) {
    this.colorCount = colorCount;
    this.queueSize = queueSize;
    
    // The queue of upcoming ball colors
    this.queue = [];
    
    // Visual representation
    this.group = new THREE.Group();
    this.ballMeshes = [];
    
    // Path for the queue (will be set by level)
    this.pathPoints = [];
    this.ballSpacing = 1.1; // Tighter spacing to fit more balls
    
    this.generateQueue();
  }
  
  // Generate the queue of ball colors
  generateQueue() {
    const availableColors = BALL_COLOR_NAMES.slice(0, this.colorCount);
    
    for (let i = 0; i < this.queueSize; i++) {
      const colorIndex = Math.floor(Math.random() * availableColors.length);
      const colorName = availableColors[colorIndex];
      this.queue.push(colorName);
    }
    
    console.log(`Generated queue of ${this.queueSize} balls with ${this.colorCount} colors`);
  }
  
  // Set the visual path for the queue (array of {x, z} points)
  setPath(points) {
    this.pathPoints = points;
    this.createVisualPipe();
    this.createBallMeshes();
  }
  
  // Create simple pipe visuals along the path
  createVisualPipe() {
    // Remove old pipe if exists
    this.group.children.forEach(child => {
      if (child.userData.isPipe) {
        this.group.remove(child);
      }
    });
    
    const pipeColor = 0x666666;
    const pipeHeight = 0.15;
    const pipeWidth = 0.4;
    
    // Create simple pipe segments between points
    for (let i = 0; i < this.pathPoints.length - 1; i++) {
      const start = this.pathPoints[i];
      const end = this.pathPoints[i + 1];
      
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const length = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dz, dx);
      const centerX = (start.x + end.x) / 2;
      const centerZ = (start.z + end.z) / 2;
      
      // Main pipe
      const mainGeom = new THREE.BoxGeometry(length + 0.2, pipeHeight, pipeWidth);
      const mainMat = new THREE.MeshBasicMaterial({ color: pipeColor });
      const main = new THREE.Mesh(mainGeom, mainMat);
      main.position.set(centerX, 0.08, centerZ);
      main.rotation.y = -angle;
      main.userData.isPipe = true;
      this.group.add(main);
      
      // Inner track
      const innerGeom = new THREE.BoxGeometry(length + 0.2, pipeHeight + 0.02, pipeWidth * 0.6);
      const innerMat = new THREE.MeshBasicMaterial({ color: 0x444444 });
      const inner = new THREE.Mesh(innerGeom, innerMat);
      inner.position.set(centerX, 0.1, centerZ);
      inner.rotation.y = -angle;
      inner.userData.isPipe = true;
      this.group.add(inner);
    }
  }
  
  // Create ball meshes for the visible queue
  createBallMeshes() {
    // Remove old ball meshes
    this.ballMeshes.forEach(mesh => {
      this.group.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    this.ballMeshes = [];
    
    // Create a mesh for each ball in queue
    for (let i = 0; i < this.queue.length; i++) {
      const colorName = this.queue[i];
      const color = BALL_COLORS[colorName];
      
      const geom = new THREE.SphereGeometry(BALL_RADIUS * 0.8, 12, 12);
      const mat = new THREE.MeshBasicMaterial({ color: color });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.userData.colorName = colorName;
      mesh.userData.queueIndex = i;
      
      this.ballMeshes.push(mesh);
      this.group.add(mesh);
    }
    
    this.updateBallPositions();
  }
  
  // Get position along path at distance t
  getPositionOnPath(distance) {
    if (this.pathPoints.length < 2) return { x: 0, z: 0 };
    
    let accumulated = 0;
    
    for (let i = 0; i < this.pathPoints.length - 1; i++) {
      const start = this.pathPoints[i];
      const end = this.pathPoints[i + 1];
      
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const segmentLength = Math.sqrt(dx * dx + dz * dz);
      
      if (accumulated + segmentLength >= distance) {
        // Position is on this segment
        const t = (distance - accumulated) / segmentLength;
        return {
          x: start.x + dx * t,
          z: start.z + dz * t
        };
      }
      
      accumulated += segmentLength;
    }
    
    // Beyond path - return last point
    return this.pathPoints[this.pathPoints.length - 1];
  }
  
  // Calculate total path length
  getTotalPathLength() {
    let total = 0;
    for (let i = 0; i < this.pathPoints.length - 1; i++) {
      const start = this.pathPoints[i];
      const end = this.pathPoints[i + 1];
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      total += Math.sqrt(dx * dx + dz * dz);
    }
    return total;
  }
  
  // Update ball positions along the path
  // Ball[0] = NEXT ball = at END of path (near dispenser)
  // Ball[n] = last ball = at START of path (far left)
  updateBallPositions() {
    const totalLength = this.getTotalPathLength();
    
    for (let i = 0; i < this.ballMeshes.length; i++) {
      const mesh = this.ballMeshes[i];
      // REVERSE: ball 0 at end, ball n at start
      const distanceFromEnd = i * this.ballSpacing;
      const distance = totalLength - distanceFromEnd;
      const pos = this.getPositionOnPath(Math.max(0, distance));
      
      mesh.position.set(pos.x, 0.4, pos.z);
    }
  }
  
  // Get the next ball color (front of queue)
  peekNext() {
    return this.queue[0] || null;
  }
  
  // Take the next ball from the queue
  takeNext() {
    if (this.queue.length === 0) return null;
    
    const colorName = this.queue.shift();
    
    // Remove first ball mesh
    if (this.ballMeshes.length > 0) {
      const mesh = this.ballMeshes.shift();
      this.group.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    
    // Update positions (balls slide forward)
    this.updateBallPositions();
    
    return colorName;
  }
  
  // EXPLOSIVE! Remove all balls of a specific color with effects!
  explodeColor(colorName, scene) {
    console.log(`💥 EXPLODING ALL ${colorName} BALLS IN QUEUE!`);
    
    const toRemove = [];
    const explosionPositions = [];
    
    // Find all balls of this color
    for (let i = this.ballMeshes.length - 1; i >= 0; i--) {
      const mesh = this.ballMeshes[i];
      if (mesh.userData.colorName === colorName) {
        explosionPositions.push({
          x: mesh.position.x,
          z: mesh.position.z
        });
        toRemove.push(i);
      }
    }
    
    // Remove from queue array and meshes (in reverse order to preserve indices)
    toRemove.forEach(index => {
      this.queue.splice(index, 1);
      const mesh = this.ballMeshes.splice(index, 1)[0];
      
      // Explosion animation
      this.createExplosionAt(mesh.position.x, mesh.position.z, scene);
      
      this.group.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    
    // Update remaining ball positions
    this.updateBallPositions();
    
    console.log(`Exploded ${toRemove.length} ${colorName} balls! ${this.queue.length} balls remaining.`);
    
    return toRemove.length;
  }
  
  // Create explosion particles at position
  createExplosionAt(x, z, scene) {
    const geometry = new THREE.BufferGeometry();
    const particleCount = 15;
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = x;
      positions[i * 3 + 1] = 0.4;
      positions[i * 3 + 2] = z;
      
      velocities.push({
        x: (Math.random() - 0.5) * 4,
        y: Math.random() * 3 + 1,
        z: (Math.random() - 0.5) * 4
      });
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      color: 0xffff00,
      size: 0.12,
      transparent: true,
      opacity: 1
    });
    
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    
    let frame = 0;
    const animate = () => {
      frame++;
      const posArray = particles.geometry.attributes.position.array;
      
      for (let i = 0; i < particleCount; i++) {
        posArray[i * 3] += velocities[i].x * 0.016;
        posArray[i * 3 + 1] += velocities[i].y * 0.016;
        velocities[i].y -= 8 * 0.016;
        posArray[i * 3 + 2] += velocities[i].z * 0.016;
      }
      
      particles.geometry.attributes.position.needsUpdate = true;
      material.opacity = 1 - (frame / 30);
      
      if (frame < 30) {
        requestAnimationFrame(animate);
      } else {
        scene.remove(particles);
        geometry.dispose();
        material.dispose();
      }
    };
    
    animate();
  }
  
  // Add to scene
  addToScene(scene) {
    scene.add(this.group);
  }
  
  removeFromScene(scene) {
    scene.remove(this.group);
  }
  
  // Get remaining count
  getCount() {
    return this.queue.length;
  }
  
  // Check if empty
  isEmpty() {
    return this.queue.length === 0;
  }
}

