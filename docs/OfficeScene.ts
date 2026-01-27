/**
 * NetOps Tower - 3D Office Scene
 * 
 * A low-poly 3D office environment built with Three.js.
 * Features interactive elements, day/night cycle, and cyberpunk aesthetics.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

// =============================================================================
// Types
// =============================================================================

interface SceneConfig {
  container: HTMLElement;
  floorLevel: number;
  timeOfDay: number; // 0-24
  onObjectClick?: (objectId: string) => void;
}

interface InteractiveObject {
  mesh: THREE.Mesh;
  id: string;
  type: 'desk' | 'coffee' | 'npc' | 'window' | 'whiteboard';
  hoverScale: number;
  onClick?: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const COLORS = {
  // Cyberpunk palette
  neonPink: 0xff0080,
  neonCyan: 0x00ffff,
  neonPurple: 0x8000ff,
  neonGreen: 0x00ff41,
  
  // Office colors
  deskWood: 0x4a3728,
  chairLeather: 0x2d2d2d,
  screenGlow: 0x00ff41,
  floorGray: 0x3a3a4a,
  wallDark: 0x1a1a2e,
  windowFrame: 0x4a4a5a,
  
  // Sky colors
  daySky: 0x87ceeb,
  nightSky: 0x0a0a1a,
  sunsetSky: 0xff6b4a,
};

// =============================================================================
// Main Scene Class
// =============================================================================

export class OfficeScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private controls: OrbitControls;
  private container: HTMLElement;
  
  private interactiveObjects: Map<string, InteractiveObject> = new Map();
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  
  private floorLevel: number;
  private timeOfDay: number;
  private animationId: number | null = null;
  
  private lights: {
    ambient: THREE.AmbientLight;
    sun: THREE.DirectionalLight;
    neonPink: THREE.PointLight;
    neonCyan: THREE.PointLight;
    monitors: THREE.PointLight[];
  };
  
  private onObjectClick?: (objectId: string) => void;
  
  constructor(config: SceneConfig) {
    this.container = config.container;
    this.floorLevel = config.floorLevel;
    this.timeOfDay = config.timeOfDay;
    this.onObjectClick = config.onObjectClick;
    
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this.init();
    this.createLights();
    this.createOffice();
    this.createCityView();
    this.setupPostProcessing();
    this.setupEventListeners();
    this.animate();
  }
  
  // ===========================================================================
  // Initialization
  // ===========================================================================
  
  private init(): void {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(COLORS.wallDark, 10, 50);
    
    // Camera
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.camera.position.set(5, 3, 5);
    this.camera.lookAt(0, 1, 0);
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.renderer.domElement);
    
    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 15;
    this.controls.maxPolarAngle = Math.PI / 2;
    this.controls.target.set(0, 1, 0);
  }
  
  // ===========================================================================
  // Lighting
  // ===========================================================================
  
  private createLights(): void {
    // Ambient light
    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambient);
    
    // Sun/moon directional light
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(10, 20, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 50;
    sun.shadow.camera.left = -10;
    sun.shadow.camera.right = 10;
    sun.shadow.camera.top = 10;
    sun.shadow.camera.bottom = -10;
    this.scene.add(sun);
    
    // Neon lights (for cyberpunk atmosphere)
    const neonPink = new THREE.PointLight(COLORS.neonPink, 0.5, 10);
    neonPink.position.set(-4, 2, 0);
    this.scene.add(neonPink);
    
    const neonCyan = new THREE.PointLight(COLORS.neonCyan, 0.5, 10);
    neonCyan.position.set(4, 2, 0);
    this.scene.add(neonCyan);
    
    // Monitor glow lights
    const monitors: THREE.PointLight[] = [];
    const monitorGlow = new THREE.PointLight(COLORS.screenGlow, 0.3, 3);
    monitorGlow.position.set(0, 1.5, -1);
    this.scene.add(monitorGlow);
    monitors.push(monitorGlow);
    
    this.lights = { ambient, sun, neonPink, neonCyan, monitors };
    
    // Update lighting based on time
    this.updateLighting();
  }
  
  private updateLighting(): void {
    const hour = this.timeOfDay;
    
    // Calculate sun intensity based on time
    let sunIntensity: number;
    let ambientIntensity: number;
    let neonIntensity: number;
    
    if (hour >= 6 && hour <= 18) {
      // Daytime
      const dayProgress = (hour - 6) / 12;
      sunIntensity = Math.sin(dayProgress * Math.PI) * 0.8 + 0.2;
      ambientIntensity = 0.4;
      neonIntensity = 0.2;
    } else {
      // Nighttime
      sunIntensity = 0.1;
      ambientIntensity = 0.2;
      neonIntensity = 0.8;
    }
    
    this.lights.sun.intensity = sunIntensity;
    this.lights.ambient.intensity = ambientIntensity;
    this.lights.neonPink.intensity = neonIntensity;
    this.lights.neonCyan.intensity = neonIntensity;
    
    // Update fog color
    if (hour >= 6 && hour <= 18) {
      this.scene.fog.color.setHex(COLORS.wallDark);
    } else {
      this.scene.fog.color.setHex(0x0a0a15);
    }
  }
  
  // ===========================================================================
  // Office Construction
  // ===========================================================================
  
  private createOffice(): void {
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(10, 10);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.floorGray,
      roughness: 0.8,
      metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    
    // Walls
    this.createWalls();
    
    // Desk
    this.createDesk();
    
    // Monitors
    this.createMonitors();
    
    // Chair
    this.createChair();
    
    // Window
    this.createWindow();
    
    // Coffee machine
    this.createCoffeeMachine();
    
    // Whiteboard
    this.createWhiteboard();
    
    // Decorations
    this.createDecorations();
  }
  
  private createWalls(): void {
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.wallDark,
      roughness: 0.9,
      metalness: 0.1
    });
    
    // Back wall
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(10, 4, 0.2),
      wallMaterial
    );
    backWall.position.set(0, 2, -5);
    backWall.receiveShadow = true;
    this.scene.add(backWall);
    
    // Left wall
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 4, 10),
      wallMaterial
    );
    leftWall.position.set(-5, 2, 0);
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);
    
    // Ceiling
    const ceiling = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.2, 10),
      wallMaterial
    );
    ceiling.position.set(0, 4, 0);
    this.scene.add(ceiling);
    
    // Add ceiling lights
    this.createCeilingLights();
  }
  
  private createCeilingLights(): void {
    const lightGeometry = new THREE.BoxGeometry(1.5, 0.05, 0.3);
    const lightMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.5
    });
    
    for (let x = -3; x <= 3; x += 3) {
      for (let z = -3; z <= 3; z += 3) {
        const light = new THREE.Mesh(lightGeometry, lightMaterial);
        light.position.set(x, 3.9, z);
        this.scene.add(light);
      }
    }
  }
  
  private createDesk(): void {
    const deskGroup = new THREE.Group();
    
    // Desktop
    const topGeometry = new THREE.BoxGeometry(2, 0.1, 1);
    const woodMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.deskWood,
      roughness: 0.6,
      metalness: 0.1
    });
    
    const desktop = new THREE.Mesh(topGeometry, woodMaterial);
    desktop.position.y = 0.75;
    desktop.castShadow = true;
    desktop.receiveShadow = true;
    deskGroup.add(desktop);
    
    // Legs
    const legGeometry = new THREE.BoxGeometry(0.1, 0.75, 0.1);
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.2
    });
    
    const legPositions = [
      [-0.9, 0.375, -0.4],
      [0.9, 0.375, -0.4],
      [-0.9, 0.375, 0.4],
      [0.9, 0.375, 0.4]
    ];
    
    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeometry, legMaterial);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      deskGroup.add(leg);
    });
    
    deskGroup.position.set(0, 0, -2);
    this.scene.add(deskGroup);
    
    // Make desk interactive
    this.registerInteractive('desk', desktop, 'desk', () => {
      if (this.onObjectClick) this.onObjectClick('desk');
    });
  }
  
  private createMonitors(): void {
    const monitorGroup = new THREE.Group();
    
    // Create 2 monitors side by side
    for (let i = 0; i < 2; i++) {
      const monitor = this.createSingleMonitor();
      monitor.position.x = (i - 0.5) * 0.7;
      monitor.rotation.y = (i - 0.5) * -0.2;
      monitorGroup.add(monitor);
    }
    
    monitorGroup.position.set(0, 0.8, -2.3);
    this.scene.add(monitorGroup);
  }
  
  private createSingleMonitor(): THREE.Group {
    const monitor = new THREE.Group();
    
    // Screen bezel
    const bezelGeometry = new THREE.BoxGeometry(0.6, 0.4, 0.02);
    const bezelMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.3,
      metalness: 0.8
    });
    
    const bezel = new THREE.Mesh(bezelGeometry, bezelMaterial);
    bezel.position.y = 0.3;
    monitor.add(bezel);
    
    // Screen (emissive for glow effect)
    const screenGeometry = new THREE.PlaneGeometry(0.55, 0.35);
    const screenMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0a15,
      emissive: COLORS.screenGlow,
      emissiveIntensity: 0.3
    });
    
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.set(0, 0.3, 0.011);
    monitor.add(screen);
    
    // Stand
    const standGeometry = new THREE.CylinderGeometry(0.02, 0.05, 0.2);
    const standMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.2
    });
    
    const stand = new THREE.Mesh(standGeometry, standMaterial);
    stand.position.y = 0.1;
    monitor.add(stand);
    
    // Base
    const baseGeometry = new THREE.BoxGeometry(0.2, 0.02, 0.15);
    const base = new THREE.Mesh(baseGeometry, standMaterial);
    monitor.add(base);
    
    return monitor;
  }
  
  private createChair(): void {
    const chairGroup = new THREE.Group();
    
    const leatherMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.chairLeather,
      roughness: 0.7,
      metalness: 0.1
    });
    
    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.2
    });
    
    // Seat
    const seatGeometry = new THREE.BoxGeometry(0.5, 0.1, 0.5);
    const seat = new THREE.Mesh(seatGeometry, leatherMaterial);
    seat.position.y = 0.5;
    seat.castShadow = true;
    chairGroup.add(seat);
    
    // Backrest
    const backGeometry = new THREE.BoxGeometry(0.5, 0.6, 0.1);
    const back = new THREE.Mesh(backGeometry, leatherMaterial);
    back.position.set(0, 0.8, -0.2);
    back.castShadow = true;
    chairGroup.add(back);
    
    // Base
    const baseGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.05);
    const base = new THREE.Mesh(baseGeometry, metalMaterial);
    base.position.y = 0.025;
    chairGroup.add(base);
    
    // Stem
    const stemGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.4);
    const stem = new THREE.Mesh(stemGeometry, metalMaterial);
    stem.position.y = 0.25;
    chairGroup.add(stem);
    
    // Wheels (simplified as a ring)
    const wheelGeometry = new THREE.TorusGeometry(0.2, 0.02, 8, 16);
    const wheel = new THREE.Mesh(wheelGeometry, metalMaterial);
    wheel.rotation.x = Math.PI / 2;
    chairGroup.add(wheel);
    
    chairGroup.position.set(0, 0, -1);
    this.scene.add(chairGroup);
  }
  
  private createWindow(): void {
    const windowGroup = new THREE.Group();
    
    // Window frame
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.windowFrame,
      metalness: 0.5,
      roughness: 0.3
    });
    
    // Outer frame
    const frameOuter = new THREE.Mesh(
      new THREE.BoxGeometry(4, 3, 0.1),
      frameMaterial
    );
    
    // Window glass (transparent)
    const glassMaterial = new THREE.MeshStandardMaterial({
      color: 0x87ceeb,
      transparent: true,
      opacity: 0.3,
      roughness: 0.1,
      metalness: 0.9
    });
    
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 2.8),
      glassMaterial
    );
    glass.position.z = 0.06;
    
    windowGroup.add(frameOuter);
    windowGroup.add(glass);
    
    // Frame dividers
    const dividerV = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 2.8, 0.12),
      frameMaterial
    );
    windowGroup.add(dividerV);
    
    const dividerH = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 0.05, 0.12),
      frameMaterial
    );
    windowGroup.add(dividerH);
    
    windowGroup.position.set(3, 2, -4.95);
    windowGroup.rotation.y = 0;
    this.scene.add(windowGroup);
    
    // Make window interactive (for looking outside)
    this.registerInteractive('window', glass, 'window', () => {
      if (this.onObjectClick) this.onObjectClick('window');
    });
  }
  
  private createCoffeeMachine(): void {
    const coffeeGroup = new THREE.Group();
    
    const machineMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a3a,
      metalness: 0.8,
      roughness: 0.2
    });
    
    // Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.5, 0.3),
      machineMaterial
    );
    body.position.y = 0.75;
    body.castShadow = true;
    coffeeGroup.add(body);
    
    // Screen/display
    const screenMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0a15,
      emissive: COLORS.neonCyan,
      emissiveIntensity: 0.3
    });
    
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.15, 0.08),
      screenMaterial
    );
    screen.position.set(0, 0.85, 0.151);
    coffeeGroup.add(screen);
    
    // Drip tray
    const tray = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.02, 0.15),
      machineMaterial
    );
    tray.position.set(0, 0.51, 0.1);
    coffeeGroup.add(tray);
    
    coffeeGroup.position.set(-4, 0.5, -2);
    this.scene.add(coffeeGroup);
    
    // Make coffee machine interactive
    this.registerInteractive('coffee', body, 'coffee', () => {
      if (this.onObjectClick) this.onObjectClick('coffee');
    });
  }
  
  private createWhiteboard(): void {
    const boardGroup = new THREE.Group();
    
    // Board
    const boardMaterial = new THREE.MeshStandardMaterial({
      color: 0xfafafa,
      roughness: 0.5,
      metalness: 0.1
    });
    
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(2, 1.5, 0.05),
      boardMaterial
    );
    board.position.y = 1.75;
    board.castShadow = true;
    boardGroup.add(board);
    
    // Frame
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a4a4a,
      metalness: 0.6,
      roughness: 0.3
    });
    
    const frameGeometry = new THREE.BoxGeometry(2.1, 0.05, 0.1);
    const topFrame = new THREE.Mesh(frameGeometry, frameMaterial);
    topFrame.position.y = 2.5;
    boardGroup.add(topFrame);
    
    const bottomFrame = new THREE.Mesh(frameGeometry, frameMaterial);
    bottomFrame.position.y = 1;
    boardGroup.add(bottomFrame);
    
    // Marker tray
    const tray = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.03, 0.1),
      frameMaterial
    );
    tray.position.set(0, 0.95, 0.07);
    boardGroup.add(tray);
    
    boardGroup.position.set(-4.9, 0, 1);
    boardGroup.rotation.y = Math.PI / 2;
    this.scene.add(boardGroup);
    
    this.registerInteractive('whiteboard', board, 'whiteboard', () => {
      if (this.onObjectClick) this.onObjectClick('whiteboard');
    });
  }
  
  private createDecorations(): void {
    // Potted plant
    this.createPlant(-3.5, 0, 3);
    
    // Stack of books on desk
    this.createBooks(0.8, 0.8, -2.2);
    
    // Coffee mug on desk
    this.createMug(-0.7, 0.8, -1.8);
    
    // Keyboard and mouse
    this.createKeyboardMouse(0, 0.8, -1.8);
  }
  
  private createPlant(x: number, y: number, z: number): void {
    const plantGroup = new THREE.Group();
    
    // Pot
    const potMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.8
    });
    
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.12, 0.25, 8),
      potMaterial
    );
    pot.position.y = 0.125;
    pot.castShadow = true;
    plantGroup.add(pot);
    
    // Dirt
    const dirt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.05, 8),
      new THREE.MeshStandardMaterial({ color: 0x3d2817 })
    );
    dirt.position.y = 0.25;
    plantGroup.add(dirt);
    
    // Simple low-poly leaves
    const leafMaterial = new THREE.MeshStandardMaterial({
      color: 0x228b22,
      roughness: 0.8
    });
    
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.Mesh(
        new THREE.ConeGeometry(0.1, 0.3, 4),
        leafMaterial
      );
      leaf.position.set(
        Math.cos(i * Math.PI * 0.4) * 0.05,
        0.4 + i * 0.05,
        Math.sin(i * Math.PI * 0.4) * 0.05
      );
      leaf.rotation.set(
        Math.random() * 0.3 - 0.15,
        i * Math.PI * 0.4,
        Math.random() * 0.3 - 0.15
      );
      plantGroup.add(leaf);
    }
    
    plantGroup.position.set(x, y, z);
    this.scene.add(plantGroup);
  }
  
  private createBooks(x: number, y: number, z: number): void {
    const colors = [0x1a365d, 0x742a2a, 0x22543d];
    
    colors.forEach((color, i) => {
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.03, 0.2),
        new THREE.MeshStandardMaterial({ color, roughness: 0.7 })
      );
      book.position.set(x, y + i * 0.035, z);
      book.rotation.y = (Math.random() - 0.5) * 0.2;
      book.castShadow = true;
      this.scene.add(book);
    });
  }
  
  private createMug(x: number, y: number, z: number): void {
    const mugGroup = new THREE.Group();
    
    const mugMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      roughness: 0.5
    });
    
    // Mug body
    const mug = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.035, 0.1, 16),
      mugMaterial
    );
    mug.position.y = 0.05;
    mugGroup.add(mug);
    
    // Handle (torus)
    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.025, 0.008, 8, 16, Math.PI),
      mugMaterial
    );
    handle.position.set(0.045, 0.05, 0);
    handle.rotation.y = Math.PI / 2;
    mugGroup.add(handle);
    
    // Coffee inside
    const coffee = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16),
      new THREE.MeshStandardMaterial({ color: 0x3d2817 })
    );
    coffee.position.y = 0.08;
    mugGroup.add(coffee);
    
    mugGroup.position.set(x, y, z);
    this.scene.add(mugGroup);
  }
  
  private createKeyboardMouse(x: number, y: number, z: number): void {
    // Keyboard
    const keyboard = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.02, 0.12),
      new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.5,
        metalness: 0.3
      })
    );
    keyboard.position.set(x, y + 0.01, z);
    keyboard.castShadow = true;
    this.scene.add(keyboard);
    
    // Mouse
    const mouse = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.02, 0.08),
      new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
        roughness: 0.4,
        metalness: 0.5
      })
    );
    mouse.position.set(x + 0.3, y + 0.01, z);
    mouse.castShadow = true;
    this.scene.add(mouse);
  }
  
  // ===========================================================================
  // City View
  // ===========================================================================
  
  private createCityView(): void {
    const cityGroup = new THREE.Group();
    
    // Create distant buildings visible through window
    const buildingCount = 50;
    
    for (let i = 0; i < buildingCount; i++) {
      const height = 2 + Math.random() * 15;
      const width = 0.5 + Math.random() * 1.5;
      const depth = 0.5 + Math.random() * 1.5;
      
      const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
      const buildingMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.6, 0.2, 0.1 + Math.random() * 0.1),
        roughness: 0.8,
        metalness: 0.2
      });
      
      const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
      
      // Position buildings outside the window
      const angle = (i / buildingCount) * Math.PI - Math.PI / 2;
      const distance = 15 + Math.random() * 30;
      building.position.set(
        Math.cos(angle) * distance + 3,
        height / 2 - 5 + this.floorLevel * 0.1,
        -Math.sin(angle) * distance - 10
      );
      
      // Add window lights
      this.addBuildingWindows(building, width, height, depth);
      
      cityGroup.add(building);
    }
    
    this.scene.add(cityGroup);
    
    // Skybox/background
    this.createSkybox();
  }
  
  private addBuildingWindows(building: THREE.Mesh, width: number, height: number, depth: number): void {
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0xffff88,
      emissive: 0xffff44,
      emissiveIntensity: this.timeOfDay < 6 || this.timeOfDay > 18 ? 0.5 : 0.1
    });
    
    const windowRows = Math.floor(height / 0.5);
    const windowCols = Math.floor(width / 0.3);
    
    for (let row = 0; row < windowRows; row++) {
      for (let col = 0; col < windowCols; col++) {
        // Random window lighting
        if (Math.random() > 0.3) {
          const window = new THREE.Mesh(
            new THREE.PlaneGeometry(0.15, 0.25),
            windowMaterial
          );
          
          window.position.set(
            building.position.x + (col - windowCols / 2) * 0.3,
            building.position.y - height / 2 + (row + 0.5) * 0.5,
            building.position.z + depth / 2 + 0.01
          );
          
          building.parent?.add(window);
        }
      }
    }
  }
  
  private createSkybox(): void {
    // Simple gradient sky
    const skyGeometry = new THREE.SphereGeometry(200, 32, 32);
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0a0a1a) },
        bottomColor: { value: new THREE.Color(0x1a1a3a) },
        offset: { value: 33 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide
    });
    
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(sky);
  }
  
  // ===========================================================================
  // Post Processing
  // ===========================================================================
  
  private setupPostProcessing(): void {
    this.composer = new EffectComposer(this.renderer);
    
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.5,  // strength
      0.4,  // radius
      0.85  // threshold
    );
    this.composer.addPass(bloomPass);
  }
  
  // ===========================================================================
  // Interactivity
  // ===========================================================================
  
  private registerInteractive(
    id: string, 
    mesh: THREE.Mesh, 
    type: InteractiveObject['type'],
    onClick?: () => void
  ): void {
    this.interactiveObjects.set(id, {
      mesh,
      id,
      type,
      hoverScale: 1.05,
      onClick
    });
    
    // Store reference in mesh for raycasting
    (mesh as any).interactiveId = id;
  }
  
  private setupEventListeners(): void {
    // Window resize
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // Mouse events
    this.renderer.domElement.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.renderer.domElement.addEventListener('click', this.handleClick.bind(this));
  }
  
  private handleResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  }
  
  private handleMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Update cursor based on hover
    this.updateHoverState();
  }
  
  private updateHoverState(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const meshes = Array.from(this.interactiveObjects.values()).map(o => o.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);
    
    // Reset all
    this.interactiveObjects.forEach(obj => {
      obj.mesh.scale.setScalar(1);
    });
    
    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Mesh;
      const id = (hit as any).interactiveId;
      const obj = this.interactiveObjects.get(id);
      
      if (obj) {
        obj.mesh.scale.setScalar(obj.hoverScale);
        this.renderer.domElement.style.cursor = 'pointer';
      }
    } else {
      this.renderer.domElement.style.cursor = 'default';
    }
  }
  
  private handleClick(event: MouseEvent): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const meshes = Array.from(this.interactiveObjects.values()).map(o => o.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);
    
    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Mesh;
      const id = (hit as any).interactiveId;
      const obj = this.interactiveObjects.get(id);
      
      if (obj && obj.onClick) {
        obj.onClick();
      }
    }
  }
  
  // ===========================================================================
  // Animation
  // ===========================================================================
  
  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));
    
    // Update controls
    this.controls.update();
    
    // Animate neon lights
    const time = Date.now() * 0.001;
    this.lights.neonPink.intensity = 0.4 + Math.sin(time * 2) * 0.1;
    this.lights.neonCyan.intensity = 0.4 + Math.cos(time * 2.5) * 0.1;
    
    // Render with post-processing
    this.composer.render();
  }
  
  // ===========================================================================
  // Public Methods
  // ===========================================================================
  
  public setTimeOfDay(hour: number): void {
    this.timeOfDay = hour;
    this.updateLighting();
  }
  
  public setFloorLevel(floor: number): void {
    this.floorLevel = floor;
    // Rebuild city view at new height
    // (simplified - in real implementation, adjust building positions)
  }
  
  public focusOnObject(objectId: string): void {
    const obj = this.interactiveObjects.get(objectId);
    if (obj) {
      // Animate camera to focus on object
      const targetPosition = new THREE.Vector3();
      obj.mesh.getWorldPosition(targetPosition);
      
      // Smooth camera movement would use GSAP or similar
      this.controls.target.copy(targetPosition);
    }
  }
  
  public dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    window.removeEventListener('resize', this.handleResize.bind(this));
    
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}

// =============================================================================
// Export
// =============================================================================

export default OfficeScene;
