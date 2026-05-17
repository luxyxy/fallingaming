// Firebaseの設定
const firebaseConfig = {
  apiKey: "AIzaSyCNgQe1bNjJbjiZOZiExkTMXOmaYRwkkIk",
  authDomain: "fallingaming-4fa8b.firebaseapp.com",
  projectId: "fallingaming-4fa8b",
  storageBucket: "fallingaming-4fa8b.firebasestorage.app",
  messagingSenderId: "570079611483",
  appId: "1:570079611483:web:8d43ba9562e8d9f8334d7e"
};

// Firebaseの初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ランキングデータの取得（初期化）
function loadRankings() {
  const db = getFirestore(app);
  const snapshot = query(collection(db, "ranking"));
  const querySnapshot = getDocs(snapshot);
  querySnapshot.then((docs) => {
    console.log("ランキング取得完了:", docs);
  });
}

// ファイアベースに接続するための関数
export { app, auth, db };
