// ser-primordial.js

const canvas = document.createElement("canvas");
canvas.width = 600;
canvas.height = 600;
document.body.insertBefore(canvas, document.getElementById("restartBtn"));
const ctx = canvas.getContext("2d");

let BLOB_SIZE_BASE = 20;
let FOOD_SIZE = 10;
const HUNGER_DECAY = 0.05;
const MAX_HUNGER = 100;
const BASE_SPEED = 2;
let blobs = [];
let foods = [];
let running;
let foodTimer;
const colors = ["blue", "purple", "orange", "pink"];
let deathCount = {};

function resetGame() {
  blobs = [
    createBlob(100, 100, colors[0]),
    createBlob(500, 100, colors[1]),
    createBlob(100, 500, colors[2]),
    createBlob(500, 500, colors[3])
  ];
  deathCount = {};
  foods = [];
  clearTimeout(foodTimer);
  running = true;
  loop();
  spawnFoodRandomly();
}

function createBlob(x, y, color) {
  return {
    x,
    y,
    hunger: MAX_HUNGER,
    age: 0,
    speed: BASE_SPEED,
    size: BLOB_SIZE_BASE,
    direction: Math.random() * 2 * Math.PI,
    speedBoostTimer: 0,
    color
  };
}

function drawFood(food) {
  ctx.fillStyle = food.doubleGrowth ? "lightgreen" : "green";
  ctx.fillRect(food.x, food.y, FOOD_SIZE, FOOD_SIZE);
}

function drawBlob(blob) {
  // Fome afeta cor de fundo
  let hungerRatio = blob.hunger / MAX_HUNGER;
  ctx.fillStyle = blob.color;
  ctx.globalAlpha = hungerRatio < 0.3 ? 0.4 : 1;
  ctx.fillRect(blob.x, blob.y, blob.size, blob.size);
  ctx.globalAlpha = 1;
}

function moveTowards(blob, target) {
  let dx = target.x - blob.x;
  let dy = target.y - blob.y;
  let dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return;
  dx /= dist;
  dy /= dist;

  let futureX = blob.x + dx * blob.speed;
  let futureY = blob.y + dy * blob.speed;

  // Evitar colisão com outro blob
  for (let other of blobs) {
    if (other !== blob && checkBlobCollision({ x: futureX, y: futureY, size: blob.size }, other)) {
      blob.direction = Math.random() * 2 * Math.PI;
      dx = Math.cos(blob.direction);
      dy = Math.sin(blob.direction);
      break;
    }
  }

  if (futureX < 0 || futureX + blob.size > canvas.width) dx = -dx;
  if (futureY < 0 || futureY + blob.size > canvas.height) dy = -dy;

  blob.x += dx * blob.speed;
  blob.y += dy * blob.speed;
}

function wander(blob) {
  if (blob.x < 0 || blob.x + blob.size > canvas.width) {
    blob.direction = Math.PI - blob.direction;
  }
  if (blob.y < 0 || blob.y + blob.size > canvas.height) {
    blob.direction = -blob.direction;
  }

  blob.x += Math.cos(blob.direction) * blob.speed;
  blob.y += Math.sin(blob.direction) * blob.speed;

  if (Math.random() < 0.02) {
    blob.direction += (Math.random() - 0.5);
  }
}

function checkCollision(blob, food) {
  return (
    blob.x < food.x + FOOD_SIZE &&
    blob.x + blob.size > food.x &&
    blob.y < food.y + FOOD_SIZE &&
    blob.y + blob.size > food.y
  );
}

function checkBlobCollision(blob1, blob2) {
  return (
    blob1.x < blob2.x + blob2.size &&
    blob1.x + blob1.size > blob2.x &&
    blob1.y < blob2.y + blob2.size &&
    blob1.y + blob1.size > blob2.y
  );
}

function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  foods.forEach(drawFood);

  let newBlobs = [];

  blobs.forEach((blob) => {
    if (blob.hunger <= 0) return;

    blob.hunger -= HUNGER_DECAY;
    blob.hunger = Math.max(0, blob.hunger);
    blob.age += 1 / 60;

    if (blob.speedBoostTimer > 0) {
      blob.speedBoostTimer--;
      if (blob.speedBoostTimer === 0) blob.speed = BASE_SPEED;
    }

    if (foods.length > 0) {
      let closest = foods.reduce((a, b) => {
        const da = Math.hypot(blob.x - a.x, blob.y - a.y);
        const db = Math.hypot(blob.x - b.x, blob.y - b.y);
        return da < db ? a : b;
      });
      moveTowards(blob, closest);
    } else {
      wander(blob);
    }

    for (let i = 0; i < foods.length; i++) {
      if (checkCollision(blob, foods[i])) {
        blob.hunger = MAX_HUNGER;
        blob.speed = BASE_SPEED + 5;
        blob.speedBoostTimer = 60 * 5;
        let growth = foods[i].doubleGrowth ? 2 : 1;
        blob.size += growth * 5;
        foods.splice(i, 1);
        break;
      }
    }

    if (blob.size >= BLOB_SIZE_BASE * 2) {
      blob.size = BLOB_SIZE_BASE;
      newBlobs.push(createBlob(blob.x + 5, blob.y + 5, blob.color));
    }

    drawBlob(blob);
  });

  blobs.push(...newBlobs);
  blobs = blobs.filter(blob => blob.hunger > 0);

  // Predação
  for (let i = blobs.length - 1; i >= 0; i--) {
    const predator = blobs[i];
    for (let j = blobs.length - 1; j >= 0; j--) {
      if (i === j) continue;
      const prey = blobs[j];
      if (
        predator.color !== prey.color &&
        predator.size >= prey.size * 1.75 &&
        checkBlobCollision(predator, prey)
      ) {
        predator.hunger = MAX_HUNGER;
        predator.size += prey.size * 0.2;
        deathCount[prey.color] = (deathCount[prey.color] || 0) + 1;
        blobs.splice(j, 1);
        if (j < i) i--;
        break;
      }
    }
  }

  // Condição de fim de jogo
  if (blobs.length === 0) {
    alert("Todos os seres pereceram. O ciclo recomeça...");
    running = false;
    return;
  }

  const remainingColors = [...new Set(blobs.map(b => b.color))];
  if (remainingColors.length === 1) {
    alert(`A equipe ${remainingColors[0]} venceu!`);
    running = false;
    return;
  }

  updateScoreboard();
}

function updateScoreboard() {
  const board = document.getElementById("scoreboard");
  const colorCounts = {};
  blobs.forEach(blob => {
    colorCounts[blob.color] = (colorCounts[blob.color] || 0) + 1;
  });

  let html = `<h3>Placar:</h3><ul>`;
  colors.forEach(color => {
    const alive = colorCounts[color] || 0;
    const dead = deathCount[color] || 0;
    html += `<li style="color:${color}; font-weight:bold">${color.toUpperCase()}: Vivos ${alive}, Mortos ${dead}</li>`;
  });
  html += `</ul>`;
  board.innerHTML = html;
}

function spawnFoodRandomly() {
  const delay = Math.random() * 15000;
  foodTimer = setTimeout(() => {
    const doubleGrowth = Math.random() < 0.02;
    foods.push({
      x: Math.random() * (canvas.width - FOOD_SIZE),
      y: Math.random() * (canvas.height - FOOD_SIZE),
      doubleGrowth
    });
    if (running) spawnFoodRandomly();
  }, delay);
}

function loop() {
  if (!running) return;
  update();
  requestAnimationFrame(loop);
}

document.getElementById("restartBtn").addEventListener("click", resetGame);

resetGame();
