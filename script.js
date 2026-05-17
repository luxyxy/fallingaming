// ファミコン風の色定義（ファミコンのカラー）
const FAMICOM_COLORS = {
  RED: "#ff0000",
  GREEN: "#00ff00",
  BLUE: "#0000ff",
  WHITE: "#ffffff",
  BLACK: "#000000",
  YELLOW: "#ffff00",
  GRAY: "#808080",
  PURPLE: "#800080"
};

// ゲーム設定
const GAME_DURATION = 15; // 秒
let score = 0;
let timer = GAME_DURATION;
let gameInterval;
let ballInterval;
let catcher = document.getElementById("catcher");
let ballContainer = document.getElementById("ball-container");
let finishScreen = document.getElementById("finish-screen");
let rankingForm = document.getElementById("ranking-form");
let playerNameInput = document.getElementById("player-name");
let submitRankBtn = document.getElementById("submit-rank");
let scoreDisplay = document.getElementById("score");
let timerDisplay = document.getElementById("timer");

// Firebase初期化
let app;
let db;
let user;

// ゲームスタート
function startGame() {
  score = 0;
  timer = GAME_DURATION;
  scoreDisplay.textContent = `スコア: ${score}`;
  timerDisplay.textContent = `タイマー: ${timer}`;

  // ボールの生成
  createBall();

  // タイマーを開始
  gameInterval = setInterval(() => {
    timer--;
    timerDisplay.textContent = `タイマー: ${timer}`;
    if (timer <= 0) {
      endGame();
    }
  }, 1000);

  // ボールの落下
  ballInterval = setInterval(() => {
    // ボールをランダムに生成
    createBall();
  }, 2000);

  // カゴの移動
  document.addEventListener("keydown", handleKeyPress);
  document.addEventListener("keyup", handleKeyUp);
}

// ボールを生成
function createBall() {
  const ball = document.createElement("div");
  ball.className = "ball";
  ball.style.position = "absolute";
  ball.style.width = "10%";
  ball.style.height = "10%";
  ball.style.background = FAMICOM_COLORS.GREEN;
  ball.style.border = "1px solid #000000";
  ball.style.borderRadius = "50%";
  ball.style.left = Math.random() * 80 + 10 + "%";
  ball.style.top = "-50px";
  ballContainer.appendChild(ball);

  // ボールの落下アニメーション
  let fallSpeed = 1;
  let fallTimer = setInterval(() => {
    const currentTop = parseInt(ball.style.top);
    if (currentTop > 100) {
      clearInterval(fallTimer);
      ball.style.top = `${currentTop + 10}px`;
      return;
    }
    ball.style.top = `${currentTop + 5}px`;
  }, 100);

  // カゴと衝突
  ball.addEventListener("click", () => {
    if (ball.classList.contains("caught")) return;
    ball.classList.add("caught");
    score += 10;
    scoreDisplay.textContent = `スコア: ${score}`;
    ball.style.animation = "none";
    ball.style.background = FAMICOM_COLORS.RED;
    ball.style.left = "50%";
    ball.style.top = "50%";
    ball.style.width = "50%";
    ball.style.height = "50%";
    ball.style.position = "relative";
    ball.style.transition = "all 0.5s ease";
    ball.style.zIndex = "1000";
    ball.style.opacity = "0";
    ball.style.pointerEvents = "none";

    // ボールを消す
    setTimeout(() => {
      ball.remove();
    }, 1000);
  });
}

// キーボード操作
function handleKeyPress(e) {
  if (e.key === "ArrowLeft") {
    catcher.style.left = "clamp(10%, 10%, 80%)";
  }
  if (e.key === "ArrowRight") {
    catcher.style.left = "clamp(10%, 10%, 80%)";
  }
  if (e.key === "ArrowUp") {
    // 上に移動（ここは無視）
  }
  if (e.key === "ArrowDown") {
    // 下に移動（ここは無視）
  }
}

function handleKeyUp(e) {
  if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
    // 何もしない（カゴは動かない）
  }
}

// ゲーム終了
function endGame() {
  clearInterval(gameInterval);
  clearInterval(ballInterval);

  finishScreen.style.display = "block";
  rankingForm.style.display = "block";

  // ユーザー名を取得
  const playerName = playerNameInput.value.trim();
  if (playerName) {
    // Firebaseに登録
    addRanking(playerName, score);
  } else {
    alert("名前を入力してください。");
  }
}

// ランキング登録
async function addRanking(playerName, score) {
  const db = getFirestore(app);
  const docRef = await addDoc(collection(db, "ranking"), {
    name: playerName,
    score: score,
    timestamp: serverTimestamp()
  });
  console.log("Document written with ID: ", docRef.id);
  alert(`登録完了！`);
}

// Firebase初期化
function initFirebase() {
  if (!window.firebase) {
    console.error("Firebase SDKが読み込まれていません");
    return;
  }

  app = initializeApp(firebaseConfig);
  db = getFirestore(app);

  // ユーザーのログイン状態を監視
  onAuthStateChanged(auth, (user) => {
    if (user) {
      user.idToken.then((token) => {
        console.log("ログイン済み: ", user.uid);
        user = user;
      });
    } else {
      console.log("ログインされていません");
    }
  });
}

// ランキングデータの取得（初期化）
function loadRankings() {
  const db = getFirestore(app);
  const snapshot = query(collection(db, "ranking"));
  const querySnapshot = getDocs(snapshot);
  querySnapshot.then((docs) => {
    console.log(docs);
  });
}

// ボタン押下時にスタート
submitRankBtn.addEventListener("click", () => {
  const name = playerNameInput.value.trim();
  if (name) {
    addRanking(name, score);
  }
});

// ゲームスタート
window.addEventListener("load", () => {
  initFirebase();
  startGame();
});
