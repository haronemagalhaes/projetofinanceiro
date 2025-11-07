// lib/firebaseConfig.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
const firebaseConfig = {
  apiKey: "AIzaSyD4X4A6bSe--jevV0Kd9WDgL7BkXtozjz8",
  authDomain: "projetofinanceiro-ad111.firebaseapp.com",
  projectId: "projetofinanceiro-ad111",
  storageBucket: "projetofinanceiro-ad111.firebasestorage.app",
  messagingSenderId: "964833485398",
  appId: "1:964833485398:web:8615e30b9da75077fc91f7"
};


const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;


