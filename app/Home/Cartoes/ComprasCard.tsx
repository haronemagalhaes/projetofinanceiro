'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingBag } from 'lucide-react';

import type { Cartao, Compra } from './CartoesCredito';
import { NovaCompraDialog } from './NovaCompraDialog';
import ComprasTable from './ComprasTable';
import { ParcelasDialog } from './ParcelasDialog';

type Props = {
  cartao: Cartao;
  compras: Compra[];
  mesAtivo: string;
  novaCompra: { nome: string; valor: string; parcelas: string; dataISO: string };
  setNovaCompra: (v: { nome: string; valor: string; parcelas: string; dataISO: string }) => void;
  dialogNovaCompra: boolean;
  setDialogNovaCompra: (v: boolean) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onTogglePago: (compraId: string, parcelaIndex: number, isPaga: boolean) => void;
};

export function ComprasCard({
  cartao,
  compras,
  mesAtivo,
  novaCompra,
  setNovaCompra,
  dialogNovaCompra,
  setDialogNovaCompra,
  onAdd,
  onRemove,
  onTogglePago,
}: Props) {
  const [openParcelas, setOpenParcelas] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedCompra = useMemo(() => {
    if (!selectedId) return null;
    return compras.find((c) => c.id === selectedId) || null;
  }, [compras, selectedId]);

  return (
    <Card className="dark:bg-slate-800/50 dark:border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Compras — {cartao.nome}</CardTitle>
            <CardDescription>Clique em uma compra para ver as parcelas</CardDescription>
          </div>

          <NovaCompraDialog
            open={dialogNovaCompra}
            onOpenChange={setDialogNovaCompra}
            cartao={cartao}
            novaCompra={novaCompra}
            setNovaCompra={setNovaCompra}
            onSubmit={onAdd}
            trigger={
              <Button
                size="sm"
                className="bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                Adicionar Compra
              </Button>
            }
          />
        </div>
      </CardHeader>

      <CardContent>
        {compras.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Nenhuma compra registrada neste cartão</p>
          </div>
        ) : (
          <>
            <ComprasTable
              cartao={cartao}
              compras={compras}
              mesAtivo={mesAtivo}
              onRemoveCompra={onRemove}
              onTogglePago={onTogglePago}
              onOpenParcelas={(compraId) => {
                setSelectedId(compraId);
                setOpenParcelas(true);
              }}
            />

            <ParcelasDialog
              open={openParcelas}
              onOpenChange={setOpenParcelas}
              compra={selectedCompra}
              cartao={cartao}
              onTogglePago={onTogglePago}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
