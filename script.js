


const audioPlayer = document.getElementById('audio-player');
document.addEventListener('DOMContentLoaded', () => {
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

  // --- Logout ---
  logoutButton.addEventListener('click', () => {
    logout();
  });

  const newPlaylistNameInput = document.getElementById('new-playlist-name');
  const createPlaylistButton = document.getElementById('create-playlist-button');
  const playlistList = document.getElementById('playlist-list');
  const mediaList = document.getElementById('media-list');
  const currentPlaylistItems = document.getElementById('current-playlist-items');
  const playPlaylistButton = document.getElementById('play-playlist-button');

  let loggedInUsername = localStorage.getItem('loggedInUser'); // Keep track of the logged-in user
  let currentPlaylists = loadPlaylists(loggedInUsername);
  let availableMedia = []; // We'll populate this later

  // --- Helper function to save playlists to localStorage ---
  function savePlaylists(username, playlists) {
    localStorage.setItem(`playlists-${username}`, JSON.stringify(playlists));
  }

  // --- Helper function to load playlists from localStorage ---
  function loadPlaylists(username) {
    const storedPlaylists = localStorage.getItem(`playlists-${username}`);
    return storedPlaylists ? JSON.parse(storedPlaylists) : {};
  }

  // --- Function to display the list of playlists ---
  function displayPlaylists() {
    playlistList.innerHTML = '';
    for (const playlistName in currentPlaylists) {
      const listItem = document.createElement('li');
      listItem.textContent = playlistName;
      const viewButton = document.createElement('button');
      viewButton.textContent = 'View';
      viewButton.addEventListener('click', () => {
        displayPlaylistItems(playlistName);
      });
      listItem.appendChild(viewButton);
      playlistList.appendChild(listItem);
    }
  }

  // --- Function to create a new playlist ---
  createPlaylistButton.addEventListener('click', () => {
    const playlistName = newPlaylistNameInput.value.trim();
    if (playlistName) {
      if (!currentPlaylists[playlistName]) {
        currentPlaylists[playlistName] = [];
        savePlaylists(loggedInUsername, currentPlaylists);
        displayPlaylists();
        newPlaylistNameInput.value = '';
      } else {
        alert('Playlist name already exists.');
      }
    } else {
      alert('Please enter a playlist name.');
    }
  });

  // --- Function to display items in a selected playlist ---
  let selectedPlaylistName = null;
  function displayPlaylistItems(playlistName) {
    selectedPlaylistName = playlistName;
    currentPlaylistItems.innerHTML = '';
    if (currentPlaylists[playlistName]) {
      currentPlaylists[playlistName].forEach(media => {
        const listItem = document.createElement('li');
        listItem.textContent = media;
        // Add a "Remove" button later if needed
        currentPlaylistItems.appendChild(listItem);
      });
      playPlaylistButton.disabled = currentPlaylists[playlistName].length === 0;
    } else {
      playPlaylistButton.disabled = true;
    }
  }

  /* --- Function to load available media (from the 'media' folder - conceptually) ---
  IMPORTANT: Browser JavaScript cannot directly read files from a local folder.
  For this assessment, you will likely need to:
  1. Manually create a 'media' folder in your project.
  2. Manually place some audio and video files in it.
  3. For this function, you might hardcode the names of the files you've placed
  or, if your assessment allows, explore server-side solutions (which is likely beyond the scope
  if you're focusing on Three.js and local storage).*/
  
  let currentPlaylist = [];
  let currentTrackIndex = 0;

  // --- Update loadAvailableMedia to only include .mp3 files (conceptual) ---
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

  // --- Function to display the list of available media ---
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
            savePlaylists(loggedInUsername, currentPlaylists);
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

  // --- Event listener for the "Play Playlist" button ---
  playPlaylistButton.addEventListener('click', () => {
    if (selectedPlaylistName && currentPlaylists[selectedPlaylistName].length > 0) {
      currentPlaylist = currentPlaylists[selectedPlaylistName];
      currentTrackIndex = 0;
      playCurrentTrackInPlaylist();
    } else {
      alert('No playlist selected or the playlist is empty.');
    }
  });

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
});

// --- Web Audio API Setup ---
let audioContext;
let analyser;
let audioSource;
let frequencyData;

function initializeAudioAnalyser() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioSource = audioContext.createMediaElementSource(audioPlayer);
    analyser = audioContext.createAnalyser();
    audioSource.connect(analyser);
    analyser.connect(audioContext.destination); // Connect analyser to output
    analyser.fftSize = 256; // Adjust for more or less detail
    frequencyData = new Uint8Array(analyser.frequencyBinCount);
  }
}

// Call initializeAudioAnalyser when playback starts
audioPlayer.addEventListener('play', initializeAudioAnalyser);

document.addEventListener('DOMContentLoaded', () => {
  // --- Web Audio API Setup ---
  let audioContext;
  let analyser;
  let audioSource;
  let frequencyData;

function initializeAudioAnalyser() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioSource = audioContext.createMediaElementSource(audioPlayer);
      analyser = audioContext.createAnalyser();
      audioSource.connect(analyser);
      analyser.connect(audioContext.destination); // Connect analyser to output
      analyser.fftSize = 256; // Adjust for more or less detail
      frequencyData = new Uint8Array(analyser.frequencyBinCount);
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    audioPlayer.volume = 1.0;
  }

  // Call initializeAudioAnalyser when playback starts
  audioPlayer.addEventListener('play', initializeAudioAnalyser);

  // --- Three.js Audio Visualizer Setup ---
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth / 2, window.innerHeight / 2); // Adjust size as needed
  document.getElementById('app-container').appendChild(renderer.domElement);

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  camera.position.z = 5;

  function animate() {
    requestAnimationFrame(animate);

    if (analyser) {
      analyser.getByteFrequencyData(frequencyData);

      // Example: Scale the cube's Y-axis based on the average frequency
      let average = 0;
      for (let i = 0; i < frequencyData.length; i++) {
        average += frequencyData[i];
      }
      average /= frequencyData.length;
      cube.scale.y = 1 + (average / 255) * 2; // Scale between 1 and 3

      // We can add more sophisticated visualisations here based on frequencyData
    }

    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    
    renderer.render(scene, camera);
  }

  animate();
});
