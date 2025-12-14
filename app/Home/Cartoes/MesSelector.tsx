'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function MesSelector({ mesAtivo, setMesAtivo }: { mesAtivo: string; setMesAtivo: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <Label>Mês</Label>
      <Input type="month" value={mesAtivo} onChange={(e) => setMesAtivo(e.target.value)} className="w-[180px]" />
    </div>
  );
}
