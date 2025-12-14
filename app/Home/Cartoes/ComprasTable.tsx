'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2 } from 'lucide-react';
import type { Cartao, Compra } from './CartoesCredito';
import { parcelaDueDate, toYM } from './billing';

type Row = {
  key: string;
  compraId: string;
  nome: string;
  parcelaIndex: number;
  parcelas: number;
  valorParcela: number;
  vencISO: string;
};

export default function ComprasTable({
  cartao,
  compras,
  mesAtivo,
  onRemoveCompra,
  onTogglePago,
  onOpenParcelas,
}: {
  cartao?: Cartao;
  compras: Compra[];
  mesAtivo: string;
  onRemoveCompra: (id: string) => void;
  onTogglePago: (compraId: string, parcelaIndex: number, isPaga: boolean) => void;
  onOpenParcelas: (compraId: string) => void;
}) {
  const diaBomCompra = cartao?.diaBomCompra ?? 1;
  const diaPagamento = cartao?.diaPagamento ?? 10;

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];

    for (const c of compras) {
      const vp = c.valor / Math.max(1, c.parcelas);
      const paid = new Set(Array.isArray(c.paidInstallments) ? c.paidInstallments : []);

      for (let i = 1; i <= c.parcelas; i++) {
        const venc = parcelaDueDate(c.dataISO, diaBomCompra, diaPagamento, i);
        if (toYM(venc) !== mesAtivo) continue;
        if (paid.has(i)) continue;

        out.push({
          key: `${c.id}-${i}`,
          compraId: c.id,
          nome: c.nome,
          parcelaIndex: i,
          parcelas: c.parcelas,
          valorParcela: vp,
          vencISO: venc.toISOString().slice(0, 10),
        });
      }
    }

    out.sort((a, b) => a.vencISO.localeCompare(b.vencISO) || a.nome.localeCompare(b.nome));
    return out;
  }, [compras, diaBomCompra, diaPagamento, mesAtivo]);

  if (!cartao) return <div className="py-6 text-sm text-slate-500">Carregando...</div>;

  if (rows.length === 0) {
    return <div className="text-center py-8 text-slate-500">Nenhuma parcela em aberto para {mesAtivo}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Descrição</TableHead>
            <TableHead>Parcela</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.map((r) => (
            <TableRow
              key={r.key}
              className="cursor-pointer"
              onClick={() => onOpenParcelas(r.compraId)}
            >
              <TableCell>{r.nome}</TableCell>

              <TableCell>
                {r.parcelaIndex}/{r.parcelas}
              </TableCell>

              <TableCell>
                {r.valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </TableCell>

              <TableCell className="text-slate-600">
                {r.vencISO.split('-').reverse().join('/')}
              </TableCell>

              <TableCell>
                <Badge className="bg-red-100 text-red-700 border-red-300">Em aberto</Badge>
              </TableCell>

              <TableCell className="flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePago(r.compraId, r.parcelaIndex, false);
                  }}
                >
                  Pago
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveCompra(r.compraId);
                  }}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  aria-label="Remover compra"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
