'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FirestoreDataConverter, DocumentData, QueryDocumentSnapshot, SnapshotOptions } from 'firebase/firestore';

import { db, auth } from '@/lib/firebaseConfig';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

import { CartoesHeader } from './CartoesHeader';
import { SummaryCards } from './SummaryCards';
import { ParcelasFinalizandoAlert } from './ParcelasFinalizandoAlert';
import { EmptyStateCartoes } from './EmptyStateCartoes';
import { CartoesTabs } from './CartoesTabs';
import { ChartsSection } from './ChartsSection';
import { PainelMensal } from './PainelMensal';

export type Compra = {
  id: string;
  cartaoId: string;
  nome: string;
  valor: number;
  parcelas: number;
  dataISO: string;
  paidInstallments?: number[];
};

export type Cartao = {
  id: string;
  nome: string;
  cor: string;
  limite: number;
  diaBomCompra: number;
  diaPagamento: number;
};

const asNum = (v: unknown, f = 0) => (typeof v === 'number' ? v : Number(v)) || f;
const asStr = (v: unknown, f = '') => (typeof v === 'string' ? v : String(v ?? f));

export default function CartoesCredito() {
  const [uid, setUid] = useState('');
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [activeTab, setActiveTab] = useState('');
  const [dialogNovoCartao, setDialogNovoCartao] = useState(false);
  const [dialogNovaCompra, setDialogNovaCompra] = useState(false);

  const [mesAtivo, setMesAtivo] = useState(() => new Date().toISOString().slice(0, 7));

  const [novoCartao, setNovoCartao] = useState({
    nome: '',
    cor: '#3b82f6',
    limite: '',
    diaBomCompra: '1',
    diaPagamento: '10',
  });

  const [novaCompra, setNovaCompra] = useState({
    nome: '',
    valor: '',
    parcelas: '1',
    dataISO: '',
  });

  const cores = [
    { nome: 'Azul', valor: '#3b82f6' },
    { nome: 'Verde', valor: '#10b981' },
    { nome: 'Roxo', valor: '#6366f1' },
    { nome: 'Rosa', valor: '#ec4899' },
    { nome: 'Laranja', valor: '#f97316' },
    { nome: 'Vermelho', valor: '#ef4444' },
    { nome: 'Ciano', valor: '#06b6d4' },
    { nome: 'Âmbar', valor: '#f59e0b' },
  ];

  const cartaoConverter: FirestoreDataConverter<Cartao> = {
    toFirestore({ id, ...rest }) {
      void id;
      return rest;
    },
    fromFirestore(s: QueryDocumentSnapshot, o: SnapshotOptions) {
      const d = s.data(o) as DocumentData;
      return {
        id: s.id,
        nome: asStr(d.nome),
        cor: asStr(d.cor, '#3b82f6'),
        limite: asNum(d.limite),
        diaBomCompra: Math.max(1, Math.min(31, asNum(d.diaBomCompra, 1))),
        diaPagamento: Math.max(1, Math.min(31, asNum(d.diaPagamento, 10))),
      };
    },
  };

  const compraConverter: FirestoreDataConverter<Compra> = {
    toFirestore({ id, ...rest }) {
      void id;
      return rest;
    },
    fromFirestore(s: QueryDocumentSnapshot, o: SnapshotOptions) {
      const d = s.data(o) as DocumentData;
      const paid = Array.isArray(d.paidInstallments)
        ? d.paidInstallments.map((x: unknown) => Number(x)).filter((n: number) => Number.isFinite(n))
        : [];
      return {
        id: s.id,
        cartaoId: asStr(d.cartaoId),
        nome: asStr(d.nome),
        valor: Math.max(0, asNum(d.valor)),
        parcelas: Math.max(1, asNum(d.parcelas, 1)),
        dataISO: asStr(d.dataISO, new Date().toISOString().slice(0, 10)),
        paidInstallments: paid,
      };
    },
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUid(u.uid);
        setAuthReady(true);
        setAuthError(null);
      } else {
        setAuthReady(true);
        setAuthError('auth/required');
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !uid || authError) return;

    const cartoesCol = collection(db, 'users', uid, 'cartoes').withConverter(cartaoConverter);
    const comprasCol = collection(db, 'users', uid, 'cartao_compras').withConverter(compraConverter);

    const u1 = onSnapshot(query(cartoesCol, orderBy('nome', 'asc')), (snap) => {
      const list = snap.docs.map((d) => d.data());
      setCartoes(list);
      if (!activeTab && list.length) setActiveTab(list[0].id);
      if (activeTab && list.length && !list.some((c) => c.id === activeTab)) setActiveTab(list[0].id);
    });

    const u2 = onSnapshot(query(comprasCol, orderBy('dataISO', 'asc')), (snap) => {
      setCompras(snap.docs.map((d) => d.data()));
    });

    return () => {
      u1();
      u2();
    };
  }, [authReady, uid, authError, activeTab]);

  const comprasByCartao = useMemo(() => {
    const m = new Map<string, Compra[]>();
    for (const c of compras) {
      if (!m.has(c.cartaoId)) m.set(c.cartaoId, []);
      m.get(c.cartaoId)!.push(c);
    }
    return m;
  }, [compras]);

  const totalPago = useMemo(() => {
    let s = 0;
    for (const c of compras) {
      const vp = c.valor / Math.max(1, c.parcelas);
      const paid = Array.isArray(c.paidInstallments) ? Array.from(new Set(c.paidInstallments)) : [];
      const paidCount = paid.filter((p) => p >= 1 && p <= c.parcelas).length;
      s += paidCount * vp;
    }
    return s;
  }, [compras]);

  const adicionarCartao = async () => {
    if (!uid) return;
    if (!novoCartao.nome.trim() || !novoCartao.limite) return;

    const limite = Math.max(0, Number(novoCartao.limite));
    const diaBomCompra = Math.max(1, Math.min(31, Number(novoCartao.diaBomCompra)));
    const diaPagamento = Math.max(1, Math.min(31, Number(novoCartao.diaPagamento)));

    const ref = await addDoc(collection(db, 'users', uid, 'cartoes'), {
      nome: novoCartao.nome.trim(),
      cor: novoCartao.cor,
      limite,
      diaBomCompra,
      diaPagamento,
      createdAt: serverTimestamp(),
    });

    setNovoCartao({
      nome: '',
      cor: '#3b82f6',
      limite: '',
      diaBomCompra: '1',
      diaPagamento: '10',
    });

    setDialogNovoCartao(false);
    setActiveTab(ref.id);
  };

  const adicionarCompra = async (cartaoId: string) => {
    if (!uid) return;
    if (!novaCompra.nome.trim() || !novaCompra.valor || !novaCompra.parcelas) return;

    const valor = Math.max(0, Number(novaCompra.valor));
    const parcelas = Math.max(1, Math.min(60, Number(novaCompra.parcelas)));
    const dataISO =
      novaCompra.dataISO && /^\d{4}-\d{2}-\d{2}$/.test(novaCompra.dataISO)
        ? novaCompra.dataISO
        : new Date().toISOString().slice(0, 10);

    await addDoc(collection(db, 'users', uid, 'cartao_compras'), {
      cartaoId,
      nome: novaCompra.nome.trim(),
      valor,
      parcelas,
      dataISO,
      paidInstallments: [],
      createdAt: serverTimestamp(),
    });

    setNovaCompra({ nome: '', valor: '', parcelas: '1', dataISO: '' });
    setDialogNovaCompra(false);
  };

  const removerCompra = async (id: string) => {
    if (!uid) return;
    await deleteDoc(doc(db, 'users', uid, 'cartao_compras', id));
  };

  const removerCartao = async (id: string) => {
    if (!uid) return;

    const q = query(collection(db, 'users', uid, 'cartao_compras'), where('cartaoId', '==', id));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    await deleteDoc(doc(db, 'users', uid, 'cartoes', id));

    const rest = cartoes.filter((c) => c.id !== id);
    setActiveTab(rest.length ? rest[0].id : '');
  };

  const toggleParcelaPaga = async (compraId: string, parcelaIndex: number, isPaga: boolean) => {
    if (!uid) return;
    const ref = doc(db, 'users', uid, 'cartao_compras', compraId);
    await updateDoc(ref, {
      paidInstallments: isPaga ? arrayRemove(parcelaIndex) : arrayUnion(parcelaIndex),
    });
  };

  if (!authReady) return null;
  if (authError) {
    return (
      <div className="p-6 text-sm text-red-600">
        Erro de autenticação: {authError}. Faça login para visualizar seus cartões.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CartoesHeader
        totalPago={totalPago}
        mesAtivo={mesAtivo}
        setMesAtivo={setMesAtivo}
        dialogNovoCartao={dialogNovoCartao}
        setDialogNovoCartao={setDialogNovoCartao}
        novoCartao={novoCartao}
        setNovoCartao={setNovoCartao}
        cores={cores}
        adicionarCartao={adicionarCartao}
      />

      <PainelMensal cartoes={cartoes} compras={compras} mesAtivo={mesAtivo} mesesFuturos={6} />

      <SummaryCards totalPago={totalPago} />

      <ParcelasFinalizandoAlert cartoes={cartoes} compras={compras} />

      {cartoes.length === 0 ? (
        <EmptyStateCartoes onCreate={() => setDialogNovoCartao(true)} />
      ) : (
        <CartoesTabs
          cartoes={cartoes}
          comprasByCartao={comprasByCartao}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          novaCompra={novaCompra}
          setNovaCompra={setNovaCompra}
          dialogNovaCompra={dialogNovaCompra}
          setDialogNovaCompra={setDialogNovaCompra}
          onAddCompra={adicionarCompra}
          onRemoveCompra={removerCompra}
          onRemoveCartao={removerCartao}
          onTogglePago={toggleParcelaPaga}
          mesAtivo={mesAtivo}
        />
      )}

      {cartoes.length > 0 && <ChartsSection cartoes={cartoes} compras={compras} />}
    </div>
  );
}
