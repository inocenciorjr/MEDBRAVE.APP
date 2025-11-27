'use client';

import { Simulado } from '@/types';
import SimuladoCard from './SimuladoCard';

interface SimuladosGridProps {
  simulados: Simulado[];
}

export default function SimuladosGrid({ simulados }: SimuladosGridProps) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200">
          Meus simulados
        </h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {simulados.map((simulado) => (
          <SimuladoCard key={simulado.id} simulado={simulado} />
        ))}
      </div>
    </div>
  );
}
