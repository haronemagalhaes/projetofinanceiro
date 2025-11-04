'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PiggyBank, Target, TrendingUp, Plus, MinusCircle } from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';

// Firebase
import app from '@/lib/firebaseConfig';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  doc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

interface Transacao {
  id: string;
  tipo: 'deposito' | 'retirada';
  valor: number;
  createdAt?: any; // Firestore Timestamp | undefined
  descricao: string;
}

type NovaTransacaoForm = {
  tipo: 'deposito' | 'retirada';
  valor: string;
  descricao: string;
};

const db = getFirestore(app);
const COL_TX = 'poupanca_transacoes';
const CFG_COL = 'poupanca_config';
const CFG_ID = 'main';

export default function Poupanca() {
  // ===== Estados =====
  const [metaMensal, setMetaMensal] = useState<number>(1000);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [novaTransacao, setNovaTransacao] = useState<NovaTransacaoForm>({
    tipo: 'deposito',
    valor: '',
    descricao: '',
  });

  // ===== Listeners Firestore =====
  useEffect(() => {
    // meta
    const cfgRef = doc(db, CFG_COL, CFG_ID);
    const unsubCfg = onSnapshot(cfgRef, (snap) => {
      const d = snap.data();
      if (d?.metaMensal !== undefined) setMetaMensal(Number(d.metaMensal) || 0);
    });

    // transações
    const q = query(collection(db, COL_TX), orderBy('createdAt', 'asc'));
    const unsubTx = onSnapshot(q, (snap) => {
      const list: Transacao[] = snap.docs.map((d) => {
        const x = d.data() as any;
        return {
          id: d.id,
          tipo: x.tipo,
          valor: Number(x.valor) || 0,
          createdAt: x.createdAt,
          descricao: String(x.descricao ?? ''),
        };
      });
      setTransacoes(list);
    });

    return () => {
      unsubCfg();
      unsubTx();
    };
  }, []);

  // ===== Ações =====
  const salvarMeta = async (valor: number) => {
    const cfgRef = doc(db, CFG_COL, CFG_ID);
    // setDoc merge para criar se não existir
    await setDoc(cfgRef, { metaMensal: valor, updatedAt: serverTimestamp() }, { merge: true });
  };

  const adicionarTransacao = async () => {
    if (!novaTransacao.valor || !novaTransacao.descricao) return;
    const valor = Math.max(0, parseFloat(novaTransacao.valor) || 0);

    await addDoc(collection(db, COL_TX), {
      tipo: novaTransacao.tipo,
      valor,
      descricao: novaTransacao.descricao.trim(),
      createdAt: serverTimestamp(),
    });

    setNovaTransacao({ tipo: 'deposito', valor: '', descricao: '' });
  };

  // ===== Cálculos =====
  const totalDepositado = useMemo(
    () => transacoes.filter(t => t.tipo === 'deposito').reduce((a, t) => a + t.valor, 0),
    [transacoes]
  );
  const totalRetirado = useMemo(
    () => transacoes.filter(t => t.tipo === 'retirada').reduce((a, t) => a + t.valor, 0),
    [transacoes]
  );
  const economizado = totalDepositado - totalRetirado;

  const progressoPercentual = metaMensal > 0 ? (economizado / metaMensal) * 100 : 0;
  const faltam = Math.max(0, metaMensal - economizado);

  // Série para os últimos 5 meses com base em createdAt
  const dadosEvolucao = useMemo(() => {
    // constrói os últimos 5 meses (mais o atual) no formato {label, yyyymm}
    const base = new Date();
    const buckets: { label: string; key: string; valor: number }[] = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
      buckets.push({ label, key, valor: 0 });
    }

    // soma por mês (depósitos positivos, retiradas negativas)
    transacoes.forEach((t) => {
      const ts: Date =
        t.createdAt?.toDate?.() ??
        (typeof t.createdAt === 'string' ? new Date(t.createdAt) : new Date());
      const key = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}`;
      const idx = buckets.findIndex(b => b.key === key);
      if (idx >= 0) buckets[idx].valor += t.tipo === 'deposito' ? t.valor : -t.valor;
    });

    // transforma em cumulativo (saldo)
    let acc = 0;
    return buckets.map((b) => {
      acc += b.valor;
      return { mes: b.label.charAt(0).toUpperCase() + b.label.slice(1), valor: Math.max(0, acc) };
    });
  }, [transacoes]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-slate-800 dark:text-slate-100">Poupança e Metas</h2>
          <p className="text-slate-600 dark:text-slate-400">Acompanhe suas economias e alcance seus objetivos</p>
        </div>
        <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2">
          Economizado: R$ {economizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </Badge>
      </div>

      {/* Card Principal - Meta Mensal */}
      <Card className="bg-gradient-to-br from-emerald-600 via-teal-600 to-green-600 dark:from-emerald-700 dark:via-teal-700 dark:to-green-700 text-white border-0 shadow-xl">
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-emerald-100 mb-2">Meta Mensal de Poupança</p>
              <h2 className="text-white mb-1">R$ {metaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
              <p className="text-emerald-100">Economizado: R$ {economizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="hidden md:block">
              <PiggyBank className="w-24 h-24 text-emerald-400 opacity-30" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-emerald-100">Progresso da Meta</span>
              <span className="text-white">{progressoPercentual.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-emerald-800/30 rounded-full h-4">
              <div
                className="bg-white h-4 rounded-full transition-all duration-500 shadow-lg"
                style={{ width: `${Math.min(Math.max(progressoPercentual, 0), 100)}%` }}
              />
            </div>
            {faltam > 0 ? (
              <p className="text-emerald-100 text-sm">
                Faltam R$ {faltam.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para atingir sua meta
              </p>
            ) : (
              <p className="text-white text-sm">🎉 Parabéns! Você atingiu sua meta mensal!</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-emerald-100 rounded-xl">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-slate-600 text-sm">Total Depositado</p>
                <p className="text-slate-900">
                  R$ {totalDepositado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-900 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-red-100 rounded-xl">
                <MinusCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-slate-600 text-sm">Total Retirado</p>
                <p className="text-slate-900">
                  R$ {totalRetirado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 dark:border-purple-900 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-slate-600 text-sm">Saldo Líquido</p>
                <p className="text-slate-900">
                  R$ {economizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulário de Transação */}
        <Card className="dark:bg-slate-800/50 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="dark:text-slate-100">Nova Transação</CardTitle>
            <CardDescription className="dark:text-slate-400">
              Adicione depósitos ou retiradas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Transação</Label>
              <div className="flex gap-2">
                <Button
                  variant={novaTransacao.tipo === 'deposito' ? 'default' : 'outline'}
                  onClick={() => setNovaTransacao({ ...novaTransacao, tipo: 'deposito' })}
                  className={novaTransacao.tipo === 'deposito' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Depósito
                </Button>
                <Button
                  variant={novaTransacao.tipo === 'retirada' ? 'default' : 'outline'}
                  onClick={() => setNovaTransacao({ ...novaTransacao, tipo: 'retirada' })}
                  className={novaTransacao.tipo === 'retirada' ? 'bg-red-600 hover:bg-red-700' : ''}
                >
                  <MinusCircle className="w-4 h-4 mr-2" />
                  Retirada
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="valorTransacao">Valor (R$)</Label>
              <Input
                id="valorTransacao"
                type="number"
                placeholder="0.00"
                value={novaTransacao.valor}
                onChange={(e) => setNovaTransacao({ ...novaTransacao, valor: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricaoTransacao">Descrição</Label>
              <Input
                id="descricaoTransacao"
                placeholder="Ex: Economia semanal, emergência..."
                value={novaTransacao.descricao}
                onChange={(e) => setNovaTransacao({ ...novaTransacao, descricao: e.target.value })}
              />
            </div>
            <Button
              onClick={adicionarTransacao}
              className={`w-full ${
                novaTransacao.tipo === 'deposito'
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
                  : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
              }`}
            >
              {novaTransacao.tipo === 'deposito' ? <Plus className="w-4 h-4 mr-2" /> : <MinusCircle className="w-4 h-4 mr-2" />}
              Registrar {novaTransacao.tipo === 'deposito' ? 'Depósito' : 'Retirada'}
            </Button>

            <div className="mt-6 space-y-2">
              <Label htmlFor="metaMensal">Ajustar Meta Mensal (R$)</Label>
              <Input
                id="metaMensal"
                type="number"
                value={metaMensal}
                onChange={(e) => setMetaMensal(parseFloat(e.target.value) || 0)}
                onBlur={() => salvarMeta(metaMensal)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Histórico de Transações */}
        <Card className="dark:bg-slate-800/50 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="dark:text-slate-100">Histórico de Transações</CardTitle>
            <CardDescription className="dark:text-slate-400">
              Últimas movimentações da poupança
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {transacoes.slice().reverse().map((t) => {
                const dt = t.createdAt?.toDate?.() ?? new Date();
                const dataBR = dt.toLocaleDateString('pt-BR');
                return (
                  <div
                    key={t.id}
                    className={`p-4 rounded-xl border ${
                      t.tipo === 'deposito'
                        ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-100'
                        : 'bg-gradient-to-r from-red-50 to-orange-50 border-red-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {t.tipo === 'deposito' ? (
                          <div className="p-2 bg-emerald-100 rounded-lg">
                            <Plus className="w-4 h-4 text-emerald-600" />
                          </div>
                        ) : (
                          <div className="p-2 bg-red-100 rounded-lg">
                            <MinusCircle className="w-4 h-4 text-red-600" />
                          </div>
                        )}
                        <div>
                          <p className="text-slate-800">{t.descricao}</p>
                          <p className="text-slate-500 text-sm">{dataBR}</p>
                        </div>
                      </div>
                      <p className={t.tipo === 'deposito' ? 'text-emerald-700' : 'text-red-700'}>
                        {t.tipo === 'deposito' ? '+' : '-'} R{' '}
                        {t.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Evolução */}
      <Card className="dark:bg-slate-800/50 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="dark:text-slate-100">Evolução da Poupança</CardTitle>
          <CardDescription className="dark:text-slate-400">
            Crescimento do saldo ao longo dos meses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dadosEvolucao}>
              <defs>
                <linearGradient id="colorPoupanca" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="mes" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              />
              <Area
                type="monotone"
                dataKey="valor"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorPoupanca)"
                name="Saldo"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
