const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const STATE = { START: 0, PLAYING: 1, GAMEOVER: 2 };
let currentState = STATE.START;

let frames = 0;
let score = 0;
let highScore = localStorage.getItem('anand_highScore') || 0;

const GRAVITY = 0.28;
const JUMP_FORCE = -5.8;
const PIPE_SPEED = 2.4;
const PIPE_GAP = 135;
const PIPE_INTERVAL = 100;

const playerImg = new Image();
playerImg.src = 'anand.png'; // Rename to match your image file

function playSound(filePath, fallbackTone = 400) {
  const audio = new Audio(filePath);
  audio.play().catch(() => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.value = fallbackTone;
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {}
  });
}

const player = {
  x: 65,
  y: 200,
  radius: 22,
  velocity: 0,
  rotation: 0,

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    this.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity * 4) * Math.PI / 180));
    ctx.rotate(this.rotation);

    if (playerImg.complete && playerImg.naturalWidth !== 0) {
      ctx.drawImage(playerImg, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
    } else {
      ctx.fillStyle = '#f39c12';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  update() {
    this.velocity += GRAVITY;
    this.y += this.velocity;

    if (this.y + this.radius >= canvas.height - 40) {
      this.y = canvas.height - 40 - this.radius;
      triggerGameOver();
    }

    if (this.y - this.radius <= 0) {
      this.y = this.radius;
      this.velocity = 0;
    }
  },

  jump() {
    this.velocity = JUMP_FORCE;
    playSound('sounds/jump.mp3', 450);
  },

  reset() {
    this.y = 200;
    this.velocity = 0;
  }
};

let pipes = [];

function spawnPipe() {
  const minHeight = 60;
  const maxHeight = canvas.height - 40 - PIPE_GAP - minHeight;
  const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;

  pipes.push({
    x: canvas.width,
    top: topHeight,
    bottom: canvas.height - 40 - (topHeight + PIPE_GAP),
    width: 52,
    passed: false
  });
}

function updatePipes() {
  if (frames % PIPE_INTERVAL === 0) spawnPipe();

  for (let i = pipes.length - 1; i >= 0; i--) {
    let p = pipes[i];
    p.x -= PIPE_SPEED;

    const inX = player.x + player.radius > p.x && player.x - player.radius < p.x + p.width;
    const hitTop = player.y - player.radius < p.top;
    const hitBottom = player.y + player.radius > canvas.height - 40 - p.bottom;

    if (inX && (hitTop || hitBottom)) {
      triggerGameOver();
    }

    if (!p.passed && p.x + p.width < player.x) {
      score++;
      p.passed = true;
      playSound('sounds/score.mp3', 600);
    }

    if (p.x + p.width < 0) {
      pipes.splice(i, 1);
    }
  }
}

function drawPipes() {
  ctx.fillStyle = '#2ecc71';
  ctx.strokeStyle = '#1b7943';
  ctx.lineWidth = 3;

  pipes.forEach(p => {
    ctx.fillRect(p.x, 0, p.width, p.top);
    ctx.strokeRect(p.x, 0, p.width, p.top);

    const bottomY = canvas.height - 40 - p.bottom;
    ctx.fillRect(p.x, bottomY, p.width, p.bottom);
    ctx.strokeRect(p.x, bottomY, p.width, p.bottom);
  });
}

function drawFloor() {
  ctx.fillStyle = '#ded895';
  ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
  ctx.fillStyle = '#73bf2e';
  ctx.fillRect(0, canvas.height - 40, canvas.width, 10);
}

function drawUI() {
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  ctx.textAlign = 'center';

  if (currentState === STATE.PLAYING) {
    ctx.font = 'bold 26px Arial';
    ctx.strokeText(score, canvas.width / 2, 50);
    ctx.fillText(score, canvas.width / 2, 50);
  } else if (currentState === STATE.START) {
    ctx.font = 'bold 24px Arial';
    ctx.strokeText('FLYING ANAND', canvas.width / 2, 170);
    ctx.fillText('FLYING ANAND', canvas.width / 2, 170);

    ctx.font = '16px Arial';
    ctx.strokeText('Tap or Press Space to Start', canvas.width / 2, 215);
    ctx.fillText('Tap or Press Space to Start', canvas.width / 2, 215);
  } else if (currentState === STATE.GAMEOVER) {
    ctx.font = 'bold 26px Arial';
    ctx.strokeText('GAME OVER', canvas.width / 2, 180);
    ctx.fillText('GAME OVER', canvas.width / 2, 180);

    ctx.font = '18px Arial';
    ctx.strokeText(`Score: ${score}`, canvas.width / 2, 220);
    ctx.fillText(`Score: ${score}`, canvas.width / 2, 220);

    ctx.strokeText(`Best: ${highScore}`, canvas.width / 2, 250);
    ctx.fillText(`Best: ${highScore}`, canvas.width / 2, 250);

    ctx.font = '15px Arial';
    ctx.strokeText('Tap or Press Space to Retry', canvas.width / 2, 300);
    ctx.fillText('Tap or Press Space to Retry', canvas.width / 2, 300);
  }
}

function triggerGameOver() {
  playSound('sounds/gameover.mp3', 180);
  currentState = STATE.GAMEOVER;
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('anand_highScore', highScore);
  }
}

function handleInput() {
  if (currentState === STATE.START) {
    currentState = STATE.PLAYING;
    player.jump();
  } else if (currentState === STATE.PLAYING) {
    player.jump();
  } else if (currentState === STATE.GAMEOVER) {
    pipes = [];
    score = 0;
    frames = 0;
    player.reset();
    currentState = STATE.START;
  }
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    handleInput();
  }
});
canvas.addEventListener('pointerdown', () => handleInput());

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (currentState === STATE.PLAYING) {
    player.update();
    updatePipes();
    frames++;
  }

  drawPipes();
  drawFloor();
  player.draw();
  drawUI();

  requestAnimationFrame(loop);
}

loop();