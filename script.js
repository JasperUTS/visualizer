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
  if you're focusing on Three.js and local storage).
    
  For now, let's hardcode some example media:*/
  function loadAvailableMedia() {
    availableMedia = ['audio1.mp3', 'song.ogg', 'video.mp4', 'another_video.webm'];
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
      mediaList.appendChild(listItem);
    });
  }

  // --- Event listener for the "Play Playlist" button ---
  playPlaylistButton.addEventListener('click', () => {
    if (selectedPlaylistName && currentPlaylists[selectedPlaylistName].length > 0) {
      // We'll implement the actual playback logic later
      alert(`Playing playlist: ${selectedPlaylistName}`);
      console.log('Playlist items:', currentPlaylists[selectedPlaylistName]);
      // You would then proceed to play the first item in the
      // currentPlaylists[selectedPlaylistName] array using the
      // <audio> or <video> elements.
    } else {
      alert('No playlist selected or the playlist is empty.');
    }
  });

  // --- Update UI based on login status ---
  function showApp(username) {
    document.getElementById('registration-container').style.display = 'none';
    document.getElementById('login-container').style.display = 'none';
    appContainer.style.display = 'block';
    loggedInUserSpan.textContent = username;
    loggedInUsername = username; // Update loggedInUsername
    currentPlaylists = loadPlaylists(loggedInUsername);
    displayPlaylists();
    loadAvailableMedia(); // Load the conceptual media list
  }

  function logout() {
    /* For this simple implementation, we're just hiding the app UI.
    In a more complex scenario, you might clear a session token.*/
    appContainer.style.display = 'none';
    document.getElementById('registration-container').style.display = 'block';
    document.getElementById('login-container').style.display = 'block';
    loggedInUserSpan.textContent = '';
    loggedInUsername = null;
    currentPlaylist = {};
    playlistList.innerHTML = '';
    currentPlaylistItems.innerHTML = '';
    selectedPlaylistName = null;
    playPlaylistButton.disabled = true;
  }

  function checkLoggedInUser() {
    /* In this basic example, we're not maintaining a separate "session."
    The user is considered "logged in" if their credentials are in localStorage.
    A more robust approach would involve a session token.
    For now, we'll just show the login/registration forms on initial load.*/
    const storedUsername = localStorage.getItem('loggedInUser');
    
    if (storedUsername) {
      showApp(storedUsername);
    } else {
      // Keep login/registration visible by default
      document.getElementById('registration-container').style.display = 'block';
      document.getElementById('login-container').style.display = 'block';
      appContainer.style.display = 'none';
    }
  }

  
  // --- Check if a user is already logged in on page load ---
  checkLoggedInUser();
});