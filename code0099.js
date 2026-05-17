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
const BALL_COLORS = ['#a81000', '#0038b8', '#00a800', '#f8b800']; // ファミコンパレットの4色

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
    gameState = "PLAYING";

    scoreDisplay.textContent = `SCORE:${score}`;
    timeDisplay.textContent = `TIME:${timeLeft}`;

    startScreen.classList.add("hidden");
    finishScreen.classList.add("hidden");
    rankingScreen.classList.add("hidden");

    // 既存のタイマーがあればクリア
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
    if (Math.random() < 0.04) { // ボールの出現頻度
        balls.push({
            x: Math.random() * (V_WIDTH - 12) + 6,
            y: -10,
            radius: 6,
            speed: Math.random() * 2 + 2.5, // 落下速度
            color: BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)]
        });
    }
}

function update() {
    if (gameState !== "PLAYING") return;

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
        if (b.y + b.radius >= player.y && b.y - b.radius <= player.y + player.height) {
            if (b.x >= player.x && b.x <= player.x + player.width) {
                score += 100;
                scoreDisplay.textContent = `SCORE:${score}`;
                balls.splice(i, 1);
                continue;
            }
        }

        // 画面外への落下判定
        if (b.y - b.radius > V_HEIGHT) {
            balls.splice(i, 1);
        }
    }
}

function render() {
    ctx.clearRect(0, 0, V_WIDTH, V_HEIGHT);

    // カゴの描画
    ctx.fillStyle = '#f8b800'; 
    ctx.fillRect(player.x, player.y, player.width, player.height);
    ctx.fillStyle = '#a81000'; 
    ctx.fillRect(player.x, player.y, player.width, 2);
    ctx.fillRect(player.x, player.y + player.height - 2, player.width, 2);

    // ボールの描画
    balls.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x - b.radius, b.y - b.radius, b.radius * 2, b.radius * 2);
        
        ctx.fillStyle = '#f8f8f8';
        ctx.fillRect(b.x - b.radius + 2, b.y - b.radius + 2, 2, 2);
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
// モジュールスクリプト内ではDOM構築後に安全に実行されます
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