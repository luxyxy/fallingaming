// game.js - ゲームの中核ロジック
import { db } from './firebase-config.js'; // Firebaseインスタンスをインポート

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// DOM要素の取得
const scoreDisplayElement = document.getElementById('scoreDisplay');
const startButton = document.getElementById('startButton');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreText = document.getElementById('finalScoreText');
const showRankingFormButton = document.getElementById('showRankingFormButton');
const rankingForm = document.getElementById('rankingForm');
const playerNameInput = document.getElementById('playerNameInput');
const submitScoreButton = document.getElementById('submitScoreButton');

// ゲーム状態管理変数
let score = 0;
let timeElapsed = 0;
let isGameRunning = false;

// 定数定義 (ファミコン風の色)
const FAMICOM_COLORS = {
    BG: '#1a1a2e', // フィールド背景
    BORDER: '#333', // 本体枠線
    BALL: '#ffeb3b', // ボールは黄色に調整
    CATCH: '#4caf50', // キャッチ成功時 (緑)
    MISS: '#f44336',  // 落下の警告色 (赤)
};

// =============================================
// 📐 オブジェクト初期化・再計算
// =============================================

function initializeGameObjects() {
    // サイズ変更に対応するためのリサイズ関数呼び出し
    resizeCanvas(); 
}

/**
 * Canvasのサイズを親要素に合わせて調整する (レスポンシブ対応)
 */
function resizeCanvas() {
    const containerWidth = document.getElementById('gameContainer').clientWidth;
    canvas.width = Math.min(containerWidth, 400); 
    // 高さもアスペクト比に基づいて決定（縦長のゲームボード風）
    canvas.height = Math.max(300, canvas.width * 0.75);

    // カゴのサイズを動的に計算し直す
    basket.width = canvas.width * 0.8;
    basket.y = canvas.height - 30; // 地面から一定距離上
}

// ゲームオブジェクト（ボール、カゴ）の状態変数
const ball = {
    x: canvas.width / 2,
    y: 50,
    radius: 15,
    dx: 4, // X方向の速度 (初期値)
    dy: 3,  // Y方向の速度 (初期値)
};

const basket = {
    x: canvas.width / 2 - this.width / 2,
    y: canvas.height - 30,
    width: Math.min(canvas.width * 0.8, 250), // 幅は計算で決定
    height: 20,
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
    ctx.beginPath();
    // ファミコン風の立体感を出すための描画
    ctx.rect(basket.x - 3, basket.y - 3, basket.width + 6, basket.height + 6);
    ctx.strokeStyle = '#a0522d'; // 茶色い縁取り
    ctx.lineWidth = 4;
    ctx.strokeRect(basket.x - 1, basket.y - 1, basket.width + 2, basket.height + 2);
    
    // 本体を描画
    ctx.fillStyle = 'var(--basket-color)';
    ctx.fillRect(basket.x, basket.y, basket.width, basket.height);
    ctx.closePath();
}

function drawTimer() {
    const remainingTime = Math.max(0, 15 - timeElapsed);
    let timerText;
    if (remainingTime > 0) {
        // 残り時間を2桁表示
        timerText = `TIME: ${String(Math.floor(remainingTime)).padStart(2, '0')}`;
    } else if (!isGameRunning) {
         return; // ゲームが動いていなければ描画しない
    }

    ctx.font = "bold 24px monospace";
    // 残り時間が少ない時は警告色（赤）を使う
    const color = remainingTime <= 5 ? '#ff4d4d' : '#90ee90'; 
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
    // 位置を更新
    ball.x += ball.dx;
    ball.y += ball.dy;

    // 1. 左右壁の判定
    if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
        ball.dx *= -1; // 方向転換
    }

    // 2. 上端からの落下防止（常に下向きを維持）
    if (ball.y <= ball.radius * 2) {
        ball.dy = Math.abs(ball.dy); 
    } 
    
    // 3. 地面到達判定
    const hitGround = ball.y + ball.radius >= canvas.height;

    if (hitGround && !isGameRunning) return; // ゲームが止まっている場合は何もしない

    // 4. キャッチ判定（キャッチエリアはカゴの少し上）
    const catchAreaYMin = basket.y - ball.radius * 0.5;
    const catchAreaYMax = basket.y + ball.radius * 0.5;

    if (ball.y > catchAreaYMin && ball.y < catchAreaYMax) { // Y軸がキャッチエリア内か？
        // X軸もカゴの範囲内か？
        if (ball.x + ball.radius >= basket.x && ball.x - ball.radius <= basket.x + basket.width) {
            score += 10;
            updateScoreDisplay();
        } else if (hitGround) {
             // キャッチエリアを通り過ぎたが、地面に当たった場合（Miss）
             // scoreは増えないが、大きなフィードバックが必要ならここに追加。
        }
    }


    // 5. 地面への落下処理
    if (ball.y + ball.radius > canvas.height) {
         clearInterval(gameInterval);
         isGameRunning = false;
         showGameOverScreen();
    }
}

/**
 * ボールを初期位置にリセットする（ミスしたとき）
 */
function resetBallPosition() {
    ball.y = 50; // 初期Y座標に戻す
    // ランダムな水平スタート位置を設定し、次のボールの動きに変化をつける
    ball.x = Math.random() * (canvas.width - ball.radius * 2) + ball.radius;
    // ランダムな速度設定 (左右どちらから落ちてくるかランダム)
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
    if (!isGameRunning) return;

    // 1. キャンバスクリア (前のフレームを消去)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. 更新処理
    updateBall(); 
    
    // 3. 描画処理
    drawBall();
    drawBasket(); // カゴは常に描画する
    drawTimer();

    // 4. ゲームオーバー判定（時間経過による終了）
    if (timeElapsed >= 15) {
        clearInterval(gameInterval);
        isGameRunning = false;
        showGameOverScreen();
    }

    requestAnimationFrame(gameLoop);
}

/**
 * ゲームの開始処理
 */
async function startGame() {
    // UIの表示制御: スタート画面を消し、ゲームボードを表示
    document.getElementById('messageOverlay').classList.add('hidden'); 
    gameOverScreen.classList.remove('hidden'); // ゲームオーバー画面を初期メッセージとして使う
    rankingForm.classList.add('hidden');

    // 初期化とリセット
    score = 0;
    timeElapsed = 0;
    isGameRunning = true;
    resetBallPosition();

    updateScoreDisplay();
    
    // タイマーを毎秒更新するインターバルを設定 (時間経過の管理)
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
 * ゲームオーバー時の処理とランキング画面への遷移
 */
function showGameOverScreen() {
    isGameRunning = false;
    const finalScore = score;
    finalScoreText.textContent = `最終スコア: ${finalScore}点`;
    gameOverScreen.classList.remove('hidden');
    
    // ランキングフォームの初期化と表示
    document.getElementById('rankingMessage').textContent = '';
    playerNameInput.value = ''; // 入力欄をクリア
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
        await setDoc(doc(db, 'rankings', playerName), {
            score: score,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(), // Firebaseのサーバー時刻を使う
            name: playerName
        });
        document.getElementById('rankingMessage').innerHTML = `<strong style="color: #4caf50;">✨ 成功！${playerName}さんのスコアを記録しました！ ✨</strong>`;

    } catch (e) {
        console.error("Firebaseへのデータ書き込みエラー:", e);
        document.getElementById('rankingMessage').innerHTML = `<strong style="color: red;">❌ エラーが発生しました。ネットワーク接続を確認してください。</strong>`;
    }
}


// =============================================
// 🎧 イベントリスナー設定 (Input Handling)
// =============================================

// 1. スタートボタンのイベントハンドラ
startButton.addEventListener('click', startGame);

// 2. カゴの動き (マウス操作) の処理
document.getElementById('gameContainer').addEventListener('mousemove', (e) => {
    if (!isGameRunning) return;
    const rect = document.getElementById('gameContainer').getBoundingClientRect();
    // マウス座標からカゴが移動すべきX位置を計算し、更新関数を呼び出す
    const newMouseX = e.clientX - rect.left; 
    // カゴの新しい中心X座標を設定する（左端+幅/2）
    updateBasket(newMouseX - basket.width / 2); 
});

// 3. カゴの動き (タッチ操作) の処理 - スマホ対応
document.getElementById('gameContainer').addEventListener('touchmove', (e) => {
    if (!isGameRunning || e.touches.length === 0) return;
    const rect = document.getElementById('gameContainer').getBoundingClientRect();
    // タッチした指の位置を基準に計算
    const touchX = e.touches[0].clientX - rect.left; 
    updateBasket(touchX - basket.width / 2);
});

// 4. ランキング登録ボタンのイベントハンドラ
showRankingFormButton.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden'); // ゲームオーバー画面を隠す
    rankingForm.classList.remove('hidden'); // ランキングフォームを表示する
});


submitScoreButton.addEventListener('click', saveScoreToFirebase);

// 5. 初期起動時の準備
window.addEventListener('load', () => {
    initializeGameObjects();
    updateScoreDisplay();
});
