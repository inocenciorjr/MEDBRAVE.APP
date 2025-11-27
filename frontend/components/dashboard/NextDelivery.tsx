'use client';

import { Delivery } from '@/types';

interface NextDeliveryProps {
  delivery: Delivery;
  onSubmit?: () => void;
}

export default function NextDelivery({ delivery, onSubmit }: NextDeliveryProps) {
  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit();
    } else {
      console.log('Enviar tarefa:', delivery.id);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-slate-700 dark:text-slate-200">
        Próxima entrega
      </h2>
      
      <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-lg flex justify-between items-center shadow-xl dark:shadow-dark-xl">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className="w-12 h-12 bg-primary/10 dark:bg-primary/20 rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">description</span>
          </div>
          
          {/* Info */}
          <div>
            <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary">
              {delivery.title}
            </h3>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              {delivery.course}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          {/* Due Date */}
          <div>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Data de entrega
            </p>
            <p className="font-semibold text-text-light-primary dark:text-text-dark-primary">
              {delivery.dueDate}
            </p>
          </div>
          
          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            className="bg-primary text-white font-semibold px-6 py-2 rounded-lg hover:opacity-90 hover:scale-105 transition-all duration-200"
          >
            Enviar tarefa
          </button>
        </div>
      </div>
    </div>
  );
}
