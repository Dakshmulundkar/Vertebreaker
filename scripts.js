var Input = {
  keys: [],
  mouse: {
    left: false,
    right: false,
    middle: false,
    x: 0,
    y: 0,
  },
}
for (var i = 0; i < 230; i++) {
  Input.keys.push(false)
}
document.addEventListener("keydown", (event) => {
  Input.keys[event.keyCode] = true
})
document.addEventListener("keyup", (event) => {
  Input.keys[event.keyCode] = false
})
document.addEventListener("mousedown", (event) => {
  if (event.button === 0) Input.mouse.left = true
  if (event.button === 1) Input.mouse.middle = true
  if (event.button === 2) Input.mouse.right = true
})
document.addEventListener("mouseup", (event) => {
  if (event.button === 0) Input.mouse.left = false
  if (event.button === 1) Input.mouse.middle = false
  if (event.button === 2) Input.mouse.right = false
})
document.addEventListener("mousemove", (event) => {
  Input.mouse.x = event.clientX
  Input.mouse.y = event.clientY
})

// === CANVAS SETUP ===
var canvas = document.getElementById("gameCanvas")
if (!canvas) {
  console.error("Canvas element not found!")
  throw new Error("Canvas element not found!")
}

canvas.width = window.innerWidth
canvas.height = window.innerHeight
canvas.style.position = "absolute"
canvas.style.left = "0px"
canvas.style.top = "0px"
document.body.style.overflow = "hidden"
var ctx = canvas.getContext("2d")
if (!ctx) {
  console.error("Could not get 2D context from canvas!")
  throw new Error("Could not get 2D context from canvas!")
}
ctx.strokeStyle = "white"

// Handle window resize
window.addEventListener("resize", () => {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  startX = canvas.width / 4
  startY = canvas.height / 2
  if (player.alive) {
    player.x = startX
    player.y = startY
  }
  // Regenerate gems on resize
  generateGems()
})

// === GLOBAL VARIABLES ===
var critter
var startX = canvas.width / 4
var startY = canvas.height / 2

// === SURVIVAL TIMER VARIABLES ===
var survivalTime = 0
var baseSize = 5 // initial creature size
var lastGrowthTime = 0
var survivalTimer
var gameLoop

// === GAME STATE ===
var gameState = "start" // 'start', 'playing', 'gameOver'
var bestScore = localStorage.getItem("dinoWalkBestScore") || 0

// === GEM SYSTEM ===
var gems = []
var gemEffects = {
  dinoFrozen: false,
  dinoFreezeTime: 0,
  playerSpeedBoost: false,
  playerSpeedBoostTime: 0,
  originalPlayerSpeed: 6.5,
}

// Gem types
var GemType = {
  BLUE: "blue", // Freeze dino for 5s
  RED: "red", // Speed boost for 15s
  PURPLE: "purple", // Teleport away from dino
}

function Gem(x, y, type) {
  this.x = x
  this.y = y
  this.type = type
  this.size = 20
  this.active = true
  this.glowPhase = Math.random() * Math.PI * 2
  this.pulsePhase = Math.random() * Math.PI * 2
}

function generateGems() {
  // Clear all existing gems immediately
  gems = []

  // Generate 3-5 gems randomly across the screen
  const numGems = 3 + Math.floor(Math.random() * 3)
  const gemTypes = [GemType.BLUE, GemType.RED, GemType.PURPLE]

  for (let i = 0; i < numGems; i++) {
    const x = Math.random() * (canvas.width * 0.8) + canvas.width * 0.1
    const y = Math.random() * (canvas.height * 0.8) + canvas.height * 0.1
    const type = gemTypes[Math.floor(Math.random() * gemTypes.length)]

    // Create new gem with random phase offsets to avoid synchronized animation
    const newGem = new Gem(x, y, type)
    newGem.glowPhase = Math.random() * Math.PI * 2
    newGem.pulsePhase = Math.random() * Math.PI * 2

    gems.push(newGem)
  }
}

function drawGems() {
  gems.forEach((gem) => {
    if (!gem.active) return

    gem.glowPhase += 0.08
    gem.pulsePhase += 0.05
    const glow = Math.sin(gem.glowPhase) * 0.4 + 0.8
    const pulse = Math.sin(gem.pulsePhase) * 0.2 + 1

    ctx.save()
    ctx.translate(gem.x, gem.y)
    ctx.scale(pulse, pulse)

    // Draw gem based on type
    switch (gem.type) {
      case GemType.BLUE:
        // Blue gem - freeze effect
        ctx.shadowColor = "rgba(0, 150, 255, 0.8)"
        ctx.shadowBlur = 20
        ctx.fillStyle = `rgba(0, 150, 255, ${glow})`
        drawGemShape()
        // Add ice effect
        ctx.strokeStyle = `rgba(200, 255, 255, ${glow * 0.7})`
        ctx.lineWidth = 2
        ctx.strokeRect(-gem.size / 2, -gem.size / 2, gem.size, gem.size)
        break

      case GemType.RED:
        // Red gem - speed boost
        ctx.shadowColor = "rgba(255, 50, 50, 0.8)"
        ctx.shadowBlur = 20
        ctx.fillStyle = `rgba(255, 50, 50, ${glow})`
        drawGemShape()
        // Add flame effect
        ctx.fillStyle = `rgba(255, 200, 0, ${glow * 0.5})`
        ctx.fillRect(-gem.size / 4, -gem.size / 4, gem.size / 2, gem.size / 2)
        break

      case GemType.PURPLE:
        // Purple gem - teleport
        ctx.shadowColor = "rgba(150, 0, 150, 0.8)"
        ctx.shadowBlur = 20
        ctx.fillStyle = `rgba(100, 0, 100, ${glow})`
        drawGemShape()
        // Add mystical effect
        ctx.strokeStyle = `rgba(200, 100, 200, ${glow * 0.7})`
        ctx.lineWidth = 1
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2
          const x1 = (Math.cos(angle) * gem.size) / 3
          const y1 = (Math.sin(angle) * gem.size) / 3
          const x2 = (Math.cos(angle) * gem.size) / 2
          const y2 = (Math.sin(angle) * gem.size) / 2
          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.stroke()
        }
        break
    }

    function drawGemShape() {
      // Draw diamond shape
      ctx.beginPath()
      ctx.moveTo(0, -gem.size / 2)
      ctx.lineTo(gem.size / 2, 0)
      ctx.lineTo(0, gem.size / 2)
      ctx.lineTo(-gem.size / 2, 0)
      ctx.closePath()
      ctx.fill()
    }

    ctx.restore()
  })
}

function checkGemCollisions() {
  gems.forEach((gem) => {
    if (!gem.active) return

    const dx = player.x - gem.x
    const dy = player.y - gem.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < gem.size + 20) {
      gem.active = false
      applyGemEffect(gem.type)
    }
  })
}

function applyGemEffect(gemType) {
  switch (gemType) {
    case GemType.BLUE:
      // Freeze dino for 5 seconds
      gemEffects.dinoFrozen = true
      gemEffects.dinoFreezeTime = 5000 // 5 seconds in milliseconds
      setTimeout(() => {
        gemEffects.dinoFrozen = false
        gemEffects.dinoFreezeTime = 0
      }, 5000)
      break

    case GemType.RED:
      // Speed boost for 15 seconds
      if (!gemEffects.playerSpeedBoost) {
        gemEffects.originalPlayerSpeed = player.speed
      }
      gemEffects.playerSpeedBoost = true
      gemEffects.playerSpeedBoostTime = 15000 // 15 seconds
      player.speed = gemEffects.originalPlayerSpeed * 1.8 // 80% speed increase

      setTimeout(() => {
        gemEffects.playerSpeedBoost = false
        gemEffects.playerSpeedBoostTime = 0
        player.speed = gemEffects.originalPlayerSpeed
      }, 15000)
      break

    case GemType.PURPLE:
      // Teleport player to random location away from dino
      teleportPlayerAway()
      break
  }
}

function teleportPlayerAway() {
  let attempts = 0
  let newX, newY

  // Try to find a position far from the dino
  do {
    newX = Math.random() * (canvas.width * 0.8) + canvas.width * 0.1
    newY = Math.random() * (canvas.height * 0.8) + canvas.height * 0.1

    const dx = newX - critter.x
    const dy = newY - critter.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance > 200) {
      // Ensure at least 200px away from dino
      player.x = newX
      player.y = newY
      break
    }
    attempts++
  } while (attempts < 10)

  // If we couldn't find a good spot, just teleport to opposite corner
  if (attempts >= 10) {
    if (critter.x < canvas.width / 2) {
      player.x = canvas.width * 0.8
    } else {
      player.x = canvas.width * 0.2
    }

    if (critter.y < canvas.height / 2) {
      player.y = canvas.height * 0.8
    } else {
      player.y = canvas.height * 0.2
    }
  }
}

function updateGemEffects() {
  // Update effect timers (visual feedback)
  if (gemEffects.dinoFreezeTime > 0) {
    gemEffects.dinoFreezeTime -= 33 // Subtract frame time
  }

  if (gemEffects.playerSpeedBoostTime > 0) {
    gemEffects.playerSpeedBoostTime -= 33
  }
}

function drawGemEffectUI() {
  let yOffset = 125 // reduced from 170

  // Show freeze effect
  if (gemEffects.dinoFrozen) {
    const timeLeft = Math.ceil(gemEffects.dinoFreezeTime / 1000)
    drawPixelatedText(`❄️ Frozen: ${timeLeft}s`, 20, yOffset, 14, "#00aaff") // reduced from 16
    yOffset += 20 // reduced from 25
  }

  // Show speed boost effect
  if (gemEffects.playerSpeedBoost) {
    const timeLeft = Math.ceil(gemEffects.playerSpeedBoostTime / 1000)
    drawPixelatedText(`🔥 Boost: ${timeLeft}s`, 20, yOffset, 14, "#ff3333") // reduced from 16
    yOffset += 20 // reduced from 25
  }
}

// === INTERACTIVE ELEMENTS ===
var interactiveElements = []
var bonusScore = 0

// Interactive element types
var ElementType = {
  SKULL_PILE: "skull_pile",
  CURSED_TOTEM: "cursed_totem",
  BONE_FRAGMENT: "bone_fragment",
}

function InteractiveElement(x, y, type, size) {
  this.x = x
  this.y = y
  this.type = type
  this.size = size || 20
  this.active = true
  this.glowPhase = Math.random() * Math.PI * 2
  this.destroyed = false
}

function generateInteractiveElements() {
  interactiveElements = []

  // Generate skull piles (breakable)
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * (canvas.width * 0.6) + canvas.width * 0.2
    const y = Math.random() * (canvas.height * 0.6) + canvas.height * 0.2
    interactiveElements.push(new InteractiveElement(x, y, ElementType.SKULL_PILE, 25))
  }

  // Generate cursed totems (slow effect)
  for (let i = 0; i < 4; i++) {
    const x = Math.random() * (canvas.width * 0.7) + canvas.width * 0.15
    const y = Math.random() * (canvas.height * 0.7) + canvas.height * 0.15
    interactiveElements.push(new InteractiveElement(x, y, ElementType.CURSED_TOTEM, 30))
  }

  // Generate bone fragments (small collectibles)
  for (let i = 0; i < 12; i++) {
    const x = Math.random() * (canvas.width * 0.8) + canvas.width * 0.1
    const y = Math.random() * (canvas.height * 0.8) + canvas.height * 0.1
    interactiveElements.push(new InteractiveElement(x, y, ElementType.BONE_FRAGMENT, 15))
  }
}

function drawInteractiveElements() {
  interactiveElements.forEach((element) => {
    if (!element.active) return

    element.glowPhase += 0.05
    const glow = Math.sin(element.glowPhase) * 0.3 + 0.7

    ctx.save()
    ctx.translate(element.x, element.y)

    switch (element.type) {
      case ElementType.SKULL_PILE:
        // Draw skull pile
        ctx.fillStyle = `rgba(245, 245, 220, ${glow})`
        ctx.shadowColor = "rgba(255, 255, 255, 0.5)"
        ctx.shadowBlur = 10
        ctx.font = `${element.size}px Arial`
        ctx.textAlign = "center"
        ctx.fillText("💀", 0, element.size / 3)
        ctx.fillText("💀", -element.size / 3, element.size / 2)
        ctx.fillText("💀", element.size / 3, element.size / 2)
        break

      case ElementType.CURSED_TOTEM:
        // Draw cursed totem
        ctx.fillStyle = `rgba(139, 0, 139, ${glow})`
        ctx.shadowColor = "rgba(139, 0, 139, 0.8)"
        ctx.shadowBlur = 15
        ctx.fillRect(-element.size / 4, -element.size / 2, element.size / 2, element.size)
        ctx.fillStyle = `rgba(255, 0, 0, ${glow})`
        ctx.font = `${element.size / 2}px Arial`
        ctx.textAlign = "center"
        ctx.fillText("⚡", 0, element.size / 6)
        break

      case ElementType.BONE_FRAGMENT:
        // Draw bone fragment
        ctx.fillStyle = `rgba(245, 245, 220, ${glow})`
        ctx.shadowColor = "rgba(245, 245, 220, 0.5)"
        ctx.shadowBlur = 8
        ctx.font = `${element.size}px Arial`
        ctx.textAlign = "center"
        ctx.fillText("🦴", 0, element.size / 3)
        break
    }

    ctx.restore()
  })
}

function checkInteractiveCollisions() {
  interactiveElements.forEach((element) => {
    if (!element.active) return

    const dx = player.x - element.x
    const dy = player.y - element.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < element.size + 20) {
      element.active = false

      switch (element.type) {
        case ElementType.SKULL_PILE:
          bonusScore += 10
          // Play break sound effect (if available)
          break

        case ElementType.CURSED_TOTEM:
          // Temporary slow effect
          player.speed = Math.max(2, player.speed - 1)
          setTimeout(() => {
            player.speed = Math.min(10, player.speed + 1)
          }, 3000)
          break

        case ElementType.BONE_FRAGMENT:
          bonusScore += 5
          break
      }
    }
  })
}

// === ARENA BACKGROUND DRAWING ===
function drawSpookyArena() {
  // Clear canvas
  ctx.fillStyle = "#0d0d0d"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Draw main arena floor
  ctx.fillStyle = "#1a0f08"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Draw floor pattern
  ctx.strokeStyle = "#2a1810"
  ctx.lineWidth = 1
  for (let i = 0; i < canvas.width; i += 20) {
    for (let j = 0; j < canvas.height; j += 20) {
      if ((i + j) % 40 === 0) {
        ctx.strokeRect(i, j, 20, 20)
      }
    }
  }

  // Draw boundary walls with enhanced corner details
  drawBoundaryWalls()

  // Draw atmospheric effects
  drawAtmosphericEffects()

  // Draw corner details
  drawEnhancedCorners()
}

function drawBoundaryWalls() {
  const wallThickness = Math.min(canvas.width, canvas.height) * 0.08

  // Top wall
  let gradient = ctx.createLinearGradient(0, 0, 0, wallThickness)
  gradient.addColorStop(0, "#3c281e")
  gradient.addColorStop(0.5, "#2a1810")
  gradient.addColorStop(1, "rgba(42, 24, 16, 0)")
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, wallThickness)

  // Bottom wall
  gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - wallThickness)
  gradient.addColorStop(0, "#3c281e")
  gradient.addColorStop(0.5, "#2a1810")
  gradient.addColorStop(1, "rgba(42, 24, 16, 0)")
  ctx.fillStyle = gradient
  ctx.fillRect(0, canvas.height - wallThickness, canvas.width, wallThickness)

  // Left wall
  gradient = ctx.createLinearGradient(0, 0, wallThickness, 0)
  gradient.addColorStop(0, "#3c281e")
  gradient.addColorStop(0.5, "#2a1810")
  gradient.addColorStop(1, "rgba(42, 24, 16, 0)")
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, wallThickness, canvas.height)

  // Right wall
  gradient = ctx.createLinearGradient(canvas.width, 0, canvas.width - wallThickness, 0)
  gradient.addColorStop(0, "#3c281e")
  gradient.addColorStop(0.5, "#2a1810")
  gradient.addColorStop(1, "rgba(42, 24, 16, 0)")
  ctx.fillStyle = gradient
  ctx.fillRect(canvas.width - wallThickness, 0, wallThickness, canvas.height)
}

function drawEnhancedCorners() {
  const cornerSize = Math.min(canvas.width, canvas.height) * 0.15

  // Top-left corner
  drawCornerDetail(0, 0, cornerSize, "top-left")

  // Top-right corner
  drawCornerDetail(canvas.width - cornerSize, 0, cornerSize, "top-right")

  // Bottom-left corner
  drawCornerDetail(0, canvas.height - cornerSize, cornerSize, "bottom-left")

  // Bottom-right corner
  drawCornerDetail(canvas.width - cornerSize, canvas.height - cornerSize, cornerSize, "bottom-right")
}

function drawCornerDetail(x, y, size, corner) {
  ctx.save()
  ctx.translate(x, y)

  // Draw crumbling stone blocks
  ctx.fillStyle = "#4a3530"
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const blockX = (i * size) / 4
      const blockY = (j * size) / 4
      const blockSize = size / 5 + Math.random() * 10
      ctx.fillRect(blockX, blockY, blockSize, blockSize)
    }
  }

  // Draw spikes
  ctx.fillStyle = "#666666"
  for (let i = 0; i < 5; i++) {
    const spikeX = Math.random() * size
    const spikeY = Math.random() * size
    const spikeHeight = 15 + Math.random() * 20

    ctx.beginPath()
    ctx.moveTo(spikeX, spikeY)
    ctx.lineTo(spikeX - 5, spikeY + spikeHeight)
    ctx.lineTo(spikeX + 5, spikeY + spikeHeight)
    ctx.closePath()
    ctx.fill()
  }

  // Draw glowing runes
  const time = Date.now() * 0.003
  const glowIntensity = Math.sin(time) * 0.3 + 0.7
  ctx.fillStyle = `rgba(139, 0, 0, ${glowIntensity})`
  ctx.shadowColor = "rgba(139, 0, 0, 0.8)"
  ctx.shadowBlur = 15
  ctx.font = `${size / 4}px Arial`
  ctx.textAlign = "center"
  ctx.fillText("☠", size / 2, size / 2)

  ctx.restore()
}

function drawAtmosphericEffects() {
  // Draw blood stains
  ctx.fillStyle = "rgba(139, 0, 0, 0.3)"
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height
    const radius = 10 + Math.random() * 20

    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  // Draw scattered bones
  ctx.fillStyle = "rgba(245, 245, 220, 0.4)"
  ctx.font = "16px Arial"
  for (let i = 0; i < 15; i++) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height
    ctx.fillText("🦴", x, y)
  }

  // Draw mystical fog
  const time = Date.now() * 0.001
  for (let i = 0; i < 5; i++) {
    const x = Math.sin(time + i) * canvas.width * 0.3 + canvas.width * 0.5
    const y = Math.cos(time + i * 0.7) * canvas.height * 0.3 + canvas.height * 0.5
    const radius = 50 + Math.sin(time + i) * 20

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0, "rgba(100, 80, 120, 0.1)")
    gradient.addColorStop(1, "rgba(100, 80, 120, 0)")

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }
}

// === CHARACTER PLAYER SETUP ===
const characterSprite = document.getElementById("character-sprite")
if (!characterSprite) {
  console.warn("Character sprite element not found!")
}

const player = {
  x: startX,
  y: startY,
  speed: 6.5,
  frame: 0,
  frameWidth: 64,
  frameHeight: 128,
  frameCount: 8,
  frameTimer: 0,
  frameInterval: 5,
  direction: "down",
  alive: true,
}

function updatePlayer() {
  let dx = 0,
    dy = 0,
    lastDir = player.direction

  if (Input.keys[87] || Input.keys[38]) {
    dy -= 1
    lastDir = "up"
  }
  if (Input.keys[83] || Input.keys[40]) {
    dy += 1
    lastDir = "down"
  }
  if (Input.keys[65] || Input.keys[37]) {
    dx -= 1
    lastDir = "left"
  }
  if (Input.keys[68] || Input.keys[39]) {
    dx += 1
    lastDir = "right"
  }

  player.direction = lastDir

  const magnitude = Math.sqrt(dx * dx + dy * dy)
  if (magnitude !== 0) {
    dx /= magnitude
    dy /= magnitude
    player.x += dx * player.speed
    player.y += dy * player.speed

    // Keep player within screen bounds
    player.x = Math.max(player.frameWidth / 2, Math.min(canvas.width - player.frameWidth / 2, player.x))
    player.y = Math.max(player.frameHeight / 2, Math.min(canvas.height - player.frameHeight / 2, player.y))

    player.frameTimer++
    if (player.frameTimer >= player.frameInterval) {
      player.frame = (player.frame + 1) % player.frameCount
      player.frameTimer = 0
    }
  } else {
    player.frame = 0 // idle
  }

  // Check gem collisions
  checkGemCollisions()
}

let shakeTime = 0
let shakeIntensity = 0
let shakePhase = 0
function applyScreenShake() {
  // Don't shake if dino is frozen
  if (survivalTime >= 15 && player.alive && !gemEffects.dinoFrozen) {
    shakePhase += 0.12

    const pulse = Math.abs(Math.sin(shakePhase * Math.PI))
    const intensity = pulse * 6

    const dx = (Math.random() - 0.5) * intensity
    const dy = (Math.random() - 0.5) * intensity

    ctx.translate(dx, dy)
  }
}

function showGameOver() {
  gameState = "gameOver"
  document.getElementById("game-over-screen").style.display = "flex"

  const finalScoreElement = document.getElementById("final-score")
  finalScoreElement.textContent = survivalTime + "s"

  if (survivalTime > bestScore) {
    bestScore = survivalTime
    saveBestScore()
  }

  const bestScoreElement = document.getElementById("best-score")
  bestScoreElement.textContent = "Best: " + bestScore + "s"
}

function startGame() {
  gameState = "playing"
  document.getElementById("start-screen").style.display = "none"

  // Stop scream audio if playing
  dinoScreamAudio.pause()
  dinoScreamAudio.currentTime = 0
  screamActive = false

  // Play game start sound
  gameStartAudio.currentTime = 0
  gameStartAudio.play()

  // Reset game state
  survivalTime = 0
  baseSize = 5
  lastGrowthTime = 0
  bonusScore = 0

  // Reset gem effects
  gemEffects.dinoFrozen = false
  gemEffects.dinoFreezeTime = 0
  gemEffects.playerSpeedBoost = false
  gemEffects.playerSpeedBoostTime = 0
  gemEffects.originalPlayerSpeed = 6.5

  // Reset player
  player.x = startX
  player.y = startY
  player.alive = true
  player.frame = 0
  player.frameTimer = 0
  player.direction = "down"
  player.speed = 6.5

  // Generate gems
  generateGems()

  // Initialize creature and start loops
  resetCreature()
  startGameLoop()
  startSurvivalTimer()
}

function backToMenu() {
  gameState = "start"
  document.getElementById("game-over-screen").style.display = "none"
  document.getElementById("start-screen").style.display = "flex"

  // Stop game loops
  if (gameLoop) {
    clearInterval(gameLoop)
    gameLoop = null
  }
  if (survivalTimer) {
    clearInterval(survivalTimer)
    survivalTimer = null
  }

  // Reset gem effects
  gemEffects.dinoFrozen = false
  gemEffects.dinoFreezeTime = 0
  gemEffects.playerSpeedBoost = false
  gemEffects.playerSpeedBoostTime = 0

  // Stop audio
  playerDeathAudio.pause()
  playerDeathAudio.currentTime = 0
  dinoScreamAudio.pause()
  dinoScreamAudio.currentTime = 0
  screamActive = false
}

function restartGame() {
  // Stop audio
  playerDeathAudio.pause()
  playerDeathAudio.currentTime = 0
  dinoScreamAudio.pause()
  dinoScreamAudio.currentTime = 0
  screamActive = false

  // Play game start sound
  gameStartAudio.currentTime = 0
  gameStartAudio.play()

  // Reset game state
  survivalTime = 0
  baseSize = 5
  lastGrowthTime = 0
  bonusScore = 0

  // Reset gem effects
  gemEffects.dinoFrozen = false
  gemEffects.dinoFreezeTime = 0
  gemEffects.playerSpeedBoost = false
  gemEffects.playerSpeedBoostTime = 0
  gemEffects.originalPlayerSpeed = 6.5

  // Reset player
  player.x = startX
  player.y = startY
  player.alive = true
  player.frame = 0
  player.frameTimer = 0
  player.direction = "down"
  player.speed = 6.5

  // Regenerate gems
  generateGems()

  // Rebuild creature
  resetCreature()

  // Hide game-over overlay
  document.getElementById("game-over-screen").style.display = "none"

  // Set game state back to playing
  gameState = "playing"
}

function drawPlayer() {
  if (!characterSprite.complete) {
    // Fallback if sprite not loaded
    ctx.fillStyle = "blue"
    ctx.fillRect(player.x - 20, player.y - 20, 40, 40)
    return
  }

  const dirRow = {
    down: 0,
    left: 1,
    right: 2,
    up: 3,
  }

  const row = dirRow[player.direction] || 0
  const scale = 0.7
  const scaledWidth = player.frameWidth * scale
  const scaledHeight = player.frameHeight * scale

  // Add speed boost visual effect
  if (gemEffects.playerSpeedBoost) {
    ctx.save()
    ctx.shadowColor = "rgba(255, 50, 50, 0.8)"
    ctx.shadowBlur = 15
  }

  ctx.drawImage(
    characterSprite,
    player.frame * player.frameWidth,
    row * player.frameHeight,
    player.frameWidth,
    player.frameHeight,
    player.x - scaledWidth / 2,
    player.y - scaledHeight / 2,
    scaledWidth,
    scaledHeight,
  )

  if (gemEffects.playerSpeedBoost) {
    ctx.restore()
  }
}

const boneTexture = new Image()
boneTexture.src = "./bone_texture.jpg"
boneTexture.onerror = () => {
  console.warn("Bone texture not found, using fallback")
}

// === DINOSAUR HEAD IMAGE ===
const dinoHead = new Image()
let dinoHeadReady = false
dinoHead.onload = () => {
  dinoHeadReady = true
}
dinoHead.onerror = () => {
  console.warn("Dino head image not found")
}
dinoHead.src = "./dino_skull.png"

function drawDinoFace(x, y, angle, imgSize = 300) {
  if (!dinoHead.complete) return

  ctx.save()

  // Add freeze effect if dino is frozen
  if (gemEffects.dinoFrozen) {
    ctx.shadowColor = "rgba(0, 150, 255, 0.5)"
    ctx.shadowBlur = 10
    // Add blue tint
    ctx.filter = "hue-rotate(200deg) brightness(0.7)"
  }

  ctx.translate(x, y)
  ctx.rotate(angle)
  if (Math.cos(angle) < 0) {
    ctx.scale(1, -1)
    ctx.drawImage(dinoHead, -imgSize / 2, -imgSize / 2, imgSize, imgSize)
  } else {
    ctx.drawImage(dinoHead, -imgSize / 2, -imgSize / 2, imgSize, imgSize)
  }
  ctx.restore()
}

// === CREATURE CLASSES ===
var segmentCount = 0
class Segment {
  constructor(parent, size, angle, range, stiffness) {
    segmentCount++
    this.isSegment = true
    this.parent = parent
    if (typeof parent.children == "object") {
      parent.children.push(this)
    }
    this.children = []
    this.size = size
    this.relAngle = angle
    this.defAngle = angle
    this.absAngle = parent.absAngle + angle
    this.range = range
    this.stiffness = stiffness
    this.updateRelative(false, true)
  }

  updateRelative(iter, flex) {
    this.relAngle = this.relAngle - 2 * Math.PI * Math.floor((this.relAngle - this.defAngle) / 2 / Math.PI + 1 / 2)
    if (flex) {
      this.relAngle = Math.min(
        this.defAngle + this.range / 2,
        Math.max(this.defAngle - this.range / 2, (this.relAngle - this.defAngle) / this.stiffness + this.defAngle),
      )
    }
    this.absAngle = this.parent.absAngle + this.relAngle
    this.x = this.parent.x + Math.cos(this.absAngle) * this.size
    this.y = this.parent.y + Math.sin(this.absAngle) * this.size
    if (iter) {
      for (const child of this.children) {
        child.updateRelative(iter, flex)
      }
    }
  }

  draw(iter) {
    // Add freeze effect to segments
    if (gemEffects.dinoFrozen) {
      ctx.save()
      ctx.shadowColor = "rgba(0, 150, 255, 0.5)"
      ctx.shadowBlur = 10
    }

    if (boneTexture.complete) {
      const angle = Math.atan2(this.y - this.parent.y, this.x - this.parent.x)
      const length = Math.sqrt((this.x - this.parent.x) ** 2 + (this.y - this.parent.y) ** 2)

      ctx.save()
      ctx.translate(this.parent.x, this.parent.y)
      ctx.rotate(angle)
      ctx.drawImage(boneTexture, 0, -5, length, 2)
      ctx.restore()
    } else {
      ctx.beginPath()
      ctx.moveTo(this.parent.x, this.parent.y)
      ctx.lineTo(this.x, this.y)
      ctx.stroke()
    }

    if (gemEffects.dinoFrozen) {
      ctx.restore()
    }

    if (iter) {
      for (const child of this.children) {
        child.draw(true)
      }
    }
  }

  follow(iter) {
    var x = this.parent.x
    var y = this.parent.y
    var dist = Math.sqrt((this.x - x) ** 2 + (this.y - y) ** 2)
    this.x = x + (this.size * (this.x - x)) / dist
    this.y = y + (this.size * (this.y - y)) / dist
    this.absAngle = Math.atan2(this.y - y, this.x - x)
    this.relAngle = this.absAngle - this.parent.absAngle
    this.updateRelative(false, true)
    if (iter) {
      for (const child of this.children) {
        child.follow(true)
      }
    }
  }
}

class LimbSystem {
  constructor(end, length, speed, creature) {
    this.end = end
    this.length = Math.max(1, length)
    this.creature = creature
    this.speed = speed
    creature.systems.push(this)
    this.nodes = []
    var node = end
    for (let index = 0; index < length; index++) {
      this.nodes.unshift(node)
      node = node.parent
      if (!node.isSegment) {
        this.length = index + 1
        break
      }
    }
    this.hip = this.nodes[0].parent
  }

  moveTo(x, y) {
    this.nodes[0].updateRelative(true, true)
    var dist = Math.sqrt((x - this.end.x) ** 2 + (y - this.end.y) ** 2)
    var len = Math.max(0, dist - this.speed)
    for (let index = this.nodes.length - 1; index >= 0; index--) {
      var segment = this.nodes[index]
      var ang = Math.atan2(segment.y - y, segment.x - x)
      segment.x = x + len * Math.cos(ang)
      segment.y = y + len * Math.sin(ang)
      x = segment.x
      y = segment.y
      len = segment.size
    }
    for (let i = 0; i < this.nodes.length; i++) {
      var node = this.nodes[i]
      node.absAngle = Math.atan2(node.y - node.parent.y, node.x - node.parent.x)
      node.relAngle = node.absAngle - node.parent.absAngle
      for (let childIndex = 0; childIndex < node.children.length; childIndex++) {
        var childSegment = node.children[childIndex]
        if (!this.nodes.includes(childSegment)) {
          childSegment.updateRelative(true, false)
        }
      }
    }
  }

  update() {
    this.moveTo(Input.mouse.x, Input.mouse.y)
  }
}

class LegSystem extends LimbSystem {
  constructor(end, length, speed, creature) {
    super(end, length, speed, creature)
    this.goalX = end.x
    this.goalY = end.y
    this.step = 0
    this.forwardness = 0
    this.reach = 0.9 * Math.sqrt((this.end.x - this.hip.x) ** 2 + (this.end.y - this.hip.y) ** 2)
    var relAngle = this.creature.absAngle - Math.atan2(this.end.y - this.hip.y, this.end.x - this.hip.x)
    relAngle -= 2 * Math.PI * Math.floor(relAngle / 2 / Math.PI + 1 / 2)
    this.swing = -relAngle + ((2 * (relAngle < 0) - 1) * Math.PI) / 2
    this.swingOffset = this.creature.absAngle - this.hip.absAngle
  }

  update(x, y) {
    this.moveTo(this.goalX, this.goalY)
    if (this.step == 0) {
      var dist = Math.sqrt((this.end.x - this.goalX) ** 2 + (this.end.y - this.goalY) ** 2)
      if (dist > 1) {
        this.step = 1
        this.goalX =
          this.hip.x +
          this.reach * Math.cos(this.swing + this.hip.absAngle + this.swingOffset) +
          ((2 * Math.random() - 1) * this.reach) / 2
        this.goalY =
          this.hip.y +
          this.reach * Math.sin(this.swing + this.hip.absAngle + this.swingOffset) +
          ((2 * Math.random() - 1) * this.reach) / 2
      }
    } else if (this.step == 1) {
      var theta = Math.atan2(this.end.y - this.hip.y, this.end.x - this.hip.x) - this.hip.absAngle
      var forwardness2 = Math.sqrt((this.end.x - this.hip.x) ** 2 + (this.end.y - this.hip.y) ** 2) * Math.cos(theta)
      var dF = this.forwardness - forwardness2
      this.forwardness = forwardness2
      if (dF * dF < 1) {
        this.step = 0
        this.goalX = this.hip.x + (this.end.x - this.hip.x)
        this.goalY = this.hip.y + (this.end.y - this.hip.y)
      }
    }
  }
}

class Creature {
  constructor(x, y, angle, fAccel, fFric, fRes, fThresh, rAccel, rFric, rRes, rThresh) {
    this.x = x
    this.y = y
    this.absAngle = angle
    this.fSpeed = 0
    this.fAccel = fAccel
    this.fFric = fFric
    this.fRes = fRes
    this.fThresh = fThresh
    this.rSpeed = 0
    this.rAccel = rAccel
    this.rFric = rFric
    this.rRes = rRes
    this.rThresh = rThresh
    this.children = []
    this.systems = []
    this.headSize = 20
  }

  follow(x, y) {
    // Don't move if frozen
    if (gemEffects.dinoFrozen) {
      this.draw(true)
      return
    }

    var dist = Math.sqrt((this.x - x) ** 2 + (this.y - y) ** 2)
    var angle = Math.atan2(y - this.y, x - this.x)
    var accel = this.fAccel
    if (this.systems.length > 0) {
      var sum = 0
      for (let index = 0; index < this.systems.length; index++) {
        sum += this.systems[index].step == 0
      }
      accel *= sum / this.systems.length
    }
    this.fSpeed += accel * (dist > this.fThresh)
    this.fSpeed *= 1 - this.fRes
    this.speed = Math.max(0, this.fSpeed - this.fFric)
    var dif = this.absAngle - angle
    dif -= 2 * Math.PI * Math.floor(dif / (2 * Math.PI) + 1 / 2)
    if (Math.abs(dif) > this.rThresh && dist > this.fThresh) {
      this.rSpeed -= this.rAccel * (2 * (dif > 0) - 1)
    }
    this.rSpeed *= 1 - this.rRes
    if (Math.abs(this.rSpeed) > this.rFric) {
      this.rSpeed -= this.rFric * (2 * (this.rSpeed > 0) - 1)
    } else {
      this.rSpeed = 0
    }
    this.absAngle += this.rSpeed
    this.absAngle -= 2 * Math.PI * Math.floor(this.absAngle / (2 * Math.PI) + 1 / 2)
    this.x += this.speed * Math.cos(this.absAngle)
    this.y += this.speed * Math.sin(this.absAngle)
    this.absAngle += Math.PI
    for (let index = 0; index < this.children.length; index++) {
      this.children[index].follow(true, true)
    }
    for (let index = 0; index < this.systems.length; index++) {
      this.systems[index].update(x, y)
    }
    this.absAngle -= Math.PI
    this.draw(true)
  }

  draw(iter) {
    if (iter) {
      for (let index = 0; index < this.children.length; index++) {
        this.children[index].draw(true)
      }
    }
    drawDinoFace(this.x, this.y, this.absAngle + Math.PI, this.headSize)
  }
}

function checkPlayerDeath() {
  const dx = player.x - critter.x
  const dy = player.y - critter.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  // Scream logic
  if (distance < 100 && player.alive) {
    if (!screamActive) {
      dinoScreamAudio.currentTime = 0
      dinoScreamAudio.play()
      screamActive = true
      dinoScreamAudio.onended = () => {
        screamActive = false
      }
    }
  }

  if (distance < 150 && player.alive) {
    shakeTime = 5
    shakeIntensity = 10
  }
  if (distance < 50 && player.alive) {
    player.alive = false
    playerDeathAudio.currentTime = 0
    playerDeathAudio.play()
    if (screamActive) {
      dinoScreamAudio.pause()
      screamActive = false
    }
    // Don't immediately show game over, let creature continue moving for a moment
    setTimeout(() => {
      showGameOver()
    }, 1000) // 1 second delay to show creature continuing to move
  }
}

function drawRestartButton() {
  ctx.save()
  ctx.translate(canvas.width - 60, 20)
  ctx.fillStyle = player.alive ? "#444" : "#fff"
  ctx.fillRect(-20, -20, 40, 40)
  ctx.fillStyle = player.alive ? "#999" : "#000"
  ctx.beginPath()
  ctx.moveTo(-5, -10)
  ctx.lineTo(10, 0)
  ctx.lineTo(-5, 10)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect()
  const bx = canvas.width - 60
  const by = 20
  const dx = e.clientX - rect.left - bx
  const dy = e.clientY - rect.top - by

  if (Math.abs(dx) < 20 && Math.abs(dy) < 20 && !player.alive) {
    restartGame()
  }
})

// === CREATURE SETUP ===
function setupLizard(size, legs, tail) {
  var s = size
  critter = new Creature(window.innerWidth / 2, window.innerHeight / 2, 0, s * 10, s * 2, 0.5, 16, 0.5, 0.085, 0.5, 0.3)
  critter.headSize = s * 20

  var spinal = critter
  for (let index = 0; index < 6; index++) {
    spinal = new Segment(spinal, s * 4, 0, (3.1415 * 2) / 3, 1.1)
    for (let k = -1; k <= 1; k += 2) {
      let segment = new Segment(spinal, s * 3, k, 0.1, 2)
      for (let l = 0; l < 3; l++) {
        segment = new Segment(segment, s * 0.1, -k * 0.1, 0.1, 2)
      }
    }
  }

  for (let index = 0; index < legs; index++) {
    if (index > 0) {
      for (let k = 0; k < 6; k++) {
        spinal = new Segment(spinal, s * 4, 0, 1.571, 1.5)
        for (let l = -1; l <= 1; l += 2) {
          let segment = new Segment(spinal, s * 3, l * 1.571, 0.1, 1.5)
          for (let m = 0; m < 4; m++) {
            segment = new Segment(segment, s * 3, -l * 0.3, 0.1, 2)
          }
        }
      }
    }

    for (let k = -1; k <= 1; k += 2) {
      let segment = new Segment(spinal, s * 12, k * 0.785, 0, 8)
      segment = new Segment(segment, s * 16, -k * 0.785, 6.28, 1)
      segment = new Segment(segment, s * 16, k * 1.571, 3.1415, 2)
      for (let l = 0; l < 4; l++) {
        new Segment(segment, s * 4, (l / 3 - 0.5) * 1.571, 0.1, 4)
      }
      new LegSystem(segment, 3, s * 12, critter)
    }
  }

  for (let index = 0; index < tail; index++) {
    spinal = new Segment(spinal, s * 4, 0, (3.1415 * 2) / 3, 1.1)
    for (let k = -1; k <= 1; k += 2) {
      let segment = new Segment(spinal, s * 3, k, 0.1, 2)
      for (let l = 0; l < 3; l++) {
        segment = new Segment(segment, (s * 3 * (tail - index)) / tail, -k * 0.1, 0.1, 2)
      }
    }
  }
}

// === MAIN RENDER LOOP ===
function startGameLoop() {
  if (gameLoop) {
    clearInterval(gameLoop)
  }
  gameLoop = setInterval(() => {
    if (gameState === "playing") {
      // Clear canvas with simple background
      ctx.fillStyle = "#1a1a1a"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.save()
      applyScreenShake()

      // Update gem effects
      updateGemEffects()

      if (player.alive) {
        updatePlayer()
        checkPlayerDeath()
      }

      if (survivalTime % 30 === 0 && survivalTime !== 0 && player.alive) {
        resetCreature()
        // Only add new gems, don't remove existing ones
        const currentActiveGems = gems.filter((g) => g.active).length
        const targetGems = 3 + Math.floor(Math.random() * 3)
        const gemsToAdd = Math.max(0, targetGems - currentActiveGems)

        const gemTypes = [GemType.BLUE, GemType.RED, GemType.PURPLE]

        for (let i = 0; i < gemsToAdd; i++) {
          const x = Math.random() * (canvas.width * 0.8) + canvas.width * 0.1
          const y = Math.random() * (canvas.height * 0.8) + canvas.height * 0.1
          const type = gemTypes[Math.floor(Math.random() * gemTypes.length)]

          const newGem = new Gem(x, y, type)
          newGem.glowPhase = Math.random() * Math.PI * 2
          newGem.pulsePhase = Math.random() * Math.PI * 2

          gems.push(newGem)
        }
      }

      // Draw gems
      drawGems()

      // Dino follows player
      if (critter) {
        critter.follow(player.x, player.y)
      }

      // Draw player
      if (player.alive) {
        drawPlayer()
      }

      if (!player.alive) {
        ctx.fillStyle = "red"
        ctx.font = "30px monospace"
        ctx.fillText("DEAD", player.x - 30, player.y - 40)
      }

      // Show UI
      drawPixelatedText(`Time: ${survivalTime}s`, 20, 20, 18, "white") // reduced from 20

      if (bestScore > 0) {
        drawPixelatedText(`Best: ${bestScore}s`, 20, 45, 14, "#00ff00") // reduced from 16, adjusted y
      }

      drawPixelatedText(`Speed: ${player.speed.toFixed(1)}`, 20, 65, 14, "#ffff00") // reduced from 16, adjusted y
      drawPixelatedText(`Dino Size: ${baseSize}`, 20, 85, 14, "#ff0000") // reduced from 16, adjusted y
      drawPixelatedText(`Gems: ${gems.filter((g) => g.active).length}`, 20, 105, 14, "#ff00ff") // reduced from 16, adjusted y

      // Show gem effects
      drawGemEffectUI()

      drawRestartButton()
      ctx.restore()
    } else if (gameState === "gameOver") {
      // Keep drawing the game background and creature even during game over
      ctx.fillStyle = "#1a1a1a"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.save()
      applyScreenShake()

      // Continue updating and drawing the creature at the player's last position
      if (critter) {
        critter.follow(player.x, player.y)
      }

      // Draw the dead player
      ctx.fillStyle = "red"
      ctx.font = "30px monospace"
      ctx.fillText("DEAD", player.x - 30, player.y - 40)

      ctx.restore()
    } else if (gameState === "start") {
      ctx.fillStyle = "#1a1a1a"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
  }, 33)
}

// === INITIALIZE THE CREATURE ===
function getIncrementalSize() {
  if (typeof baseSize === "undefined") {
    baseSize = 5
  }
  return baseSize
}

function resetCreature() {
  const legNum = 2
  const size = getIncrementalSize()
  setupLizard(size / Math.sqrt(legNum), legNum, Math.floor(2 + 2 * legNum * 8))
}

// === INITIAL START ===
console.log("Starting game initialization...")
loadBestScore()
generateGems()
startGameLoop()
console.log("Game initialization complete!")

function resetPlayer() {
  player.x = startX
  player.y = startY
  player.direction = "down"
  player.speed = 6.5
}

// === SURVIVAL TIMER ===
const dinoRoarAudio = new Audio("./Roar.mp3")
dinoRoarAudio.volume = 0.7
const playerDeathAudio = new Audio("./udied.mp3")
playerDeathAudio.volume = 0.8
const gameStartAudio = new Audio("./Roar.mp3")
gameStartAudio.volume = 0.8
const dinoScreamAudio = new Audio("./scream.mp3")
dinoScreamAudio.volume = 0.7
let screamActive = false

function startSurvivalTimer() {
  if (survivalTimer) {
    clearInterval(survivalTimer)
  }
  survivalTimer = setInterval(() => {
    if (player.alive && gameState === "playing") {
      survivalTime++

      if (survivalTime - lastGrowthTime >= 30) {
        baseSize += 1
        // Don't increase player speed if they have speed boost active
        if (!gemEffects.playerSpeedBoost) {
          player.speed += 0.5
          gemEffects.originalPlayerSpeed += 0.5
        } else {
          gemEffects.originalPlayerSpeed += 0.5
        }
        lastGrowthTime = survivalTime
        resetCreature()
        dinoRoarAudio.currentTime = 0
        dinoRoarAudio.play()
      }
    }
  }, 1000)
}

function drawPixelatedText(text, x, y, size = 16, color = "white") {
  ctx.save()
  ctx.font = `${size}px 'Courier New', monospace`
  ctx.fillStyle = color
  ctx.textAlign = "left"
  ctx.textBaseline = "top"
  ctx.shadowColor = color
  ctx.shadowBlur = 2
  ctx.fillText(text, x, y)
  ctx.restore()
}

// Load best score from localStorage
function loadBestScore() {
  const saved = localStorage.getItem("dinoWalkBestScore")
  if (saved) {
    bestScore = Number.parseInt(saved)
  }
}

// Save best score to localStorage
function saveBestScore() {
  localStorage.setItem("dinoWalkBestScore", bestScore.toString())
}

function drawGemIcon(ctx, x, y, type, size = 12) {
  ctx.save()
  ctx.translate(x, y)

  switch (type) {
    case "blue":
      ctx.fillStyle = "rgba(0, 150, 255, 0.9)"
      ctx.shadowColor = "rgba(0, 150, 255, 0.5)"
      ctx.shadowBlur = 8
      break
    case "red":
      ctx.fillStyle = "rgba(255, 50, 50, 0.9)"
      ctx.shadowColor = "rgba(255, 50, 50, 0.5)"
      ctx.shadowBlur = 8
      break
    case "purple":
      ctx.fillStyle = "rgba(100, 0, 100, 0.9)"
      ctx.shadowColor = "rgba(100, 0, 100, 0.5)"
      ctx.shadowBlur = 8
      break
  }

  // Draw diamond shape
  ctx.beginPath()
  ctx.moveTo(0, -size / 2)
  ctx.lineTo(size / 2, 0)
  ctx.lineTo(0, size / 2)
  ctx.lineTo(-size / 2, 0)
  ctx.closePath()
  ctx.fill()

  ctx.restore()
}

function initializeGemIcons() {
  const gemCanvas = document.getElementById("gem-icons")
  if (!gemCanvas) return

  const gemCtx = gemCanvas.getContext("2d")
  if (!gemCtx) return

  // Clear canvas
  gemCtx.fillStyle = "transparent"
  gemCtx.fillRect(0, 0, 200, 60)

  // Draw gem legend
  gemCtx.font = '10px "Press Start 2P"'
  gemCtx.fillStyle = "#f5f5dc"
  gemCtx.textAlign = "left"

  // Blue gem
  drawGemIcon(gemCtx, 15, 15, "blue", 10)
  gemCtx.fillText("Freeze Dino (5s)", 30, 20)

  // Red gem
  drawGemIcon(gemCtx, 15, 35, "red", 10)
  gemCtx.fillText("Speed Boost (15s)", 30, 40)

  // Purple gem
  drawGemIcon(gemCtx, 15, 55, "purple", 10)
  gemCtx.fillText("Teleport Away", 30, 60)
}

function drawIndividualGemIcons() {
  // Blue gem icon
  const blueCanvas = document.getElementById("blue-gem-icon")
  if (blueCanvas) {
    const ctx = blueCanvas.getContext("2d")
    ctx.clearRect(0, 0, 12, 12)
    drawGemIcon(ctx, 6, 6, "blue", 5)
  }

  // Red gem icon
  const redCanvas = document.getElementById("red-gem-icon")
  if (redCanvas) {
    const ctx = redCanvas.getContext("2d")
    ctx.clearRect(0, 0, 12, 12)
    drawGemIcon(ctx, 6, 6, "red", 5)
  }

  // Purple gem icon
  const purpleCanvas = document.getElementById("purple-gem-icon")
  if (purpleCanvas) {
    const ctx = purpleCanvas.getContext("2d")
    ctx.clearRect(0, 0, 12, 12)
    drawGemIcon(ctx, 6, 6, "purple", 5)
  }
}

// Call this when the page loads
window.addEventListener("load", initializeGemIcons)
window.addEventListener("load", drawIndividualGemIcons)
