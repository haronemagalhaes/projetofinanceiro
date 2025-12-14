'use client';

import { Card, CardContent } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';

type Props = {
  totalPago: number;
};

export function SummaryCards({ totalPago }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="border-emerald-200 dark:border-emerald-900 bg-linear-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 rounded-xl">
              <CreditCard className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-slate-600 text-sm">Total Pago</p>
              <p className="text-slate-900">
                {totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800 bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-950/30 dark:to-slate-900/30">
        <CardContent className="p-6">
          <div>
            <p className="text-slate-600 text-sm">Status</p>
            <p className="text-slate-900">Controle por parcelas</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800 bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-950/30 dark:to-slate-900/30">
        <CardContent className="p-6">
          <div>
            <p className="text-slate-600 text-sm">Dica</p>
            <p className="text-slate-900">Clique em uma compra para ver as parcelas</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
