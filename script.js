import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Raycaster } from 'three';
import { RGBELoader } from 'https://unpkg.com/three@0.161.0/examples/jsm/loaders/RGBELoader.js';

const audioPlayer = document.getElementById('audio-player');
document.addEventListener('DOMContentLoaded', () => {

  // Create container for pre-login RGBELoader scene
  const preLoginSceneContainer = document.createElement('div');
  preLoginSceneContainer.id = 'pre-login-scene-container';
  preLoginSceneContainer.style.position = 'fixed';
  preLoginSceneContainer.style.top = '155px';
  preLoginSceneContainer.style.left = '40px';
  preLoginSceneContainer.style.width = 'calc(100vw - 80px)';
  preLoginSceneContainer.style.height = 'calc(90vh - 120px)';
  preLoginSceneContainer.style.zIndex = '900';
  document.body.appendChild(preLoginSceneContainer);

  let loggedInUsername = null;

  // Playlist related variables
  let currentPlaylists = [];
  let currentPlaylist = [];
  let selectedPlaylistName = null;
  let currentTrackIndex = 0;
  const playlistList = document.getElementById('playlist-list');
  const currentPlaylistItems = document.getElementById('current-playlist-items');
  const playPlaylistButton = document.getElementById('play-playlist-button');

  const registerUsernameInput = document.getElementById('register-username');
  const registerPasswordInput = document.getElementById('register-password');
  const registerButton = document.getElementById('register-button');
  const registrationMessage = document.getElementById('registration-message');

  const loginUsernameInput = document.getElementById('login-username');
  const loginPasswordInput = document.getElementById('login-password');
  const loginButton = document.getElementById('login-button');
  const loginMessage = document.getElementById('login-message');

  const appContainer = document.getElementById('app-container');
  const loggedInUserSpan = document.getElementById('logged-in-user');
  const logoutButton = document.getElementById('logout-button');

  // Dropdown toggle buttons and containers
  const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
  const dropdownContainers = document.querySelectorAll('.dropdown-container');

  // Function to hide all dropdowns
  function hideAllDropdowns() {
    dropdownContainers.forEach(container => {
      container.classList.remove('active');
    });
  }

  // --- RGBELoader pre-login scene setup ---
  const preLoginScene = new THREE.Scene();
  const preLoginCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const preLoginRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  preLoginRenderer.setSize(window.innerWidth, window.innerHeight);
  preLoginSceneContainer.appendChild(preLoginRenderer.domElement);

  preLoginCamera.position.z = 5;

  // Add a cube mesh as in script_backup.js example
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const cube = new THREE.Mesh(geometry, material);
  preLoginScene.add(cube);

  // Load HDR environment map using RGBELoader
  new RGBELoader()
    .load('snowy_field_4k.hdr', function(texture) {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      preLoginScene.background = texture;
      preLoginScene.environment = texture;
    });

  function animatePreLoginScene() {
    requestAnimationFrame(animatePreLoginScene);

    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

    preLoginRenderer.render(preLoginScene, preLoginCamera);
  }

  animatePreLoginScene();

  // Handle window resize for pre-login scene
  window.addEventListener('resize', () => {
    preLoginCamera.aspect = window.innerWidth / window.innerHeight;
    preLoginCamera.updateProjectionMatrix();
    preLoginRenderer.setSize(window.innerWidth, window.innerHeight);
  });

// --- Modify showApp and logout to toggle pre-login scene visibility ---
const originalShowAppFunc = showApp;
showApp = function(username) {
  originalShowAppFunc(username);
  preLoginSceneContainer.style.display = 'none';
  updateTitleBarVisibility(true);
};

const originalLogoutFunc = logout;
logout = function() {
  originalLogoutFunc();
  preLoginSceneContainer.style.display = 'block';
  updateTitleBarVisibility(false);
};


  // Load playlists for a user from localStorage
  function loadPlaylists(username) {
    const playlistsJSON = localStorage.getItem(`playlists_${username}`);
    if (playlistsJSON) {
      return JSON.parse(playlistsJSON);
    }
    return [];
  }

  // Available media list element
  const mediaList = document.getElementById('media-list');

  // Available media array
  let availableMedia = [];

  // Load available media (hardcoded list of mp3 files)
  function loadAvailableMedia() {
    availableMedia = [
      '21 inst mix ab oz.mp3',
      '1983 inst mix ab oz.mp3',
      'after end inst mix ab oz.mp3',
      'april 10 inst mix ab oz.mp3',
      'ascending inst inst mix ab oz.mp3',
      'drop straight inst mix ab oz.mp3',
      'falling out of love inst mix ab oz.mp3',
      'house i love inst mix ab oz.mp3',
      'how the future dies inst mix ab oz.mp3',
      'jul 31 17 inst mix ab oz.mp3',
      'more than a song ab oz.mp3',
      'ordinary inst mix ab oz.mp3'
    ];
    displayAvailableMedia();
  }

  // Display available media in the UI
  function displayAvailableMedia() {
    mediaList.innerHTML = '';
    availableMedia.forEach(media => {
      const listItem = document.createElement('li');
      listItem.textContent = media;

      const addButton = document.createElement('button');
      addButton.textContent = 'Add to Playlist';
      addButton.addEventListener('click', () => {
        if (selectedPlaylistName) {
          if (!currentPlaylists[selectedPlaylistName].includes(media)) {
            currentPlaylists[selectedPlaylistName].push(media);
            localStorage.setItem(`playlists_${loggedInUsername}`, JSON.stringify(currentPlaylists));
            displayPlaylistItems(selectedPlaylistName);
          } else {
            alert('Media already in playlist.');
          }
        } else {
          alert('Please select a playlist first.');
        }
      });
      listItem.appendChild(addButton);

      const playSingleButton = document.createElement('button');
      playSingleButton.textContent = 'Play';
      playSingleButton.addEventListener('click', () => {
        playTrack(`media/${media}`);
      });
      listItem.appendChild(playSingleButton);

      mediaList.appendChild(listItem);
    });
  }

  // --- Function to play a single track ---
  function playTrack(filePath) {
    audioPlayer.src = filePath;
    audioPlayer.play();
    // Update now playing title
    const nowPlayingTitle = document.getElementById('now-playing-title');
    if (nowPlayingTitle) {
      // Extract filename from filePath
      const parts = filePath.split('/');
      const filename = parts[parts.length - 1];
      nowPlayingTitle.textContent = filename;
    }
  }

  // --- Function to play the current track in the playlist ---
  function playCurrentTrackInPlaylist() {
    if (currentPlaylist.length > 0 && currentTrackIndex < currentPlaylist.length) {
      const trackName = currentPlaylist[currentTrackIndex];
      playTrack(`media/${trackName}`);
    } else {
      alert('Playlist finished.');
      currentPlaylist = [];
      currentTrackIndex = 0;
      playPlaylistButton.disabled = currentPlaylists[selectedPlaylistName]?.length === 0;
    }
  }

  // --- Event listener for when the current track ends (for playlist playback) ---
  audioPlayer.addEventListener('ended', () => {
    if (currentPlaylist.length > 0) {
      currentTrackIndex++;
      playCurrentTrackInPlaylist();
    }
  });

  // --- Skip to Next Track ---
  const skipNextButton = document.getElementById('skip-next-button');
  skipNextButton.addEventListener('click', () => {
    if (currentPlaylist.length > 0 && currentTrackIndex < currentPlaylist.length - 1) {
      currentTrackIndex++;
      playCurrentTrackInPlaylist();
    }
  });

  // --- Skip to Previous Track ---
  const skipPreviousButton = document.getElementById('skip-previous-button');
  skipPreviousButton.addEventListener('click', () => {
    if (currentPlaylist.length > 0 && currentTrackIndex > 0) {
      currentTrackIndex--;
      playCurrentTrackInPlaylist();
    }
  });

  // Display playlists in the UI
  function displayPlaylists() {
    playlistList.innerHTML = '';
    currentPlaylists.forEach(playlist => {
      const li = document.createElement('li');
      li.textContent = playlist.name;
      li.classList.add('playlist-item');
      if (playlist.name === selectedPlaylistName) {
        li.classList.add('selected');
      }
      li.addEventListener('click', () => {
        selectedPlaylistName = playlist.name;
        currentPlaylist = playlist.songs || [];
        displayCurrentPlaylist();
        updatePlaylistSelection();
      });
      playlistList.appendChild(li);
    });
  }

  // Display current playlist songs
  function displayCurrentPlaylist() {
    currentPlaylistItems.innerHTML = '';
    currentPlaylist.forEach(song => {
      const li = document.createElement('li');
      li.textContent = song;
      currentPlaylistItems.appendChild(li);
    });
  }

  // Update playlist selection UI
  function updatePlaylistSelection() {
    const items = playlistList.querySelectorAll('li');
    items.forEach(item => {
      if (item.textContent === selectedPlaylistName) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
  }

  // Add event listeners to toggle buttons
  dropdownToggles.forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-target');
      const targetDropdown = document.getElementById(targetId);
      if (targetDropdown.classList.contains('active')) {
        targetDropdown.classList.remove('active');
      } else {
        hideAllDropdowns();
        targetDropdown.classList.add('active');
      }
    });
  });

  // Event listener for play playlist button
  playPlaylistButton.addEventListener('click', () => {
    if (selectedPlaylistName && currentPlaylists[selectedPlaylistName]?.length > 0) {
      currentPlaylist = currentPlaylists[selectedPlaylistName];
      currentTrackIndex = 0;
      playCurrentTrackInPlaylist();
    } else {
      alert('Please select a playlist with songs to play.');
    }
  });

  // Function to toggle visibility of Register and Login buttons before and after login
  function toggleDropdownButtons(isLoggedIn) {
    dropdownToggles.forEach(button => {
      const targetId = button.getAttribute('data-target');
      if (targetId === 'register-dropdown' || targetId === 'login-dropdown') {
        button.style.display = isLoggedIn ? 'none' : 'inline-block';
      } else {
        button.style.display = isLoggedIn ? 'inline-block' : 'none';
      }
    });
  }

  // --- Registration ---
  registerButton.addEventListener('click', () => {
    const username = registerUsernameInput.value.trim();
    const password = registerPasswordInput.value;

    if (username && password) {
      const existingUser = localStorage.getItem(username);
      if (existingUser) {
        registrationMessage.textContent = 'Username already exists.';
      } else {
        // For simplicity, we'll store the password directly.
        // In a real application, you would hash the password.
        localStorage.setItem(username, password);
        registrationMessage.textContent = 'Registration successful. You can now log in.';
        registerUsernameInput.value = '';
        registerPasswordInput.value = '';
      }
    } else {
      registrationMessage.textContent = 'Please enter a username and password.';
    }
  });

  // --- Login ---
  loginButton.addEventListener('click', () => {
    const username = loginUsernameInput.value.trim();
    const password = loginPasswordInput.value;

    if (username && password) {
      const storedPassword = localStorage.getItem(username);
      if (storedPassword === password) {
        loginMessage.textContent = 'Login successful.';
        loginUsernameInput.value = '';
        loginPasswordInput.value = '';
        showApp(username);
        toggleDropdownButtons(true);
      } else {
        loginMessage.textContent = 'Invalid username or password.';
      }
    } else {
      loginMessage.textContent = 'Please enter your username and password.';
    }
  });

  // --- Logout ---
  logoutButton.addEventListener('click', () => {
    logout();
    toggleDropdownButtons(false);
  });

  // --- Update showApp function ---
  function showApp(username) {
    document.getElementById('registration-container').style.display = 'none';
    document.getElementById('login-container').style.display = 'none';
    appContainer.style.display = 'block';
    loggedInUserSpan.textContent = username;
    loggedInUsername = username;
    currentPlaylists = loadPlaylists(loggedInUsername);
    displayPlaylists();
    loadAvailableMedia(); // Load the MP3 files
    toggleDropdownButtons(true);
  }

  function logout() {
    /* For this simple implementation, we're just hiding the app UI.
    In a more complex scenario, you might clear a session token.*/
    appContainer.style.display = 'none';
    document.getElementById('registration-container').style.display = 'block';
    document.getElementById('login-container').style.display = 'block';
    loggedInUserSpan.textContent = '';
    loggedInUsername = null;
    currentPlaylist = [];
    playlistList.innerHTML = '';
    currentPlaylistItems.innerHTML = '';
    selectedPlaylistName = null;
    playPlaylistButton.disabled = true;
    toggleDropdownButtons(false);
  }

  function checkLoggedInUser() {
    /* In this basic example, we're not maintaining a separate "session."
    The user is considered "logged in" if their credentials are in localStorage.
    A more robust approach would involve a session token.
    For now, we'll just show the login/registration forms on initial load.*/
    const storedUsername = localStorage.getItem('loggedInUser');

    if (storedUsername) {
      showApp(storedUsername);
      toggleDropdownButtons(true);
    } else {
      // Keep login/registration visible by default
      document.getElementById('registration-container').style.display = 'block';
      document.getElementById('login-container').style.display = 'block';
      appContainer.style.display = 'none';
      toggleDropdownButtons(false);
    }
  }

  // --- Check if a user is already logged in on page load ---
  checkLoggedInUser();

  // Show or hide title bar based on login status
  function updateTitleBarVisibility(isLoggedIn) {
    const titleBar = document.getElementById('title-bar');
    if (titleBar) {
      titleBar.style.display = isLoggedIn ? 'none' : 'flex';
    }
  }

  // --- Modify showApp and logout to toggle pre-login scene visibility ---
  const originalShowApp = showApp;
  showApp = function(username) {
    originalShowApp(username);
    preLoginSceneContainer.style.display = 'none';
    updateTitleBarVisibility(true);
  };

  const originalLogout = logout;
  logout = function() {
    originalLogout();
    preLoginSceneContainer.style.display = 'block';
    updateTitleBarVisibility(false);
  };

// Initially show title bar if not logged in
const storedUsername = localStorage.getItem('loggedInUser');
updateTitleBarVisibility(!!storedUsername);

// Visualizer class from visualizer.js integrated here

class Visualizer {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });

    this.audioContext = null;
    this.analyser = null;
    this.dataArray = new Uint8Array(128);

    this.bars = [];
    this.particles = [];
    this.towers = [];
    this.groundPlane = null;
    this.cloudLayers = [];

    this.isPlaying = false;
    this.currentStyle = 'bars';
    this.audioFiles = [];
    this.currentTrackIndex = 0;
    this.currentTime = 0;
    this.updateInterval = null;

    this.orbitControls = null;
    this.clock = new THREE.Clock();

    this.inkSystem = null;
    this.inkParticles = [];
    this.inkVelocities = [];
    this.inkAges = [];
    this.paperTexture = null;
    this.inkTargets = [];

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

    this.cloudSettings = {
      height: 10,
      opacity: 0.8,
      movementSpeed: 0.1,
      audioReactivity: 0.2,
      threshold: 0.4
    };

    this.init();
    this.setupControls();
    this.createVisualizer();
    this.animate();
  }

  init() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    document.getElementById('canvas-container').appendChild(this.renderer.domElement);

    this.camera.position.z = 15;
    this.camera.lookAt(0, 0, 0);

    const ambientLight = new THREE.AmbientLight(0xcccccc, 0.3);
    this.scene.add(ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    this.sunLight.position.set(-100, 50, 100);
    this.scene.add(this.sunLight);

    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.05;
    this.orbitControls.screenSpacePanning = false;
    this.orbitControls.minDistance = 5;
    this.orbitControls.maxDistance = 100;
    this.orbitControls.maxPolarAngle = Math.PI / 2;
    this.orbitControls.enabled = false;

    this.paperColor = new THREE.Color(0xF5E8C8);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.createVisualizer();
  }

  setupControls() {
    const audioInput = document.getElementById('audio-input');
    const playPauseBtn = document.getElementById('play-pause');
    const nextBtn = document.getElementById('next');
    const prevBtn = document.getElementById('prev');
    const visualizerStyle = document.getElementById('visualizer-style');

    const initAudioContext = () => {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.setupAudio();
      }
    };

    audioInput.addEventListener('change', (event) => {
      initAudioContext();
      const files = event.target.files;
      this.audioFiles = Array.from(files);
      if (this.audioFiles.length > 0) {
        this.currentTrackIndex = 0;
        this.loadAudioFile(this.audioFiles[0]);
      }
    });

    playPauseBtn.addEventListener('click', () => {
      initAudioContext();
      if (!this.audioContext || !this.source) return;

      if (this.isPlaying) {
        this.source.stop();
        this.isPlaying = false;
        playPauseBtn.textContent = 'Play';
        if (this.updateInterval) {
          clearInterval(this.updateInterval);
        }
      } else {
        this.source.start(0);
        this.startTime = this.audioContext.currentTime;
        this.isPlaying = true;
        playPauseBtn.textContent = 'Pause';
        this.updateInterval = setInterval(() => this.updateProgress(), 100);
      }
    });

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

    visualizerStyle.addEventListener('change', (event) => {
      this.currentStyle = event.target.value;
      this.createVisualizer();
    });
  }

  setupAudio() {
    if (!this.analyser) return;
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

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

  loadAudioFile(file) {
    if (!this.audioContext) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      this.audioContext.decodeAudioData(event.target.result, (buffer) => {
        this.audioBuffer = buffer;
        this.source = this.audioContext.createBufferSource();
        this.source.buffer = this.audioBuffer;
        this.source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
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

  playNextTrack() {
    if (this.audioFiles.length > 0) {
      this.currentTrackIndex = (this.currentTrackIndex + 1) % this.audioFiles.length;
      this.loadAudioFile(this.audioFiles[this.currentTrackIndex]);
      if (this.isPlaying) {
        this.source.start(0);
        this.startTime = this.audioContext.currentTime;
      }
    }
  }

  playPreviousTrack() {
    if (this.audioFiles.length > 0) {
      this.currentTrackIndex = (this.currentTrackIndex - 1 + this.audioFiles.length) % this.audioFiles.length;
      this.loadAudioFile(this.audioFiles[this.currentTrackIndex]);
      if (this.isPlaying) {
        this.source.start(0);
        this.startTime = this.audioContext.currentTime;
      }
    }
  }

  createVisualizer() {
    this.clearScene();

    this.camera.position.set(0, 10, 20);
    this.camera.lookAt(0, 0, 0);
    this.scene.background = new THREE.Color(0x000005);
    this.orbitControls.enabled = false;
    this.orbitControls.target.set(0, 0, 0);

    switch (this.currentStyle) {
      case 'bars':
        this.createBars();
        break;
      case 'points':
        this.createPointsVisualizer();
        break;
      case 'towers':
        this.createTowersVisualizer();
        this.camera.position.set(0, 2, 10);
        this.camera.lookAt(0, 1, 0);
        break;
      case 'wave':
        this.createWaveVisualizer();
        this.camera.position.set(0, 0, 30);
        this.camera.lookAt(0, 0, 0);
        break;
    }

    this.renderer.render(this.scene, this.camera);
  }

  clearScene() {
    this.bars.forEach(bar => this.scene.remove(bar));
    this.particles.forEach(particle => this.scene.remove(particle));
    this.towers.forEach(tower => this.scene.remove(tower));

    if (this.groundPlane) {
      this.scene.remove(this.groundPlane);
      this.groundPlane = null;
    }

    this.cloudLayers.forEach(layer => this.scene.remove(layer));
    this.cloudLayers = [];

    this.bars = [];
    this.particles = [];
    this.towers = [];

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

    this.scene.background = new THREE.Color(0x000005);

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

    if (this.pointsMesh) {
      this.scene.remove(this.pointsMesh);
      this.pointsMesh.geometry.dispose();
      this.pointsMesh.material.dispose();
      this.pointsMesh = null;
    }
  }

  createBars() {
    const barCount = 64;
    const barWidth = 0.2;
    const barHeight = 1;
    const spacing = 0.3;
    const totalWidth = (barCount - 1) * (barWidth + spacing);
    const startX = -totalWidth / 2;

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

  createPointsVisualizer() {
    const pointCount = 15000;
    const positions = new Float32Array(pointCount * 3);
    const colors = new Float32Array(pointCount * 3);
    const sizes = new Float32Array(pointCount);

    const color = new THREE.Color();
    for (let i = 0; i < pointCount; i++) {
      const i3 = i * 3;

      const radius = 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      color.setHSL(Math.random(), 0.8, 0.5);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      sizes[i] = Math.random() * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

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
                    
                    vec3 pos = position;
                    
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
                    
                    float alpha = 1.0 - smoothstep(0.4, 0.5, dist);
                    
                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.pointsMesh = new THREE.Points(geometry, material);
    this.scene.add(this.pointsMesh);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);

    this.camera.position.set(0, 0, 100);
    this.camera.lookAt(0, 0, 0);
  }

  createWaveVisualizer() {
    const width = 200;
    const height = 100;
    const segments = 100;
    const pointCount = segments * segments;

    const positions1 = new Float32Array(pointCount * 3);
    const positions2 = new Float32Array(pointCount * 3);
    const colors1 = new Float32Array(pointCount * 3);
    const colors2 = new Float32Array(pointCount * 3);
    const sizes1 = new Float32Array(pointCount);
    const sizes2 = new Float32Array(pointCount);

    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < segments; j++) {
        const index = (i * segments + j) * 3;

        positions1[index] = (i - segments / 2) * (width / segments);
        positions1[index + 1] = (j - segments / 2) * (height / segments);
        positions1[index + 2] = 0;
        colors1[index] = 0.0;
        colors1[index + 1] = 0.5;
        colors1[index + 2] = 1.0;
        sizes1[i * segments + j] = 1.0;

        positions2[index] = positions1[index] + 0.5;
        positions2[index + 1] = positions1[index + 1] + 0.5;
        positions2[index + 2] = 0;
        colors2[index] = 1.0;
        colors2[index + 1] = 0.2;
        colors2[index + 2] = 0.5;
        sizes2[i * segments + j] = 0.8;
      }
    }

    this.waveGeometry1 = new THREE.BufferGeometry();
    this.waveGeometry1.setAttribute('position', new THREE.BufferAttribute(positions1, 3));
    this.waveGeometry1.setAttribute('color', new THREE.BufferAttribute(colors1, 3));
    this.waveGeometry1.setAttribute('size', new THREE.BufferAttribute(sizes1, 1));

    this.waveGeometry2 = new THREE.BufferGeometry();
    this.waveGeometry2.setAttribute('position', new THREE.BufferAttribute(positions2, 3));
    this.waveGeometry2.setAttribute('color', new THREE.BufferAttribute(colors2, 3));
    this.waveGeometry2.setAttribute('size', new THREE.BufferAttribute(sizes2, 1));

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
                    
                    vec3 pos = position;
                    
                    float wave = sin(pos.x * 0.1 + time) * cos(pos.y * 0.1 + time);
                    wave *= 2.0 + audioLevel * 3.0;
                    
                    float noise = fract(sin(dot(pos.xy, vec2(12.9898, 78.233))) * 43758.5453);
                    wave += noise * 0.5 * audioLevel;
                    
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
                    
                    float alpha = 1.0 - smoothstep(0.4, 0.5, dist);
                    
                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.waveMesh1 = new THREE.Points(this.waveGeometry1, this.waveMaterial);
    this.waveMesh2 = new THREE.Points(this.waveGeometry2, this.waveMaterial);
    this.scene.add(this.waveMesh1);
    this.scene.add(this.waveMesh2);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);

    this.camera.position.set(0, 15, 30);
    this.camera.lookAt(0, 0, 0);
  }

  createTowersVisualizer() {
    this.towers = [];
    this.cloudLayers = [];

    this.scene.fog = null;
    this.scene.background = new THREE.Color(0x000000);

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

    this.camera.position.set(0, 5, 15);
    this.camera.lookAt(0, 2, 0);
  }

  updateTowersVisualizer(lowAvg, highAvg, delta) {
    if (!this.towerGridSettings) return;

    const gs = this.towerGridSettings;
    const baseTowerHeight = gs.baseTowerHeight;
    const maxScale = 50;
    const treadmillSpeed = 10.0 * delta;

    let averageLevel = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      averageLevel += this.dataArray[i] / 255.0;
    }
    averageLevel /= this.dataArray.length;

    this.towers.forEach((tower, index) => {
      tower.position.z += treadmillSpeed;
      if (tower.position.z > gs.wrapDistanceZ / 2) {
        tower.position.z -= gs.gridSize * gs.spacing;
        tower.scale.y = 1.0;
      }

      const freqIndex = index % this.dataArray.length;
      const value = this.dataArray[freqIndex] / 255.0;
      const targetScaleY = 1 + value * maxScale;
      tower.scale.y += (targetScaleY - tower.scale.y) * 0.1;
      tower.position.y = (baseTowerHeight * tower.scale.y) / 2 - (baseTowerHeight / 2);

      const baseHue = (0.6 + averageLevel * 0.4) % 1.0;
      const towerHue = (baseHue + value * 0.3) % 1.0;
      const saturation = 0.8 + value * 0.2;
      const lightness = 0.6 + value * 0.4;

      tower.material.color.setHSL(towerHue, saturation, lightness);

      const emissiveHue = (towerHue + 0.5) % 1.0;
      tower.material.emissive.setHSL(emissiveHue, 0.8, 0.5);
      tower.material.emissiveIntensity = value * 2.0;
    });

    const time = this.clock.getElapsedTime();

    this.camera.position.y = 0.5;

    const forwardSpeed = 5.0 * delta;
    this.camera.position.z -= forwardSpeed;

    const sideMovement = Math.sin(time * 0.5) * 2.0;
    this.camera.position.x = sideMovement;

    this.camera.lookAt(
      sideMovement * 0.5,
      2.0,
      this.camera.position.z - 10
    );

    if (this.camera.position.z < -50) {
      this.camera.position.z = 30;
    }
  }

  updateVisualizer() {
    if (!this.analyser) return;

    this.analyser.getByteFrequencyData(this.dataArray);
    const time = Date.now() * 0.0001;
    const delta = this.clock.getDelta();
    if (!this.clock) this.clock = new THREE.Clock();

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

    if (this.orbitControls && this.orbitControls.enabled) {
      this.orbitControls.update();
    }

    if (this.sunLight) {
      this.sunLight.intensity = 1.0 + averageLevel * 1.0;
    }

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

  updatePointsVisualizer(delta) {
    if (!this.pointsMesh) return;

    this.pointsMesh.material.uniforms.time.value += delta;

    let averageLevel = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      averageLevel += this.dataArray[i] / 255.0;
    }
    averageLevel /= this.dataArray.length;

    this.pointsMesh.material.uniforms.audioLevel.value = averageLevel;

    this.pointsMesh.rotation.y += delta * 0.2;
    this.pointsMesh.rotation.x += delta * 0.1;

    const time = this.clock.getElapsedTime();
    const radius = 100 + Math.sin(time * 0.5) * 20;
    const angle = time * 0.2;

    this.camera.position.x = Math.sin(angle) * radius;
    this.camera.position.z = Math.cos(angle) * radius;
    this.camera.position.y = Math.sin(time * 0.3) * 30;

    this.camera.lookAt(0, 0, 0);
  }

  updateWaveVisualizer(delta) {
    if (!this.waveMesh1 || !this.waveMesh2) return;

    this.waveMaterial.uniforms.time.value += delta;

    let averageLevel = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      averageLevel += this.dataArray[i] / 255.0;
    }
    averageLevel /= this.dataArray.length;

    this.waveMaterial.uniforms.audioLevel.value = averageLevel;

    const positions1 = this.waveGeometry1.attributes.position.array;
    const positions2 = this.waveGeometry2.attributes.position.array;
    const colors1 = this.waveGeometry1.attributes.color.array;
    const colors2 = this.waveGeometry2.attributes.color.array;
    const hue1 = (averageLevel * 0.5) % 1.0;
    const hue2 = (hue1 + 0.5) % 1.0;

    for (let i = 0; i < positions1.length; i += 3) {
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

    this.waveGeometry1.attributes.color.needsUpdate = true;
    this.waveGeometry2.attributes.color.needsUpdate = true;

    const time = this.clock.getElapsedTime();

    const baseHeight = 15;
    const baseDistance = 30;
    const rotationSpeed = 0.2;
    const verticalOscillation = 0.5;
    const oscillationSpeed = 2.0;

    const angle = time * rotationSpeed;
    const verticalOffset = Math.sin(time * oscillationSpeed) * verticalOscillation;
    const audioInfluence = averageLevel * 2.0;
    const radius = baseDistance + Math.sin(time * 0.5) * audioInfluence;

    this.camera.position.x = Math.sin(angle) * radius;
    this.camera.position.y = baseHeight + verticalOffset + audioInfluence * 0.5;
    this.camera.position.z = Math.cos(angle) * radius;

    const lookAtOffset = Math.sin(time * 0.3) * 5;
    this.camera.lookAt(0, lookAtOffset, 0);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.updateVisualizer();
  }
}
});
