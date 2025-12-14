'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Cartao, Compra } from './CartoesCredito';

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const parseISO = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const addMonthsKeepDay = (base: Date, months: number) => {
  const t = new Date(base.getFullYear(), base.getMonth() + months, 1);
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  t.setDate(Math.min(base.getDate(), last));
  return t;
};

const billingMonthRef = (iso: string, diaBom: number) => {
  const d = parseISO(iso);
  const ref = new Date(d.getFullYear(), d.getMonth(), 1);
  if (d.getDate() >= diaBom) ref.setMonth(ref.getMonth() + 1);
  return ref;
};

const dueDate = (ref: Date, diaPagamento: number) => {
  const last = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
  return new Date(ref.getFullYear(), ref.getMonth(), clamp(diaPagamento, 1, last));
};

const formatBR = (d: Date) => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  compra: Compra | null;
  cartao: Cartao | null;
  onTogglePago: (compraId: string, parcelaIndex: number, isPaga: boolean) => void;
};

export function ParcelasDialog({ open, onOpenChange, compra, cartao, onTogglePago }: Props) {
  if (!compra || !cartao) return null;

  const first = dueDate(billingMonthRef(compra.dataISO, cartao.diaBomCompra), cartao.diaPagamento);
  const valorParcela = compra.valor / Math.max(1, compra.parcelas);
  const paidSet = new Set(Array.isArray(compra.paidInstallments) ? compra.paidInstallments : []);

  const parcelas = Array.from({ length: compra.parcelas }, (_, i) => {
    const idx = i + 1;
    const venc = addMonthsKeepDay(first, i);
    const isPaga = paidSet.has(idx);
    return { idx, venc, isPaga };
  });

  const totalPago = parcelas.filter((p) => p.isPaga).length * valorParcela;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Parcelas — {compra.nome}</DialogTitle>
          <DialogDescription>
            {compra.parcelas}x de{' '}
            {valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}{' '}
            • Total pago:{' '}
            {totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {parcelas.map((p) => (
            <div key={p.idx} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <Badge
                  className={
                    p.isPaga
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                      : 'bg-red-100 text-red-700 border-red-300'
                  }
                >
                  {p.isPaga ? 'Pago' : 'Não pago'}
                </Badge>

                <div className="text-sm">
                  <div className="font-medium">{p.idx}ª parcela</div>
                  <div className="text-slate-600">Vence em {formatBR(p.venc)}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-sm font-medium">
                  {valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>

                <Button
                  onClick={() => onTogglePago(compra.id, p.idx, p.isPaga)}
                  className={p.isPaga ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
                >
                  {p.isPaga ? 'Desmarcar' : 'Marcar pago'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
