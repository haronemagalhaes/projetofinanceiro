'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

import type { Cartao, Compra } from './CartoesCredito';
import { CartaoResumo } from './CartaoResumo';
import { ComprasCard } from './ComprasCard';

type Props = {
  cartoes: Cartao[];
  comprasByCartao: Map<string, Compra[]>;
  activeTab: string;
  setActiveTab: (v: string) => void;

  mesAtivo: string;

  novaCompra: { nome: string; valor: string; parcelas: string; dataISO: string };
  setNovaCompra: (v: { nome: string; valor: string; parcelas: string; dataISO: string }) => void;

  dialogNovaCompra: boolean;
  setDialogNovaCompra: (v: boolean) => void;

  onAddCompra: (cartaoId: string) => void;
  onRemoveCompra: (id: string) => void;
  onRemoveCartao: (id: string) => void;

  onTogglePago: (compraId: string, parcelaIndex: number, isPaga: boolean) => void;
};

export function CartoesTabs({
  cartoes,
  comprasByCartao,
  activeTab,
  setActiveTab,
  mesAtivo,
  novaCompra,
  setNovaCompra,
  dialogNovaCompra,
  setDialogNovaCompra,
  onAddCompra,
  onRemoveCompra,
  onRemoveCartao,
  onTogglePago,
}: Props) {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList
        className="grid w-full gap-2 bg-white/80 p-2 rounded-xl"
        style={{ gridTemplateColumns: `repeat(${cartoes.length}, minmax(0, 1fr))` }}
      >
        {cartoes.map((cartao) => {
          const isActive = activeTab === cartao.id;
          return (
            <TabsTrigger
              key={cartao.id}
              value={cartao.id}
              className="transition-colors data-[state=active]:text-white"
              style={isActive ? { background: cartao.cor, color: '#fff' } : { background: 'transparent' }}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {cartao.nome}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {cartoes.map((cartao) => {
        const comprasDoCartao = comprasByCartao.get(cartao.id) || [];
        return (
          <TabsContent key={cartao.id} value={cartao.id} className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <CartaoResumo cartao={cartao} compras={comprasDoCartao} />

              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemoveCartao(cartao.id)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                aria-label="Remover cartão"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <ComprasCard
              cartao={cartao}
              compras={comprasDoCartao}
              mesAtivo={mesAtivo}
              novaCompra={novaCompra}
              setNovaCompra={setNovaCompra}
              dialogNovaCompra={dialogNovaCompra}
              setDialogNovaCompra={setDialogNovaCompra}
              onAdd={() => onAddCompra(cartao.id)}
              onRemove={onRemoveCompra}
              onTogglePago={onTogglePago}
            />
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
