var Input = {
  keys: [],
  mouse: {
    left: false,
    right: false,
    middle: false,
    x: 0,
    y: 0
  }
};
for (var i = 0; i < 230; i++) {
  Input.keys.push(false);
}
document.addEventListener("keydown", function (event) {
  Input.keys[event.keyCode] = true;
});
document.addEventListener("keyup", function (event) {
  Input.keys[event.keyCode] = false;
});
document.addEventListener("mousedown", function (event) {
  if (event.button === 0) Input.mouse.left = true;
  if (event.button === 1) Input.mouse.middle = true;
  if (event.button === 2) Input.mouse.right = true;
});
document.addEventListener("mouseup", function (event) {
  if (event.button === 0) Input.mouse.left = false;
  if (event.button === 1) Input.mouse.middle = false;
  if (event.button === 2) Input.mouse.right = false;
});
document.addEventListener("mousemove", function (event) {
  Input.mouse.x = event.clientX;
  Input.mouse.y = event.clientY;
});



// === CANVAS SETUP ===
var canvas = document.getElementById("gameCanvas");
if (!canvas) {
  console.error("Canvas element not found!");
  throw new Error("Canvas element not found!");
}

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
canvas.style.position = "absolute";
canvas.style.left = "0px";
canvas.style.top = "0px";
document.body.style.overflow = "hidden";
var ctx = canvas.getContext("2d");
if (!ctx) {
  console.error("Could not get 2D context from canvas!");
  throw new Error("Could not get 2D context from canvas!");
}
canvas.style.backgroundColor = "black";
ctx.strokeStyle = "white";

// Handle window resize
window.addEventListener("resize", function() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  startX = canvas.width / 4;
  startY = canvas.height / 2;
  if (player.alive) {
    player.x = startX;
    player.y = startY;
  }
});

// === GLOBAL VARIABLES ===
var critter;
var startX = canvas.width / 4;
var startY = canvas.height / 2;

// === SURVIVAL TIMER VARIABLES ===
var survivalTime = 0;
var baseSize = 4;         // initial creature size
var lastGrowthTime = 0;
var survivalTimer;
var gameLoop;

// === GAME STATE ===
var gameState = 'start'; // 'start', 'playing', 'gameOver'
var bestScore = localStorage.getItem('dinoWalkBestScore') || 0;

// === CHARACTER PLAYER SETUP ===
const characterSprite = document.getElementById("character-sprite");
if (!characterSprite) {
  console.warn("Character sprite element not found!");
}

const player = {
  x: startX,
  y: startY,
  speed: 6.5,
  frame: 0,
  frameWidth: 64,    // ✅ updated
  frameHeight: 128,  // ✅ updated
  frameCount: 8,     // ✅ total frames per row in sprite sheet
  frameTimer: 0,
  frameInterval: 5,
  direction: 'down',
  alive: true
};

function updatePlayer() {
  let dx = 0, dy = 0;
  let lastDir = player.direction;

  if (Input.keys[87] || Input.keys[38]) { dy -= 1; lastDir = 'up'; }
  if (Input.keys[83] || Input.keys[40]) { dy += 1; lastDir = 'down'; }
  if (Input.keys[65] || Input.keys[37]) { dx -= 1; lastDir = 'left'; }
  if (Input.keys[68] || Input.keys[39]) { dx += 1; lastDir = 'right'; }

  player.direction = lastDir;

  const magnitude = Math.sqrt(dx * dx + dy * dy);
  if (magnitude !== 0) {
    dx /= magnitude;
    dy /= magnitude;
    player.x += dx * player.speed;
    player.y += dy * player.speed;
    // ✅ Clamp position to stay inside canvas (walls)
    player.x = Math.max(player.frameWidth / 2, Math.min(canvas.width - player.frameWidth / 2, player.x));
    player.y = Math.max(player.frameHeight / 2, Math.min(canvas.height - player.frameHeight / 2, player.y));

    player.frameTimer++;
    if (player.frameTimer >= player.frameInterval) {
      player.frame = (player.frame + 1) % player.frameCount;
      player.frameTimer = 0;
    }
  } else {
    player.frame = 0; // idle
  }

  // Example game over trigger (if player goes off screen)
  if (
    player.x < -player.frameWidth || player.x > canvas.width + player.frameWidth ||
    player.y < -player.frameHeight || player.y > canvas.height + player.frameHeight
  ) {
    player.alive = false;
  }

  

}

let shakeTime = 0;
let shakeIntensity = 0;
let shakePhase = 0;
function applyScreenShake() {
  if (survivalTime >= 15 && player.alive) {
    shakePhase += 0.12;

    // Big pulse at each step
    const pulse = Math.abs(Math.sin(shakePhase * Math.PI)); // 0 to 1
    const intensity = pulse * 6; // scale

    const dx = (Math.random() - 0.5) * intensity;
    const dy = (Math.random() - 0.5) * intensity;

    ctx.translate(dx, dy);
  }
}

function showGameOver() {
  gameState = 'gameOver';
  document.getElementById("game-over-screen").style.display = "flex";
  
  // Update score display
  const finalScoreElement = document.getElementById("final-score");
  finalScoreElement.textContent = survivalTime + "s";
  
  // Update best score
  if (survivalTime > bestScore) {
    bestScore = survivalTime;
    saveBestScore(); // Save to localStorage
  }
  
  // Update best score display
  const bestScoreElement = document.getElementById("best-score");
  bestScoreElement.textContent = "Best: " + bestScore + "s";
}

function startGame() {
  gameState = 'playing';
  document.getElementById("start-screen").style.display = "none";
  
  // Play game start sound
  gameStartAudio.currentTime = 0;
  gameStartAudio.play();

  // Reset game state
  survivalTime = 0;
  baseSize = 4;
  lastGrowthTime = 0;
  
  // Reset player
  player.x = startX;
  player.y = startY;
  player.alive = true;
  player.frame = 0;
  player.frameTimer = 0;
  player.direction = 'down';
  player.speed = 6.5;
  
  // Initialize creature and start loops
  resetCreature();
  startGameLoop();
  startSurvivalTimer();
}

function backToMenu() {
  gameState = 'start';
  document.getElementById("game-over-screen").style.display = "none";
  document.getElementById("start-screen").style.display = "flex";
  
  // Stop game loops
  if (gameLoop) {
    clearInterval(gameLoop);
    gameLoop = null;
  }
  if (survivalTimer) {
    clearInterval(survivalTimer);
    survivalTimer = null;
  }
  // Stop death audio if playing
  playerDeathAudio.pause();
  playerDeathAudio.currentTime = 0;
}

function restartGame() {
  // Stop death audio if playing
  playerDeathAudio.pause();
  playerDeathAudio.currentTime = 0;

  // Play game start sound
  gameStartAudio.currentTime = 0;
  gameStartAudio.play();

  // Reset game state
  survivalTime = 0;
  baseSize = 4;
  lastGrowthTime = 0;
  
  // Reset player
  player.x = startX;
  player.y = startY;
  player.alive = true;
  player.frame = 0;
  player.frameTimer = 0;
  player.direction = 'down';
  player.speed = 6.5;

  // Rebuild creature (fully resets tail, limbs, etc.)
  resetCreature();

  // Hide game-over overlay
  document.getElementById("game-over-screen").style.display = "none";
  
  // Set game state back to playing
  gameState = 'playing';
}

function drawPlayer() {
  if (!characterSprite.complete) {
    // Fallback if sprite not loaded
    ctx.fillStyle = "blue";
    ctx.fillRect(player.x - 20, player.y - 20, 40, 40);
    return;
  }

  const dirRow = {
    'down': 0,
    'left': 1,
    'right': 2,
    'up': 3
  };

  const row = dirRow[player.direction] || 0;

  const scale = 0.7;  // 🔍 scale down (adjust as needed)
  const scaledWidth = player.frameWidth * scale;
  const scaledHeight = player.frameHeight * scale;

  ctx.drawImage(
    characterSprite,
    player.frame * player.frameWidth,     // source x
    row * player.frameHeight,             // source y
    player.frameWidth,                    // source width
    player.frameHeight,                   // source height
    player.x - scaledWidth / 2,           // draw x
    player.y - scaledHeight / 2,          // draw y
    scaledWidth,                          // draw width
    scaledHeight                          // draw height
  );
}

const boneTexture = new Image();
boneTexture.src = "./bone_texture.jpg";
boneTexture.onerror = () => {
  console.warn("Bone texture not found, using fallback");
};


// === DINOSAUR HEAD IMAGE ===
const dinoHead = new Image();
let dinoHeadReady = false;
dinoHead.onload = () => {
  dinoHeadReady = true;
};
dinoHead.onerror = () => {
  console.warn("Dino head image not found");
};
dinoHead.src = "./dino_skull.png"; // ✅ your actual transparent skull


function drawDinoFace(x, y, angle, imgSize = 300) {
  if (!dinoHead.complete) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (Math.cos(angle) < 0) {
    ctx.scale(1, -1);
    ctx.drawImage(dinoHead, -imgSize/2, -imgSize/2, imgSize, imgSize);
  } else {
    ctx.drawImage(dinoHead, -imgSize/2, -imgSize/2, imgSize, imgSize);
  }
  ctx.restore();
}

// === CREATURE CLASSES ===
var segmentCount = 0;
class Segment {
  constructor(parent, size, angle, range, stiffness) {
    segmentCount++;
    this.isSegment = true;
    this.parent = parent;
    if (typeof parent.children == "object") {
      parent.children.push(this);
    }
    this.children = [];
    this.size = size;
    this.relAngle = angle;
    this.defAngle = angle;
    this.absAngle = parent.absAngle + angle;
    this.range = range;
    this.stiffness = stiffness;
    this.updateRelative(false, true);
  }
  
  updateRelative(iter, flex) {
    this.relAngle =
      this.relAngle -
      2 *
        Math.PI *
        Math.floor((this.relAngle - this.defAngle) / 2 / Math.PI + 1 / 2);
    if (flex) {
      this.relAngle = Math.min(
        this.defAngle + this.range / 2,
        Math.max(
          this.defAngle - this.range / 2,
          (this.relAngle - this.defAngle) / this.stiffness + this.defAngle
        )
      );
    }
    this.absAngle = this.parent.absAngle + this.relAngle;
    this.x = this.parent.x + Math.cos(this.absAngle) * this.size;
    this.y = this.parent.y + Math.sin(this.absAngle) * this.size;
    if (iter) {
      for (var i = 0; i < this.children.length; i++) {
        this.children[i].updateRelative(iter, flex);
      }
    }
  }
  
  draw(iter) {
  if (boneTexture.complete) {
    const angle = Math.atan2(this.y - this.parent.y, this.x - this.parent.x);
    const length = Math.sqrt((this.x - this.parent.x) ** 2 + (this.y - this.parent.y) ** 2);

    ctx.save();
    ctx.translate(this.parent.x, this.parent.y);
    ctx.rotate(angle);
    ctx.drawImage(boneTexture, 0, -5, length, 2); // width = segment length, height = 10px
    ctx.restore();
  } else {
    // fallback if texture not ready
    ctx.beginPath();
    ctx.moveTo(this.parent.x, this.parent.y);
    ctx.lineTo(this.x, this.y);
    ctx.stroke();
  }

  if (iter) {
    for (var i = 0; i < this.children.length; i++) {
      this.children[i].draw(true);
    }
  }
}

  
  follow(iter) {
    var x = this.parent.x;
    var y = this.parent.y;
    var dist = Math.sqrt((this.x - x) ** 2 + (this.y - y) ** 2);
    this.x = x + this.size * (this.x - x) / dist;
    this.y = y + this.size * (this.y - y) / dist;
    this.absAngle = Math.atan2(this.y - y, this.x - x);
    this.relAngle = this.absAngle - this.parent.absAngle;
    this.updateRelative(false, true);
    if (iter) {
      for (var i = 0; i < this.children.length; i++) {
        this.children[i].follow(true);
      }
    }
  }
}

class LimbSystem {
  constructor(end, length, speed, creature) {
    this.end = end;
    this.length = Math.max(1, length);
    this.creature = creature;
    this.speed = speed;
    creature.systems.push(this);
    this.nodes = [];
    var node = end;
    for (var i = 0; i < length; i++) {
      this.nodes.unshift(node);
      node = node.parent;
      if (!node.isSegment) {
        this.length = i + 1;
        break;
      }
    }
    this.hip = this.nodes[0].parent;
  }
  
  moveTo(x, y) {
    this.nodes[0].updateRelative(true, true);
    var dist = Math.sqrt((x - this.end.x) ** 2 + (y - this.end.y) ** 2);
    var len = Math.max(0, dist - this.speed);
    for (var i = this.nodes.length - 1; i >= 0; i--) {
      var node = this.nodes[i];
      var ang = Math.atan2(node.y - y, node.x - x);
      node.x = x + len * Math.cos(ang);
      node.y = y + len * Math.sin(ang);
      x = node.x;
      y = node.y;
      len = node.size;
    }
    for (var i = 0; i < this.nodes.length; i++) {
      var node = this.nodes[i];
      node.absAngle = Math.atan2(
        node.y - node.parent.y,
        node.x - node.parent.x
      );
      node.relAngle = node.absAngle - node.parent.absAngle;
      for (var ii = 0; ii < node.children.length; ii++) {
        var childNode = node.children[ii];
        if (!this.nodes.includes(childNode)) {
          childNode.updateRelative(true, false);
        }
      }
    }
  }
  
  update() {
    this.moveTo(Input.mouse.x, Input.mouse.y);
  }
}

class LegSystem extends LimbSystem {
  constructor(end, length, speed, creature) {
    super(end, length, speed, creature);
    this.goalX = end.x;
    this.goalY = end.y;
    this.step = 0;
    this.forwardness = 0;
    this.reach =
      0.9 *
      Math.sqrt((this.end.x - this.hip.x) ** 2 + (this.end.y - this.hip.y) ** 2);
    var relAngle =
      this.creature.absAngle -
      Math.atan2(this.end.y - this.hip.y, this.end.x - this.hip.x);
    relAngle -= 2 * Math.PI * Math.floor(relAngle / 2 / Math.PI + 1 / 2);
    this.swing = -relAngle + (2 * (relAngle < 0) - 1) * Math.PI / 2;
    this.swingOffset = this.creature.absAngle - this.hip.absAngle;
  }
  
  update(x, y) {
    this.moveTo(this.goalX, this.goalY);
    if (this.step == 0) {
      var dist = Math.sqrt((this.end.x - this.goalX) ** 2 + (this.end.y - this.goalY) ** 2);
      if (dist > 1) {
        this.step = 1;
        this.goalX =
          this.hip.x +
          this.reach *
            Math.cos(this.swing + this.hip.absAngle + this.swingOffset) +
          (2 * Math.random() - 1) * this.reach / 2;
        this.goalY =
          this.hip.y +
          this.reach *
            Math.sin(this.swing + this.hip.absAngle + this.swingOffset) +
          (2 * Math.random() - 1) * this.reach / 2;
      }
    } else if (this.step == 1) {
      var theta =
        Math.atan2(this.end.y - this.hip.y, this.end.x - this.hip.x) -
        this.hip.absAngle;
      var dist = Math.sqrt((this.end.x - this.hip.x) ** 2 + (this.end.y - this.hip.y) ** 2);
      var forwardness2 = dist * Math.cos(theta);
      var dF = this.forwardness - forwardness2;
      this.forwardness = forwardness2;
      if (dF * dF < 1) {
        this.step = 0;
        this.goalX = this.hip.x + (this.end.x - this.hip.x);
        this.goalY = this.hip.y + (this.end.y - this.hip.y);
      }
    }
  }
}

class Creature {
  constructor(
    x,
    y,
    angle,
    fAccel,
    fFric,
    fRes,
    fThresh,
    rAccel,
    rFric,
    rRes,
    rThresh
  ) {
    this.x = x;
    this.y = y;
    this.absAngle = angle;
    this.fSpeed = 0;
    this.fAccel = fAccel;
    this.fFric = fFric;
    this.fRes = fRes;
    this.fThresh = fThresh;
    this.rSpeed = 0;
    this.rAccel = rAccel;
    this.rFric = rFric;
    this.rRes = rRes;
    this.rThresh = rThresh;
    this.children = [];
    this.systems = [];
    this.headSize = 20;
  }
  
  follow(x, y) {
    var dist = Math.sqrt((this.x - x) ** 2 + (this.y - y) ** 2);
    var angle = Math.atan2(y - this.y, x - this.x);
    var accel = this.fAccel;
    if (this.systems.length > 0) {
      var sum = 0;
      for (var i = 0; i < this.systems.length; i++) {
        sum += this.systems[i].step == 0;
      }
      accel *= sum / this.systems.length;
    }
    this.fSpeed += accel * (dist > this.fThresh);
    this.fSpeed *= 1 - this.fRes;
    this.speed = Math.max(0, this.fSpeed - this.fFric);
    var dif = this.absAngle - angle;
    dif -= 2 * Math.PI * Math.floor(dif / (2 * Math.PI) + 1 / 2);
    if (Math.abs(dif) > this.rThresh && dist > this.fThresh) {
      this.rSpeed -= this.rAccel * (2 * (dif > 0) - 1);
    }
    this.rSpeed *= 1 - this.rRes;
    if (Math.abs(this.rSpeed) > this.rFric) {
      this.rSpeed -= this.rFric * (2 * (this.rSpeed > 0) - 1);
    } else {
      this.rSpeed = 0;
    }
    this.absAngle += this.rSpeed;
    this.absAngle -=
      2 * Math.PI * Math.floor(this.absAngle / (2 * Math.PI) + 1 / 2);
    this.x += this.speed * Math.cos(this.absAngle);
    this.y += this.speed * Math.sin(this.absAngle);
    this.absAngle += Math.PI;
    for (var i = 0; i < this.children.length; i++) {
      this.children[i].follow(true, true);
    }
    for (var i = 0; i < this.systems.length; i++) {
      this.systems[i].update(x, y);
    }
    this.absAngle -= Math.PI;
    this.draw(true);
  }
  
  draw(iter) {
  if (iter) {
    for (var i = 0; i < this.children.length; i++) {
      this.children[i].draw(true); // ✅ draw body first
    }
  }
  drawDinoFace(this.x, this.y, this.absAngle + Math.PI, this.headSize); // ✅ then draw head on top
}
}


function checkPlayerDeath() {
  const dx = player.x - critter.x;
  const dy = player.y - critter.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance < 150 && player.alive) {
    shakeTime = 5;           // how long it lasts (frames)
    shakeIntensity = 10;     // how strong it shakes
  }
  if (distance < 50 && player.alive) {
    player.alive = false;
    // Play death sound
    playerDeathAudio.currentTime = 0;
    playerDeathAudio.play();
    showGameOver(); // ✅ show overlay
  }
}


function drawRestartButton() {
  ctx.save();
  ctx.translate(canvas.width - 60, 20);
  ctx.fillStyle = player.alive ? "#444" : "#fff";
  ctx.fillRect(-20, -20, 40, 40);
  ctx.fillStyle = player.alive ? "#999" : "#000";
  ctx.beginPath();
  ctx.moveTo(-5, -10);
  ctx.lineTo(10, 0);
  ctx.lineTo(-5, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

canvas.addEventListener("click", function (e) {
  const rect = canvas.getBoundingClientRect();
  const bx = canvas.width - 60;
  const by = 20;
  const dx = (e.clientX - rect.left) - bx;
  const dy = (e.clientY - rect.top) - by;

  if (Math.abs(dx) < 20 && Math.abs(dy) < 20 && !player.alive) {
    restartGame();
  }
});


// === CREATURE SETUP ===
function setupLizard(size, legs, tail) {
  var s = size;
  critter = new Creature(
    window.innerWidth / 2,
    window.innerHeight / 2,
    0,
    s * 10,
    s * 2,
    0.5,
    16,
    0.5,
    0.085,
    0.5,
    0.3
  );
  critter.headSize = s * 20;

  var spinal = critter;
  for (var i = 0; i < 6; i++) {
    spinal = new Segment(spinal, s * 4, 0, 3.1415 * 2 / 3, 1.1);
    for (var ii = -1; ii <= 1; ii += 2) {
      var node = new Segment(spinal, s * 3, ii, 0.1, 2);
      for (var iii = 0; iii < 3; iii++) {
        node = new Segment(node, s * 0.1, -ii * 0.1, 0.1, 2);
      }
    }
  }

  for (var i = 0; i < legs; i++) {
    if (i > 0) {
      for (var ii = 0; ii < 6; ii++) {
        spinal = new Segment(spinal, s * 4, 0, 1.571, 1.5);
        for (var iii = -1; iii <= 1; iii += 2) {
          var node = new Segment(spinal, s * 3, iii * 1.571, 0.1, 1.5);
          for (var iv = 0; iv < 3; iv++) {
            node = new Segment(node, s * 3, -iii * 0.3, 0.1, 2);
          }
        }
      }
    }

    for (var ii = -1; ii <= 1; ii += 2) {
      var node = new Segment(spinal, s * 12, ii * 0.785, 0, 8);
      node = new Segment(node, s * 16, -ii * 0.785, 6.28, 1);
      node = new Segment(node, s * 16, ii * 1.571, 3.1415, 2);
      for (var iii = 0; iii < 4; iii++) {
        new Segment(node, s * 4, (iii / 3 - 0.5) * 1.571, 0.1, 4);
      }
      new LegSystem(node, 3, s * 12, critter);
    }
  }

  for (var i = 0; i < tail; i++) {
    spinal = new Segment(spinal, s * 4, 0, 3.1415 * 2 / 3, 1.1);
    for (var ii = -1; ii <= 1; ii += 2) {
      var node = new Segment(spinal, s * 3, ii, 0.1, 2);
      for (var iii = 0; iii < 3; iii++) {
        node = new Segment(node, s * 3 * (tail - i) / tail, -ii * 0.1, 0.1, 2);
      }
    }
  }
}

function drawBackground() {
  const backgroundImg = document.getElementById("background-image");
  if (backgroundImg && backgroundImg.complete) {
    // Create a pattern that tiles the background
    const pattern = ctx.createPattern(backgroundImg, 'repeat');
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    // Fallback to black if image not loaded
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

// === MAIN RENDER LOOP ===
function startGameLoop() {
  if (gameLoop) {
    clearInterval(gameLoop);
  }
  gameLoop = setInterval(function () {
    // Only run game logic if playing
    if (gameState === 'playing') {
      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();            // Save before applying shake
      applyScreenShake();    // Apply random offset
      drawBackground();      // Draw background image instead of black

      // Update only if player is alive
      if (player.alive) {
        updatePlayer();        // movement & animation
        checkPlayerDeath();    // collision with dino
      }

      if (survivalTime % 30 === 0 && survivalTime !== 0 && player.alive) {
        resetCreature();
      }

      // Dino follows player
      if (critter) {
        critter.follow(player.x, player.y);
      }

      // Draw player
      if (player.alive) {
        drawPlayer();
      }

      if (!player.alive) {
        ctx.fillStyle = "red";
        ctx.font = "30px monospace";
        ctx.fillText("DEAD", player.x - 30, player.y - 40);
      }

      // Show survival timer
      drawPixelatedText(`Time Survived: ${survivalTime}s`, 20, 20, 20, "white");
      
      // Show best score
      if (bestScore > 0) {
        drawPixelatedText(`Best: ${bestScore}s`, 20, 50, 16, "#00ff00");
      }
      
      // Show current speed
      drawPixelatedText(`Speed: ${player.speed.toFixed(1)}`, 20, 80, 16, "#ffff00");
      
      // Show dino size
      drawPixelatedText(`Dino Size: ${baseSize}`, 20, 110, 16, "#ff0000");

      // Show restart icon in top right (canvas-based)
      drawRestartButton();
      ctx.restore();         // Restore to undo shake offset
    } else if (gameState === 'start') {
      // Draw start screen background
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawBackground();      // Use background image for start screen too
      
      // Draw some animated background elements
      drawStartScreenBackground();
    }
  }, 33);
}

// === INITIALIZE THE CREATURE ===

function getIncrementalSize() {
  if (typeof baseSize === 'undefined') {
    baseSize = 4; // fallback initialization
  }
  return baseSize;
}

function resetCreature() {
  const legNum = 2;
  const size = getIncrementalSize();

  setupLizard(size / Math.sqrt(legNum), legNum, Math.floor(2 + 2 * legNum * 8));
}

// === INITIAL START ===
console.log("Starting game initialization...");
loadBestScore(); // Load best score from localStorage
// Don't start the game automatically - show start screen first
startGameLoop(); // Start the render loop but don't start the game
console.log("Game initialization complete!");

function resetPlayer() {
  player.x = startX;
  player.y = startY;
  player.direction = 'down';
  player.speed = 6.5;
}

// === SURVIVAL TIMER ===
// Add audio element for dino roar
const dinoRoarAudio = new Audio('./Roar.mp3');
dinoRoarAudio.volume = 0.7; // adjust as needed
// Add audio element for player death
const playerDeathAudio = new Audio('./udied.mp3');
playerDeathAudio.volume = 0.8; // adjust as needed
// Add audio element for game start
const gameStartAudio = new Audio('./Roar.mp3');
gameStartAudio.volume = 0.8; // adjust as needed

function startSurvivalTimer() {
  if (survivalTimer) {
    clearInterval(survivalTimer);
  }
  survivalTimer = setInterval(() => {
    if (player.alive && gameState === 'playing') {
      survivalTime++;

      // Grow every 30 seconds
      if (survivalTime - lastGrowthTime >= 30) {
        baseSize += 1;              // ✅ dino grows +1 size
        player.speed += 0.5;        // ✅ player gets faster
        lastGrowthTime = survivalTime;
        resetCreature();            // ✅ rebuild creature with new size
        // Play dino roar sound
        dinoRoarAudio.currentTime = 0;
        dinoRoarAudio.play();
      }
    }
  }, 1000);
}

function drawPixelatedText(text, x, y, size = 16, color = "white") {
  ctx.save();
  ctx.font = `${size}px 'Courier New', monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  
  // Add pixelated effect
  ctx.shadowColor = color;
  ctx.shadowBlur = 2;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawPixelatedRect(x, y, width, height, color = "white", borderColor = null) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
  
  if (borderColor) {
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
  }
  ctx.restore();
}

function drawStartScreenBackground() {
  // Add a semi-transparent overlay to make elements more visible
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw animated pixel particles
  const time = Date.now() * 0.001;
  for (let i = 0; i < 50; i++) {
    const x = (Math.sin(time + i * 0.1) * canvas.width * 0.3) + canvas.width * 0.5;
    const y = (Math.cos(time + i * 0.15) * canvas.height * 0.3) + canvas.height * 0.5;
    const size = Math.sin(time + i) * 2 + 3;
    
    ctx.fillStyle = `rgba(0, 255, 0, ${0.3 + Math.sin(time + i) * 0.2})`;
    ctx.fillRect(x, y, size, size);
  }
  
  // Draw some pixelated grid lines
  ctx.strokeStyle = "rgba(0, 255, 0, 0.1)";
  ctx.lineWidth = 1;
  for (let i = 0; i < canvas.width; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, canvas.height);
    ctx.stroke();
  }
  for (let i = 0; i < canvas.height; i += 40) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(canvas.width, i);
    ctx.stroke();
  }
}

// Load best score from localStorage
function loadBestScore() {
  const saved = localStorage.getItem('dinoWalkBestScore');
  if (saved) {
    bestScore = parseInt(saved);
  }
}

// Save best score to localStorage
function saveBestScore() {
  localStorage.setItem('dinoWalkBestScore', bestScore.toString());
}