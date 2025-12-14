'use client';

import { Card, CardContent } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';
import type { Cartao, Compra } from './CartoesCredito';

export function CartaoResumo({ cartao, compras }: { cartao: Cartao; compras: Compra[] }) {
  const travado = compras.reduce((acc, c) => {
    const vp = c.valor / Math.max(1, c.parcelas);
    const paid = Array.isArray(c.paidInstallments) ? Array.from(new Set(c.paidInstallments)) : [];
    const paidCount = paid.filter((p) => p >= 1 && p <= c.parcelas).length;
    const restante = Math.max(0, c.valor - paidCount * vp);
    return acc + restante;
  }, 0);

  const disponivel = Math.max(0, cartao.limite - travado);
  const pct = cartao.limite > 0 ? Math.min((travado / cartao.limite) * 100, 100) : 0;

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${cartao.cor}20` }}>
              <CreditCard className="w-8 h-8" style={{ color: cartao.cor }} />
            </div>

            <div>
              <h3 className="text-slate-800">{cartao.nome}</h3>
              <p className="text-slate-600">
                Travado:{' '}
                {travado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}{' '}
                de{' '}
                {cartao.limite.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <p className="text-slate-500 text-sm">
                Dia bom: {cartao.diaBomCompra} • Pagamento: {cartao.diaPagamento}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-slate-600 text-sm">Disponível</p>
            <p className="text-emerald-700">
              {disponivel.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>

        <div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div className="h-3 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: cartao.cor }} />
          </div>
          <p className="text-slate-500 text-sm mt-2">{pct.toFixed(1)}% do limite travado</p>
        </div>
      </CardContent>
    </Card>
  );
}
