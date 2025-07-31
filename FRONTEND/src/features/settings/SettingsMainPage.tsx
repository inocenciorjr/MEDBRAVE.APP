import React, { useState } from 'react';
import { NotificationSettingsPage } from './NotificationSettingsPage';
import { NotificationDeliveryDashboard } from '../../components/common/NotificationDeliveryDashboard';

type SettingsTab = 'preferences' | 'delivery' | 'templates';

export const SettingsMainPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('preferences');

  const tabs = [
    {
      id: 'preferences' as const,
      label: '🔔 Preferências',
      description: 'Configure como receber notificações'
    },
    {
      id: 'delivery' as const,
      label: '📊 Estatísticas',
      description: 'Veja o desempenho das entregas'
    },
    {
      id: 'templates' as const,
      label: '📧 Templates',
      description: 'Gerencie templates de email e SMS'
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'preferences':
        return <NotificationSettingsPage />;
      case 'delivery':
        return <NotificationDeliveryDashboard />;
      case 'templates':
        return (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🚧</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Templates em Desenvolvimento
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Esta funcionalidade estará disponível em breve
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen" style={{backgroundColor: 'var(--color-bg-main)'}}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              ⚙️ Configurações de Notificação
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Gerencie suas preferências de comunicação e acompanhe estatísticas de entrega
            </p>
          </div>
          
          {/* Navegação de abas */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }
                  `}
                >
                  <div className="flex flex-col items-center">
                    <span>{tab.label}</span>
                    <span className="text-xs mt-1 opacity-75">{tab.description}</span>
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Conteúdo da aba */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default SettingsMainPage; 