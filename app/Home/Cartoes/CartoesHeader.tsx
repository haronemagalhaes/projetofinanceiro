'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Plus } from 'lucide-react';
import { MesSelector } from './MesSelector';

type Props = {
  totalPago: number;

  mesAtivo: string;
  setMesAtivo: (v: string) => void;

  dialogNovoCartao: boolean;
  setDialogNovoCartao: (v: boolean) => void;

  novoCartao: { nome: string; cor: string; limite: string; diaBomCompra: string; diaPagamento: string };
  setNovoCartao: (v: { nome: string; cor: string; limite: string; diaBomCompra: string; diaPagamento: string }) => void;

  cores: { nome: string; valor: string }[];
  adicionarCartao: () => void;
};

export function CartoesHeader({
  totalPago,
  mesAtivo,
  setMesAtivo,
  dialogNovoCartao,
  setDialogNovoCartao,
  novoCartao,
  setNovoCartao,
  cores,
  adicionarCartao,
}: Props) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h2 className="text-slate-800 dark:text-slate-100">Cartões de Crédito</h2>
        <p className="text-slate-600 dark:text-slate-400">Controle de compras e parcelas</p>
      </div>

      <div className="flex items-end gap-3 flex-wrap">
        <MesSelector mesAtivo={mesAtivo} setMesAtivo={setMesAtivo} />

        <Badge className="bg-linear-to-r from-emerald-500 to-emerald-600 text-white px-4 py-2">
          Total Pago:{' '}
          {totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </Badge>

        <Dialog open={dialogNovoCartao} onOpenChange={setDialogNovoCartao}>
          <DialogTrigger asChild>
            <Button className="bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Cartão
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Novo Cartão</DialogTitle>
              <DialogDescription>Crie um novo cartão</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Cartão</Label>
                <Input
                  placeholder="Ex: Nubank, Black..."
                  value={novoCartao.nome}
                  onChange={(e) => setNovoCartao({ ...novoCartao, nome: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Limite (R$)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={novoCartao.limite}
                  onChange={(e) => setNovoCartao({ ...novoCartao, limite: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Dia bom de compra</Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={novoCartao.diaBomCompra}
                    onChange={(e) => setNovoCartao({ ...novoCartao, diaBomCompra: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Dia de pagamento</Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={novoCartao.diaPagamento}
                    onChange={(e) => setNovoCartao({ ...novoCartao, diaPagamento: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cor do Cartão</Label>
                <div className="grid grid-cols-4 gap-2">
                  {cores.map((cor) => (
                    <button
                      key={cor.valor}
                      className={`h-12 rounded-lg border-2 transition-all ${
                        novoCartao.cor === cor.valor ? 'border-slate-900 scale-105' : 'border-slate-200'
                      }`}
                      style={{ backgroundColor: cor.valor }}
                      onClick={() => setNovoCartao({ ...novoCartao, cor: cor.valor })}
                      type="button"
                    />
                  ))}
                </div>
              </div>

              <Button onClick={adicionarCartao} className="w-full bg-linear-to-r from-blue-500 to-blue-600">
                <CreditCard className="w-4 h-4 mr-2" />
                Criar Cartão
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
