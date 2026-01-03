import * as THREE from 'three';
import { 
  SCENE_BG_COLOR, 
  FLOOR_COLOR, 
  BRONZE_COLOR,
  COPPER_COLOR,
  GOLD_COLOR,
  DARK_METAL
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
    this.scene.background = new THREE.Color(SCENE_BG_COLOR);
    
    // Orthographic camera - ZOOM OUT MORE for mobile!
    const aspect = window.innerWidth / window.innerHeight;
    const isMobile = window.innerWidth < 768;
    // More zoom for portrait mode to fit everything!
    const frustumSize = aspect < 1 ? 45 : (isMobile ? 35 : 30);
    
    this.camera = new THREE.OrthographicCamera(
      -frustumSize * aspect / 2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      1000
    );
    
    // Top-down view
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
    
    console.log('⚙️ SceneManager initialized - STEAMPUNK MODE!');
  }
  
  setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    this.scene.add(ambient);
  }
  
  createFloor() {
    // ⚙️ STEAMPUNK MACHINERY FLOOR! ⚙️
    const floorGroup = new THREE.Group();
    
    // Dark base
    const baseGeom = new THREE.PlaneGeometry(100, 100);
    const baseMat = new THREE.MeshBasicMaterial({ color: SCENE_BG_COLOR });
    const base = new THREE.Mesh(baseGeom, baseMat);
    base.rotation.x = -Math.PI / 2;
    base.position.y = -0.2;
    floorGroup.add(base);
    
    // Metal plate pattern
    const plateSize = 4;
    for (let x = -10; x <= 10; x++) {
      for (let z = -10; z <= 10; z++) {
        const plateGeom = new THREE.PlaneGeometry(plateSize - 0.1, plateSize - 0.1);
        const shade = 0.8 + Math.random() * 0.2;
        const plateMat = new THREE.MeshBasicMaterial({ 
          color: new THREE.Color(FLOOR_COLOR).multiplyScalar(shade)
        });
        const plate = new THREE.Mesh(plateGeom, plateMat);
        plate.rotation.x = -Math.PI / 2;
        plate.position.set(x * plateSize, -0.15, z * plateSize);
        floorGroup.add(plate);
        
        // Rivets at corners
        if (Math.random() > 0.5) {
          const rivetGeom = new THREE.CircleGeometry(0.15, 8);
          const rivetMat = new THREE.MeshBasicMaterial({ color: COPPER_COLOR });
          const rivet = new THREE.Mesh(rivetGeom, rivetMat);
          rivet.rotation.x = -Math.PI / 2;
          rivet.position.set(
            x * plateSize + (plateSize/2 - 0.3) * (Math.random() > 0.5 ? 1 : -1),
            -0.12,
            z * plateSize + (plateSize/2 - 0.3) * (Math.random() > 0.5 ? 1 : -1)
          );
          floorGroup.add(rivet);
        }
      }
    }
    
    // Decorative background gears (non-interactive)
    this.addBackgroundGears(floorGroup);
    
    this.scene.add(floorGroup);
  }
  
  addBackgroundGears(parent) {
    // Add some decorative gears in corners
    const gearPositions = [
      { x: -18, z: -18, size: 3 },
      { x: 18, z: -18, size: 2.5 },
      { x: -18, z: 18, size: 2 },
      { x: 18, z: 18, size: 3.5 },
      { x: -20, z: 0, size: 2 },
      { x: 20, z: 0, size: 2.5 },
    ];
    
    gearPositions.forEach(pos => {
      const gearGroup = new THREE.Group();
      
      // Gear disc
      const discGeom = new THREE.CylinderGeometry(pos.size, pos.size, 0.2, 24);
      const discMat = new THREE.MeshBasicMaterial({ 
        color: DARK_METAL,
        transparent: true,
        opacity: 0.4
      });
      const disc = new THREE.Mesh(discGeom, discMat);
      gearGroup.add(disc);
      
      // Teeth
      const teethCount = Math.floor(pos.size * 5);
      for (let i = 0; i < teethCount; i++) {
        const angle = (i / teethCount) * Math.PI * 2;
        const toothGeom = new THREE.BoxGeometry(0.2, 0.25, 0.3);
        const toothMat = new THREE.MeshBasicMaterial({ 
          color: BRONZE_COLOR,
          transparent: true,
          opacity: 0.3
        });
        const tooth = new THREE.Mesh(toothGeom, toothMat);
        tooth.position.set(
          Math.cos(angle) * (pos.size + 0.1),
          0,
          Math.sin(angle) * (pos.size + 0.1)
        );
        tooth.rotation.y = -angle;
        gearGroup.add(tooth);
      }
      
      gearGroup.position.set(pos.x, -0.1, pos.z);
      parent.add(gearGroup);
    });
  }
  
  onResize() {
    const aspect = window.innerWidth / window.innerHeight;
    const isMobile = window.innerWidth < 768;
    const frustumSize = aspect < 1 ? 45 : (isMobile ? 35 : 30);
    
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

