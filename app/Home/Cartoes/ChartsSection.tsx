'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Cartao, Compra } from './CartoesCredito';

type UsoCartao = {
  nome: string;
  travado: number;
  disponivel: number;
  cor: string;
};

type PagoCartao = {
  nome: string;
  valor: number;
  cor: string;
};

const isHex = (c: string) => /^#([0-9A-Fa-f]{6})$/.test(c);

const hexToRgba = (hex: string, alpha: number) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const money = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function UsoLegend() {
  return (
    <div className="flex items-center gap-4 text-sm text-slate-700 mt-2">
      <div className="flex items-center gap-2">
        <span className="inline-block w-3 h-3 rounded-sm bg-slate-900" />
        <span>Travado</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block w-3 h-3 rounded-sm bg-slate-300" />
        <span>Disponível</span>
      </div>
    </div>
  );
}

export function ChartsSection({ cartoes, compras }: { cartoes: Cartao[]; compras: Compra[] }) {
  const usoPorCartao: UsoCartao[] = cartoes.map((cartao) => {
    const cor = isHex(cartao.cor) ? cartao.cor : '#3b82f6';
    const comprasCartao = compras.filter((c) => c.cartaoId === cartao.id);

    const travado = comprasCartao.reduce((acc, c) => {
      const vp = c.valor / Math.max(1, c.parcelas);
      const paid = Array.isArray(c.paidInstallments) ? Array.from(new Set(c.paidInstallments)) : [];
      const paidCount = paid.filter((p) => p >= 1 && p <= c.parcelas).length;
      const restante = Math.max(0, c.valor - paidCount * vp);
      return acc + restante;
    }, 0);

    const disponivel = Math.max(0, cartao.limite - travado);

    return { nome: cartao.nome, travado, disponivel, cor };
  });

  const pagoPorCartao: PagoCartao[] = cartoes.map((cartao) => {
    const cor = isHex(cartao.cor) ? cartao.cor : '#3b82f6';
    const comprasCartao = compras.filter((c) => c.cartaoId === cartao.id);

    const totalPago = comprasCartao.reduce((acc, c) => {
      const vp = c.valor / Math.max(1, c.parcelas);
      const paid = Array.isArray(c.paidInstallments) ? Array.from(new Set(c.paidInstallments)) : [];
      const paidCount = paid.filter((p) => p >= 1 && p <= c.parcelas).length;
      return acc + paidCount * vp;
    }, 0);

    return { nome: cartao.nome, valor: totalPago, cor };
  });

  const pizzaPago = pagoPorCartao.filter((x) => x.valor > 0);

  if (cartoes.length === 0) return null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Uso do Limite por Cartão</CardTitle>
          <CardDescription>Travado (comprometido) vs disponível</CardDescription>
        </CardHeader>

        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={usoPorCartao} barCategoryGap={18}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nome" />
              <YAxis />
              <Tooltip
                cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
                content={({ active, payload, label }) => {
                  if (!active || !payload || payload.length === 0) return null;

                  const row = usoPorCartao.find((x) => x.nome === label);
                  const cor = row?.cor || '#3b82f6';

                  const trav = typeof payload[0]?.value === 'number' ? payload[0].value : 0;
                  const disp = typeof payload[1]?.value === 'number' ? payload[1].value : 0;

                  return (
                    <div className="rounded-lg border bg-white p-3 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-block w-3 h-3 rounded-sm" style={{ background: cor }} />
                        <div className="font-medium text-slate-900">{label}</div>
                      </div>
                      <div className="text-sm text-slate-700 flex flex-col gap-1">
                        <div className="flex justify-between gap-6">
                          <span>Travado</span>
                          <span className="font-medium">{money(trav)}</span>
                        </div>
                        <div className="flex justify-between gap-6">
                          <span>Disponível</span>
                          <span className="font-medium">{money(disp)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />

              <Legend content={<UsoLegend />} />

              <Bar dataKey="travado" name="Travado" radius={[8, 8, 0, 0]} fill="#0f172a">
                {usoPorCartao.map((e, i) => (
                  <Cell key={`trav-${i}`} fill={e.cor} />
                ))}
              </Bar>

              <Bar dataKey="disponivel" name="Disponível" radius={[8, 8, 0, 0]} fill="#cbd5e1">
                {usoPorCartao.map((e, i) => (
                  <Cell key={`disp-${i}`} fill={hexToRgba(e.cor, 0.25)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Total Pago por Cartão</CardTitle>
          <CardDescription>Somando parcelas marcadas como pagas</CardDescription>
        </CardHeader>

        <CardContent>
          {pizzaPago.length === 0 ? (
            <div className="h-[320px] flex items-center justify-center text-slate-500 text-sm">
              Nenhum pagamento marcado ainda
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={pizzaPago}
                  dataKey="valor"
                  nameKey="nome"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  innerRadius={55}
                  isAnimationActive={false}
                  label={({ name }) => String(name)}
                >
                  {pizzaPago.map((e, i) => (
                    <Cell key={`pie-${i}`} fill={e.cor} />
                  ))}
                </Pie>

                <Tooltip
                  formatter={(v: unknown) => (typeof v === 'number' ? money(v) : v)}
                  contentStyle={{ borderRadius: 10 }}
                />

                <Legend
                  verticalAlign="bottom"
                  formatter={(value: unknown) => <span className="text-sm text-slate-700">{String(value)}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
