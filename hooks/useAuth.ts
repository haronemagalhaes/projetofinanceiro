"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebaseClients";

type AuthState = {
  user: User | null;
  uid: string | null;   // ⬅️ adiciona uid aqui
  loading: boolean;
};

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    uid: null,
    loading: true,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setState({ user: u, uid: u?.uid ?? null, loading: false });
    });
    return () => unsub();
  }, []);

  return state;
}
