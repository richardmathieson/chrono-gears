import * as THREE from 'three';
import {
  DESERT_SAND,
  DESERT_DARK,
  BUILDING_TAN,
  METAL_GRAY
} from '../utils/constants.js';

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
  }
  
  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(DESERT_SAND);

    // Orthographic camera - Desert Strike style top-down view!
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 25; // Tighter view to fit everything

    this.camera = new THREE.OrthographicCamera(
      -frustumSize * aspect / 2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      1000
    );

    // Top-down isometric-ish view
    this.camera.position.set(0, 50, 8);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.setupLighting();
    this.createFloor();

    window.addEventListener('resize', () => this.onResize());

    console.log('🚁 SceneManager initialized - DESERT STRIKE MODE!');
  }
  
  setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    this.scene.add(ambient);
  }
  
  createFloor() {
    // 🚁 DESERT FLOOR! 🚁
    const floorGroup = new THREE.Group();

    // Sandy base
    const baseGeom = new THREE.PlaneGeometry(100, 100);
    const baseMat = new THREE.MeshBasicMaterial({ color: DESERT_SAND });
    const base = new THREE.Mesh(baseGeom, baseMat);
    base.rotation.x = -Math.PI / 2;
    base.position.y = -0.2;
    floorGroup.add(base);

    // Sandy patches for texture
    for (let i = 0; i < 40; i++) {
      const patchSize = 2 + Math.random() * 3;
      const patchGeom = new THREE.CircleGeometry(patchSize, 8);
      const shade = 0.85 + Math.random() * 0.15;
      const patchMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(DESERT_DARK).multiplyScalar(shade),
        transparent: true,
        opacity: 0.3
      });
      const patch = new THREE.Mesh(patchGeom, patchMat);
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(
        (Math.random() - 0.5) * 60,
        -0.18,
        (Math.random() - 0.5) * 60
      );
      floorGroup.add(patch);
    }

    // Desert buildings!
    this.addDesertBuildings(floorGroup);

    this.scene.add(floorGroup);
  }
  
  addDesertBuildings(parent) {
    // Desert Strike style buildings scattered around
    const buildingPositions = [
      { x: -15, z: -12, w: 3, h: 2, d: 3 },
      { x: 15, z: -12, w: 2.5, h: 3, d: 2.5 },
      { x: -16, z: 10, w: 2, h: 2.5, d: 2 },
      { x: 14, z: 12, w: 3.5, h: 2, d: 2.5 },
      { x: -18, z: 0, w: 2, h: 1.5, d: 2 },
      { x: 17, z: 2, w: 2.5, h: 2, d: 2.5 },
    ];

    buildingPositions.forEach(pos => {
      const buildingGroup = new THREE.Group();

      // Main building
      const buildingGeom = new THREE.BoxGeometry(pos.w, pos.h, pos.d);
      const buildingMat = new THREE.MeshBasicMaterial({
        color: BUILDING_TAN
      });
      const building = new THREE.Mesh(buildingGeom, buildingMat);
      building.position.y = pos.h / 2;
      buildingGroup.add(building);

      // Roof (flat)
      const roofGeom = new THREE.BoxGeometry(pos.w + 0.3, 0.2, pos.d + 0.3);
      const roofMat = new THREE.MeshBasicMaterial({
        color: DESERT_DARK
      });
      const roof = new THREE.Mesh(roofGeom, roofMat);
      roof.position.y = pos.h;
      buildingGroup.add(roof);

      // Windows (dark squares)
      const windowCount = Math.floor(Math.random() * 2) + 1;
      for (let i = 0; i < windowCount; i++) {
        const windowGeom = new THREE.PlaneGeometry(0.3, 0.4);
        const windowMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
        const window1 = new THREE.Mesh(windowGeom, windowMat);
        window1.position.set((pos.w / 2) + 0.01, pos.h * 0.6, (i - 0.5) * 0.8);
        window1.rotation.y = -Math.PI / 2;
        buildingGroup.add(window1);
      }

      buildingGroup.position.set(pos.x, 0, pos.z);
      parent.add(buildingGroup);
    });
  }
  
  onResize() {
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 25;

    this.camera.left = -frustumSize * aspect / 2;
    this.camera.right = frustumSize * aspect / 2;
    this.camera.top = frustumSize / 2;
    this.camera.bottom = -frustumSize / 2;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

