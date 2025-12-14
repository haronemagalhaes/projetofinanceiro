'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import type { Cartao, Compra } from './CartoesCredito';
import { addMonths, parcelaDueDate, toYM } from './billing';

const money = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type MonthRow = { ym: string; previsto: number; pago: number; aPagar: number };

export function PainelMensal({
  cartoes,
  compras,
  mesAtivo,
  mesesFuturos = 6,
}: {
  cartoes: Cartao[];
  compras: Compra[];
  mesAtivo: string;
  mesesFuturos?: number;
}) {
  const byId = new Map(cartoes.map((c) => [c.id, c] as const));

  const calcMes = (ym: string) => {
    let previsto = 0;
    let pago = 0;

    for (const compra of compras) {
      const cartao = byId.get(compra.cartaoId);
      if (!cartao) continue;

      const vp = compra.valor / Math.max(1, compra.parcelas);
      const paid = Array.isArray(compra.paidInstallments) ? new Set(compra.paidInstallments) : new Set<number>();

      for (let i = 1; i <= compra.parcelas; i++) {
        const venc = parcelaDueDate(compra.dataISO, cartao.diaBomCompra, cartao.diaPagamento, i);
        if (toYM(venc) !== ym) continue;

        previsto += vp;
        if (paid.has(i)) pago += vp;
      }
    }

    return { previsto, pago, aPagar: Math.max(0, previsto - pago) };
  };

  const mesAtual = calcMes(mesAtivo);

  const base = new Date(Number(mesAtivo.slice(0, 4)), Number(mesAtivo.slice(5, 7)) - 1, 1);
  const rows: MonthRow[] = Array.from({ length: mesesFuturos }, (_, i) => {
    const d = addMonths(base, i + 1);
    const ym = toYM(d);
    const r = calcMes(ym);
    return { ym, ...r };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visão Mensal</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg border p-4">
            <div className="text-sm text-slate-600">Previsto no mês</div>
            <div className="text-lg font-semibold">{money(mesAtual.previsto)}</div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="text-sm text-slate-600">Pago no mês</div>
            <div className="text-lg font-semibold text-emerald-700">{money(mesAtual.pago)}</div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="text-sm text-slate-600">A pagar no mês</div>
            <div className="text-lg font-semibold text-red-700">{money(mesAtual.aPagar)}</div>
          </div>
        </div>

        <div className="rounded-lg border">
          <div className="px-4 py-3 font-medium">Próximos {mesesFuturos} meses</div>
          <Table>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.ym}>
                  <TableCell className="w-[110px] font-medium">{r.ym}</TableCell>
                  <TableCell>Previsto: {money(r.previsto)}</TableCell>
                  <TableCell className="text-emerald-700">Pago: {money(r.pago)}</TableCell>
                  <TableCell className="text-red-700">A pagar: {money(r.aPagar)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
