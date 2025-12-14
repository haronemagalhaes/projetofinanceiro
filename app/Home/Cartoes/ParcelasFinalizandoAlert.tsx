'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import type { Cartao, Compra } from './CartoesCredito';

type Props = {
  cartoes: Cartao[];
  compras: Compra[];
};

export function ParcelasFinalizandoAlert({ cartoes, compras }: Props) {
  const list = compras
    .map((c) => {
      const paid = Array.isArray(c.paidInstallments)
        ? Array.from(new Set(c.paidInstallments)).filter((p) => p >= 1 && p <= c.parcelas)
        : [];
      const paidCount = paid.length;
      const faltam = c.parcelas - paidCount;
      const cartao = cartoes.find((x) => x.id === c.cartaoId)?.nome || 'Cartão';
      return { ...c, faltam, cartao };
    })
    .filter((x) => x.parcelas > 1 && x.faltam > 0 && x.faltam <= 2)
    .sort((a, b) => a.faltam - b.faltam);

  if (list.length === 0) return null;

  return (
    <Alert className="border-amber-300 bg-amber-50">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800">Parcelas prestes a finalizar</AlertTitle>
      <AlertDescription className="text-amber-700">
        <ul className="mt-2 space-y-1">
          {list.map((c) => (
            <li key={c.id}>
              <strong>{c.nome}</strong> ({c.cartao}) — faltam {c.faltam} de {c.parcelas}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
