import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, set, query, orderByChild, limitToLast, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// --- Firebase 初期化設定 ---
const firebaseConfig = {
    apiKey: "AIzaSyCNgQe1bNjJbjiZOZiExkTMXOmaYRwkkIk",
    authDomain: "fallingaming-4fa8b.firebaseapp.com",
    databaseURL: "https://fallingaming-4fa8b-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "fallingaming-4fa8b",
    storageBucket: "fallingaming-4fa8b.firebasestorage.app",
    messagingSenderId: "570079611483",
    appId: "1:570079611483:web:8d43ba9562e8d9f8334d7e"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- ゲーム画面・解像度設定 ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const V_WIDTH = 240;
const V_HEIGHT = 320;
canvas.width = V_WIDTH;
canvas.height = V_HEIGHT;

// --- ゲーム状態管理 ---
let score = 0;
let timeLeft = 15;
let gameState = "START"; // START, PLAYING, FINISH, RANKING
let gameTimer = null;
let balls = [];

// --- 画像アセットのプリロード ---
const images = {
    ufo: new Image(),
    ball: new Image(),
    basket: new Image()
};

images.ufo.src = 'ufo.png';
images.ball.src = 'ball.png';
images.basket.src = 'basket.png';

let imagesLoaded = false;
let loadedCount = 0;
const totalImages = Object.keys(images).length;

function onImageLoad() {
    loadedCount++;
    if (loadedCount === totalImages) {
        imagesLoaded = true;
    }
}
images.ufo.onload = onImageLoad;
images.ball.onload = onImageLoad;
images.basket.onload = onImageLoad;

// --- オブジェクトデータ ---
const ufo = {
    width: 32,
    height: 16,
    x: 0,
    y: 40,
    speed: 4,
    direction: 1
};

const player = {
    width: 40,
    height: 12,
    x: V_WIDTH / 2 - 20,
    y: V_HEIGHT - 30,
    speed: 5,
    moveLeft: false,
    moveRight: false
};

// --- UI要素の取得 ---
const scoreDisplay = document.getElementById("score-display");
const timeDisplay = document.getElementById("time-display");
const startScreen = document.getElementById("start-screen");
const finishScreen = document.getElementById("finish-screen");
const rankingScreen = document.getElementById("ranking-screen");
const resultScoreText = document.getElementById("result-score");
const rankingBoard = document.getElementById("ranking-board");
const playerNameInput = document.getElementById("player-name");
const submitBtn = document.getElementById("submit-btn");

// --- 画面遷移の制御関数 ---
function switchScreen(targetState) {
    gameState = targetState;
    
    // すべてのオーバーレイを一旦隠す
    startScreen.classList.add("hidden");
    finishScreen.classList.add("hidden");
    rankingScreen.classList.add("hidden");

    // 状態に応じた画面を表示
    if (targetState === "START") startScreen.classList.remove("hidden");
    if (targetState === "FINISH") finishScreen.classList.remove("hidden");
    if (targetState === "RANKING") rankingScreen.classList.remove("hidden");
}

// --- ゲームロジック ---
function startGame() {
    score = 0;
    timeLeft = 15;
    balls = [];
    player.x = V_WIDTH / 2 - player.width / 2;
    ufo.x = 0;
    ufo.direction = 1;

    scoreDisplay.textContent = `SCORE:${score}`;
    timeDisplay.textContent = `TIME:${timeLeft}`;

    switchScreen("PLAYING");

    if (gameTimer) clearInterval(gameTimer);
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
    resultScoreText.textContent = score;
    player.moveLeft = false;
    player.moveRight = false;
    switchScreen("FINISH");
}

function spawnBall() {
    if (Math.random() < 0.02) {
        balls.push({
            x: ufo.x + (ufo.width / 2) - 6,
            y: ufo.y + ufo.height,
            width: 12,
            height: 12,
            speed: Math.random() * 3.5 + 1.2
        });
    }
}

function update() {
    if (gameState !== "PLAYING") return;

    // UFOの高速移動
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

    if (player.x < 0) player.x = 0;
    if (player.x > V_WIDTH - player.width) player.x = V_WIDTH - player.width;

    // ボール処理
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

        if (b.y > V_HEIGHT) {
            balls.splice(i, 1);
        }
    }
}

function render() {
    ctx.clearRect(0, 0, V_WIDTH, V_HEIGHT);

    if (!imagesLoaded) return;

    // プレイ中のみUFOを描画
    if (gameState === "PLAYING") {
        ctx.drawImage(images.ufo, ufo.x, ufo.y, ufo.width, ufo.height);
    }

    // カゴの描画
    ctx.drawImage(images.basket, player.x, player.y, player.width, player.height);

    // ボールの描画
    balls.forEach(b => {
        ctx.drawImage(images.ball, b.x, b.y, b.width, b.height);
    });
}

function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// --- Firebase スコア送信 & ランキング取得 ---
async function submitScore() {
    const name = playerNameInput.value.trim() || "MARIO";

    // 2重送信防止のためにボタンを即座に無効化
    submitBtn.disabled = true;
    submitBtn.textContent = "SENDING...";

    try {
        // 1. スコアをFirebaseに送信
        const rankingRef = ref(db, 'scores');
        const newScoreRef = push(rankingRef);
        await set(newScoreRef, {
            name: name,
            score: score,
            timestamp: Date.now()
        });

        // 2. 入力フォームをクリア
        playerNameInput.value = "";

        // 3. 送信成功後に画面を切り替え、ランキングを描画
        switchScreen("RANKING");
        await loadAndRenderRanking();

    } catch (error) {
        console.error("Firebaseへの送信またはデータ取得に失敗しました:", error);
        alert("通信エラーが発生しました。データベースの接続やルールを確認してください。");
        submitBtn.disabled = false;
        submitBtn.textContent = "REGISTRATION";
    }
}

async function loadAndRenderRanking() {
    rankingBoard.innerHTML = "LOADING...";

    try {
        // スコアの高い順に最大7件取得するクエリ
        const scoresRef = query(ref(db, 'scores'), orderByChild('score'), limitToLast(7));
        const snapshot = await get(scoresRef);
        
        rankingBoard.innerHTML = "";
        let records = [];

        snapshot.forEach((childSnapshot) => {
            records.push(childSnapshot.val());
        });

        // 降順（高得点順）に並び替え
        records.sort((a, b) => b.score - a.score);

        if (records.length === 0) {
            rankingBoard.innerHTML = "NO RECORD YET";
            return;
        }

        // ランキングHTMLの組み立て
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
        console.error("ランキングの読み込みに失敗しました:", error);
        rankingBoard.innerHTML = "LOAD ERROR";
    } finally {
        // 次のプレイのためにボタンの状態を戻しておく
        submitBtn.disabled = false;
        submitBtn.textContent = "REGISTRATION";
    }
}

function backToStart() {
    switchScreen("START");
}

function escapeHTML(str) {
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
}

// --- イベントリスナー設定 ---
document.getElementById("start-btn").addEventListener("click", startGame);
submitBtn.addEventListener("click", submitScore);
document.getElementById("restart-btn").addEventListener("click", backToStart);

// キーボード
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

// ループ起動
requestAnimationFrame(gameLoop);