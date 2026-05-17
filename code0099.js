import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, set, query, orderByChild, limitToLast, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// --- Firebase 設定 ---
const firebaseConfig = {
    apiKey: "AIzaSyCNgQe1bNjJbjiZOZiExkTMXOmaYRwkkIk",
    authDomain: "fallingaming-4fa8b.firebaseapp.com",
    databaseURL: "https://fallingaming-4fa8b-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "fallingaming-4fa8b",
    storageBucket: "fallingaming-4fa8b.firebasestorage.app",
    messagingSenderId: "570079611483",
    appId: "1:570079611483:web:8d43ba9562e8d9f8334d7e"
};

// Firebase 初期化
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- ゲーム用グローバル設定・変数 ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 仮想解像度
const V_WIDTH = 240;
const V_HEIGHT = 320;
canvas.width = V_WIDTH;
canvas.height = V_HEIGHT;

let score = 0;
let timeLeft = 15;
let gameState = "START"; // START, PLAYING, FINISH, RANKING
let gameTimer = null;

// --- 画像アセットのプリロードと管理 ---
const images = {
    ufo: new Image(),
    ball: new Image(),
    basket: new Image()
};

images.ufo.src = 'ufo.png';
images.ball.src = 'ball.png';
images.basket.src = 'basket.png';

// 全ての画像が読み込まれたか確認するフラグ
let imagesLoaded = false;
let loadedCount = 0;
const totalImages = Object.keys(images).length;

function checkImagesLoad() {
    loadedCount++;
    if (loadedCount === totalImages) {
        imagesLoaded = true;
    }
}

images.ufo.onload = checkImagesLoad;
images.ball.onload = checkImagesLoad;
images.basket.onload = checkImagesLoad;

// --- オブジェクト定義 ---
// UFOオブジェクト（画面上部を高速移動）
const ufo = {
    width: 32,
    height: 16,
    x: 0,
    y: 40,         // 画面上部に確実に出現するよう調整
    speed: 4,      // 高速移動用速度設定
    direction: 1   // 1: 右, -1: 左
};

// プレイヤー（カゴ）オブジェクト
const player = {
    width: 40,
    height: 12,
    x: V_WIDTH / 2 - 20,
    y: V_HEIGHT - 30,
    speed: 5,
    moveLeft: false,
    moveRight: false
};

// ボール配列
let balls = [];

// --- UI要素 ---
const scoreDisplay = document.getElementById("score-display");
const timeDisplay = document.getElementById("time-display");
const startScreen = document.getElementById("start-screen");
const finishScreen = document.getElementById("finish-screen");
const rankingScreen = document.getElementById("ranking-screen");
const resultScoreText = document.getElementById("result-score");
const rankingBoard = document.getElementById("ranking-board");

// --- ゲームロジック ---
function startGame() {
    score = 0;
    timeLeft = 15;
    balls = [];
    player.x = V_WIDTH / 2 - player.width / 2;
    ufo.x = 0;
    ufo.direction = 1;
    gameState = "PLAYING";

    scoreDisplay.textContent = `SCORE:${score}`;
    timeDisplay.textContent = `TIME:${timeLeft}`;

    startScreen.classList.add("hidden");
    finishScreen.classList.add("hidden");
    rankingScreen.classList.add("hidden");

    if (gameTimer) clearInterval(gameTimer);

    // カウントダウンタイマー
    gameTimer = setInterval(() => {
        timeLeft--;
        timeDisplay.textContent = `TIME:${timeLeft}`;
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

function endGame() {
    clearInterval(gameTimer);
    gameState = "FINISH";
    resultScoreText.textContent = score;
    finishScreen.classList.remove("hidden");
    player.moveLeft = false;
    player.moveRight = false;
}

function spawnBall() {
    // 出現頻度（従来の頻度を維持）
    if (Math.random() < 0.02) { 
        balls.push({
            // ボールは現在のUFOの中心位置から発射される
            x: ufo.x + (ufo.width / 2) - 6,
            y: ufo.y + ufo.height,
            width: 12,
            height: 12,
            speed: Math.random() * 3.5 + 1.2 // 落下速度のランダム性
        });
    }
}

function update() {
    if (gameState !== "PLAYING") return;

    // UFOの高速左右往復移動
    ufo.x += ufo.speed * ufo.direction;
    if (ufo.x <= 0) {
        ufo.x = 0;
        ufo.direction = 1;
    } else if (ufo.x >= V_WIDTH - ufo.width) {
        ufo.x = V_WIDTH - ufo.width;
        ufo.direction = -1;
    }

    // プレイヤー移動
    if (player.moveLeft) player.x -= player.speed;
    if (player.moveRight) player.x += player.speed;

    // 壁との接触判定
    if (player.x < 0) player.x = 0;
    if (player.x > V_WIDTH - player.width) player.x = V_WIDTH - player.width;

    // ボールの移動および判定
    spawnBall();
    for (let i = balls.length - 1; i >= 0; i--) {
        let b = balls[i];
        b.y += b.speed;

        // キャッチ判定
        if (b.y + b.height >= player.y && b.y <= player.y + player.height) {
            if (b.x + b.width >= player.x && b.x <= player.x + player.width) {
                score += 100;
                scoreDisplay.textContent = `SCORE:${score}`;
                balls.splice(i, 1);
                continue;
            }
        }

        // 画面外への落下判定
        if (b.y > V_HEIGHT) {
            balls.splice(i, 1);
        }
    }
}

function render() {
    ctx.clearRect(0, 0, V_WIDTH, V_HEIGHT);

    // 画像がまだ読み込まれていない場合は描画をスキップしてバグを防ぐ
    if (!imagesLoaded) return;

    // プレイ中のみ画面上部にUFOを描画
    if (gameState === "PLAYING") {
        ctx.drawImage(images.ufo, ufo.x, ufo.y, ufo.width, ufo.height);
    }

    // カゴ（basket.png）の描画
    ctx.drawImage(images.basket, player.x, player.y, player.width, player.height);

    // ボール（ball.png）の描画
    balls.forEach(b => {
        ctx.drawImage(images.ball, b.x, b.y, b.width, b.height);
    });
}

// メインループ
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// --- Firebase ランキングデータ処理 ---
async function submitScore() {
    const nameInput = document.getElementById("player-name");
    const name = nameInput.value.trim() || "MARIO";
    const submitBtn = document.getElementById("submit-btn");

    submitBtn.disabled = true;
    submitBtn.textContent = "SENDING...";

    try {
        const rankingRef = ref(db, 'scores');
        const newScoreRef = push(rankingRef);
        await set(newScoreRef, {
            name: name,
            score: score,
            timestamp: Date.now()
        });

        nameInput.value = "";
        await showRanking();
    } catch (error) {
        console.error("Firebaseへの送信に失敗しました:", error);
        alert("送信エラーが発生しました。");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "REGISTRATION";
    }
}

async function showRanking() {
    finishScreen.classList.add("hidden");
    rankingScreen.classList.remove("hidden");
    gameState = "RANKING";
    rankingBoard.innerHTML = "LOADING...";

    try {
        const scoresRef = query(ref(db, 'scores'), orderByChild('score'), limitToLast(7));
        const snapshot = await get(scoresRef);
        
        rankingBoard.innerHTML = "";
        let records = [];

        snapshot.forEach((childSnapshot) => {
            records.push(childSnapshot.val());
        });

        records.sort((a, b) => b.score - a.score);

        if (records.length === 0) {
            rankingBoard.innerHTML = "NO RECORD YET";
            return;
        }

        records.forEach((data, index) => {
            const item = document.createElement("div");
            item.className = `ranking-item ${index < 3 ? 'top3' : ''}`;
            item.innerHTML = `
                <span>${index + 1}.${escapeHTML(data.name)}</span>
                <span>${data.score}</span>
            `;
            rankingBoard.appendChild(item);
        });

    } catch (error) {
        console.error("ランキングデータの取得に失敗しました:", error);
        rankingBoard.innerHTML = "LOAD ERROR";
    }
}

function backToStart() {
    rankingScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");
    gameState = "START";
}

function escapeHTML(str) {
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
}

// --- 初期化とイベントリスナー登録 ---
document.getElementById("start-btn").addEventListener("click", startGame);
document.getElementById("submit-btn").addEventListener("click", submitScore);
document.getElementById("restart-btn").addEventListener("click", backToStart);

// キーボード操作
window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a") player.moveLeft = true;
    if (e.key === "ArrowRight" || e.key === "d") player.moveRight = true;
});
window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a") player.moveLeft = false;
    if (e.key === "ArrowRight" || e.key === "d") player.moveRight = false;
});

// スマホ用タッチ操作
const leftZone = document.getElementById("left-zone");
const rightZone = document.getElementById("right-zone");

leftZone.addEventListener("touchstart", (e) => { e.preventDefault(); player.moveLeft = true; });
leftZone.addEventListener("touchend", () => player.moveLeft = false);
rightZone.addEventListener("touchstart", (e) => { e.preventDefault(); player.moveRight = true; });
rightZone.addEventListener("touchend", () => player.moveRight = false);

// 描画ループ開始
requestAnimationFrame(gameLoop);