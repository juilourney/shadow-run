import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyBZVOW6MPd4MB3y2ZqeMTX28dRUFHCWjwM",
  authDomain: "gamerun-14662.firebaseapp.com",
  projectId: "gamerun-14662",
  storageBucket: "gamerun-14662.firebasestorage.app",
  messagingSenderId: "953167143973",
  appId: "1:953167143973:web:37cc949dbfca449d5e0bcc",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
