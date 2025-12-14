'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Plus } from 'lucide-react';

export function EmptyStateCartoes({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="border-dashed border-2 dark:bg-slate-800/50 dark:border-slate-700">
      <CardContent className="p-12 text-center">
        <CreditCard className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <h3 className="text-slate-600 dark:text-slate-300 mb-2">Nenhum cartão cadastrado</h3>
        <p className="text-slate-500 dark:text-slate-400 mb-4">Crie seu primeiro cartão</p>
        <Button onClick={onCreate} className="bg-linear-to-r from-blue-500 to-blue-600">
          <Plus className="w-4 h-4 mr-2" />
          Criar Primeiro Cartão
        </Button>
      </CardContent>
    </Card>
  );
}
