const socket = io();

// UI Elements
const uiLayer = document.getElementById('ui-layer');
const homeScreen = document.getElementById('home-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const gameUi = document.getElementById('game-ui');
const resultsScreen = document.getElementById('results-screen');

// Home
const btnCreate = document.getElementById('btn-create-room');
const btnJoin = document.getElementById('btn-join-room');
const inputRoomCode = document.getElementById('room-code-input');
const errorMsg = document.getElementById('error-msg');

// Lobby
const lobbyRoomCode = document.getElementById('lobby-room-code');
const playerList = document.getElementById('player-list');
const btnReady = document.getElementById('btn-ready');
const btnStartGame = document.getElementById('btn-start-game');

// HUD
const hudScore = document.getElementById('hud-score');
const hudLeaderboard = document.getElementById('hud-leaderboard');
const touchLeft = document.getElementById('touch-left');
const touchRight = document.getElementById('touch-right');

// Results
const finalLeaderboard = document.getElementById('final-leaderboard');
const btnReturnLobby = document.getElementById('btn-return-lobby');

// State
let currentRoom = null;
let isReady = false;
let gameEngine = new GameEngine('gameCanvas');

// Navigation
function showScreen(screen) {
    [homeScreen, lobbyScreen, gameUi, resultsScreen].forEach(s => s.classList.add('hidden'));
    screen.classList.remove('hidden');
}

function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
    setTimeout(() => errorMsg.classList.add('hidden'), 3000);
}

function renderLobby(roomData) {
    playerList.innerHTML = '';

    // Check if everyone is ready to show start button for host
    let allReady = true;

    for (let id in roomData.players) {
        const p = roomData.players[id];
        const li = document.createElement('li');
        li.className = 'player-item';
        li.style.borderColor = `hsl(${p.color}, 100%, 70%)`;

        let label = id === socket.id ? '(You)' : 'Player';
        if (id === roomData.host) label += ' ★';

        const statusSpan = document.createElement('span');
        statusSpan.className = `player-status ${p.ready ? 'ready' : ''}`;
        statusSpan.textContent = p.ready ? 'READY' : 'WAITING';

        if (!p.ready) allReady = false;

        li.innerHTML = `<span>${label}</span>`;
        li.appendChild(statusSpan);
        playerList.appendChild(li);
    }

    if (socket.id === roomData.host) {
        btnStartGame.classList.toggle('hidden', !allReady);
    } else {
        btnStartGame.classList.add('hidden'); // Only host sees start
    }
}

function updateHUDLeaderboard(players) {
    // Sort players by score
    const sorted = Object.values(players).sort((a, b) => b.score - a.score);
    hudLeaderboard.innerHTML = '';

    // Show top 3 or just brief info
    const topCount = Math.min(3, sorted.length);
    for (let i = 0; i < topCount; i++) {
        const p = sorted[i];
        const div = document.createElement('div');
        div.style.color = `hsl(${p.color}, 100%, 70%)`;
        div.textContent = `${p.id === socket.id ? 'You' : 'P' + (i+1)}: ${Math.floor(p.score)}`;
        if (p.status === 'dead') div.style.opacity = '0.5';
        hudLeaderboard.appendChild(div);
    }
}

// Socket Emitters
btnCreate.addEventListener('click', () => {
    socket.emit('createRoom');
});

btnJoin.addEventListener('click', () => {
    const code = inputRoomCode.value.trim();
    if (code.length === 4) {
        socket.emit('joinRoom', code);
    } else {
        showError('Invalid Room Code');
    }
});

btnReady.addEventListener('click', () => {
    isReady = !isReady;
    btnReady.textContent = isReady ? 'NOT READY' : 'READY';
    btnReady.classList.toggle('primary', isReady);
    btnReady.classList.toggle('secondary', !isReady);
    socket.emit('setReady', { roomCode: currentRoom, ready: isReady });
});

btnStartGame.addEventListener('click', () => {
    socket.emit('startGame', currentRoom);
});

btnReturnLobby.addEventListener('click', () => {
    if(socket.id === currentRoomHost) {
        socket.emit('returnToLobby', currentRoom);
    }
});

// Socket Listeners
let currentRoomHost = null;

socket.on('roomCreated', (code) => {
    currentRoom = code;
    lobbyRoomCode.textContent = code;
    showScreen(lobbyScreen);
});

socket.on('roomJoined', (code) => {
    currentRoom = code;
    lobbyRoomCode.textContent = code;
    showScreen(lobbyScreen);
});

socket.on('roomUpdate', (roomData) => {
    currentRoomHost = roomData.host;
    renderLobby(roomData);

    // Make sure return to lobby button is only visible to host in results
    if (roomData.state === 'results') {
        btnReturnLobby.style.display = (socket.id === roomData.host) ? 'block' : 'none';
    }
});

socket.on('errorMsg', (msg) => {
    showError(msg);
});

socket.on('gameStarted', (data) => {
    showScreen(gameUi);

    // Bind network callbacks to engine
    gameEngine.onPlayerUpdate = (state) => {
        socket.emit('playerUpdate', { roomCode: currentRoom, ...state });
    };

    gameEngine.onPlayerDeath = (finalScore) => {
        socket.emit('playerDeath', { roomCode: currentRoom, finalScore });
    };

    gameEngine.onScoreUpdate = (score) => {
        hudScore.textContent = Math.floor(score);
        socket.emit('scoreUpdate', { roomCode: currentRoom, score });
    };

    // Store latest player state for leaderboard
    gameEngine.playersData = data.players;

    gameEngine.start(data.seed, data.players, socket.id);
});

socket.on('playerStateUpdate', (data) => {
    if (gameEngine.isRunning) {
        gameEngine.updateRemotePlayer(data.id, data);
    }
});

socket.on('playerDied', (data) => {
    if (gameEngine.isRunning) {
        gameEngine.setRemotePlayerDead(data.id, data.score);
        if(gameEngine.playersData && gameEngine.playersData[data.id]) {
            gameEngine.playersData[data.id].score = data.score;
            gameEngine.playersData[data.id].status = 'dead';
        }
    }
});

// Update HUD periodically based on local knowledge of remote players
setInterval(() => {
    if (gameEngine.isRunning && gameEngine.players) {
        // sync scores for HUD display
        updateHUDLeaderboard(gameEngine.players);
    }
}, 500);

socket.on('gameOver', (players) => {
    gameEngine.stop();
    showScreen(resultsScreen);

    finalLeaderboard.innerHTML = '';
    const sorted = Object.values(players).sort((a, b) => b.score - a.score);

    sorted.forEach((p, i) => {
        const li = document.createElement('li');
        li.style.color = `hsl(${p.color}, 100%, 70%)`;
        const label = p.id === socket.id ? '(You)' : `Player ${i+1}`;
        li.textContent = `${label} - Score: ${Math.floor(p.score)}`;
        finalLeaderboard.appendChild(li);
    });

    btnReturnLobby.style.display = (socket.id === currentRoomHost) ? 'block' : 'none';
});

socket.on('returnedToLobby', () => {
    isReady = false;
    btnReady.textContent = 'READY';
    btnReady.classList.remove('primary');
    btnReady.classList.add('secondary');
    showScreen(lobbyScreen);
});

// Input Handling
function handleInput(action) {
    if (gameEngine.isRunning) {
        gameEngine.handleInput(action);
    }
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') handleInput('jump');
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.key.toLowerCase() === 'x') handleInput('dash');
});

// Mobile Controls
touchLeft.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleInput('jump');
});

touchRight.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleInput('dash');
});

// Need dummy touch end to prevent default behavior bugs on some mobile browsers
touchLeft.addEventListener('touchend', (e) => e.preventDefault());
touchRight.addEventListener('touchend', (e) => e.preventDefault());