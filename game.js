// game.js
import { initializeApp } from './firebase-app.js';
import { db } from './firebase-config.js';

const app = initializeApp(firebaseConfig);

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 400;
canvas.height = 600;

const ball = {
  x: canvas.width / 2,
  y: 0,
  dx: 3,
  dy: 3,
  radius: 15,
  color: '#ff0'
};

const basket = {
  x: canvas.width / 2 - 50,
  y: canvas.height - 60,
  width: 100,
  height: 20,
  speed: 5,
  dx: 0,
  color: '#ff0'
};

let score = 0;
const finishMessage = document.createElement('div');
finishMessage.style.position = 'absolute';
finishMessage.style.top = '50%';
finishMessage.style.left = '50%';
finishMessage.style.transform = 'translate(-50%, -50%)';
finishMessage.style.color = '#fff';
finishMessage.style.fontSize = '24px';

const scoreDisplay = document.createElement('div');
scoreDisplay.style.position = 'absolute';
scoreDisplay.style.top: '10px';
scoreDisplay.style.right: '10px';
scoreDisplay.style.color = '#fff';
scoreDisplay.style.fontSize = '18px';

document.body.appendChild(scoreDisplay);

function drawBall() {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = ball.color;
  ctx.fill();
  ctx.closePath();
}

function drawBasket() {
  ctx.beginPath();
  ctx.rect(basket.x, basket.y, basket.width, basket.height);
  ctx.fillStyle = basket.color;
  ctx.fill();
  ctx.closePath();
}

function updateBall() {
  ball.x += ball.dx;
  ball.y += ball.dy;

  if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
    ball.dx *= -1;
  }

  if (ball.y - ball.radius < 0) {
    ball.dy *= -1;
  } else if (ball.y + ball.radius > canvas.height) {
    clearInterval(gameInterval);
    document.body.appendChild(finishMessage);
    finishMessage.textContent = `FINISH! Your Score: ${score}`;
  }
}

function updateBasket() {
  basket.x += basket.dx;

  if (basket.x < 0) {
    basket.x = 0;
  } else if (basket.x + basket.width > canvas.width) {
    basket.x = canvas.width - basket.width;
  }
}

canvas.addEventListener('mousemove', (event) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  basket.dx = mouseX - (basket.x + basket.width / 2);
});

function resetBall() {
  ball.x = canvas.width / 2;
  ball.y = 0;
  ball.dx *= -1;
}

let gameInterval;

function startGame() {
  scoreDisplay.textContent = `Score: ${score}`;
  gameInterval = setInterval(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBall();
    drawBasket();
    updateBall();
    updateBasket();
  }, 10);

  setTimeout(() => {
    clearInterval(gameInterval);
    document.body.appendChild(finishMessage);
    finishMessage.textContent = `FINISH! Your Score: ${score}`;
    saveScore(score);
  }, 15000);
}

function saveScore(score) {
  const db = getFirestore();
  const scoreRef = doc(db, 'ranking', 'score');
  setDoc(scoreRef, { value: score });
}

document.addEventListener('DOMContentLoaded', () => {
  startGame();
});
