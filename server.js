const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

// State management
const rooms = {};

function generateRoomCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('createRoom', () => {
    let roomCode;
    do {
      roomCode = generateRoomCode();
    } while (rooms[roomCode]);

    rooms[roomCode] = {
      id: roomCode,
      host: socket.id,
      players: {
        [socket.id]: {
          id: socket.id,
          ready: false,
          color: Math.floor(Math.random() * 360), // HSL hue
          score: 0,
          status: 'lobby',
          x: 0,
          y: 0
        }
      },
      state: 'lobby',
      seed: Math.random() * 1000000
    };

    socket.join(roomCode);
    socket.emit('roomCreated', roomCode);
    io.to(roomCode).emit('roomUpdate', rooms[roomCode]);
  });

  socket.on('joinRoom', (roomCode) => {
    roomCode = roomCode.toUpperCase();
    if (rooms[roomCode]) {
      if (rooms[roomCode].state !== 'lobby') {
         socket.emit('errorMsg', 'Game already in progress');
         return;
      }

      rooms[roomCode].players[socket.id] = {
        id: socket.id,
        ready: false,
        color: Math.floor(Math.random() * 360),
        score: 0,
        status: 'lobby',
        x: 0,
        y: 0
      };
      socket.join(roomCode);
      socket.emit('roomJoined', roomCode);
      io.to(roomCode).emit('roomUpdate', rooms[roomCode]);
    } else {
      socket.emit('errorMsg', 'Room not found');
    }
  });

  socket.on('setReady', ({ roomCode, ready }) => {
    if (rooms[roomCode] && rooms[roomCode].players[socket.id]) {
      rooms[roomCode].players[socket.id].ready = ready;
      io.to(roomCode).emit('roomUpdate', rooms[roomCode]);
    }
  });

  socket.on('startGame', (roomCode) => {
    if (rooms[roomCode] && rooms[roomCode].host === socket.id) {
      rooms[roomCode].state = 'playing';
      rooms[roomCode].seed = Math.random() * 1000000;
      rooms[roomCode].serverStartTime = Date.now();

      // Reset player states for game
      for (let pid in rooms[roomCode].players) {
        rooms[roomCode].players[pid].score = 0;
        rooms[roomCode].players[pid].status = 'playing';
      }

      io.to(roomCode).emit('gameStarted', {
        seed: rooms[roomCode].seed,
        players: rooms[roomCode].players,
        serverStartTime: rooms[roomCode].serverStartTime
      });
    }
  });

  socket.on('playerUpdate', ({ roomCode, x, y, vy, isDashing, animationState }) => {
    if (rooms[roomCode] && rooms[roomCode].players[socket.id] && rooms[roomCode].state === 'playing') {
       const player = rooms[roomCode].players[socket.id];
       // Basic bounds validation
       if (y > 2000 || y < -1000) return; // Ignore crazy jumps

       // Update server state
       player.x = x;
       player.y = y;

       // Broadcast directly for lower latency
       socket.to(roomCode).emit('playerStateUpdate', {
          id: socket.id,
          x, y, vy, isDashing, animationState
       });
    }
  });

  socket.on('scoreUpdate', ({ roomCode, score }) => {
     if (rooms[roomCode] && rooms[roomCode].players[socket.id] && rooms[roomCode].state === 'playing') {
         // Basic authoritative score validation
         // In 10s, at roughly max speed, expected distance is ~10k units, ~1000 score.
         // Adding generous bounds for collectibles (+3000 max realistically in short time)
         const elapsedMs = Date.now() - rooms[roomCode].serverStartTime;
         const theoreticalMaxScore = (elapsedMs / 1000) * 150 + 5000;

         if (score < theoreticalMaxScore) {
             rooms[roomCode].players[socket.id].score = score;
             // Broadcast valid scores periodically or on update
             socket.to(roomCode).emit('scoreUpdate', {
                 id: socket.id,
                 score: score
             });
         }
     }
  });

  socket.on('playerDeath', ({ roomCode, finalScore }) => {
    if (rooms[roomCode] && rooms[roomCode].players[socket.id]) {
      const player = rooms[roomCode].players[socket.id];
      if (player.status === 'dead') return; // Ignore duplicate deaths

      player.status = 'dead';

      const elapsedMs = Date.now() - rooms[roomCode].serverStartTime;
      const theoreticalMaxScore = (elapsedMs / 1000) * 150 + 5000;
      player.score = Math.min(finalScore, theoreticalMaxScore);

      io.to(roomCode).emit('playerDied', { id: socket.id, score: player.score });

      // Check if all players are dead
      let allDead = true;
      for (let pid in rooms[roomCode].players) {
        if (rooms[roomCode].players[pid].status === 'playing') {
          allDead = false;
          break;
        }
      }

      if (allDead && rooms[roomCode].state === 'playing') {
        rooms[roomCode].state = 'results';
        io.to(roomCode).emit('gameOver', rooms[roomCode].players);
      }
    }
  });

  socket.on('returnToLobby', (roomCode) => {
     if (rooms[roomCode] && rooms[roomCode].host === socket.id) {
         rooms[roomCode].state = 'lobby';
         for (let pid in rooms[roomCode].players) {
            rooms[roomCode].players[pid].status = 'lobby';
            rooms[roomCode].players[pid].ready = false;
         }
         io.to(roomCode).emit('returnedToLobby');
         io.to(roomCode).emit('roomUpdate', rooms[roomCode]);
     }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Find room the user was in
    for (const roomCode in rooms) {
      if (rooms[roomCode].players[socket.id]) {
        delete rooms[roomCode].players[socket.id];

        // If room is empty, delete it
        if (Object.keys(rooms[roomCode].players).length === 0) {
          delete rooms[roomCode];
        } else {
           // If host left, reassign host
           if (rooms[roomCode].host === socket.id) {
               rooms[roomCode].host = Object.keys(rooms[roomCode].players)[0];
           }
           io.to(roomCode).emit('roomUpdate', rooms[roomCode]);

           if(rooms[roomCode].state === 'playing') {
               io.to(roomCode).emit('playerDied', { id: socket.id, score: 0 }); // Treat disconnect as death in game
                // Check if all remaining players are dead
                let allDead = true;
                for (let pid in rooms[roomCode].players) {
                    if (rooms[roomCode].players[pid].status === 'playing') {
                    allDead = false;
                    break;
                    }
                }

                if (allDead && rooms[roomCode].state === 'playing') {
                    rooms[roomCode].state = 'results';
                    io.to(roomCode).emit('gameOver', rooms[roomCode].players);
                }
           }
        }
        break;
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});