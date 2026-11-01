// Simple Mulberry32 PRNG
function mulberry32(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

class SoundManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.enabled = true;
    }

    playTone(freq, type, duration, vol) {
        if (!this.enabled || this.ctx.state !== 'running') return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    jump() {
        this.playTone(400, 'square', 0.2, 0.1);
        setTimeout(() => this.playTone(600, 'square', 0.3, 0.1), 50);
    }

    dash() {
        this.playTone(800, 'sawtooth', 0.3, 0.1);
    }

    crash() {
        this.playTone(100, 'square', 0.5, 0.3);
        setTimeout(() => this.playTone(50, 'sawtooth', 0.5, 0.3), 100);
    }
}

class Player {
    constructor(id, colorHue, isLocal) {
        this.id = id;
        this.color = `hsl(${colorHue}, 100%, 70%)`;
        this.isLocal = isLocal;

        this.width = 40;
        this.height = 40;

        this.x = isLocal ? 150 : -100; // Local player fixed X on screen, others interpolated
        this.y = 300;

        this.vy = 0;
        this.gravity = 0.6;
        this.jumpForce = -12;

        this.isGrounded = false;
        this.isDashing = false;
        this.dashTimer = 0;
        this.dashDuration = 15;
        this.dashCooldown = 0;

        this.status = 'playing'; // playing, dead
        this.score = 0;

        // Multiplayer interpolation
        this.targetY = this.y;
        this.targetX = this.x; // World X relative to local player
    }

    jump(soundMgr) {
        if (this.isGrounded && this.status === 'playing') {
            this.vy = this.jumpForce;
            this.isGrounded = false;
            if(this.isLocal) soundMgr.jump();
            return true;
        }
        return false;
    }

    dash(soundMgr) {
        if (!this.isDashing && this.dashCooldown <= 0 && this.status === 'playing') {
            this.isDashing = true;
            this.dashTimer = this.dashDuration;
            this.vy = 0; // suspend gravity
            if(this.isLocal) soundMgr.dash();
            return true;
        }
        return false;
    }

    update(worldSpeed) {
        if (this.status !== 'playing') return;

        if (this.isLocal) {
            // Local Physics
            if (this.isDashing) {
                this.dashTimer--;
                if (this.dashTimer <= 0) {
                    this.isDashing = false;
                    this.dashCooldown = 30; // frames
                }
            } else {
                this.vy += this.gravity;
                if (this.dashCooldown > 0) this.dashCooldown--;
            }

            this.y += this.vy;

            // Score based on survival time/distance (worldSpeed applied per frame)
            this.score += Math.floor(worldSpeed * 0.1);

        } else {
            // Remote Interpolation
            this.y += (this.targetY - this.y) * 0.3;
            this.x += (this.targetX - this.x) * 0.3;
        }
    }

    draw(ctx) {
        if (this.status !== 'playing') return;

        ctx.save();

        // Dash trail effect
        if (this.isDashing) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = this.color;
            ctx.fillStyle = this.color;
            ctx.globalAlpha = 0.5;
            ctx.fillRect(this.x - 30, this.y, this.width + 30, this.height);
        }

        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;

        // Draw Unicorn (simplified geometric shape)
        ctx.beginPath();
        // Body
        ctx.rect(this.x, this.y, this.width, this.height);
        // Horn
        ctx.moveTo(this.x + this.width, this.y);
        ctx.lineTo(this.x + this.width + 15, this.y - 15);
        ctx.lineTo(this.x + this.width, this.y + 10);

        ctx.fill();
        ctx.restore();
    }
}

class World {
    constructor(seed) {
        this.prng = mulberry32(seed);
        this.platforms = [];
        this.obstacles = [];
        this.stars = [];

        this.worldX = 0; // Total distance traveled
        this.speed = 8;

        this.lastPlatformX = 0;
        this.lastPlatformY = 300;

        // Initial ground
        this.platforms.push({ x: 0, y: 350, w: 1200, h: 200 });
        this.lastPlatformX = 1200;
        this.lastPlatformY = 350;
    }

    generateChunk() {
        // Only generate ahead of the screen
        if (this.lastPlatformX - this.worldX < 1500) {
            const gap = 100 + this.prng() * 200; // Gap between platforms
            const w = 200 + this.prng() * 500;   // Platform width
            let y = this.lastPlatformY + (this.prng() * 200 - 100);

            // Keep Y in bounds
            y = Math.max(200, Math.min(y, 500));

            const x = this.lastPlatformX + gap;

            this.platforms.push({ x, y, w, h: 500 });

            // Add obstacle on platform
            if (this.prng() > 0.6) {
                this.obstacles.push({
                    x: x + w/2,
                    y: y - 40,
                    w: 40,
                    h: 40,
                    destructible: this.prng() > 0.5
                });
            }

            // Add star
            if (this.prng() > 0.4) {
                this.stars.push({
                    x: x + w/2 + 50,
                    y: y - 100 - (this.prng() * 50),
                    radius: 10,
                    collected: false
                });
            }

            this.lastPlatformX = x + w;
            this.lastPlatformY = y;
        }
    }

    update() {
        this.worldX += this.speed;
        this.speed += 0.001; // Slowly increase difficulty

        this.generateChunk();

        // Cleanup old objects
        this.platforms = this.platforms.filter(p => p.x + p.w > this.worldX - 200);
        this.obstacles = this.obstacles.filter(o => o.x + o.w > this.worldX - 200);
        this.stars = this.stars.filter(s => s.x + 20 > this.worldX - 200 && !s.collected);
    }

    draw(ctx, canvasWidth, canvasHeight) {
        // Draw grid/background
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < canvasWidth; i += 50) {
            let x = (i - (this.worldX * 0.2) % 50);
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvasHeight);
        }
        for (let i = 0; i < canvasHeight; i += 50) {
            ctx.moveTo(0, i);
            ctx.lineTo(canvasWidth, i);
        }
        ctx.stroke();

        // Draw Platforms
        ctx.fillStyle = '#0b001a';
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff00ff';

        for (let p of this.platforms) {
            const screenX = p.x - this.worldX;
            ctx.beginPath();
            ctx.rect(screenX, p.y, p.w, p.h);
            ctx.fill();
            ctx.stroke();
        }

        // Draw Obstacles
        for (let o of this.obstacles) {
            const screenX = o.x - this.worldX;
            ctx.shadowColor = o.destructible ? '#00ffff' : '#ff0000';
            ctx.fillStyle = o.destructible ? 'rgba(0, 255, 255, 0.5)' : 'rgba(255, 0, 0, 0.5)';
            ctx.strokeStyle = o.destructible ? '#00ffff' : '#ff0000';

            ctx.beginPath();
            ctx.rect(screenX, o.y, o.w, o.h);
            ctx.fill();
            ctx.stroke();
        }

        // Draw Stars
        ctx.shadowColor = '#ffff00';
        ctx.fillStyle = '#ffff00';
        for (let s of this.stars) {
            const screenX = s.x - this.worldX;
            ctx.beginPath();
            ctx.arc(screenX, s.y, s.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

class GameEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.soundMgr = new SoundManager();

        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.players = {};
        this.localPlayerId = null;
        this.world = null;
        this.isRunning = false;

        this.onPlayerDeath = null; // Callback for multiplayer
        this.onPlayerUpdate = null; // Callback for multiplayer
        this.onScoreUpdate = null;
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    start(seed, playersData, localId) {
        this.world = new World(seed);
        this.players = {};
        this.localPlayerId = localId;

        for (let id in playersData) {
            this.players[id] = new Player(id, playersData[id].color, id === localId);
        }

        // Audio context needs user gesture to start
        if(this.soundMgr.ctx.state === 'suspended') {
            this.soundMgr.ctx.resume();
        }

        this.isRunning = true;
        this.loop();
    }

    stop() {
        this.isRunning = false;
    }

    handleInput(action) {
        const p = this.players[this.localPlayerId];
        if (!p || p.status !== 'playing') return;

        let stateChanged = false;
        console.log('handleInput action:', action);
        if (action === 'jump') {
            stateChanged = p.jump(this.soundMgr);
        } else if (action === 'dash') {
            stateChanged = p.dash(this.soundMgr);
        }

        if (stateChanged && this.onPlayerUpdate) {
            this.emitLocalState();
        }
    }

    emitLocalState() {
        const p = this.players[this.localPlayerId];
        if (p && this.onPlayerUpdate) {
            this.onPlayerUpdate({
                x: p.x + this.world.worldX, // Absolute world X
                y: p.y,
                vy: p.vy,
                isDashing: p.isDashing
            });
        }
    }

    updatePhysics() {
        const local = this.players[this.localPlayerId];
        if (local && local.status === 'playing') {
            local.isGrounded = false;

            // Check Platform Collisions
            for (let p of this.world.platforms) {
                // AABB Collision (simplified for top edge)
                const screenX = p.x - this.world.worldX;

                if (local.x < screenX + p.w &&
                    local.x + local.width > screenX &&
                    local.y + local.height <= p.y + 10 && // Was above
                    local.y + local.height + local.vy >= p.y) { // Will intersect

                    local.isGrounded = true;
                    local.y = p.y - local.height;
                    local.vy = 0;
                    break;
                }
            }

            // Check Death (Fall)
            if (local.y > this.canvas.height) {
                this.die(local);
            }

            // Check Obstacle Collisions
            for (let o of this.world.obstacles) {
                const screenX = o.x - this.world.worldX;
                if (local.x < screenX + o.w &&
                    local.x + local.width > screenX &&
                    local.y < o.y + o.h &&
                    local.y + local.height > o.y) {

                    if (local.isDashing && o.destructible) {
                        // Destroy obstacle, add score
                        o.x = -1000; // Move out of view to cull
                        local.score += 500;
                    } else {
                        this.die(local);
                    }
                }
            }

            // Check Stars
            for (let s of this.world.stars) {
                const screenX = s.x - this.world.worldX;
                // Circular collision approximation
                const dist = Math.hypot((local.x + local.width/2) - screenX, (local.y + local.height/2) - s.y);
                if (dist < s.radius + local.width/2) {
                    s.collected = true;
                    local.score += 1000;
                    // Note: Could play star sound here
                }
            }
        }
    }

    die(player) {
        player.status = 'dead';
        this.soundMgr.crash();
        if (this.onPlayerDeath) {
            this.onPlayerDeath(player.score);
        }
    }

    updateRemotePlayer(id, data) {
        const p = this.players[id];
        if (p && !p.isLocal) {
            p.targetX = data.x - this.world.worldX; // Convert absolute to screen space relative to local world view
            p.targetY = data.y;
            p.isDashing = data.isDashing;
            p.status = 'playing'; // Implicitly playing if receiving updates
        }
    }

    setRemotePlayerDead(id, score) {
        const p = this.players[id];
        if(p) {
            p.status = 'dead';
            p.score = score;
        }
    }

    loop() {
        if (!this.isRunning) return;

        // Clear canvas
        this.ctx.fillStyle = '#0b001a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Update
        this.world.update();

        for (let id in this.players) {
            this.players[id].update(this.world.speed);
        }

        this.updatePhysics();

        // Periodically emit score and state even if no input (for sync)
        if (Math.random() < 0.05) {
            this.emitLocalState();
            if (this.onScoreUpdate && this.players[this.localPlayerId]) {
                this.onScoreUpdate(this.players[this.localPlayerId].score);
            }
        }

        // Draw
        this.world.draw(this.ctx, this.canvas.width, this.canvas.height);

        // Draw local player last so it's on top
        for (let id in this.players) {
            if (!this.players[id].isLocal) this.players[id].draw(this.ctx);
        }
        if (this.players[this.localPlayerId]) {
            this.players[this.localPlayerId].draw(this.ctx);
        }

        requestAnimationFrame(() => this.loop());
    }
}

// Make accessible to multiplayer.js
window.GameEngine = GameEngine;