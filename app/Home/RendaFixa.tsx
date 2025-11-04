'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Plus, Trash2, Calendar, DollarSign } from 'lucide-react';

import app from '@/lib/firebaseConfig';
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';

interface RendaFixaItem {
  id: string;
  descricao: string;
  valor: number;
  diaVencimento: number;
  categoria: string;
}

type NovaRendaForm = {
  descricao: string;
  valor: string;          
  diaVencimento: string;  
  categoria: string;
};

const db = getFirestore(app);
const COL = 'rendas_fixas';

export default function RendaFixa() {
  const [rendas, setRendas] = useState<RendaFixaItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [novaRenda, setNovaRenda] = useState<NovaRendaForm>({
    descricao: '',
    valor: '',
    diaVencimento: '',
    categoria: '',
  });

  useEffect(() => {
    const q = query(collection(db, COL), orderBy('diaVencimento', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: RendaFixaItem[] = snap.docs.map((d) => {
          const data = d.data() as Omit<RendaFixaItem, 'id'>;
          return {
            id: d.id,
            descricao: data.descricao,
            valor: Number(data.valor) || 0,
            diaVencimento: Number(data.diaVencimento) || 1,
            categoria: data.categoria ?? 'Outros',
          };
        });
        setRendas(list);
        setLoading(false);
      },
      (err) => {
        console.error('Erro ao ler rendas_fixas:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const adicionarRenda = async () => {
    if (!novaRenda.descricao || !novaRenda.valor || !novaRenda.diaVencimento) return;

    const valor = Math.max(0, parseFloat(novaRenda.valor) || 0);
    const dia = Math.min(31, Math.max(1, parseInt(novaRenda.diaVencimento) || 1));

    try {
      await addDoc(collection(db, COL), {
        descricao: novaRenda.descricao.trim(),
        valor,
        diaVencimento: dia,
        categoria: (novaRenda.categoria || 'Outros').trim(),
        createdAt: serverTimestamp(),
      });
      setNovaRenda({ descricao: '', valor: '', diaVencimento: '', categoria: '' });
    } catch (e) {
      console.error('Erro ao adicionar renda fixa:', e);
    }
  };

  const removerRenda = async (id: string) => {
    try {
      await deleteDoc(doc(db, COL, id));
    } catch (e) {
      console.error('Erro ao remover renda fixa:', e);
    }
  };

  const totalRendaFixa = useMemo(
    () => rendas.reduce((acc, r) => acc + r.valor, 0),
    [rendas]
  );

  const getCategoriaColor = (categoria: string) => {
    switch (categoria) {
      case 'Trabalho':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'Imóveis':
        return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'Investimentos':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'Freelance':
        return 'bg-teal-100 text-teal-700 border-teal-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-slate-800 dark:text-slate-100">Renda Fixa Mensal</h2>
          <p className="text-slate-600 dark:text-slate-400">Rendas recorrentes e previsíveis</p>
        </div>
        <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 py-2">
          Total Mensal: R$ {totalRendaFixa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </Badge>
      </div>


      <Card className="bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 dark:from-emerald-700 dark:via-green-700 dark:to-teal-700 text-white border-0 shadow-lg">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 mb-2">Renda Fixa Total</p>
              <h2 className="text-white mb-2">
                R$ {totalRendaFixa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h2>
              <p className="text-emerald-100">Recebimento garantido por mês</p>
            </div>
            <div className="hidden md:block">
              <DollarSign className="w-24 h-24 text-emerald-400 opacity-30" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    
        <Card className="dark:bg-slate-800/50 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="dark:text-slate-100">Adicionar Renda Fixa</CardTitle>
            <CardDescription className="dark:text-slate-400">
              Registre uma nova fonte de renda recorrente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="descricaoFixa">Descrição</Label>
              <Input
                id="descricaoFixa"
                placeholder="Ex: Salário, Aluguel..."
                value={novaRenda.descricao}
                onChange={(e) =>
                  setNovaRenda({ ...novaRenda, descricao: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valorFixa">Valor (R$)</Label>
              <Input
                id="valorFixa"
                type="number"
                placeholder="0.00"
                value={novaRenda.valor}
                onChange={(e) =>
                  setNovaRenda({ ...novaRenda, valor: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dia">Dia do Recebimento</Label>
              <Input
                id="dia"
                type="number"
                min={1}
                max={31}
                placeholder="1-31"
                value={novaRenda.diaVencimento}
                onChange={(e) =>
                  setNovaRenda({ ...novaRenda, diaVencimento: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoriaFixa">Categoria</Label>
              <Input
                id="categoriaFixa"
                placeholder="Ex: Trabalho, Imóveis, Investimentos..."
                value={novaRenda.categoria}
                onChange={(e) =>
                  setNovaRenda({ ...novaRenda, categoria: e.target.value })
                }
              />
            </div>
            <Button
              onClick={adicionarRenda}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Renda Fixa
            </Button>
          </CardContent>
        </Card>

        <Card className="dark:bg-slate-800/50 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="dark:text-slate-100">Rendas Cadastradas</CardTitle>
            <CardDescription className="dark:text-slate-400">
              Todas as suas rendas fixas mensais
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-slate-500">Carregando...</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {rendas.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">
                    Nenhuma renda fixa cadastrada
                  </p>
                ) : (
                  rendas.map((renda) => (
                    <div
                      key={renda.id}
                      className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-100 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-slate-800">{renda.descricao}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge className={getCategoriaColor(renda.categoria)}>
                              {renda.categoria}
                            </Badge>
                            <div className="flex items-center text-slate-500 text-sm">
                              <Calendar className="w-3 h-3 mr-1" />
                              Dia {renda.diaVencimento}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-emerald-700">
                            R$ {renda.valor.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Remover renda fixa"
                            onClick={() => removerRenda(renda.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="dark:bg-slate-800/50 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="dark:text-slate-100">Calendário de Recebimentos</CardTitle>
          <CardDescription className="dark:text-slate-400">
            Visualização dos dias de recebimento no mês
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((dia) => {
              const rendasDoDia = rendas.filter((r) => r.diaVencimento === dia);
              const hasRenda = rendasDoDia.length > 0;

              return (
                <div
                  key={dia}
                  className={`aspect-square rounded-lg p-2 flex flex-col items-center justify-center text-sm transition-all ${
                    hasRenda
                      ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-md hover:shadow-lg'
                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  <span>{dia}</span>
                  {hasRenda && <span className="text-xs mt-1">{rendasDoDia.length}</span>}
                </div>
              );
            })}
          </div>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-slate-700 text-sm">
              <strong>Dica:</strong> Os dias destacados em verde possuem recebimentos agendados.
              O número indica quantas rendas você receberá naquele dia.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
