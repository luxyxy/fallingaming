// game.js - ゲームの中核ロジック
import { db } from './firebase-config.js'; 

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// DOM要素の取得
const scoreDisplayElement = document.getElementById('scoreDisplay');
const startButton = document.getElementById('startButton');
const messageOverlay = document.getElementById('messageOverlay'); // スタート画面用
const gameOverScreen = document.getElementById('gameOverScreen');  // ゲームオーバー画面（IDを明示）
const finalScoreText = document.getElementById('finalScoreText');
const rankingForm = document.getElementById('rankingForm');
const playerNameInput = document.getElementById('playerNameInput');
const submitScoreButton = document.getElementById('submitScoreButton');
const overlayTitle = document.querySelector('#messageOverlay h1'); 

// ゲーム状態管理変数
let score = 0;
let timeElapsed = 0;
let isGameRunning = false;


// --- 定数とスタイル定義 ---
const FAMICOM_COLORS = {
    BALL: '#ffeb3b', 
    CATCH: '#4caf50', 
    MISS: '#f44336',  
};

// ゲームボードのサイズは、CSS/JSで動的に決定されるため、ここではダミーの値を入れておきます。
const canvasDimensions = { width: 400, height: 570 };


// =============================================
// 📐 オブジェクト初期化・再計算
// =============================================

function initializeGameObjects() {
    resizeCanvas(); // 初回に必ずサイズを調整する
}

/**
 * Canvasのサイズを親要素に合わせて調整し、ゲームオブジェクトの位置も修正する。
 */
function resizeCanvas() {
    const containerWidth = document.getElementById('gameContainer').clientWidth;
    canvas.width = Math.min(containerWidth, 400); 
    canvas.height = Math.max(300, canvas.width * 0.75);

    // カゴのサイズ計算（画面幅に依存）
    basket.width = Math.min(canvas.width * 0.8, 250); 
}

const ball = {
    x: canvas.width / 2,
    y: 50,
    radius: 15,
    dx: 4, 
    dy: 3,  
};

const basket = {
    // カゴのX座標を常に中心から計算し直す
    x: canvas.width / 2 - this.width / 2 + ball.radius * 1.5, 
    y: canvas.height - 30, 
};


// =============================================
// 🎨 描画関数 (Drawing)
// =============================================

function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = FAMICOM_COLORS.BALL;
    ctx.fill();
    ctx.closePath();
}

function drawBasket() {
    // ... (描画ロジックは前回と変更なし) ...
    ctx.beginPath();
    const effectiveX = basket.x - 3;
    const effectiveY = basket.y - 3;
    const effectiveWidth = basket.width + 6;
    const effectiveHeight = basket.height + 6;

    ctx.strokeStyle = '#a0522d'; 
    ctx.lineWidth = 4;
    ctx.strokeRect(effectiveX, effectiveY, effectiveWidth, effectiveHeight);
    ctx.fillStyle = 'var(--basket-color)';
    ctx.fillRect(effectiveX, effectiveY, effectiveWidth, effectiveHeight);
    ctx.closePath();
}

function drawTimer() {
    const remainingTime = Math.max(0, 15 - timeElapsed);
    let timerText;
    if (remainingTime > 0) {
        timerText = `TIME: ${String(Math.floor(remainingTime)).padStart(2, '0')}`;
    } else if (!isGameRunning && timeElapsed >= 15) {
         return;
    }

    ctx.font = "bold 24px monospace";
    const color = remainingTime <= 3 ? '#ff4d4d' : '#90ee90'; 
    ctx.fillStyle = color;
    ctx.fillText(timerText, canvas.width - 180, 30);
}

function updateScoreDisplay() {
    scoreDisplayElement.textContent = `SCORE: ${score}`;
}


// =============================================
// 🕹️ ゲームロジック (Physics & Collision)
// =============================================

/**
 * ボールの移動と衝突判定を行うメイン関数
 */
function updateBall() {
    if (!isGameRunning) return; // ゲームが動いていなければ何もしない

    // 位置を更新
    ball.x += ball.dx;
    ball.y += ball.dy;

    // 1. 左右壁の判定
    if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
        ball.dx *= -1; // 方向転換
    }

    // 2. 上端からの落下防止
    if (ball.y <= ball.radius * 2) {
        ball.dy = Math.abs(ball.dy); 
    } else if (!isGameRunning) {
         ball.dy = 0; // ゲーム停止中はY軸の動きを止める
    }

    // 3. キャッチ判定 (キャッチエリアはカゴの上下の範囲に絞る)
    const catchAreaYMin = basket.y - ball.radius * 0.5;
    const catchAreaYMax = basket.y + ball.radius * 0.5;

    if (ball.y >= catchAreaYMin && ball.y <= catchAreaYMax) { // Y軸がキャッチエリア内か？
        // X軸もカゴの範囲内か？
        if (ball.x + ball.radius >= basket.x - 3 && ball.x - ball.radius <= basket.x + basket.width + 3) {
            score += 10;
            updateScoreDisplay();
        }
    }

    // 4. 地面への落下処理 (ゲームオーバー判定の最終トリガー)
    if (ball.y + ball.radius > canvas.height && isGameRunning) {
         clearInterval(gameInterval); 
         isGameRunning = false;
         showGameOverScreen();
    }
}

/**
 * ボールを初期位置にリセットする（次のボールの準備）
 */
function resetBallPosition() {
    ball.y = 50;
    ball.x = Math.random() * (canvas.width - ball.radius * 2) + ball.radius;
    // 次の落下速度をランダムに設定 (-5〜5)
    ball.dx = (Math.random() > 0.5 ? 1 : -1) * (3 + Math.random() * 2); 
    ball.dy = 3; 
}


// =============================================
// 🚀 ゲームフロー制御
// =============================================

/**
 * メインゲームループ（アニメーション）
 */
function gameLoop() {
    if (!isGameRunning) return; // ゲームが動いていなければ、描画はしない

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. 更新処理
    updateBall(); 
    
    // 2. 描画処理
    drawBall();
    drawBasket();
    drawTimer(); 
    
    requestAnimationFrame(gameLoop);
}

/**
 * ゲームの開始準備と実行（ここが最も重要）
 */
function startGame() {
    if (isGameRunning) return; // 二重起動防止

    // UIの状態遷移：スタート画面 -> ゲームボード
    document.getElementById('messageOverlay').classList.add('hidden'); 
    rankingForm.classList.add('hidden');
    gameOverScreen.classList.remove('hidden'); // ゲームオーバー画面を初期メッセージとして使う

    score = 0;
    timeElapsed = 0;
    isGameRunning = true;
    resetBallPosition(); // ボールを最初から配置し直す

    updateScoreDisplay();
    console.log("--- [GAME STARTED] ---");

    // タイマーインターバル設定 (毎秒時間経過の管理)
    gameInterval = setInterval(() => {
        if (isGameRunning) {
            timeElapsed++;
            drawTimer(); // 時間が経つたびに描画を更新
        }
    }, 1000);

    // アニメーションループ開始
    requestAnimationFrame(gameLoop);
}


/**
 * ゲームオーバー時の処理とランキング画面の表示
 */
function showGameOverScreen() {
    isGameRunning = false;
    const finalScore = score;
    finalScoreText.textContent = `最終スコア: ${finalScore}点`;

    // UIの状態遷移：ゲームボード -> ゲームオーバー画面 -> ランキングフォーム
    gameOverScreen.classList.remove('hidden'); 
    rankingForm.classList.remove('hidden');
}


// =============================================
// 🛠️ Firebase連携 (ランキング保存)
// =============================================

async function saveScoreToFirebase() {
    const playerName = playerNameInput.value.trim();
    if (!playerName) {
        document.getElementById('rankingMessage').textContent = "⚠️ 名前を入力してください。";
        return;
    }

    try {
        await db.collection("rankings").doc(playerName).set({ 
            score: score,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            name: playerName
        });
        document.getElementById('rankingMessage').innerHTML = `<strong style="color: #4caf50;">✅ 成功！${playerName}さんのスコアを記録しました！</strong>`;

    } catch (e) {
        console.error("Firebaseへのデータ書き込みエラー:", e);
        document.getElementById('rankingMessage').innerHTML = `<strong style="color: red;">❌ エラーが発生しました。Firestoreの設定を確認してください。</strong>`;
    }
}


// =============================================
// 🎧 イベントリスナー設定 (Input Handling)
// =============================================

startButton.addEventListener('click', startGame);

// マウスとタッチの両方でカゴを動かすイベント処理の共通化
const handleMouseMove = (e) => {
    if (!isGameRunning && !gameOverScreen.classList.contains('hidden')) return; 

    // クランプ範囲の計算: カゴの中心がどこに来るべきか
    let targetXCenter;

    // マウス座標を取得
    const rect = document.getElementById('gameContainer').getBoundingClientRect();
    targetXCenter = e.clientX - rect.left; 
    
    updateBasket(targetXCenter);
};

document.getElementById('gameContainer').addEventListener('mousemove', handleMouseMove);
document.getElementById('gameContainer').addEventListener('touchmove', (e) => {
    if (!isGameRunning && !gameOverScreen.classList.contains('hidden') || e.touches.length === 0) return;

    const rect = document.getElementById('gameContainer').getBoundingClientRect();
    // タッチした指の位置を基準に計算
    const touchX = e.touches[0].clientX - rect.left; 
    updateBasket(touchX);
}, { passive: false }); // スクロールイベントとの競合を防ぐためpassive: false

// ランキング登録ボタンのイベントハンドラ
document.getElementById('showRankingFormButton').addEventListener('click', () => {
    gameOverScreen.classList.add('hidden'); 
    rankingForm.classList.remove('hidden'); 
});


submitScoreButton.addEventListener('click', saveScoreToFirebase);

// 初期起動時のセットアップ (最重要: すべての要素がロードされた後に実行)
window.addEventListener('load', () => {
    initializeGameObjects();
    updateScoreDisplay();
    console.log("✅ ゲーム初期化完了。スタートボタンを押してください。");
});
