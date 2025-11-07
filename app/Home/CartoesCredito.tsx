'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { CreditCard, AlertTriangle, TrendingUp, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import type {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  DocumentData,
  SnapshotOptions,
} from 'firebase/firestore';

import { db, auth } from '@/lib/firebaseConfig';
import {
  collection, addDoc, deleteDoc, doc, onSnapshot, query, where, orderBy,
  getDocs, serverTimestamp,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

/* -------------------- Tipos -------------------- */
type Compra = {
  id: string;
  cartaoId: string;
  nome: string;
  valor: number;
  parcelas: number;
  parcelaAtual: number;
  dataISO: string;
};

type Cartao = {
  id: string;
  nome: string;
  cor: string;
  limite: number;
};

/* -------------------- Utils seguros -------------------- */
const asNum = (v: unknown, fallback = 0) => (typeof v === 'number' ? v : Number(v)) || fallback;
const asStr = (v: unknown, fallback = '') => (typeof v === 'string' ? v : String(v ?? fallback));

export default function CartoesCredito() {
  const [uid, setUid] = useState<string>('');
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [dialogNovoCartao, setDialogNovoCartao] = useState(false);
  const [dialogNovaCompra, setDialogNovaCompra] = useState(false);

  const [novoCartao, setNovoCartao] = useState<{ nome: string; cor: string; limite: string }>({
    nome: '',
    cor: '#3b82f6',
    limite: '',
  });
  const [novaCompra, setNovaCompra] = useState<{ nome: string; valor: string; parcelas: string; dataISO: string }>({
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

  /* -------------------- Converters -------------------- */
  const cartaoConverter: FirestoreDataConverter<Cartao> = {
    toFirestore(c: Cartao): DocumentData {
      const { id, ...rest } = c;
      void id;
      return rest;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Cartao {
      const d = snapshot.data(options) as DocumentData;
      return {
        id: snapshot.id,
        nome: asStr(d.nome),
        cor: asStr(d.cor, '#3b82f6'),
        limite: asNum(d.limite),
      };
    },
  };

  const compraConverter: FirestoreDataConverter<Compra> = {
    toFirestore(c: Compra): DocumentData {
      const { id, ...rest } = c;
      void id;
      return rest;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Compra {
      const d = snapshot.data(options) as DocumentData;
      return {
        id: snapshot.id,
        cartaoId: asStr(d.cartaoId),
        nome: asStr(d.nome),
        valor: asNum(d.valor),
        parcelas: Math.max(1, asNum(d.parcelas, 1)),
        parcelaAtual: Math.max(1, asNum(d.parcelaAtual, 1)),
        dataISO: asStr(d.dataISO, new Date().toISOString().slice(0, 10)),
      };
    },
  };

  /* -------------------- Auth -------------------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
        setAuthReady(true);
        setAuthError(null);
      } else {
        setAuthReady(true);
        setAuthError('auth/required');
      }
    });
    return () => unsub();
  }, []);

  /* -------------------- Listeners por usuário -------------------- */
  useEffect(() => {
    if (!authReady || !uid || authError) return;

    const cartoesCol = collection(db, 'users', uid, 'cartoes').withConverter(cartaoConverter);
    const comprasCol = collection(db, 'users', uid, 'cartao_compras').withConverter(compraConverter);

    const unsubCartoes = onSnapshot(query(cartoesCol, orderBy('nome', 'asc')), (snap) => {
      const list = snap.docs.map((d) => d.data());
      setCartoes(list);
      if (!activeTab && list.length) setActiveTab(list[0].id);
    });

    const unsubCompras = onSnapshot(query(comprasCol, orderBy('dataISO', 'asc')), (snap) => {
      const list = snap.docs.map((d) => d.data());
      setCompras(list);
    });

    return () => {
      unsubCartoes();
      unsubCompras();
    };
  }, [authReady, authError, uid, activeTab]);

  /* -------------------- Derivados -------------------- */
  const comprasByCartao = useMemo(() => {
    const m = new Map<string, Compra[]>();
    for (const c of compras) {
      if (!m.has(c.cartaoId)) m.set(c.cartaoId, []);
      m.get(c.cartaoId)!.push(c);
    }
    return m;
  }, [compras]);

  const usadoPorCartao = useMemo(() => {
    const m = new Map<string, number>();
    for (const card of cartoes) m.set(card.id, 0);
    for (const c of compras) {
      const vParcela = c.valor / Math.max(1, c.parcelas);
      m.set(c.cartaoId, (m.get(c.cartaoId) || 0) + vParcela);
    }
    return m;
  }, [cartoes, compras]);

  const totalGastoCartoes = Array.from(usadoPorCartao.values()).reduce((a, b) => a + b, 0);
  const totalLimite = cartoes.reduce((acc, c) => acc + c.limite, 0);
  const percentualUso = totalLimite > 0 ? (totalGastoCartoes / totalLimite) * 100 : 0;

  const comprasFinalizando = useMemo(() => {
    return compras
      .filter((x) => x.parcelas > 1 && x.parcelas - x.parcelaAtual <= 2)
      .sort((a, b) => (a.parcelas - a.parcelaAtual) - (b.parcelas - b.parcelaAtual))
      .map((c) => ({
        ...c,
        cartao: cartoes.find((k) => k.id === c.cartaoId)?.nome || 'Cartão',
      }));
  }, [compras, cartoes]);

  const dadosGastoPorCartao = cartoes.map((c) => {
    const usado = usadoPorCartao.get(c.id) || 0;
    return {
      nome: c.nome,
      gasto: usado,
      disponivel: Math.max(0, c.limite - usado),
    };
  });

  const dadosPizza: Array<{ nome: string; valor: number; cor: string }> = cartoes
    .map((c) => ({ nome: c.nome, valor: usadoPorCartao.get(c.id) || 0, cor: c.cor }))
    .filter((x) => x.valor > 0);

  /* -------------------- Ações -------------------- */
  const adicionarCartao = async () => {
    if (!uid) return;
    if (!novoCartao.nome || !novoCartao.limite) return;
    const limite = Math.max(0, parseFloat(novoCartao.limite) || 0);
    try {
      const ref = await addDoc(collection(db, 'users', uid, 'cartoes'), {
        nome: novoCartao.nome.trim(),
        cor: novoCartao.cor,
        limite,
        createdAt: serverTimestamp(),
      });
      setNovoCartao({ nome: '', cor: '#3b82f6', limite: '' });
      setDialogNovoCartao(false);
      setActiveTab(ref.id);
    } catch (e) {
      console.error('Erro ao criar cartão:', e);
    }
  };

  const adicionarCompra = async (cartaoId: string) => {
    if (!uid) return;
    if (!novaCompra.nome || !novaCompra.valor || !novaCompra.parcelas) return;
    const total = Math.max(0, parseFloat(novaCompra.valor) || 0);
    const qtdParcelas = Math.max(1, parseInt(novaCompra.parcelas) || 1);
    const dataISO =
      novaCompra.dataISO && /^\d{4}-\d{2}-\d{2}$/.test(novaCompra.dataISO)
        ? novaCompra.dataISO
        : new Date().toISOString().slice(0, 10);

    try {
      await addDoc(collection(db, 'users', uid, 'cartao_compras'), {
        cartaoId,
        nome: novaCompra.nome.trim(),
        valor: total,
        parcelas: qtdParcelas,
        parcelaAtual: 1, // primeira parcela já no mês corrente
        dataISO,
        createdAt: serverTimestamp(),
      });
      setNovaCompra({ nome: '', valor: '', parcelas: '1', dataISO: '' });
      setDialogNovaCompra(false);
    } catch (e) {
      console.error('Erro ao adicionar compra:', e);
    }
  };

  const removerCompra = async (compraId: string) => {
    if (!uid) return;
    try {
      await deleteDoc(doc(db, 'users', uid, 'cartao_compras', compraId));
    } catch (e) {
      console.error('Erro ao remover compra:', e);
    }
  };

  const removerCartao = async (cartaoId: string) => {
    if (!uid) return;
    try {
      const q = query(collection(db, 'users', uid, 'cartao_compras'), where('cartaoId', '==', cartaoId));
      const snap = await getDocs(q);
      const deletions = snap.docs.map((d) => deleteDoc(doc(db, 'users', uid, 'cartao_compras', d.id)));
      await Promise.all(deletions);

      await deleteDoc(doc(db, 'users', uid, 'cartoes', cartaoId));

      const rest = cartoes.filter((c) => c.id !== cartaoId);
      if (rest.length) setActiveTab(rest[0].id);
      else setActiveTab('');
    } catch (e) {
      console.error('Erro ao remover cartão:', e);
    }
  };

  /* -------------------- Render -------------------- */
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-slate-800 dark:text-slate-100">Cartões de Crédito</h2>
          <p className="text-slate-600 dark:text-slate-400">Gerencie seus cartões e compras parceladas</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-linear-to-r from-blue-500 to-blue-600 text-white px-4 py-2">
            Total Gasto (mês):{' '}
            {totalGastoCartoes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </Badge>

          <Dialog open={dialogNovoCartao} onOpenChange={setDialogNovoCartao}>
            <DialogTrigger asChild>
              <Button className="bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Novo Cartão
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Novo Cartão</DialogTitle>
                <DialogDescription>Crie um novo cartão de crédito</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do Cartão</Label>
                  <Input
                    placeholder="Ex: Nubank, Black..."
                    value={novoCartao.nome}
                    onChange={(e) => setNovoCartao({ ...novoCartao, nome: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Limite (R$)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={novoCartao.limite}
                    onChange={(e) => setNovoCartao({ ...novoCartao, limite: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor do Cartão</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {cores.map((cor) => (
                      <button
                        key={cor.valor}
                        className={`h-12 rounded-lg border-2 transition-all ${novoCartao.cor === cor.valor ? 'border-slate-900 scale-105' : 'border-slate-200'
                          }`}
                        style={{ backgroundColor: cor.valor }}
                        onClick={() => setNovoCartao({ ...novoCartao, cor: cor.valor })}
                        aria-label={`Selecionar cor ${cor.nome}`}
                      />
                    ))}
                  </div>
                </div>
                <Button onClick={adicionarCartao} className="w-full bg-linear-to-r from-blue-500 to-blue-600">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Criar Cartão
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-blue-200 dark:border-blue-900 bg-linear-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-slate-600 text-sm">Total Utilizado (mês)</p>
                <p className="text-slate-900">
                  {totalGastoCartoes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 dark:border-emerald-900 bg-linear-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-emerald-100 rounded-xl">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-slate-600 text-sm">Limite Total</p>
                <p className="text-slate-900">
                  {totalLimite.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 dark:border-purple-900 bg-linear-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-purple-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-slate-600 text-sm">Uso do Limite</p>
                <p className="text-slate-900">{percentualUso.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {comprasFinalizando.length > 0 && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Parcelas prestes a finalizar</AlertTitle>
          <AlertDescription className="text-amber-700">
            <ul className="mt-2 space-y-1">
              {comprasFinalizando.map((c) => (
                <li key={c.id}>
                  <strong>{c.nome}</strong> ({c.cartao}) — faltam {c.parcelas - c.parcelaAtual} de {c.parcelas}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {cartoes.length === 0 ? (
        <Card className="border-dashed border-2 dark:bg-slate-800/50 dark:border-slate-700">
          <CardContent className="p-12 text-center">
            <CreditCard className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-slate-600 dark:text-slate-300 mb-2">Nenhum cartão cadastrado</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">Crie seu primeiro cartão</p>
            <Button onClick={() => setDialogNovoCartao(true)} className="bg-linear-to-r from-blue-500 to-blue-600">
              <Plus className="w-4 h-4 mr-2" /> Criar Primeiro Cartão
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList
            className="grid w-full gap-2 bg-white/80 p-2 rounded-xl"
            style={{ gridTemplateColumns: `repeat(${cartoes.length}, minmax(0, 1fr))` }}
          >
            {cartoes.map((cartao) => {
              const isActive = activeTab === cartao.id;
              return (
                <TabsTrigger
                  key={cartao.id}
                  value={cartao.id}
                  className="transition-colors data-[state=active]:text-white"
                  style={isActive ? { background: cartao.cor, color: '#fff' } : { background: 'transparent' }}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {cartao.nome}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {cartoes.map((cartao) => {
            const comprasDoCartao = comprasByCartao.get(cartao.id) || [];
            const utilizado = usadoPorCartao.get(cartao.id) || 0;
            return (
              <TabsContent key={cartao.id} value={cartao.id} className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-16 h-16 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${cartao.cor}20` }}
                        >
                          <CreditCard className="w-8 h-8" style={{ color: cartao.cor }} />
                        </div>
                        <div>
                          <h3 className="text-slate-800">{cartao.nome}</h3>
                          <p className="text-slate-600">
                            {utilizado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} de{' '}
                            {cartao.limite.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-slate-600 text-sm">Disponível</p>
                          <p className="text-emerald-700">
                            {Math.max(0, cartao.limite - utilizado).toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removerCartao(cartao.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          aria-label="Remover cartão"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <div className="w-full bg-slate-200 rounded-full h-3">
                        <div
                          className="h-3 rounded-full transition-all"
                          style={{
                            width: `${Math.min((utilizado / Math.max(1, cartao.limite)) * 100, 100)}%`,
                            backgroundColor: cartao.cor,
                          }}
                        />
                      </div>
                      <p className="text-slate-500 text-sm mt-2">
                        {((utilizado / Math.max(1, cartao.limite)) * 100).toFixed(1)}% do limite utilizado
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="dark:bg-slate-800/50 dark:border-slate-700">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Compras — {cartao.nome}</CardTitle>
                        <CardDescription>Detalhamento de todas as compras</CardDescription>
                      </div>
                      <Dialog open={dialogNovaCompra} onOpenChange={setDialogNovaCompra}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            className="bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                          >
                            <ShoppingBag className="w-4 h-4 mr-2" />
                            Adicionar Compra
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Nova Compra — {cartao.nome}</DialogTitle>
                            <DialogDescription>Registre uma nova compra neste cartão</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Descrição</Label>
                              <Input
                                placeholder="Ex: Notebook, Supermercado..."
                                value={novaCompra.nome}
                                onChange={(e) => setNovaCompra({ ...novaCompra, nome: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Valor Total (R$)</Label>
                              <Input
                                type="number"
                                placeholder="0.00"
                                value={novaCompra.valor}
                                onChange={(e) => setNovaCompra({ ...novaCompra, valor: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Número de Parcelas</Label>
                              <Select
                                value={novaCompra.parcelas}
                                onValueChange={(v) => setNovaCompra({ ...novaCompra, parcelas: v })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 24 }, (_, i) => (i + 1).toString()).map((p) => (
                                    <SelectItem key={p} value={p}>
                                      {p}x
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Data da Compra</Label>
                              <Input
                                type="date"
                                value={novaCompra.dataISO}
                                onChange={(e) => setNovaCompra({ ...novaCompra, dataISO: e.target.value })}
                              />
                            </div>

                            {novaCompra.valor && novaCompra.parcelas && (
                              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-slate-700 text-sm">
                                  <strong>Valor da parcela:</strong>{' '}
                                  {(
                                    Math.max(0, parseFloat(novaCompra.valor) || 0) /
                                    Math.max(1, parseInt(novaCompra.parcelas) || 1)
                                  ).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                                <p className="text-slate-600 text-xs mt-1">
                                  A 1ª parcela já conta para o mês atual (parcelaAtual = 1).
                                </p>
                              </div>
                            )}

                            <Button
                              onClick={() => adicionarCompra(cartao.id)}
                              className="w-full bg-linear-to-r from-emerald-500 to-emerald-600"
                            >
                              <ShoppingBag className="w-4 h-4 mr-2" />
                              Registrar Compra
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {comprasDoCartao.length === 0 ? (
                      <div className="text-center py-8">
                        <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">Nenhuma compra registrada neste cartão</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Descrição</TableHead>
                              <TableHead>Valor Total</TableHead>
                              <TableHead>Parcelas</TableHead>
                              <TableHead>Valor Parcela</TableHead>
                              <TableHead>Data</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {comprasDoCartao.map((compra) => {
                              const valorParcela = compra.valor / Math.max(1, compra.parcelas);
                              const faltam = compra.parcelas - compra.parcelaAtual;
                              return (
                                <TableRow key={compra.id}>
                                  <TableCell>{compra.nome}</TableCell>
                                  <TableCell>
                                    {compra.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </TableCell>
                                  <TableCell>{compra.parcelaAtual}/{compra.parcelas}</TableCell>
                                  <TableCell>
                                    {valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </TableCell>
                                  <TableCell className="text-slate-600">
                                    {compra.dataISO.split('-').reverse().join('/')}
                                  </TableCell>
                                  <TableCell>
                                    {faltam <= 0 ? (
                                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">Quitado</Badge>
                                    ) : faltam <= 2 ? (
                                      <Badge className="bg-amber-100 text-amber-700 border-amber-300">Finalizando</Badge>
                                    ) : (
                                      <Badge className="bg-blue-100 text-blue-700 border-blue-300">Ativo</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removerCompra(compra.id)}
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                      aria-label="Remover compra"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      {/* ====== Gráficos ====== */}
      {cartoes.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Gastos por Cartão</CardTitle>
              <CardDescription>Utilizado (mês) vs Disponível</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosGastoPorCartao}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="nome" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    formatter={(value: number | string) =>
                      typeof value === 'number'
                        ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                        : value
                    }
                  />
                  <Legend />
                  <Bar dataKey="gasto" fill="#ef4444" name="Gasto (mês)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="disponivel" fill="#10b981" name="Disponível" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Gastos</CardTitle>
              <CardDescription>Proporção por cartão (mês)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dadosPizza}           // [{ nome, valor, cor }]
                    dataKey="valor"
                    nameKey="nome"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    isAnimationActive={false}
                  >
                    {dadosPizza.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.cor} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number | string) =>
                      typeof value === 'number'
                        ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                        : value
                    }
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
