const gameArea = document.getElementById('game-area');
const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');
const pauseOverlay = document.getElementById('pause-overlay');
const gameoverOverlay = document.getElementById('gameover-overlay');
const memePopup = document.getElementById('meme-popup');
const memeImage = document.getElementById('meme-image');
const selectedCharacterImage = document.getElementById('selected-character-image');
const selectedCharacterName = document.getElementById('selected-character-name');
const carousel = document.getElementById('carousel');
const carouselLeft = document.getElementById('carousel-left');
const carouselRight = document.getElementById('carousel-right');
const scoreValue = document.getElementById('score-value');
const highScoreValue = document.getElementById('high-score');
const hudHighScore = document.getElementById('hud-high-score');
const finalScore = document.getElementById('final-score');
const gameoverHighscore = document.getElementById('gameover-highscore');
const startButton = document.getElementById('start-button');
const pauseButton = document.getElementById('pause-button');
const resumeButton = document.getElementById('resume-button');
const restartButton = document.getElementById('restart-button');
const backButton = document.getElementById('back-button');
const bgmAudio = document.getElementById('bgm-audio');
const musicAudio = document.getElementById('music-audio');
const jumpAudio = document.getElementById('jump-audio');
const coinAudio = document.getElementById('coin-audio');
const memeAudio = document.getElementById('meme-audio');
const boomAudio = document.getElementById('boom-audio');
const gameoverAudio = document.getElementById('gameover-audio');

const characterOptions = [
  { id: 'strawberry', name: 'Strawberry', image: 'assets/strawberry.png' },
  { id: 'apple', name: 'Apple', image: 'assets/apple.png' },
  { id: 'oreo', name: 'Oreo', image: 'assets/oreo.png' },
  { id: 'akmal', name: 'akmal', image: 'assets/akmal.png' },
  { id: 'tulalit', name: 'tulalit', image: 'assets/tulalit.png' },
];

let activeCharacterIndex = 0;
let activeCharacter = characterOptions[activeCharacterIndex];
const storageKey = 'endless-jumper-high-score';
const gameConfig = {
  gravity: 0.45,
  jumpVelocity: -15,
  maxMoveSpeed: 7.5,
  acceleration: 0.7,
  friction: 0.88,
  platformWidth: 100,
  platformHeight: 18,
  minPlatformGap: 90,
  maxPlatformGap: 150,
  itemSpawnChance: 0.22,
  tntSpawnChance: 0.15,
  memeTriggers: [120, 300, 520, 780],
  memeDuration: 1500,
};

let gameState = 'menu';
let gameObjects = { player: null, platforms: [], items: [], tnts: [] };
let animationFrameId = null;
let lastTime = 0;
let score = 0;
let highScore = 0;
let paused = false;
let stage = { width: 0, height: 0, midline: 0 };
const inputState = { left: false, right: false };
let nextMemeIndex = 0;
let memeTimer = null;
let musicFadeRequest = null;

class Player {
  constructor(x, y, imageSrc) {
    this.width = 52;
    this.height = 72;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.direction = 1;
    this.scaleX = 1;
    this.scaleY = 1;
    this.element = document.createElement('div');
    this.element.className = 'player game-object';
    this.sprite = document.createElement('img');
    this.sprite.src = imageSrc;
    this.sprite.alt = 'Character';
    this.sprite.onerror = () => {
      this.sprite.style.background = 'rgba(255,255,255,0.12)';
    };
    this.element.appendChild(this.sprite);
    gameArea.appendChild(this.element);
    this.render();
  }

  update() {
    if (inputState.left) {
      this.vx -= gameConfig.acceleration;
      this.direction = -1;
    } else if (inputState.right) {
      this.vx += gameConfig.acceleration;
      this.direction = 1;
    } else {
      this.vx *= gameConfig.friction;
    }

    if (this.vx > gameConfig.maxMoveSpeed) this.vx = gameConfig.maxMoveSpeed;
    if (this.vx < -gameConfig.maxMoveSpeed) this.vx = -gameConfig.maxMoveSpeed;

    this.x += this.vx;
    this.vy += gameConfig.gravity;
    this.y += this.vy;

    if (this.x < 0) {
      this.x = 0;
      this.vx = 0;
    }
    if (this.x + this.width > stage.width) {
      this.x = stage.width - this.width;
      this.vx = 0;
    }

    this.scaleX += (1 - this.scaleX) * 0.14;
    this.scaleY += (1 - this.scaleY) * 0.14;
    this.render();
  }

  jump() {
    this.vy = gameConfig.jumpVelocity;
    this.scaleX = 0.45;
    this.scaleY = 1.35;
    jumpAudio.currentTime = 0;
    jumpAudio.play().catch(() => {});
  }

  render() {
    const flip = this.direction === -1 ? -1 : 1;
    this.element.style.transform = `translate(${this.x}px, ${this.y}px) scale(${flip * this.scaleX}, ${this.scaleY})`;
  }

  destroy() {
    this.element.remove();
  }
}

class Platform {
  constructor(x, y, width) {
    this.width = width;
    this.height = gameConfig.platformHeight;
    this.x = x;
    this.y = y;
    this.element = document.createElement('div');
    this.element.className = 'platform game-object';
    this.element.style.width = `${this.width}px`;
    this.element.style.height = `${this.height}px`;
    gameArea.appendChild(this.element);
    this.render();
  }

  render() {
    this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;
  }

  destroy() {
    this.element.remove();
  }
}

class Item {
  constructor(x, y) {
    this.width = 34;
    this.height = 34;
    this.x = x;
    this.y = y;
    this.element = document.createElement('div');
    this.element.className = 'item game-object';
    this.sprite = document.createElement('img');
    this.sprite.src = 'assets/iwak.png';
    this.sprite.alt = 'Iwak';
    this.element.appendChild(this.sprite);
    gameArea.appendChild(this.element);
    this.render();
  }

  render() {
    this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;
  }

  destroy() {
    this.element.remove();
  }
}

class TNT {
  constructor(x, y) {
    this.width = 38;
    this.height = 38;
    this.x = x;
    this.y = y;
    this.element = document.createElement('div');
    this.element.className = 'tnt game-object';
    this.sprite = document.createElement('img');
    this.sprite.src = 'assets/tnt.png';
    this.sprite.alt = 'TNT';
    this.sprite.onerror = () => {
      this.sprite.style.background = 'rgba(255, 100, 100, 0.2)';
    };
    this.element.appendChild(this.sprite);
    gameArea.appendChild(this.element);
    this.render();
  }

  render() {
    this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;
  }

  destroy() {
    this.element.remove();
  }
}

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createCharacterCarousel() {
  renderCarousel();
  carouselLeft.addEventListener('click', () => {
    setActiveCharacter(activeCharacterIndex - 1);
  });
  carouselRight.addEventListener('click', () => {
    setActiveCharacter(activeCharacterIndex + 1);
  });
}

function renderCarousel() {
  carousel.innerHTML = '';
  characterOptions.forEach((character, index) => {
    const item = document.createElement('div');
    item.className = 'carousel-item';
    if (index === activeCharacterIndex) {
      item.classList.add('active');
    } else if (index === (activeCharacterIndex + 1) % characterOptions.length) {
      item.classList.add('next');
    } else if (index === (activeCharacterIndex - 1 + characterOptions.length) % characterOptions.length) {
      item.classList.add('previous');
    } else {
      item.classList.add('hidden');
    }
    item.innerHTML = `
      <img src="${character.image}" alt="${character.name}" onerror="this.style.background='#f8f8f8'" />
      <strong>${character.name}</strong>
    `;
    item.addEventListener('click', () => {
      setActiveCharacter(index);
    });
    carousel.appendChild(item);
  });
}

function setActiveCharacter(index) {
  activeCharacterIndex = ((index % characterOptions.length) + characterOptions.length) % characterOptions.length;
  activeCharacter = characterOptions[activeCharacterIndex];
  renderCarousel();
  updateSelectedCharacterDisplay();
}

function updateSelectedCharacterDisplay() {
  selectedCharacterImage.src = activeCharacter.image;
  selectedCharacterImage.alt = activeCharacter.name;
  selectedCharacterName.textContent = activeCharacter.name;
}

function loadHighScore() {
  highScore = Number(localStorage.getItem(storageKey) || '0');
  highScoreValue.textContent = highScore;
  hudHighScore.textContent = highScore;
}

function saveHighScore() {
  if (score > highScore) {
    highScore = score;
    localStorage.setItem(storageKey, String(highScore));
    highScoreValue.textContent = highScore;
    hudHighScore.textContent = highScore;
    return true;
  }
  return false;
}

function clearGameObjects() {
  gameObjects.platforms.forEach((platform) => platform.destroy());
  gameObjects.items.forEach((item) => item.destroy());
  gameObjects.tnts.forEach((tnt) => tnt.destroy());
  gameObjects.platforms = [];
  gameObjects.items = [];
  gameObjects.tnts = [];
  if (gameObjects.player) {
    gameObjects.player.destroy();
    gameObjects.player = null;
  }
}

function resetGame() {
  score = 0;
  scoreValue.textContent = score;
  nextMemeIndex = 0;
  clearTimeout(memeTimer);
  memePopup.classList.remove('visible');
  clearGameObjects();
  stage.width = gameArea.clientWidth;
  stage.height = gameArea.clientHeight;
  stage.midline = stage.height * 0.45;
  const playerStartX = stage.width / 2 - 26;
  const playerStartY = stage.height - 140;
  gameObjects.player = new Player(playerStartX, playerStartY, activeCharacter.image);
  gameObjects.player.jump();
  const basePlatform = new Platform(playerStartX - 14, playerStartY + 96, 140);
  basePlatform.element.classList.add('safe');
  gameObjects.platforms.push(basePlatform);
  generatePlatforms();
}

function generatePlatforms() {
  const threshold = stage.height + 100;
  let lastY = stage.height;
  if (gameObjects.platforms.length > 0) {
    lastY = Math.min(...gameObjects.platforms.map((platform) => platform.y));
  }
  while (lastY > -threshold) {
    const difficulty = Math.min(1, score / 1000);
    const gap = getRandomNumber(gameConfig.minPlatformGap, gameConfig.maxPlatformGap + difficulty * 40);
    const width = getRandomNumber(80, 120);
    const x = getRandomNumber(10, stage.width - width - 10);
    const y = lastY - gap;
    const platform = new Platform(x, y, width);
    if (Math.random() < difficulty * 0.1) {
      platform.element.classList.add('safe');
    }
    gameObjects.platforms.push(platform);
    if (Math.random() < gameConfig.itemSpawnChance && y > -stage.height) {
      const itemX = x + getRandomNumber(8, Math.max(8, width - 40));
      const itemY = y - 52;
      const item = new Item(itemX, itemY);
      gameObjects.items.push(item);
    }
    if (Math.random() < gameConfig.tntSpawnChance && y > 120) {
      const tntX = x + Math.max(8, Math.min(width - 46, Math.round(width / 2 - 18)));
      const tntY = y - 50;
      const tnt = new TNT(tntX, tntY);
      gameObjects.tnts.push(tnt);
    }
    lastY = y;
  }
}

function updatePlatforms(deltaY = 0) {
  const removePlatforms = [];
  gameObjects.platforms.forEach((platform) => {
    if (deltaY !== 0) {
      platform.y += deltaY;
      platform.render();
    }
    if (platform.y > stage.height + 40) {
      removePlatforms.push(platform);
    }
  });
  removePlatforms.forEach((platform) => {
    platform.destroy();
    gameObjects.platforms = gameObjects.platforms.filter((item) => item !== platform);
  });
}

function updateItems(deltaY = 0) {
  const removeItems = [];
  gameObjects.items.forEach((item) => {
    if (deltaY !== 0) {
      item.y += deltaY;
      item.render();
    }
    if (item.y > stage.height + 60) {
      removeItems.push(item);
    }
  });
  removeItems.forEach((item) => {
    item.destroy();
    gameObjects.items = gameObjects.items.filter((entry) => entry !== item);
  });
}

function updateTNT(deltaY = 0) {
  const removeTnts = [];
  gameObjects.tnts.forEach((tnt) => {
    if (deltaY !== 0) {
      tnt.y += deltaY;
      tnt.render();
    }
    if (tnt.y > stage.height + 60) {
      removeTnts.push(tnt);
    }
  });
  removeTnts.forEach((tnt) => {
    tnt.destroy();
    gameObjects.tnts = gameObjects.tnts.filter((entry) => entry !== tnt);
  });
}

function checkPlatformCollisions() {
  if (!gameObjects.player || gameObjects.player.vy <= 0) return;
  const player = gameObjects.player;
  const playerBottom = player.y + player.height;
  const previousBottom = player.y + player.height - player.vy;
  gameObjects.platforms.forEach((platform) => {
    const platformTop = platform.y;
    const isOnTop = previousBottom <= platformTop && playerBottom >= platformTop;
    const overlapsX = player.x + player.width > platform.x + 8 && player.x < platform.x + platform.width - 8;
    if (isOnTop && overlapsX && playerBottom <= platformTop + 18) {
      player.y = platformTop - player.height;
      player.jump();
      score += 5;
      scoreValue.textContent = score;
    }
  });
}

function checkItemCollisions() {
  if (!gameObjects.player) return;
  const playerBox = {
    left: gameObjects.player.x,
    right: gameObjects.player.x + gameObjects.player.width,
    top: gameObjects.player.y,
    bottom: gameObjects.player.y + gameObjects.player.height,
  };
  const removeItems = [];
  gameObjects.items.forEach((item) => {
    const itemBox = {
      left: item.x,
      right: item.x + item.width,
      top: item.y,
      bottom: item.y + item.height,
    };
    const intersects = playerBox.left < itemBox.right &&
                       playerBox.right > itemBox.left &&
                       playerBox.top < itemBox.bottom &&
                       playerBox.bottom > itemBox.top;
    if (intersects) {
      score += 20;
      scoreValue.textContent = score;
      coinAudio.currentTime = 0;
      coinAudio.play().catch(() => {});
      removeItems.push(item);
    }
  });
  removeItems.forEach((item) => {
    item.destroy();
    gameObjects.items = gameObjects.items.filter((entry) => entry !== item);
  });
}

function checkTNTCollisions() {
  if (!gameObjects.player) return;
  const playerBox = {
    left: gameObjects.player.x,
    right: gameObjects.player.x + gameObjects.player.width,
    top: gameObjects.player.y,
    bottom: gameObjects.player.y + gameObjects.player.height,
  };
  gameObjects.tnts.forEach((tnt) => {
    const tntBox = {
      left: tnt.x,
      right: tnt.x + tnt.width,
      top: tnt.y,
      bottom: tnt.y + tnt.height,
    };
    const intersects = playerBox.left < tntBox.right &&
                       playerBox.right > tntBox.left &&
                       playerBox.top < tntBox.bottom &&
                       playerBox.bottom > tntBox.top;
    if (intersects) {
      triggerExplosion(gameObjects.player.x + gameObjects.player.width / 2, gameObjects.player.y + gameObjects.player.height / 2);
      boomAudio.currentTime = 0;
      boomAudio.play().catch(() => {});
      score = Math.max(0, score - 50);
      saveHighScore();
      finishGame();
    }
  });
}

function fadeMusic(targetVolume, duration = 1400) {
  if (!musicAudio) return;
  if (musicFadeRequest) {
    cancelAnimationFrame(musicFadeRequest);
    musicFadeRequest = null;
  }

  const startVolume = musicAudio.volume;
  const startTime = performance.now();

  if (targetVolume > 0) {
    musicAudio.volume = startVolume;
    musicAudio.play().catch(() => {});
  }

  const step = (time) => {
    const progress = Math.min(1, (time - startTime) / duration);
    musicAudio.volume = Math.max(0, Math.min(1, startVolume + (targetVolume - startVolume) * progress));

    if (progress < 1) {
      musicFadeRequest = requestAnimationFrame(step);
    } else {
      musicFadeRequest = null;
      if (targetVolume === 0) {
        musicAudio.pause();
        musicAudio.currentTime = 0;
      }
    }
  };

  musicFadeRequest = requestAnimationFrame(step);
}

function triggerExplosion(x, y) {
  const explosion = document.createElement('div');
  explosion.className = 'explosion visible';
  explosion.style.left = `${x}px`;
  explosion.style.top = `${y}px`;
  gameArea.appendChild(explosion);
  setTimeout(() => {
    explosion.classList.remove('visible');
    explosion.remove();
  }, 340);
}

function maybeShowMeme() {
  if (nextMemeIndex >= gameConfig.memeTriggers.length) return;
  if (score >= gameConfig.memeTriggers[nextMemeIndex]) {
    const memePaths = [
      'assets/tidak menggoda.jpg',
      'assets/laiks.jpg',
      'assets/punten.jpg',
      
      
    ];
    memeImage.src = memePaths[nextMemeIndex % memePaths.length];
    memePopup.classList.add('visible');
    memeAudio.currentTime = 0;
    memeAudio.play().catch(() => {});
    clearTimeout(memeTimer);
    memeTimer = setTimeout(() => {
      memePopup.classList.remove('visible');
    }, gameConfig.memeDuration);
    nextMemeIndex += 1;
  }
}

function gameLoop(timestamp) {
  if (paused || gameState !== 'running') {
    animationFrameId = requestAnimationFrame(gameLoop);
    return;
  }
  if (!lastTime) lastTime = timestamp;
  const delta = Math.min((timestamp - lastTime) / 16, 2);
  lastTime = timestamp;
  gameObjects.player.update();
  if (gameObjects.player.y < stage.midline) {
    const shift = stage.midline - gameObjects.player.y;
    gameObjects.player.y = stage.midline;
    updatePlatforms(shift);
    updateItems(shift);
    updateTNT(shift);
    generatePlatforms();
  }
  checkPlatformCollisions();
  checkItemCollisions();
  checkTNTCollisions();
  maybeShowMeme();
  saveHighScore();
  if (gameObjects.player.y > stage.height) {
    saveHighScore();
    finishGame();
  }
  animationFrameId = requestAnimationFrame(gameLoop);
}

function finishGame() {
  gameState = 'gameover';
  cancelAnimationFrame(animationFrameId);
  saveHighScore();
  gameoverOverlay.classList.remove('hidden');
  finalScore.textContent = score;
  gameoverHighscore.textContent = highScore;
  fadeMusic(0);
  gameoverAudio.currentTime = 0;
  gameoverAudio.play().catch(() => {});
}

function togglePause() {
  if (gameState !== 'running') return;
  paused = !paused;
  pauseOverlay.classList.toggle('hidden', !paused);
  pauseButton.textContent = paused ? 'Resume' : 'Pause';
  if (paused) {
    fadeMusic(0);
  } else {
    fadeMusic(0.8);
  }
}

function showScreen(screen) {
  menuScreen.classList.toggle('active', screen === 'menu');
  gameScreen.classList.toggle('active', screen === 'game');
}

function startGame() {
  showScreen('game');
  gameState = 'running';
  paused = false;
  pauseOverlay.classList.add('hidden');
  gameoverOverlay.classList.add('hidden');
  pauseButton.textContent = 'Pause';
  resetGame();
  lastTime = 0;
  musicAudio.currentTime = 0;
  fadeMusic(0.8);
  animationFrameId = requestAnimationFrame(gameLoop);
}

function goBackToMenu() {
  gameState = 'menu';
  cancelAnimationFrame(animationFrameId);
  showScreen('menu');
  paused = false;
  pauseOverlay.classList.add('hidden');
  gameoverOverlay.classList.add('hidden');
  fadeMusic(0);
}

function bindInputListeners() {
  window.addEventListener('keydown', (event) => {
    if (event.code === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
      inputState.left = true;
    }
    if (event.code === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
      inputState.right = true;
    }
    if (event.code === 'Escape' && gameState === 'running') {
      togglePause();
    }
  });
  window.addEventListener('keyup', (event) => {
    if (event.code === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
      inputState.left = false;
    }
    if (event.code === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
      inputState.right = false;
    }
  });
  pauseButton.addEventListener('click', () => {
    togglePause();
  });
  resumeButton.addEventListener('click', () => {
    togglePause();
  });
  startButton.addEventListener('click', startGame);
  restartButton.addEventListener('click', startGame);
  backButton.addEventListener('click', goBackToMenu);
  window.addEventListener('resize', () => {
    stage.width = gameArea.clientWidth;
    stage.height = gameArea.clientHeight;
    stage.midline = stage.height * 0.45;
  });
}

function init() {
  createCharacterCarousel();
  updateSelectedCharacterDisplay();
  loadHighScore();
  bindInputListeners();
}

init();
