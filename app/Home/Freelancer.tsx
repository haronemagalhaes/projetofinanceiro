'use client';

import { useEffect, useMemo, useRef, useState, startTransition } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus, Briefcase, Clock, CheckCircle, AlertCircle, Trash2, ReceiptText, Wallet,
} from 'lucide-react';

// Firebase
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
  serverTimestamp,
  getDocs,
  FirestoreDataConverter,
  Query,
  DocumentData,
  updateDoc, // << ADICIONADO
} from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';

// ---------- Tipos ----------
type StatusProjeto = 'Em andamento' | 'Concluído' | 'Pendente';

interface Projeto {
  id: string;
  userId: string;
  nome: string;
  cliente: string;
  valor: number;
  status: StatusProjeto;
  dataInicio: string;   // DD/MM/AAAA
  dataEntrega: string;  // DD/MM/AAAA
  createdAt?: unknown;
}

interface Despesa {
  id: string;
  userId: string;
  descricao: string;
  valor: number;
  data: string;         // DD/MM/AAAA
  projetoId?: string | null;
  createdAt?: unknown;
}

// ---------- Converters ----------
const projetoConverter: FirestoreDataConverter<Projeto> = {
  toFirestore(p: Projeto): DocumentData {
    const { id: _ignore, ...rest } = p;
    return rest;
  },
  fromFirestore(snapshot) {
    const d = snapshot.data() as DocumentData;
    return {
      id: snapshot.id,
      userId: String(d.userId ?? ''),
      nome: String(d.nome ?? ''),
      cliente: String(d.cliente ?? ''),
      valor: Number(d.valor ?? 0),
      status: (d.status as StatusProjeto) ?? 'Pendente',
      dataInicio: String(d.dataInicio ?? ''),
      dataEntrega: String(d.dataEntrega ?? ''),
      createdAt: d.createdAt,
    };
  },
};

const despesaConverter: FirestoreDataConverter<Despesa> = {
  toFirestore(x: Despesa): DocumentData {
    const { id: _ignore, ...rest } = x;
    return rest;
  },
  fromFirestore(snapshot) {
    const d = snapshot.data() as DocumentData;
    return {
      id: snapshot.id,
      userId: String(d.userId ?? ''),
      descricao: String(d.descricao ?? ''),
      valor: Number(d.valor ?? 0),
      data: String(d.data ?? ''),
      projetoId: d.projetoId ? String(d.projetoId) : null,
      createdAt: d.createdAt,
    };
  },
};

export default function Freelancer() {
  const [uid, setUid] = useState<string>('');
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const triedRef = useRef(false);

  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [dialogProjetoOpen, setDialogProjetoOpen] = useState(false);
  const [dialogDespesaOpen, setDialogDespesaOpen] = useState(false);

  const [novoProjeto, setNovoProjeto] = useState({
    nome: '', cliente: '', valor: '', dataInicio: '', dataEntrega: '',
  });
  const [novaDespesa, setNovaDespesa] = useState({
    descricao: '', valor: '', data: '', projetoId: '',
  });

  // Debug/estado de índice
  const [snapError, setSnapError] = useState<string | null>(null);
  const [usingFallbackQuery, setUsingFallbackQuery] = useState(false);

  // ---------- Auth anônimo ----------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          startTransition(() => {
            setUid(user.uid);
            setAuthReady(true);
            setAuthError(null);
          });
          return;
        }
        if (!triedRef.current) {
          triedRef.current = true;
          const cred = await signInAnonymously(auth);
          startTransition(() => {
            setUid(cred.user.uid);
            setAuthReady(true);
            setAuthError(null);
          });
        } else {
          startTransition(() => {
            setAuthReady(true);
            setAuthError('auth/anonymous-disabled-or-restricted');
          });
        }
      } catch (e) {
        const code = e instanceof FirebaseError ? e.code : 'auth/unknown';
        startTransition(() => {
          setAuthReady(true);
          setAuthError(code);
        });
      }
    });
    return () => unsub();
  }, []);

  // ---------- Listeners Firestore (com fallback se faltar índice) ----------
  useEffect(() => {
    if (!authReady || !!authError || !uid) return;

    setSnapError((prev) => (prev !== null ? null : prev));
    setUsingFallbackQuery((prev) => (prev ? false : prev));

    const projCol = collection(db, 'freelancer_projetos').withConverter(projetoConverter);
    const despCol = collection(db, 'freelancer_despesas').withConverter(despesaConverter);

    const makeQuery = (useOrder: boolean) => {
      const qProj: Query<Projeto> = useOrder
        ? query(projCol, where('userId', '==', uid), orderBy('createdAt', 'desc'))
        : query(projCol, where('userId', '==', uid));

      const qDesp: Query<Despesa> = useOrder
        ? query(despCol, where('userId', '==', uid), orderBy('createdAt', 'desc'))
        : query(despCol, where('userId', '==', uid));

      return { qProj, qDesp };
    };

    const subscribe = (useOrder: boolean) => {
      const { qProj, qDesp } = makeQuery(useOrder);

      const unsubProj = onSnapshot(
        qProj,
        (snap) => {
          const rows = snap.docs.map((d) => d.data());
          startTransition(() => setProjetos(rows));
        },
        (err) => {
          const code = err instanceof FirebaseError ? err.code : String(err);
          startTransition(() => setSnapError(code));
          if (code === 'failed-precondition' && useOrder) {
            startTransition(() => setUsingFallbackQuery(true));
            cleanup();
            resubscribeWithoutOrder();
          }
        },
      );

      const unsubDesp = onSnapshot(
        qDesp,
        (snap) => {
          const rows = snap.docs.map((d) => d.data());
          startTransition(() => setDespesas(rows));
        },
        (err) => {
          const code = err instanceof FirebaseError ? err.code : String(err);
          startTransition(() => setSnapError(code));
          if (code === 'failed-precondition' && useOrder) {
            startTransition(() => setUsingFallbackQuery(true));
            cleanup();
            resubscribeWithoutOrder();
          }
        },
      );

      const cleanup = () => {
        try { unsubProj(); } catch {}
        try { unsubDesp(); } catch {}
      };

      const resubscribeWithoutOrder = () => {
        subscribe(false);
      };

      return { cleanup };
    };

    const { cleanup } = subscribe(true);
    return () => cleanup();
  }, [uid, authReady, authError]);

  // ---------- Actions ----------
  const adicionarProjeto = async () => {
    if (!uid) return;
    if (!novoProjeto.nome || !novoProjeto.cliente || !novoProjeto.valor) return;

    await addDoc(collection(db, 'freelancer_projetos'), {
      userId: uid,
      nome: novoProjeto.nome.trim(),
      cliente: novoProjeto.cliente.trim(),
      valor: Math.max(0, parseFloat(novoProjeto.valor) || 0),
      status: 'Pendente' as StatusProjeto,
      dataInicio: novoProjeto.dataInicio || new Date().toLocaleDateString('pt-BR'),
      dataEntrega: novoProjeto.dataEntrega || '',
      createdAt: serverTimestamp(),
    });

    setNovoProjeto({ nome: '', cliente: '', valor: '', dataInicio: '', dataEntrega: '' });
    setDialogProjetoOpen(false);
  };

  const adicionarDespesa = async () => {
    if (!uid) return;
    if (!novaDespesa.descricao || !novaDespesa.valor) return;

    await addDoc(collection(db, 'freelancer_despesas'), {
      userId: uid,
      descricao: novaDespesa.descricao.trim(),
      valor: Math.max(0, parseFloat(novaDespesa.valor) || 0),
      data: novaDespesa.data || new Date().toLocaleDateString('pt-BR'),
      projetoId: novaDespesa.projetoId || null,
      createdAt: serverTimestamp(),
    });

    setNovaDespesa({ descricao: '', valor: '', data: '', projetoId: '' });
    setDialogDespesaOpen(false);
  };

  const removerDespesa = async (id: string) => {
    await deleteDoc(doc(db, 'freelancer_despesas', id));
  };

  const removerProjeto = async (projetoId: string) => {
    if (!uid) return;

    const qd = query(
      collection(db, 'freelancer_despesas'),
      where('userId', '==', uid),
      where('projetoId', '==', projetoId),
    );
    const snap = await getDocs(qd);
    await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, 'freelancer_despesas', d.id))));
    await deleteDoc(doc(db, 'freelancer_projetos', projetoId));
  };

  // >>> NOVO: atualizar status direto pela UI
  const atualizarStatusProjeto = async (projetoId: string, novoStatus: StatusProjeto) => {
    await updateDoc(doc(db, 'freelancer_projetos', projetoId), { status: novoStatus });
  };

  // ---------- Derivados ----------
  const totalGanho = useMemo(
    () => projetos.filter((p) => p.status === 'Concluído').reduce((acc, p) => acc + p.valor, 0),
    [projetos],
  );
  const totalEmAndamento = useMemo(
    () => projetos.filter((p) => p.status === 'Em andamento').reduce((acc, p) => acc + p.valor, 0),
    [projetos],
  );
  const totalPendente = useMemo(
    () => projetos.filter((p) => p.status === 'Pendente').reduce((acc, p) => acc + p.valor, 0),
    [projetos],
  );
  const totalDespesas = useMemo(() => despesas.reduce((acc, d) => acc + d.valor, 0), [despesas]);
  const lucroLiquido = Math.max(0, totalGanho - totalDespesas);

  const dadosPizza = [
    { nome: 'Concluído', valor: totalGanho, cor: '#10b981' },
    { nome: 'Em andamento', valor: totalEmAndamento, cor: '#3b82f6' },
    { nome: 'Pendente', valor: totalPendente, cor: '#f59e0b' },
  ];

  const getStatusBadge = (status: StatusProjeto) => {
    switch (status) {
      case 'Concluído':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Concluído
          </Badge>
        );
      case 'Em andamento':
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-300">
            <Clock className="w-3 h-3 mr-1" />
            Em andamento
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-300">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        );
    }
  };

  // ---------- UI de estados ----------
  if (!authReady) {
    return <div className="p-8 text-center text-slate-500">Iniciando sessão segura…</div>;
  }
  if (authError) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 font-medium">
          Falha ao autenticar: {authError}
        </p>
        <p className="text-slate-600 mt-2 text-sm">
          Verifique se o método <b>Anônimo</b> está ativado em Authentication → Método de login,
          se <b>localhost</b> está em Domínios autorizados e se a <b>API key</b> não está
          bloqueada para este domínio.
        </p>
      </div>
    );
  }

  // ---------- UI principal ----------
  return (
    <div className="space-y-6">
      {/* Barra de debug (remova se não quiser) */}
      <div className="text-xs text-slate-600 p-2 border rounded mb-2 flex flex-wrap gap-3">
        <span>UID atual: <span className="font-mono">{uid || '(vazio)'}</span></span>
        {snapError && <span className="text-red-600">Snapshot error: {snapError}</span>}
        {usingFallbackQuery && (
          <span className="text-amber-600">
            Usando fallback sem <code>orderBy(&apos;createdAt&apos;)</code> (crie/aguarde índice: userId ASC + createdAt DESC).
          </span>
        )}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-slate-800 dark:text-slate-100">Painel do Freelancer</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Acompanhe projetos, receitas, despesas e lucro líquido
          </p>
        </div>

        <div className="flex gap-2">
          {/* Novo Projeto */}
          <Button
            className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
            onClick={() => setDialogProjetoOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Projeto
          </Button>
          <Dialog open={dialogProjetoOpen} onOpenChange={setDialogProjetoOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Novo Projeto</DialogTitle>
                <DialogDescription>Preencha os dados do novo projeto</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="nomeProj">Nome do Projeto</Label>
                  <Input
                    id="nomeProj"
                    value={novoProjeto.nome}
                    onChange={(e) => setNovoProjeto({ ...novoProjeto, nome: e.target.value })}
                    placeholder="Ex: Website E-commerce"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clienteProj">Cliente</Label>
                  <Input
                    id="clienteProj"
                    value={novoProjeto.cliente}
                    onChange={(e) => setNovoProjeto({ ...novoProjeto, cliente: e.target.value })}
                    placeholder="Nome do cliente"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valorProj">Valor (R$)</Label>
                  <Input
                    id="valorProj"
                    type="number"
                    value={novoProjeto.valor}
                    onChange={(e) => setNovoProjeto({ ...novoProjeto, valor: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="inicioProj">Data Início</Label>
                    <Input
                      id="inicioProj"
                      value={novoProjeto.dataInicio}
                      onChange={(e) => setNovoProjeto({ ...novoProjeto, dataInicio: e.target.value })}
                      placeholder="DD/MM/AAAA"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="entregaProj">Data Entrega</Label>
                    <Input
                      id="entregaProj"
                      value={novoProjeto.dataEntrega}
                      onChange={(e) => setNovoProjeto({ ...novoProjeto, dataEntrega: e.target.value })}
                      placeholder="DD/MM/AAAA"
                    />
                  </div>
                </div>
                <Button onClick={adicionarProjeto} className="w-full bg-gradient-to-r from-teal-500 to-teal-600">
                  Adicionar Projeto
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Nova Despesa */}
          <Button
            className="bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700"
            onClick={() => setDialogDespesaOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Despesa
          </Button>
          <Dialog open={dialogDespesaOpen} onOpenChange={setDialogDespesaOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Despesa</DialogTitle>
                <DialogDescription>Abate do total para calcular lucro líquido</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="descDesp">Descrição</Label>
                  <Input
                    id="descDesp"
                    value={novaDespesa.descricao}
                    onChange={(e) => setNovaDespesa({ ...novaDespesa, descricao: e.target.value })}
                    placeholder="Ex: Domínio, Ferramentas, Impostos..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valorDesp">Valor (R$)</Label>
                  <Input
                    id="valorDesp"
                    type="number"
                    value={novaDespesa.valor}
                    onChange={(e) => setNovaDespesa({ ...novaDespesa, valor: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="dataDesp">Data</Label>
                    <Input
                      id="dataDesp"
                      value={novaDespesa.data}
                      onChange={(e) => setNovaDespesa({ ...novaDespesa, data: e.target.value })}
                      placeholder="DD/MM/AAAA"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vincular a Projeto (opcional)</Label>
                    <select
                      className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none ring-0 dark:bg-slate-900 dark:border-slate-700"
                      value={novaDespesa.projetoId}
                      onChange={(e) => setNovaDespesa({ ...novaDespesa, projetoId: e.target.value })}
                    >
                      <option value="">— Despesa geral —</option>
                      {projetos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <Button onClick={adicionarDespesa} className="w-full bg-gradient-to-r from-rose-500 to-rose-600">
                  Adicionar Despesa
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
              <Badge className="bg-emerald-600">Receita Bruta</Badge>
            </div>
            <p className="text-slate-600 text-sm mb-1">Projetos concluídos</p>
            <p className="text-slate-900">R$ {totalGanho.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>

        <Card className="border-rose-200 dark:border-rose-900 bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/30 dark:to-orange-950/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <ReceiptText className="w-8 h-8 text-rose-600" />
              <Badge className="bg-rose-600">Despesas</Badge>
            </div>
            <p className="text-slate-600 text-sm mb-1">Custos do freelance</p>
            <p className="text-slate-900">R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 dark:border-purple-900 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Wallet className="w-8 h-8 text-purple-600" />
              <Badge className="bg-purple-600">Lucro Líquido</Badge>
            </div>
            <p className="text-slate-600 text-sm mb-1">{'Bruto \u2212 Despesas'}</p>
            <p className="text-slate-900">R$ {lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
      </div>

      {/* Projetos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2 dark:bg-slate-800/50 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="dark:text-slate-100">Projetos</CardTitle>
            <CardDescription className="dark:text-slate-400">Lista de projetos e valores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Entrega</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projetos.map((projeto) => (
                    <TableRow key={projeto.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-teal-600" />
                          {projeto.nome}
                        </div>
                      </TableCell>
                      <TableCell>{projeto.cliente}</TableCell>
                      <TableCell className="text-teal-700">
                        R$ {projeto.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-slate-600">{projeto.dataInicio}</TableCell>
                      <TableCell className="text-slate-600">{projeto.dataEntrega}</TableCell>
                      <TableCell>
                        {/* Badge + seletor para alterar status */}
                        <div className="flex items-center gap-2">
                          {getStatusBadge(projeto.status)}
                          <select
                            aria-label="Alterar status"
                            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs outline-none dark:bg-slate-900 dark:border-slate-700"
                            value={projeto.status}
                            onChange={(e) => atualizarStatusProjeto(projeto.id, e.target.value as StatusProjeto)}
                          >
                            <option value="Pendente">Pendente</option>
                            <option value="Em andamento">Em andamento</option>
                            <option value="Concluído">Concluído</option>
                          </select>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removerProjeto(projeto.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          aria-label="Remover projeto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pizza por status */}
        <Card className="lg:col-span-2 dark:bg-slate-800/50 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="dark:text-slate-100">Distribuição por Status</CardTitle>
            <CardDescription className="dark:text-slate-400">Valores por estado dos projetos</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dadosPizza}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ nome, percent }) => `${nome} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="valor"
                >
                  {dadosPizza.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.cor} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) =>
                    `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                  }
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Despesas */}
      <Card className="dark:bg-slate-800/50 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="dark:text-slate-100">Despesas do Freelance</CardTitle>
          <CardDescription className="dark:text-slate-400">
            Custos vinculados (ou não) a projetos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {despesas.length === 0 ? (
            <div className="text-center py-8 text-slate-500">Nenhuma despesa registrada</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {despesas.map((d) => {
                    const proj = d.projetoId ? projetos.find((p) => p.id === d.projetoId) : undefined;
                    return (
                      <TableRow key={d.id}>
                        <TableCell>{d.descricao}</TableCell>
                        <TableCell className="text-slate-600">{proj ? proj.nome : '—'}</TableCell>
                        <TableCell className="text-slate-600">{d.data}</TableCell>
                        <TableCell className="text-rose-700">
                          R$ {d.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removerDespesa(d.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            aria-label="Remover despesa"
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
    </div>
  );
}
