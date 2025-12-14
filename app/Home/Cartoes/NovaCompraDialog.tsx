'use client';

import { useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingBag } from 'lucide-react';

import type { Cartao } from './CartoesCredito';
import { parcelaDueDate, formatBR } from './billing';

type NovaCompra = {
  nome: string;
  valor: string;
  parcelas: string;
  dataISO: string;
};

export function NovaCompraDialog({
  open,
  onOpenChange,
  cartao,
  novaCompra,
  setNovaCompra,
  onSubmit,
  trigger,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cartao: Cartao;
  novaCompra: NovaCompra;
  setNovaCompra: (v: NovaCompra) => void;
  onSubmit: () => void;
  trigger: React.ReactNode;
}) {
  /* 🔥 RESET AUTOMÁTICO AO ABRIR */
  useEffect(() => {
    if (open) {
      setNovaCompra({
        nome: '',
        valor: '',
        parcelas: '1',
        dataISO: new Date().toISOString().slice(0, 10),
      });
    }
  }, [open, setNovaCompra]);

  const valorParcela = useMemo(() => {
    const v = Number(novaCompra.valor) || 0;
    const p = Number(novaCompra.parcelas) || 1;
    return p > 0 ? v / p : 0;
  }, [novaCompra.valor, novaCompra.parcelas]);

  const primeiraParcelaISO = useMemo(() => {
    const baseISO =
      novaCompra.dataISO && /^\d{4}-\d{2}-\d{2}$/.test(novaCompra.dataISO)
        ? novaCompra.dataISO
        : new Date().toISOString().slice(0, 10);

    const d = parcelaDueDate(baseISO, cartao.diaBomCompra, cartao.diaPagamento, 1);
    return d.toISOString().slice(0, 10);
  }, [novaCompra.dataISO, cartao.diaBomCompra, cartao.diaPagamento]);

  const canSubmit =
    novaCompra.nome.trim().length > 0 &&
    Number(novaCompra.valor) > 0 &&
    Number(novaCompra.parcelas) >= 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Compra — {cartao.nome}</DialogTitle>
          <DialogDescription>Registre uma nova compra neste cartão</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input
              placeholder="Ex: Notebook, Supermercado..."
              value={novaCompra.nome}
              onChange={(e) => setNovaCompra({ ...novaCompra, nome: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Valor Total (R$)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={novaCompra.valor}
              onChange={(e) => setNovaCompra({ ...novaCompra, valor: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Número de Parcelas</Label>
            <Select
              value={novaCompra.parcelas}
              onValueChange={(v) => setNovaCompra({ ...novaCompra, parcelas: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }, (_, i) => String(i + 1)).map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}x
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data da Compra</Label>
            <Input
              type="date"
              value={novaCompra.dataISO}
              onChange={(e) => setNovaCompra({ ...novaCompra, dataISO: e.target.value })}
            />
          </div>

          {canSubmit && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-slate-700">
                <strong>Valor da parcela:</strong>{' '}
                {valorParcela.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </p>
              <p className="text-sm text-slate-700 mt-1">
                <strong>1ª parcela em:</strong> {formatBR(primeiraParcelaISO)}
              </p>
            </div>
          )}

          <Button
            disabled={!canSubmit}
            onClick={() => {
              onSubmit();
              onOpenChange(false);
            }}
            className="w-full bg-linear-to-r from-emerald-500 to-emerald-600 disabled:opacity-60"
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            Registrar Compra
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
