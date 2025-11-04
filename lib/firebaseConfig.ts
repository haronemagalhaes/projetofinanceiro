// lib/firebaseConfig.ts
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyD4X4A6bSe--jevVKd9WDgL7BkXtozjz8",
  authDomain: "projetofinanceiro-ad111.firebaseapp.com",
  projectId: "projetofinanceiro-ad111",
  storageBucket: "projetofinanceiro-ad111.appspot.com",
  messagingSenderId: "964833485398",
  appId: "1:964833485398:web:8615e30b9da75077fc91f7"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

export default app;
