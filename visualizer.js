/**
 * Audio Visualizer Class
 * 
 * This class creates an interactive 3D audio visualizer using Three.js.
 * It supports multiple visualization styles and responds to audio input.
*/
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
//import { Raycaster } from 'three';
//import { RGBELoader } from 'https://unpkg.com/three@0.161.0/examples/jsm/loaders/RGBELoader.js';

class Visualizer {
    /**
     * Initialize the visualizer with default settings and properties
    */

    constructor() {
        // Three.js scene setup
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });

        // Audio processing properties
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = new Uint8Array(128);

        // Visualizer elements
        this.bars = [];
        this.particles = [];
        this.towers = [];
        this.groundPlane = null;
        this.cloudLayers = [];

        // State management
        this.isPlaying = false;
        this.currentStyle = 'bars';
        this.audioFiles = [];
        this.currentTrackIndex = 0;
        this.currentTime = 0;
        this.updateInterval = null;

        // Controls and timing
        this.orbitControls = null;
        this.clock = new THREE.Clock();

        // Ink visualizer properties
        this.inkSystem = null;
        this.inkParticles = [];
        this.inkVelocities = [];
        this.inkAges = [];
        this.paperTexture = null;
        this.inkTargets = [];

        // Wave visualizer properties
        this.waveGeometry1 = null;
        this.waveGeometry2 = null;
        this.waveMaterial = null;
        this.waveMesh1 = null;
        this.waveMesh2 = null;
        this.waveSegments = [];
        this.segmentWidth = 200;
        this.segmentHeight = 100;
        this.segmentSegments = 100;
        this.numSegments = 3;
        this.segmentSpacing = 150;

        // Cloud control properties
        this.cloudSettings = {
            height: 10,
            opacity: 0.8,
            movementSpeed: 0.1,
            audioReactivity: 0.2,
            threshold: 0.4
        };

        // Initialize the visualizer
        this.init();
        this.setupControls();
        this.createVisualizer();
        this.animate();
    }

    /**
     * Initialize the Three.js scene, camera, renderer, and lights
    */

    init() {
        // Set up renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);

        // Set up camera
        this.camera.position.z = 15;
        this.camera.lookAt(0, 0, 0);

        // Set up lights
        const ambientLight = new THREE.AmbientLight(0xcccccc, 0.3);
        this.scene.add(ambientLight);

        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
        this.sunLight.position.set(-100, 50, 100);
        this.scene.add(this.sunLight);

        // Set up orbit controls
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.enableDamping = true;
        this.orbitControls.dampingFactor = 0.05;
        this.orbitControls.screenSpacePanning = false;
        this.orbitControls.minDistance = 5;
        this.orbitControls.maxDistance = 100;
        this.orbitControls.maxPolarAngle = Math.PI / 2;
        this.orbitControls.enabled = false;

        // Set default paper color
        this.paperColor = new THREE.Color(0xF5E8C8);

        // Set up window resize handler
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Create initial visualizer
        this.createVisualizer();
    }

    /**
     * Set up event listeners for controls (play/pause, next/prev, file upload)
    */

    setupControls() {
        const audioInput = document.getElementById('audio-input');
        const playPauseBtn = document.getElementById('play-pause');
        const nextBtn = document.getElementById('next');
        const prevBtn = document.getElementById('prev');
        const visualizerStyle = document.getElementById('visualizer-style');

        // Initialize audio context on first user interaction
        const initAudioContext = () => {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.analyser = this.audioContext.createAnalyser();
                this.setupAudio();
            }
        };

        // Handle file selection
        audioInput.addEventListener('change', (event) => {
            initAudioContext();
            const files = event.target.files;
            this.audioFiles = Array.from(files);
            if (this.audioFiles.length > 0) {
                this.currentTrackIndex = 0;
                this.loadAudioFile(this.audioFiles[0]);
            }
        });

        // Handle play/pause
        playPauseBtn.addEventListener('click', () => {
            initAudioContext();
            if (!this.audioContext) return;

            if (this.isPlaying) {
                if (this.source) {
                    this.source.stop();
                    this.source.disconnect();
                    this.source = null;
                }
                this.isPlaying = false;
                playPauseBtn.textContent = 'Play';
                if (this.updateInterval) {
                    clearInterval(this.updateInterval);
                }
            } else {
                this.createSourceNode();
                this.source.start(0);
                this.startTime = this.audioContext.currentTime;
                this.isPlaying = true;
                playPauseBtn.textContent = 'Pause';
                this.updateInterval = setInterval(() => this.updateProgress(), 100);
            }
        });

        // Handle next/previous
        nextBtn.addEventListener('click', () => {
            if (this.isPlaying) {
                this.source.stop();
                if (this.updateInterval) {
                    clearInterval(this.updateInterval);
                }
            }
            this.playNextTrack();
        });

        prevBtn.addEventListener('click', () => {
            if (this.isPlaying) {
                this.source.stop();
                if (this.updateInterval) {
                    clearInterval(this.updateInterval);
                }
            }
            this.playPreviousTrack();
        });

        // Handle visualizer style change
        visualizerStyle.addEventListener('change', (event) => {
            this.currentStyle = event.target.value;
            this.createVisualizer();
        });
    }

    /**
     * Set up audio analyzer with appropriate settings
    */

    setupAudio() {
        if (!this.analyser) return;
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.8;
    }

    /**
     * Format time in seconds to MM:SS format
    */

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    /**
     * Update the progress bar and time display
    */

    updateProgress() {
        if (this.source && this.audioBuffer) {
            this.currentTime = this.audioContext.currentTime - this.startTime;
            const progress = (this.currentTime / this.audioBuffer.duration) * 100;
            document.querySelector('.progress').style.width = `${progress}%`;
            document.getElementById('current-time').textContent = this.formatTime(this.currentTime);

            if (this.currentTime >= this.audioBuffer.duration) {
                this.playNextTrack();
            }
        }
    }

    /**
     * Load and decode an audio file
    */

    loadAudioFile(file) {
        if (!this.audioContext) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            this.audioContext.decodeAudioData(event.target.result, (buffer) => {
                this.audioBuffer = buffer;
                this.createSourceNode();
                this.isPlaying = false;
                document.getElementById('play-pause').textContent = 'Play';
                document.getElementById('total-time').textContent = this.formatTime(buffer.duration);
                this.currentTime = 0;
                document.querySelector('.progress').style.width = '0%';
                document.getElementById('current-time').textContent = '0:00';
            });
        };
        reader.readAsArrayBuffer(file);
    }

    /**
     * Play the next track in the playlist
    */

    playNextTrack() {
        if (this.audioFiles.length > 0) {
            this.currentTrackIndex = (this.currentTrackIndex + 1) % this.audioFiles.length;
            this.loadAudioFile(this.audioFiles[this.currentTrackIndex]);
            if (this.isPlaying) {
                this.createSourceNode();
                this.source.start(0);
                this.startTime = this.audioContext.currentTime;
            }
        }
    }

    /**
     * Play the previous track in the playlist
    */

    playPreviousTrack() {
        if (this.audioFiles.length > 0) {
            this.currentTrackIndex = (this.currentTrackIndex - 1 + this.audioFiles.length) % this.audioFiles.length;
            this.loadAudioFile(this.audioFiles[this.currentTrackIndex]);
            if (this.isPlaying) {
                this.createSourceNode();
                this.source.start(0);
                this.startTime = this.audioContext.currentTime;
            }
        }
    }

    /**
     * Create the current visualizer based on the selected style
    */

    createVisualizer() {
        this.clearScene();

        // Set up basic scene
        this.camera.position.set(0, 10, 20);
        this.camera.lookAt(0, 0, 0);
        this.scene.background = new THREE.Color(0x000005);
        this.orbitControls.enabled = false;
        this.orbitControls.target.set(0, 0, 0);

        // Create visualizer based on current style
        switch (this.currentStyle) {
            case 'bars':
                this.createBars();
                break;
            case 'points':
                this.createPointsVisualizer();
                break;
            case 'towers':
                this.createTowersVisualizer();
                // Set camera to low flying car position
                this.camera.position.set(0, 2, 10);
                this.camera.lookAt(0, 1, 0);
                break;
            case 'wave':
                this.createWaveVisualizer();
                this.camera.position.set(0, 0, 30);
                this.camera.lookAt(0, 0, 0);
                break;
        }

        // Ensure initial render
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Clean up the current visualizer before creating a new one
    */

    clearScene() {
        // Remove all visualizer elements
        this.bars.forEach(bar => this.scene.remove(bar));
        this.particles.forEach(particle => this.scene.remove(particle));
        this.towers.forEach(tower => this.scene.remove(tower));

        if (this.groundPlane) {
            this.scene.remove(this.groundPlane);
            this.groundPlane = null;
        }

        // Remove cloud layers
        this.cloudLayers.forEach(layer => this.scene.remove(layer));
        this.cloudLayers = [];

        // Reset arrays
        this.bars = [];
        this.particles = [];
        this.towers = [];

        // Clean up ink system elements
        if (this.inkSystem) {
            this.scene.remove(this.inkSystem);
            this.inkSystem.geometry.dispose();
            this.inkSystem.material.dispose();
        }
        this.inkSystem = null;
        this.inkParticles = [];
        this.inkVelocities = [];
        this.inkAges = [];
        this.inkTargets = [];

        // Reset background
        this.scene.background = new THREE.Color(0x000005);

        // Clean up wave visualizer elements
        if (this.waveMesh1) {
            this.scene.remove(this.waveMesh1);
            this.waveMesh1.geometry.dispose();
            this.waveMesh1 = null;
        }
        if (this.waveMesh2) {
            this.scene.remove(this.waveMesh2);
            this.waveMesh2.geometry.dispose();
            this.waveMesh2 = null;
        }
        if (this.waveMaterial) {
            this.waveMaterial.dispose();
            this.waveMaterial = null;
        }
        if (this.waveGeometry1) {
            this.waveGeometry1.dispose();
            this.waveGeometry1 = null;
        }
        if (this.waveGeometry2) {
            this.waveGeometry2.dispose();
            this.waveGeometry2 = null;
        }

        if (this.waveSegments) {
            this.waveSegments.forEach(segment => {
                this.scene.remove(segment);
                segment.geometry.dispose();
                segment.material.dispose();
            });
            this.waveSegments = [];
        }

        // Clean up points visualizer elements
        if (this.pointsMesh) {
            this.scene.remove(this.pointsMesh);
            this.pointsMesh.geometry.dispose();
            this.pointsMesh.material.dispose();
            this.pointsMesh = null;
        }
    }

    /**
     * Create the bars visualizer
     * Creates a set of vertical bars that react to audio frequencies
    */

    createBars() {
        const barCount = 64;
        const barWidth = 0.2;
        const barHeight = 1;
        const spacing = 0.3;
        const totalWidth = (barCount - 1) * (barWidth + spacing);
        const startX = -totalWidth / 2;

        // Create bars with initial properties
        for (let i = 0; i < barCount; i++) {
            const geometry = new THREE.BoxGeometry(barWidth, barHeight, 1);
            const material = new THREE.MeshPhongMaterial({
                color: 0x00ff00,
                shininess: 100
            });
            const bar = new THREE.Mesh(geometry, material);
            bar.position.x = startX + i * (barWidth + spacing);
            bar.position.y = 0;
            this.scene.add(bar);
            this.bars.push(bar);
        }
    }

    /**
     * Create the points visualizer
     * Creates a sphere of points that react to audio with dynamic movement
    */

    createPointsVisualizer() {
        // Create a large number of points
        const pointCount = 15000;
        const positions = new Float32Array(pointCount * 3);
        const colors = new Float32Array(pointCount * 3);
        const sizes = new Float32Array(pointCount);

        // Initialize points with random positions and colors
        const color = new THREE.Color();
        for (let i = 0; i < pointCount; i++) {
            const i3 = i * 3;

            // Random positions in a sphere
            const radius = 50;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = radius * Math.cos(phi);

            // Random colors
            color.setHSL(Math.random(), 0.8, 0.5);
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;

            // Random sizes
            sizes[i] = Math.random() * 2;
        }

        // Create geometry with point attributes
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        // Create shader material for points
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                audioLevel: { value: 0 },
                pointTexture: { value: new THREE.TextureLoader().load('https://threejs.org/examples/textures/sprites/disc.png') }
            },
            vertexShader: `
                attribute float size;
                varying vec3 vColor;
                uniform float time;
                uniform float audioLevel;
                
                void main() {
                    vColor = color;
                    
                    // Get vertex position
                    vec3 pos = position;
                    
                    // Add some movement based on audio
                    float movement = sin(time + pos.x * 0.1) * cos(time + pos.y * 0.1) * audioLevel * 2.0;
                    pos += pos * movement * 0.1;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z) * (1.0 + audioLevel);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform sampler2D pointTexture;
                varying vec3 vColor;
                
                void main() {
                    vec2 center = vec2(0.5, 0.5);
                    float dist = length(gl_PointCoord - center);
                    
                    // Create soft, glowing points
                    float alpha = 1.0 - smoothstep(0.4, 0.5, dist);
                    
                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            transparent: true,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        // Create points mesh
        this.pointsMesh = new THREE.Points(geometry, material);
        this.scene.add(this.pointsMesh);

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);

        // Set initial camera position
        this.camera.position.set(0, 0, 100);
        this.camera.lookAt(0, 0, 0);
    }

    /**
     * Create the wave visualizer
     * Creates two layers of points that form a wave pattern reacting to audio
    */

    createWaveVisualizer() {
        // Create a large grid of points
        const width = 200;
        const height = 100;
        const segments = 100;
        const pointCount = segments * segments;

        // Create arrays for both layers
        const positions1 = new Float32Array(pointCount * 3);
        const positions2 = new Float32Array(pointCount * 3);
        const colors1 = new Float32Array(pointCount * 3);
        const colors2 = new Float32Array(pointCount * 3);
        const sizes1 = new Float32Array(pointCount);
        const sizes2 = new Float32Array(pointCount);

        // Initialize points for both layers
        for (let i = 0; i < segments; i++) {
            for (let j = 0; j < segments; j++) {
                const index = (i * segments + j) * 3;

                // First layer (blue)
                positions1[index] = (i - segments / 2) * (width / segments);
                positions1[index + 1] = (j - segments / 2) * (height / segments);
                positions1[index + 2] = 0;
                colors1[index] = 0.0;
                colors1[index + 1] = 0.5;
                colors1[index + 2] = 1.0;
                sizes1[i * segments + j] = 1.0;

                // Second layer (purple/red) - slightly offset
                positions2[index] = positions1[index] + 0.5;
                positions2[index + 1] = positions1[index + 1] + 0.5;
                positions2[index + 2] = 0;
                colors2[index] = 1.0;
                colors2[index + 1] = 0.2;
                colors2[index + 2] = 0.5;
                sizes2[i * segments + j] = 0.8;
            }
        }

        // Create geometries for both layers
        this.waveGeometry1 = new THREE.BufferGeometry();
        this.waveGeometry1.setAttribute('position', new THREE.BufferAttribute(positions1, 3));
        this.waveGeometry1.setAttribute('color', new THREE.BufferAttribute(colors1, 3));
        this.waveGeometry1.setAttribute('size', new THREE.BufferAttribute(sizes1, 1));

        this.waveGeometry2 = new THREE.BufferGeometry();
        this.waveGeometry2.setAttribute('position', new THREE.BufferAttribute(positions2, 3));
        this.waveGeometry2.setAttribute('color', new THREE.BufferAttribute(colors2, 3));
        this.waveGeometry2.setAttribute('size', new THREE.BufferAttribute(sizes2, 1));

        // Create shared shader material
        this.waveMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                audioLevel: { value: 0 },
                pointTexture: { value: new THREE.TextureLoader().load('https://threejs.org/examples/textures/sprites/disc.png') }
            },
            vertexShader: `
                attribute float size;
                varying vec3 vColor;
                uniform float time;
                uniform float audioLevel;
                
                void main() {
                    vColor = color;
                    
                    // Get vertex position
                    vec3 pos = position;
                    
                    // Create wave effect with phase offset for second layer
                    float wave = sin(pos.x * 0.1 + time) * cos(pos.y * 0.1 + time);
                    wave *= 2.0 + audioLevel * 3.0;
                    
                    // Add some noise
                    float noise = fract(sin(dot(pos.xy, vec2(12.9898, 78.233))) * 43758.5453);
                    wave += noise * 0.5 * audioLevel;
                    
                    // Apply wave to vertex
                    pos.z = wave;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z) * (1.0 + audioLevel * 0.5);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform sampler2D pointTexture;
                varying vec3 vColor;
                
                void main() {
                    vec2 center = vec2(0.5, 0.5);
                    float dist = length(gl_PointCoord - center);
                    
                    // Create soft, glowing points
                    float alpha = 1.0 - smoothstep(0.4, 0.5, dist);
                    
                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            transparent: true,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        // Create points meshes for both layers
        this.waveMesh1 = new THREE.Points(this.waveGeometry1, this.waveMaterial);
        this.waveMesh2 = new THREE.Points(this.waveGeometry2, this.waveMaterial);
        this.scene.add(this.waveMesh1);
        this.scene.add(this.waveMesh2);

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);

        // Set camera position
        this.camera.position.set(0, 15, 30);
        this.camera.lookAt(0, 0, 0);
    }

    /**
     * Create the towers visualizer
     * Creates a grid of towers that react to audio with height and color changes
    */

    createTowersVisualizer() {
        this.towers = [];
        this.cloudLayers = [];

        // Set up scene properties
        this.scene.fog = null;
        this.scene.background = new THREE.Color(0x000000);

        // Configure grid settings
        const planeSize = 150;
        const viewDistance = 75;
        this.towerGridSettings = {
            gridSize: 20,
            spacing: planeSize / 20,
            towerBaseSize: 2.0,
            baseTowerHeight: 0.1,
            planeSize: planeSize,
            wrapDistanceZ: viewDistance
        };
        const gs = this.towerGridSettings;

        // Create ground plane
        const planeGeometry = new THREE.PlaneGeometry(gs.planeSize * 2, gs.planeSize * 2);
        const planeMaterial = new THREE.MeshPhongMaterial({
            color: 0x050508,
            shininess: 50,
            specular: 0x111111
        });
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = -gs.baseTowerHeight / 2;
        this.scene.add(plane);
        this.groundPlane = plane;

        // Create towers in a grid
        for (let x = 0; x < gs.gridSize; x++) {
            for (let z = 0; z < gs.gridSize * 2; z++) {
                const geometry = new THREE.BoxGeometry(gs.towerBaseSize, gs.baseTowerHeight, gs.towerBaseSize);
                const material = new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    metalness: 0.1,
                    roughness: 0.6,
                    emissive: 0xffffff,
                    emissiveIntensity: 0
                });
                const tower = new THREE.Mesh(geometry, material);

                tower.position.x = (x - gs.gridSize / 2 + 0.5) * gs.spacing;
                tower.position.y = 0;
                tower.position.z = (z - gs.gridSize + 0.5) * gs.spacing;

                this.scene.add(tower);
                this.towers.push(tower);
            }
        }

        // Set camera position
        this.camera.position.set(0, 5, 15);
        this.camera.lookAt(0, 2, 0);
    }

    /**
     * Update the towers visualizer
     * Animates towers based on audio frequencies and creates a treadmill effect
    */

    updateTowersVisualizer(lowAvg, highAvg, delta) {
        if (!this.towerGridSettings) return;

        const gs = this.towerGridSettings;
        const baseTowerHeight = gs.baseTowerHeight;
        const maxScale = 50;
        const treadmillSpeed = 10.0 * delta;

        // Calculate average audio level for color changes
        let averageLevel = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            averageLevel += this.dataArray[i] / 255.0;
        }
        averageLevel /= this.dataArray.length;

        // Update each tower
        this.towers.forEach((tower, index) => {
            // Treadmill effect - move towers forward and wrap around
            tower.position.z += treadmillSpeed;
            if (tower.position.z > gs.wrapDistanceZ / 2) {
                tower.position.z -= gs.gridSize * gs.spacing;
                tower.scale.y = 1.0;
            }

            // Audio reactivity - adjust height and color
            const freqIndex = index % this.dataArray.length;
            const value = this.dataArray[freqIndex] / 255.0;
            const targetScaleY = 1 + value * maxScale;
            tower.scale.y += (targetScaleY - tower.scale.y) * 0.1;
            tower.position.y = (baseTowerHeight * tower.scale.y) / 2 - (baseTowerHeight / 2);

            // Color changes based on audio
            const baseHue = (0.6 + averageLevel * 0.4) % 1.0;
            const towerHue = (baseHue + value * 0.3) % 1.0;
            const saturation = 0.8 + value * 0.2;
            const lightness = 0.6 + value * 0.4;

            tower.material.color.setHSL(towerHue, saturation, lightness);

            // Emissive glow effect
            const emissiveHue = (towerHue + 0.5) % 1.0;
            tower.material.emissive.setHSL(emissiveHue, 0.8, 0.5);
            tower.material.emissiveIntensity = value * 2.0;
        });

        // Ground-level camera movement
        const time = this.clock.getElapsedTime();

        // Set camera to ground level
        this.camera.position.y = 0.5;

        // Move camera forward
        const forwardSpeed = 5.0 * delta;
        this.camera.position.z -= forwardSpeed;

        // Add side-to-side movement
        const sideMovement = Math.sin(time * 0.5) * 2.0;
        this.camera.position.x = sideMovement;

        // Look ahead and slightly upward
        this.camera.lookAt(
            sideMovement * 0.5,
            2.0,
            this.camera.position.z - 10
        );

        // Reset camera position when it moves too far back
        if (this.camera.position.z < -50) {
            this.camera.position.z = 30;
        }
    }

    /**
     * Update the visualizer based on audio data
     * This is the main update loop that handles all visualizer animations
    */

    updateVisualizer() {
        if (!this.analyser) return;

        // Get audio data
        this.analyser.getByteFrequencyData(this.dataArray);
        const time = Date.now() * 0.0001;
        const delta = this.clock.getDelta();
        if (!this.clock) this.clock = new THREE.Clock();

        // Calculate audio levels for different frequency ranges
        let averageLevel = 0;
        let lowFreqAvg = 0;
        let highFreqAvg = 0;
        const lowFreqCutoff = Math.floor(this.dataArray.length / 3);
        const highFreqStart = Math.floor(this.dataArray.length * 2 / 3);
        for (let i = 0; i < this.dataArray.length; i++) {
            const level = this.dataArray[i] / 255.0;
            averageLevel += level;
            if (i < lowFreqCutoff) { lowFreqAvg += level; }
            else if (i >= highFreqStart) { highFreqAvg += level; }
        }
        averageLevel /= this.dataArray.length;
        lowFreqAvg /= lowFreqCutoff;
        highFreqAvg /= (this.dataArray.length - highFreqStart);

        // Update orbit controls if enabled
        if (this.orbitControls && this.orbitControls.enabled) {
            this.orbitControls.update();
        }

        // Update sun light intensity based on audio
        if (this.sunLight) {
            this.sunLight.intensity = 1.0 + averageLevel * 1.0;
        }

        // Update the active visualizer
        switch (this.currentStyle) {
            case 'bars':
                this.updateBars();
                break;
            case 'points':
                this.updatePointsVisualizer(delta);
                break;
            case 'wave':
                this.updateWaveVisualizer(delta);
                break;
            case 'towers':
                this.updateTowersVisualizer(lowFreqAvg, highFreqAvg, delta);
                break;
        }

        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Update the bars visualizer
     * Adjusts bar heights and colors based on audio frequencies
    */

    updateBars() {
        for (let i = 0; i < this.bars.length; i++) {
            const value = this.dataArray[i] / 255;
            const bar = this.bars[i];
            bar.scale.y = 1 + value * 10;
            const hue = (i / this.bars.length) * 0.3 + 0.5;
            const color = new THREE.Color().setHSL(hue, 1, 0.5);
            bar.material.color = color;
        }
    }

    /**
     * Update the points visualizer
     * Animates points based on audio and time
    */

    updatePointsVisualizer(delta) {
        if (!this.pointsMesh) return;

        // Update shader uniforms
        this.pointsMesh.material.uniforms.time.value += delta;

        // Calculate average audio level
        let averageLevel = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            averageLevel += this.dataArray[i] / 255.0;
        }
        averageLevel /= this.dataArray.length;

        // Update audio level uniform
        this.pointsMesh.material.uniforms.audioLevel.value = averageLevel;

        // Rotate the point cloud
        this.pointsMesh.rotation.y += delta * 0.2;
        this.pointsMesh.rotation.x += delta * 0.1;

        // Dynamic camera movement
        const time = this.clock.getElapsedTime();
        const radius = 100 + Math.sin(time * 0.5) * 20;
        const angle = time * 0.2;

        this.camera.position.x = Math.sin(angle) * radius;
        this.camera.position.z = Math.cos(angle) * radius;
        this.camera.position.y = Math.sin(time * 0.3) * 30;

        this.camera.lookAt(0, 0, 0);
    }

    /**
     * Update the wave visualizer
     * Animates wave patterns based on audio and time
    */

    updateWaveVisualizer(delta) {
        if (!this.waveMesh1 || !this.waveMesh2) return;

        // Update shader uniforms
        this.waveMaterial.uniforms.time.value += delta;

        // Calculate average audio level
        let averageLevel = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            averageLevel += this.dataArray[i] / 255.0;
        }
        averageLevel /= this.dataArray.length;

        // Update audio level uniform
        this.waveMaterial.uniforms.audioLevel.value = averageLevel;

        // Update colors based on audio for both layers
        const positions1 = this.waveGeometry1.attributes.position.array;
        const positions2 = this.waveGeometry2.attributes.position.array;
        const colors1 = this.waveGeometry1.attributes.color.array;
        const colors2 = this.waveGeometry2.attributes.color.array;
        const hue1 = (averageLevel * 0.5) % 1.0;
        const hue2 = (hue1 + 0.5) % 1.0;

        for (let i = 0; i < positions1.length; i += 3) {
            // Update first layer colors
            const height1 = positions1[i + 2];
            const normalizedHeight1 = (height1 + 5) / 10;
            const color1 = new THREE.Color().setHSL(
                hue1 + normalizedHeight1 * 0.2,
                0.8 + averageLevel * 0.2,
                0.5 + normalizedHeight1 * 0.3
            );
            colors1[i] = color1.r;
            colors1[i + 1] = color1.g;
            colors1[i + 2] = color1.b;

            // Update second layer colors
            const height2 = positions2[i + 2];
            const normalizedHeight2 = (height2 + 5) / 10;
            const color2 = new THREE.Color().setHSL(
                hue2 + normalizedHeight2 * 0.2,
                0.8 + averageLevel * 0.2,
                0.5 + normalizedHeight2 * 0.3
            );
            colors2[i] = color2.r;
            colors2[i + 1] = color2.g;
            colors2[i + 2] = color2.b;
        }

        // Update geometry attributes
        this.waveGeometry1.attributes.color.needsUpdate = true;
        this.waveGeometry2.attributes.color.needsUpdate = true;

        // Dynamic camera movement
        const time = this.clock.getElapsedTime();

        // Base camera parameters
        const baseHeight = 15;
        const baseDistance = 30;
        const rotationSpeed = 0.2;
        const verticalOscillation = 0.5;
        const oscillationSpeed = 2.0;

        // Calculate camera position
        const angle = time * rotationSpeed;
        const verticalOffset = Math.sin(time * oscillationSpeed) * verticalOscillation;
        const audioInfluence = averageLevel * 2.0;
        const radius = baseDistance + Math.sin(time * 0.5) * audioInfluence;

        // Update camera position
        this.camera.position.x = Math.sin(angle) * radius;
        this.camera.position.y = baseHeight + verticalOffset + audioInfluence * 0.5;
        this.camera.position.z = Math.cos(angle) * radius;

        // Update camera look target
        const lookAtOffset = Math.sin(time * 0.3) * 5;
        this.camera.lookAt(
            Math.sin(angle * 0.5) * lookAtOffset,
            verticalOffset * 0.5,
            Math.cos(angle * 0.5) * lookAtOffset
        );
    }

    /**
     * Main animation loop
     * Handles continuous updates and rendering
    */

    animate() {
        requestAnimationFrame(() => this.animate());

        // Update orbit controls if enabled
        if (this.orbitControls && this.orbitControls.enabled) {
            this.orbitControls.update();
        }

        // Update visualizer
        this.updateVisualizer();

        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}

Visualizer.prototype.createSourceNode = function() {
    if (this.source) {
        try {
            this.source.stop();
        } catch (e) {
            // Ignore if already stopped
        }
        this.source.disconnect();
        this.source = null;
    }
    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
};

export { Visualizer };

// Initialize the visualizer when the page loads
// window.addEventListener('load', () => {
//     new Visualizer();
// });
