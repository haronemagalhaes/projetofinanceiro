'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

import {
  AlertTriangle, Calendar, Car, DollarSign, GraduationCap,
  Heart, Home, Phone, Plus, ShoppingBag, Wifi, Zap, PiggyBank, Trash2,
} from 'lucide-react';

import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

// Firebase centralizado + auth
import { db } from '@/lib/firebaseClients';
import { useAuth } from '@/hooks/useAuth';
import {
  collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore';

type GastoFixo = {
  id: string;
  nome: string;
  valor: number;
  categoria: string;
  diaVencimento: number;
  ativo: boolean;
};

const CATEGORIAS = [
  { value: 'moradia', label: 'Moradia', icon: Home, color: '#3b82f6' },
  { value: 'internet', label: 'Internet/TV', icon: Wifi, color: '#8b5cf6' },
  { value: 'energia', label: 'Energia', icon: Zap, color: '#eab308' },
  { value: 'transporte', label: 'Transporte', icon: Car, color: '#06b6d4' },
  { value: 'telefone', label: 'Telefone', icon: Phone, color: '#10b981' },
  { value: 'educacao', label: 'Educação', icon: GraduationCap, color: '#f59e0b' },
  { value: 'saude', label: 'Saúde', icon: Heart, color: '#ef4444' },
  { value: 'outros', label: 'Outros', icon: ShoppingBag, color: '#6b7280' },
] as const;

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#eab308', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6b7280'];

const COL = 'gastos_fixos';

export default function GastosFixos() {
  const { uid, loading: loadingUser } = useAuth();

  const [gastos, setGastos] = useState<GastoFixo[]>([]);
  const [loading, setLoading] = useState(true);

  const [novo, setNovo] = useState<{ nome: string; valor: string; categoria: string; diaVencimento: string }>(
    { nome: '', valor: '', categoria: '', diaVencimento: '' }
  );

  // Listener por usuário
  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, 'users', uid, COL),
      orderBy('diaVencimento', 'asc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: GastoFixo[] = snap.docs.map((d) => {
          const x = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            nome: String(x.nome ?? ''),
            valor: Number(x.valor ?? 0),
            categoria: String(x.categoria ?? 'outros'),
            diaVencimento: Number(x.diaVencimento ?? 1),
            ativo: Boolean(x.ativo ?? true),
          };
        });
        setGastos(list);
        setLoading(false);
      },
      (err) => {
        console.error('Erro ao ler gastos_fixos:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [uid]);

  const totalAtivo = useMemo(
    () => gastos.filter(g => g.ativo).reduce((acc, g) => acc + g.valor, 0),
    [gastos],
  );

  const pieData = useMemo(() => {
    const bucket = new Map<string, number>();
    gastos.filter(g => g.ativo).forEach(g => {
      bucket.set(g.categoria, (bucket.get(g.categoria) ?? 0) + g.valor);
    });
    return Array.from(bucket.entries()).map(([categoria, valor]) => {
      const cat = CATEGORIAS.find(c => c.value === categoria);
      return { name: cat?.label ?? categoria, value: valor };
    });
  }, [gastos]);

  const renderPieLabel = (entry: { name: string; value: number }) => {
    const pct = totalAtivo > 0 ? (entry.value / totalAtivo) * 100 : 0;
    return `${entry.name}: ${pct.toFixed(0)}%`;
  };

  const barData = useMemo(
    () =>
      gastos
        .filter(g => g.ativo)
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 10)
        .map(g => ({ nome: g.nome, valor: g.valor })),
    [gastos],
  );

  const hoje = new Date().getDate();

  const proximos = useMemo(
    () =>
      gastos
        .filter(g => g.ativo)
        .filter(g => g.diaVencimento >= hoje && g.diaVencimento <= hoje + 7)
        .sort((a, b) => a.diaVencimento - b.diaVencimento),
    [gastos, hoje],
  );

  const ordenarCalendario = useMemo(
    () => [...gastos].filter(g => g.ativo).sort((a, b) => a.diaVencimento - b.diaVencimento),
    [gastos],
  );

  const money = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const getCategoriaColor = (categoria: string) =>
    CATEGORIAS.find(c => c.value === categoria)?.color ?? '#6b7280';
  const getCategoriaIcon = (categoria: string) => {
    const Icon = CATEGORIAS.find(c => c.value === categoria)?.icon ?? ShoppingBag;
    return <Icon className="h-4 w-4" />;
  };

  // CRUD em users/{uid}/gastos_fixos
  const addGasto = async () => {
    if (!uid) return;
    if (!novo.nome || !novo.valor || !novo.categoria || !novo.diaVencimento) return;

    const dia = Math.max(1, Math.min(31, parseInt(novo.diaVencimento, 10) || 1));
    const valor = Math.max(0, parseFloat(novo.valor.replace(',', '.')) || 0);

    try {
      await addDoc(collection(db, 'users', uid, COL), {
        nome: novo.nome.trim(),
        valor,
        categoria: novo.categoria,
        diaVencimento: dia,
        ativo: true,
        createdAt: serverTimestamp(),
      });
      setNovo({ nome: '', valor: '', categoria: '', diaVencimento: '' });
    } catch (e) {
      console.error('Erro ao adicionar gasto fixo:', e);
    }
  };

  const removeGasto = async (id: string) => {
    if (!uid) return;
    try {
      await deleteDoc(doc(db, 'users', uid, COL, id));
    } catch (e) {
      console.error('Erro ao remover gasto fixo:', e);
    }
  };

  if (loadingUser) return null;

  return (
    <div className="space-y-6">
      {/* Cards superiores */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-none bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-white">
              <DollarSign className="h-5 w-5" />
              Total de Gastos Fixos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/90">R$ {money(totalAtivo)}</p>
            <p className="mt-1 text-sm text-white/80">{gastos.filter(g => g.ativo).length} despesas ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items中心 gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Próximos Vencimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-800 dark:text-slate-100">
              {loading ? 'Carregando...' : `${proximos.length} despesas`}
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">nos próximos 7 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-emerald-500" />
              Média por Despesa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-800 dark:text-slate-100">
              R$ {money(totalAtivo / Math.max(1, gastos.filter(g => g.ativo).length))}
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">considerando despesas ativas</p>
          </CardContent>
        </Card>
      </div>

      {!loading && proximos.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
          <AlertDescription className="text-amber-800 dark:text-amber-300">
            Você tem {proximos.length} despesa(s) vencendo em 7 dias. Total: R$ {money(proximos.reduce((a, d) => a + d.valor, 0))}
          </AlertDescription>
        </Alert>
      )}

      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-500" />
            Adicionar Gasto Fixo
          </CardTitle>
          <CardDescription>Cadastre suas despesas mensais recorrentes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                placeholder="Ex: Aluguel"
                value={novo.nome}
                onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input
                id="valor"
                type="number"
                placeholder="0.00"
                value={novo.valor}
                onChange={(e) => setNovo({ ...novo, valor: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={novo.categoria}
                onValueChange={(v) => setNovo({ ...novo, categoria: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map(cat => {
                    const Icon = cat.icon;
                    return (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" style={{ color: cat.color }} />
                          {cat.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dia">Dia do Vencimento</Label>
              <Input
                id="dia"
                type="number"
                min={1}
                max={31}
                placeholder="1-31"
                value={novo.diaVencimento}
                onChange={(e) => setNovo({ ...novo, diaVencimento: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600" onClick={addGasto}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Despesas por Categoria</CardTitle>
            <CardDescription>Distribuição percentual</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  labelLine={false}
                  label={renderPieLabel}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Maiores Despesas</CardTitle>
            <CardDescription>Top 10 por valor</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" angle={-45} textAnchor="end" height={90} />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                />
                <Bar dataKey="valor" fill="#ef4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Calendário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            Calendário de Vencimentos
          </CardTitle>
          <CardDescription>Cronograma mensal</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
            {ordenarCalendario.map(g => (
              <div
                key={g.id}
                className="rounded-lg border-2 p-3 transition-all hover:border-blue-400"
                style={{ borderColor: g.diaVencimento >= hoje && g.diaVencimento <= hoje + 7 ? '#f59e0b' : undefined }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <Badge
                    variant="secondary"
                    className="text-xs"
                    style={{
                      backgroundColor: `${getCategoriaColor(g.categoria)}20`,
                      color: getCategoriaColor(g.categoria),
                    }}
                  >
                    Dia {g.diaVencimento}
                  </Badge>
                  {getCategoriaIcon(g.categoria)}
                </div>
                <p className="mb-1 truncate text-sm">{g.nome}</p>
                <p className="text-xs text-slate-600">R$ {money(g.valor)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Todos os Gastos Fixos</CardTitle>
          <CardDescription>Gerencie suas despesas mensais</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-slate-500">Carregando...</div>
          ) : gastos.filter(g => g.ativo).length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-slate-500">Nenhuma despesa cadastrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gastos.filter(g => g.ativo).map(g => {
                    const proximo = g.diaVencimento >= hoje && g.diaVencimento <= hoje + 7;
                    return (
                      <TableRow key={g.id}>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="flex w-fit items-center gap-1"
                            style={{
                              backgroundColor: `${getCategoriaColor(g.categoria)}20`,
                              color: getCategoriaColor(g.categoria),
                            }}
                          >
                            {getCategoriaIcon(g.categoria)}
                            <span className="hidden sm:inline">
                              {CATEGORIAS.find(c => c.value === g.categoria)?.label}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>{g.nome}</TableCell>
                        <TableCell>R$ {money(g.valor)}</TableCell>
                        <TableCell>Dia {g.diaVencimento}</TableCell>
                        <TableCell>
                          {proximo ? (
                            <Badge className="bg-amber-500">Próximo</Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            >
                              Ativo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeGasto(g.id)}
                            className="text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                            aria-label="Remover gasto"
                          >
                            <Trash2 className="h-4 w-4" />
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
