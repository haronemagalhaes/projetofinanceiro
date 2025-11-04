'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart as RBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Wallet, CreditCard, PiggyBank, DollarSign,
} from 'lucide-react';


import app from '@/lib/firebaseConfig';
import {
  getFirestore, collection, onSnapshot, query, orderBy, where, doc, getDoc,
} from 'firebase/firestore';

type RendaFixa = { id:string; valor:number; createdAt?:any };
type GastoFixo = { id:string; valor:number; ativo:boolean; createdAt?:any };
type Cartao   = { id:string; nome:string; cor:string; limite:number };
type Compra   = { id:string; cartaoId:string; nome:string; valor:number; parcelas:number; parcelaAtual:number; dataISO:string; createdAt?:any };
type PoupTx   = { id:string; tipo:'deposito'|'retirada'; valor:number; createdAt?:any };

const db = getFirestore(app);

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
const monthLabelPt = (d: Date) =>
  d.toLocaleString('pt-BR', { month:'short' }).replace('.', '').replace(/^./, m => m.toUpperCase());

export default function DashboardGeral() {

  const [rendas, setRendas] = useState<RendaFixa[]>([]);
  const [gastosFixos, setGastosFixos] = useState<GastoFixo[]>([]);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [poupTx, setPoupTx] = useState<PoupTx[]>([]);

 
  useEffect(() => {
    const unsub1 = onSnapshot(
      query(collection(db, 'rendas_fixas'), orderBy('diaVencimento', 'asc')),
      snap => setRendas(snap.docs.map(d => ({ id:d.id, valor:Number((d.data() as any).valor)||0, createdAt:(d.data() as any).createdAt })))
    );

    const unsub2 = onSnapshot(
      // só ativos contam no mês
      query(collection(db, 'gastos_fixos'), where('ativo', '==', true), orderBy('diaVencimento', 'asc')),
      snap => setGastosFixos(snap.docs.map(d => {
        const x = d.data() as any;
        return { id:d.id, valor:Number(x.valor)||0, ativo:Boolean(x.ativo), createdAt:x.createdAt };
      }))
    );

    const unsub3 = onSnapshot(
      query(collection(db, 'cartoes'), orderBy('nome', 'asc')),
      snap => setCartoes(snap.docs.map(d => {
        const x = d.data() as any;
        return { id:d.id, nome:String(x.nome), cor:String(x.cor||'#3b82f6'), limite:Number(x.limite)||0 };
      }))
    );

    const unsub4 = onSnapshot(
      query(collection(db, 'cartao_compras'), orderBy('dataISO', 'asc')),
      snap => setCompras(snap.docs.map(d => {
        const x = d.data() as any;
        return {
          id:d.id, cartaoId:String(x.cartaoId), nome:String(x.nome||''),
          valor:Number(x.valor)||0, parcelas:Number(x.parcelas)||1, parcelaAtual:Number(x.parcelaAtual)||1,
          dataISO: String(x.dataISO||new Date().toISOString().slice(0,10)), createdAt:x.createdAt
        };
      }))
    );

    const unsub5 = onSnapshot(
      query(collection(db, 'poupanca_transacoes'), orderBy('createdAt', 'asc')),
      snap => setPoupTx(snap.docs.map(d => {
        const x = d.data() as any;
        return { id:d.id, tipo: (x.tipo==='retirada'?'retirada':'deposito'), valor:Number(x.valor)||0, createdAt:x.createdAt };
      }))
    );

    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); };
  }, []);

  const now = new Date();
  const curKey = monthKey(now);

  const totalRendaFixaMes = useMemo(
    () => rendas.reduce((a,r)=> a + (Number(r.valor)||0), 0),
    [rendas]
  );

  const totalGastosFixosMes = useMemo(
    () => gastosFixos.reduce((a,g)=> a + (Number(g.valor)||0), 0),
    [gastosFixos]
  );

  const gastoCartoesMes = useMemo(() =>
    compras.reduce((a,c) => a + (Number(c.valor)||0)/Math.max(1, Number(c.parcelas)||1), 0)
  , [compras]);

  const poupancaDepositadoMes = useMemo(
    () => poupTx.filter(t => t.tipo==='deposito').reduce((a,t)=>a+t.valor, 0),
    [poupTx]
  );
  const poupancaRetiradoMes = useMemo(
    () => poupTx.filter(t => t.tipo==='retirada').reduce((a,t)=>a+t.valor, 0),
    [poupTx]
  );
  const poupancaSaldoMes = poupancaDepositadoMes - poupancaRetiradoMes;

  const ganhosMes = totalRendaFixaMes; 
  const gastosMes = totalGastosFixosMes + gastoCartoesMes; 
  const saldoMes = ganhosMes - gastosMes;

  
  const buckets = useMemo(() => {
    const arr: { key:string; label:string; ganhos:number; gastos:number }[] = [];
    for (let i=4;i>=0;i--) {
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      arr.push({ key:monthKey(d), label:monthLabelPt(d), ganhos:0, gastos:0 });
    }

    for (const b of arr) b.ganhos = totalRendaFixaMes;

    
    for (const b of arr) b.gastos += totalGastosFixosMes;

    for (const c of compras) {
      const d = new Date(c.dataISO);
      const k = monthKey(d);
      const bucket = arr.find(x => x.key === k);
      if (bucket) bucket.gastos += (c.valor / Math.max(1, c.parcelas));
    }
    return arr;
  }, [now, totalRendaFixaMes, totalGastosFixosMes, compras]);

  const dadosDistribuicao = useMemo(() => {
    const data = [
      { nome:'Renda Fixa', valor: ganhosMes, cor:'#10b981' },
      { nome:'Gastos Fixos', valor: totalGastosFixosMes, cor:'#ef4444' },
      { nome:'Cartões', valor: gastoCartoesMes, cor:'#3b82f6' },
      { nome:'Poupança', valor: Math.max(0, poupancaSaldoMes), cor:'#059669' },
    ];
    
    const tot = data.reduce((a,b)=>a+b.valor,0) || 1;
    return { data, total: tot };
  }, [ganhosMes, totalGastosFixosMes, gastoCartoesMes, poupancaSaldoMes]);

 
  const gastoParcelaPorCartao = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cartoes) m.set(c.id, 0);
    for (const cp of compras) {
      const vParc = cp.valor / Math.max(1, cp.parcelas);
      m.set(cp.cartaoId, (m.get(cp.cartaoId) || 0) + vParc);
    }
 
    return cartoes
      .map(c => ({ cartaoId:c.id, nome:c.nome, cor:c.cor, valor:m.get(c.id)||0 }))
      .sort((a,b)=> b.valor - a.valor);
  }, [cartoes, compras]);

  const saldoTotalAproximado = useMemo(() => {
    return saldoMes + poupancaSaldoMes;
  }, [saldoMes, poupancaSaldoMes]);

  return (
    <div className="space-y-6">
      
      <Card className="bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 text-white border-0 shadow-xl">
        <CardContent className="p-6 md:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 mb-2">Saldo Total (aprox.)</p>
              <h2 className="text-white mb-4">
                R$ {saldoTotalAproximado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h2>
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  <div>
                    <p className="text-blue-100 text-sm">Ganhos</p>
                    <p className="text-white">R$ {ganhosMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5" />
                  <div>
                    <p className="text-blue-100 text-sm">Gastos</p>
                    <p className="text-white">R$ {gastosMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  <div>
                    <p className="text-blue-100 text-sm">Saldo do Mês</p>
                    <p className="text-white">R$ {saldoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="hidden md:block">
              <DollarSign className="w-24 h-24 text-blue-300 opacity-30" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { titulo:'Renda Fixa', valor:ganhosMes, icon:TrendingUp, cor:'text-emerald-600', bg:'bg-emerald-50' },
          { titulo:'Gastos Fixos', valor:totalGastosFixosMes, icon:TrendingDown, cor:'text-red-600', bg:'bg-red-50' },
          { titulo:'Gastos Cartões', valor:gastoCartoesMes, icon:CreditCard, cor:'text-blue-600', bg:'bg-blue-50' },
          { titulo:'Poupança (líquido)', valor:poupancaSaldoMes, icon:PiggyBank, cor:'text-green-600', bg:'bg-green-50' },
        ].map((c, i) => {
          const Icon = c.icon;
          return (
            <Card key={i} className="dark:bg-slate-800/50 dark:border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-3 rounded-xl ${c.bg}`}>
                    <Icon className={`w-6 h-6 ${c.cor}`} />
                  </div>
                  <Badge variant="outline" className="border-slate-300">Mês</Badge>
                </div>
                <p className="text-slate-600 text-sm">{c.titulo}</p>
                <p className="text-slate-900">
                  R$ {c.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

   
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
        <Card className="dark:bg-slate-800/50 dark:border-slate-700">
          <CardHeader>
            <CardTitle>Ganhos x Gastos (Últimos 5 meses)</CardTitle>
            <CardDescription>Renda fixa vs gastos fixos + cartões</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RBarChart data={buckets.map(b => ({ mes:b.label, ganhos:b.ganhos, gastos:b.gastos }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="mes" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{ backgroundColor:'#fff', border:'1px solid #e2e8f0', borderRadius:8 }}
                  formatter={(v:number)=>`R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                />
                <Legend />
                <Bar dataKey="ganhos" fill="#10b981" name="Ganhos" radius={[8,8,0,0]} />
                <Bar dataKey="gastos" fill="#ef4444" name="Gastos" radius={[8,8,0,0]} />
              </RBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

    
        <Card className="dark:bg-slate-800/50 dark:border-slate-700">
          <CardHeader>
            <CardTitle>Distribuição Financeira</CardTitle>
            <CardDescription>Sem freelancer</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dadosDistribuicao.data}
                  cx="50%" cy="50%"
                  outerRadius={110}
                  dataKey="valor"
                  label={({ name, percent }: any) => `${name} ${(percent*100).toFixed(0)}%`}
                >
                  {dadosDistribuicao.data.map((e, i) => <Cell key={i} fill={e.cor} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor:'#fff', border:'1px solid #e2e8f0', borderRadius:8 }}
                  formatter={(v:number)=>`R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

     
      <Card className="dark:bg-slate-800/50 dark:border-slate-700">
        <CardHeader>
          <CardTitle>Evolução do Saldo</CardTitle>
          <CardDescription>Tendência do saldo total aproximado</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={buckets.map((b, idx) => ({
              mes: b.label, saldo: (b.ganhos - b.gastos) + poupancaSaldoMes * ((idx===buckets.length-1)?1:0),
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="mes" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{ backgroundColor:'#fff', border:'1px solid #e2e8f0', borderRadius:8 }}
                formatter={(v:number)=>`R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              />
              <Legend />
              <Line type="monotone" dataKey="saldo" stroke="#3b82f6" strokeWidth={3} dot={{ r:4 }} name="Saldo" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

    
      {gastoParcelaPorCartao.length > 0 && (
        <Card className="dark:bg-slate-800/50 dark:border-slate-700">
          <CardHeader>
            <CardTitle>Cartões mais usados (parcela do mês)</CardTitle>
            <CardDescription>Priorize reduzir os primeiros</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RBarChart data={gastoParcelaPorCartao.map(x => ({ nome:x.nome, valor:x.valor }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="nome" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{ backgroundColor:'#fff', border:'1px solid #e2e8f0', borderRadius:8 }}
                  formatter={(v:number)=>`R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                />
                <Legend />
                <Bar dataKey="valor" name="Parcela (mês)" radius={[8,8,0,0]} fill="#a855f7" />
              </RBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
