// firebase-config.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCNgQe1bNjJbjiZOZiExkTMXOmaYRwkkIk",
  authDomain: "fallingaming-4fa8b.firebaseapp.com",
  projectId: "fallingaming-4fa8b",
  storageBucket: "fallingaming-4fa8b.firebasestorage.app",
  messagingSenderId: "570079611483",
  appId: "1:570079611483:web:8d43ba9562e8d9f8334d7e"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
