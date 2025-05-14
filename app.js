
// Import Visualizer class from visualizer.js
import { Visualizer } from './visualizer.js';

// app.js - Handles authentication, media, and playlists

// --- Authentication ---

function showRegistrationForm() {
    const authContainer = document.getElementById('auth-container');
    authContainer.innerHTML = `
        <h2>Register</h2>
        <input type="text" id="register-username" placeholder="Username">
        <input type="password" id="register-password" placeholder="Password">
        <button onclick="registerUser()">Register</button>
        <button onclick="showLoginForm()">Already have an account?</button>
    `;
}

function showLoginForm() {
    const authContainer = document.getElementById('auth-container');
    authContainer.innerHTML = `
        <h2>Login</h2>
        <input type="text" id="login-username" placeholder="Username">
        <input type="password" id="login-password" placeholder="Password">
        <button onclick="loginUser()">Login</button>
        <button onclick="showRegistrationForm()">Need an account?</button>
    `;
}

window.showRegistrationForm = showRegistrationForm;
window.showLoginForm = showLoginForm;
window.registerUser = registerUser;
window.loginUser = loginUser;
window.logoutUser = logoutUser;

function registerUser() {
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;

    if (username && password) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        if (users.find(user => user.username === username)) {
            alert('Username already exists.');
            return;
        }
        users.push({ username, password });
        localStorage.setItem('users', JSON.stringify(users));
        alert('Registration successful!');
        showLoginForm();
    } else {
        alert('Please enter a username and password.');
    }
}

function loginUser() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(user => user.username === username && user.password === password);

    if (user) {
        localStorage.setItem('currentUser', username);
        alert('Login successful!');
        showApp();
    } else {
        alert('Invalid username or password.');
    }
}

function logoutUser() {
    localStorage.removeItem('currentUser');
    showAuth();
}

function checkAuth() {
    if (localStorage.getItem('currentUser')) {
        showApp();
    } else {
        showAuth();
    }
}

function showAuth() {
    document.getElementById('auth-container').style.display = 'block';
    document.getElementById('app-container').style.display = 'none';
    showLoginForm();
}

function showApp() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
    loadMediaLibrary();
    loadPlaylists();
    initializeVisualizer();
}

// --- Media Library ---

let audioFiles = []; // Keep track of loaded files

function loadMediaLibrary() {
    const mediaLibrary = document.getElementById('media-library');
    mediaLibrary.innerHTML = '<h2>Media Library</h2>';

    // Display loaded audio files
    if (audioFiles.length === 0) {
        mediaLibrary.innerHTML += '<p>No audio files loaded.</p>';
    } else {
        const list = document.createElement('ul');
        audioFiles.forEach((file, index) => {
            const item = document.createElement('li');
            item.textContent = `${file.name} `;

            // Add "Add to Playlist" button
            const addButton = document.createElement('button');
            addButton.textContent = 'Add to Playlist';
            addButton.style.marginLeft = '10px';
            addButton.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent triggering loadAndPlayAudio
                showAddToPlaylistOptions(index);
            });

            item.appendChild(addButton);
            item.addEventListener('click', () => loadAndPlayAudio(index));
            list.appendChild(item);
        });
        mediaLibrary.appendChild(list);
    }
}

function showAddToPlaylistOptions(trackIndex) {
    const playlistContainer = document.getElementById('playlist-container');
    const playlists = JSON.parse(localStorage.getItem('playlists') || '[]');

    if (playlists.length === 0) {
        alert('No playlists available. Please create a playlist first.');
        return;
    }

    // Create a selection UI for playlists
    const selectionDiv = document.createElement('div');
    selectionDiv.id = 'add-to-playlist-selection';
    selectionDiv.style.border = '1px solid #ccc';
    selectionDiv.style.padding = '10px';
    selectionDiv.style.marginTop = '10px';
    selectionDiv.style.backgroundColor = '#f9f9f9';

    const title = document.createElement('p');
    title.textContent = 'Select a playlist to add the track:';
    selectionDiv.appendChild(title);

    playlists.forEach((playlist, index) => {
        const button = document.createElement('button');
        button.textContent = playlist.name;
        button.style.marginRight = '5px';
        button.addEventListener('click', () => {
            addTrackToPlaylist(trackIndex, index);
            // Remove the selection UI after adding
            const existingSelection = document.getElementById('add-to-playlist-selection');
            if (existingSelection) {
                existingSelection.remove();
            }
        });
        selectionDiv.appendChild(button);
    });

    // Add a cancel button
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.marginLeft = '10px';
    cancelButton.addEventListener('click', () => {
        const existingSelection = document.getElementById('add-to-playlist-selection');
        if (existingSelection) {
            existingSelection.remove();
        }
    });
    selectionDiv.appendChild(cancelButton);

    // Remove any existing selection UI before adding new one
    const existingSelection = document.getElementById('add-to-playlist-selection');
    if (existingSelection) {
        existingSelection.remove();
    }

    playlistContainer.appendChild(selectionDiv);
}

function addTrackToPlaylist(trackIndex, playlistIndex) {
    const playlists = JSON.parse(localStorage.getItem('playlists') || '[]');
    if (playlistIndex >= 0 && playlistIndex < playlists.length) {
        const playlist = playlists[playlistIndex];
        if (!playlist.tracks.includes(trackIndex)) {
            playlist.tracks.push(trackIndex);
            localStorage.setItem('playlists', JSON.stringify(playlists));
            alert(`Track added to playlist "${playlist.name}".`);
            loadPlaylists(); // Refresh playlist display
        } else {
            alert('Track already exists in the playlist.');
        }
    }
}

function loadAndPlayAudio(index) {
    if (index >= 0 && index < audioFiles.length) {
        const visualizer = window.visualizer; // Access the Visualizer instance
        if (visualizer) {
            visualizer.loadAudioFile(audioFiles[index]);
            // Assuming you have a play function in your visualizer
            // You might need to adapt this based on your visualizer's API
            if (!visualizer.isPlaying) {
                document.getElementById('play-pause').click(); // Simulate a click
            }
        }
    }
}

// --- Playlist Management ---

function loadPlaylists() {
    const playlistContainer = document.getElementById('playlist-container');
    playlistContainer.innerHTML = '<h2>Playlists</h2>';

    const playlists = JSON.parse(localStorage.getItem('playlists') || '[]');
    if (playlists.length === 0) {
        playlistContainer.innerHTML += '<p>No playlists created.</p>';
    } else {
        const list = document.createElement('ul');
playlists.forEach((playlist, index) => {
            const item = document.createElement('li');
            item.textContent = `${playlist.name} (${playlist.tracks.length} tracks)`;
            item.addEventListener('click', () => playPlaylist(index));
            list.appendChild(item);
            playlistContainer.appendChild(list);
        });
    }

    const createButton = document.createElement('button');
    createButton.textContent = 'Create New Playlist';
    createButton.onclick = showCreatePlaylistForm;
    playlistContainer.appendChild(createButton);
}

function showCreatePlaylistForm() {
    const playlistContainer = document.getElementById('playlist-container');
    playlistContainer.innerHTML = `
        <h2>Create New Playlist</h2>
        <input type="text" id="new-playlist-name" placeholder="Playlist Name">
        <button onclick="createPlaylist()">Create</button>
        <button onclick="loadPlaylists()">Cancel</button>
    `;
}

function createPlaylist() {
    const name = document.getElementById('new-playlist-name').value;
    if (name) {
        const playlists = JSON.parse(localStorage.getItem('playlists') || '[]');
        playlists.push({ name: name, tracks: [] }); // Initialize with empty tracks
        localStorage.setItem('playlists', JSON.stringify(playlists));
        loadPlaylists();
    } else {
        alert('Please enter a playlist name.');
    }
}

function playPlaylist(index) {
    const playlists = JSON.parse(localStorage.getItem('playlists') || '[]');
    if (index >= 0 && index < playlists.length) {
        const playlist = playlists[index];
        if (playlist.tracks.length > 0) {
            // Assuming playlist tracks are indices in audioFiles
            loadAndPlayAudio(playlist.tracks[0]); // Play the first track
            // Implement logic to play the rest of the playlist
        } else {
            alert('This playlist is empty.');
        }
    }
}

// --- Visualizer Integration ---

let visualizer;

function initializeVisualizer() {
    const audioInput = document.getElementById('audio-input');
    audioInput.addEventListener('change', handleAudioInput);
    window.visualizer = new Visualizer(); // Create a global instance
}

function handleAudioInput(event) {
    const files = event.target.files;
    audioFiles = Array.from(files);
    loadMediaLibrary();
    // Optionally play the first file
    if (audioFiles.length > 0) {
        loadAndPlayAudio(0);
    }
}

// --- Initialization ---

checkAuth(); // Check if user is logged in on page load

// Expose functions to global scope for inline onclick handlers
window.createPlaylist = createPlaylist;
window.showCreatePlaylistForm = showCreatePlaylistForm;
window.loadPlaylists = loadPlaylists;
