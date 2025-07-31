import React, { useState } from 'react';
import { useNotificationPreferences, NotificationPreferencesProvider } from '../../contexts/NotificationPreferencesContext';
import { NotificationChannel, NotificationType, NotificationPriority } from '../../types/notification';

// Componente para toggle switch elegante
const Toggle: React.FC<{
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}> = ({ enabled, onChange, disabled = false, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-4',
    md: 'w-11 h-6'
  };
  
  const thumbClasses = {
    sm: 'w-3 h-3',
    md: 'w-5 h-5'
  };

  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`
        relative inline-flex items-center rounded-full
        ${enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${sizeClasses[size]}
      `}
    >
      <span
        className={`
          ${thumbClasses[size]} inline-block transform rounded-full bg-white shadow
          ${enabled ? `translate-x-${size === 'sm' ? '4' : '5'}` : 'translate-x-0'}
        `}
      />
    </button>
  );
};

// Componente para seleção de canais
const ChannelSelector: React.FC<{
  channels: NotificationChannel[];
  selectedChannels: NotificationChannel[];
  onChange: (channels: NotificationChannel[]) => void;
  contactInfo: any;
}> = ({ channels, selectedChannels, onChange, contactInfo }) => {
  const channelInfo = {
    [NotificationChannel.IN_APP]: {
      label: 'App',
      icon: '📱',
      description: 'Notificações dentro do app',
      available: true
    },
    [NotificationChannel.EMAIL]: {
      label: 'Email',
      icon: '📧',
      description: contactInfo?.email?.verified ? contactInfo.email.address : 'Email não verificado',
      available: contactInfo?.email?.verified || false
    },
    [NotificationChannel.SMS]: {
      label: 'SMS',
      icon: '💬',
      description: contactInfo?.phone?.verified ? contactInfo.phone.number : 'Telefone não verificado',
      available: contactInfo?.phone?.verified || false
    },
    [NotificationChannel.PUSH]: {
      label: 'Push',
      icon: '🔔',
      description: 'Notificações push do browser',
      available: 'Notification' in window
    },
    [NotificationChannel.WHATSAPP]: {
      label: 'WhatsApp',
      icon: '💚',
      description: contactInfo?.whatsapp?.verified ? 'Conectado' : 'Não configurado',
      available: contactInfo?.whatsapp?.optedIn || false
    }
  };

  const toggleChannel = (channel: NotificationChannel) => {
    if (!channelInfo[channel].available) return;
    
    if (selectedChannels.includes(channel)) {
      onChange(selectedChannels.filter(c => c !== channel));
    } else {
      onChange([...selectedChannels, channel]);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {channels.map(channel => {
        const info = channelInfo[channel];
        const isSelected = selectedChannels.includes(channel);
        
        return (
          <button
            key={channel}
            onClick={() => toggleChannel(channel)}
            disabled={!info.available}
            className={`
              p-3 rounded-lg border-2 text-left
              ${isSelected && info.available
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }
              ${!info.available ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="flex items-center space-x-2">
              <span className="text-lg">{info.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 dark:text-white">
                  {info.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {info.description}
                </p>
              </div>
              {isSelected && info.available && (
                <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

// Componente para configuração de horários silenciosos
const QuietHoursConfig: React.FC<{
  quietHours: any;
  onChange: (quietHours: any) => void;
}> = ({ quietHours, onChange }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-900 dark:text-white">
          Horário de Silêncio
        </label>
        <Toggle
          enabled={quietHours.enabled}
          onChange={(enabled) => onChange({ ...quietHours, enabled })}
        />
      </div>
      
      {quietHours.enabled && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Início
            </label>
            <input
              type="time"
              value={quietHours.startTime}
              onChange={(e) => onChange({ ...quietHours, startTime: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fim
            </label>
            <input
              type="time"
              value={quietHours.endTime}
              onChange={(e) => onChange({ ...quietHours, endTime: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Criar um wrapper para fornecer o contexto apenas quando necessário
const NotificationSettingsContent: React.FC = () => {
  const {
    preferences,
    contactInfo,
    emailTemplates,
    smsTemplates,
    deliveryStats,
    recentDeliveries,
    loading,
    saving,
    updatePreference,
    updateContactInfo,
    verifyEmail,
    verifyPhone,
    resendVerification,
    testNotification,
    isChannelEnabled,
    isInQuietHours,
    getPreferenceByType
  } = useNotificationPreferences();

  const [testMessage, setTestMessage] = useState('Esta é uma mensagem de teste!');
  const [testChannels, setTestChannels] = useState<NotificationChannel[]>([NotificationChannel.IN_APP]);

  // Tipos de notificação com descrições
  const notificationTypes = [
    {
      type: NotificationType.GENERAL,
      label: 'Geral',
      description: 'Mensagens gerais e atualizações do sistema',
      icon: '📢'
    },
    {
      type: NotificationType.EDUCATIONAL,
      label: 'Educacional',
      description: 'Novos conteúdos, aulas e materiais de estudo',
      icon: '📚'
    },
    {
      type: NotificationType.EXAM,
      label: 'Exames',
      description: 'Novos exames disponíveis e resultados',
      icon: '📝'
    },
    {
      type: NotificationType.PAYMENT,
      label: 'Pagamentos',
      description: 'Confirmações de pagamento e faturas',
      icon: '💳'
    },
    {
      type: NotificationType.SOCIAL,
      label: 'Social',
      description: 'Interações, comentários e menções',
      icon: '👥'
    },
    {
      type: NotificationType.ACHIEVEMENT,
      label: 'Conquistas',
      description: 'Badges, certificados e marcos alcançados',
      icon: '🏆'
    },
    {
      type: NotificationType.SYSTEM,
      label: 'Sistema',
      description: 'Manutenções e atualizações importantes',
      icon: '⚙️'
    },
    {
      type: NotificationType.MARKETING,
      label: 'Marketing',
      description: 'Promoções, ofertas e novidades',
      icon: '🎯'
    }
  ];

  const getPreference = (type: NotificationType) => {
    return preferences.find(p => p.type === type) || {
      type,
      enabled: true,
      channels: [NotificationChannel.IN_APP],
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'America/Sao_Paulo'
      },
      frequency: {
        immediate: true,
        daily: false,
        weekly: false,
        monthly: false
      },
      minimumPriority: NotificationPriority.NORMAL
    };
  };

  const handlePreferenceUpdate = async (type: NotificationType, updates: any) => {
    await updatePreference({
      type,
      ...updates
    });
  };

  const handleTestNotification = async () => {
    if (testChannels.length === 0) {
      alert('Selecione pelo menos um canal para teste');
      return;
    }
    await testNotification(testChannels, testMessage);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Configurações de Notificação
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configure como e quando você deseja receber notificações
        </p>
      </div>

      {/* Informações de Contato */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          📞 Informações de Contato
        </h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Email */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="email"
                value={contactInfo?.email?.address || ''}
                onChange={(e) => updateContactInfo({ 
                  email: { 
                    verified: false,
                    bounces: 0,
                    ...contactInfo?.email, 
                    address: e.target.value 
                  } 
                })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="seu@email.com"
              />
              {contactInfo?.email?.verified ? (
                <span className="text-green-600 text-sm">✅ Verificado</span>
              ) : (
                <button
                  onClick={() => verifyEmail(contactInfo?.email?.address || '')}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Verificar
                </button>
              )}
            </div>
          </div>

          {/* Telefone */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Telefone
            </label>
            <div className="flex items-center space-x-2">
              <select
                value={contactInfo?.phone?.countryCode || '+55'}
                onChange={(e) => updateContactInfo({ 
                  phone: { 
                    number: '',
                    verified: false,
                    optedOut: false,
                    ...contactInfo?.phone, 
                    countryCode: e.target.value 
                  } 
                })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="+55">🇧🇷 +55</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
              </select>
              <input
                type="tel"
                value={contactInfo?.phone?.number || ''}
                onChange={(e) => updateContactInfo({ 
                  phone: { 
                    countryCode: '+55',
                    verified: false,
                    optedOut: false,
                    ...contactInfo?.phone, 
                    number: e.target.value 
                  } 
                })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="(11) 99999-9999"
              />
              {contactInfo?.phone?.verified ? (
                <span className="text-green-600 text-sm">✅ Verificado</span>
              ) : (
                <button
                  onClick={() => verifyPhone(contactInfo?.phone?.number || '', contactInfo?.phone?.countryCode || '+55')}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Verificar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Preferências por Tipo */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          🔔 Preferências de Notificação
        </h2>
        
        {notificationTypes.map(({ type, label, description, icon }) => {
          const preference = getPreference(type);
          
          return (
            <div key={type} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {label}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {description}
                    </p>
                  </div>
                </div>
                <Toggle
                  enabled={preference.enabled}
                  onChange={(enabled) => handlePreferenceUpdate(type, { enabled })}
                  disabled={saving}
                />
              </div>
              
              {preference.enabled && (
                <div className="space-y-4">
                  {/* Canais */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Canais de Entrega
                    </label>
                    <ChannelSelector
                      channels={Object.values(NotificationChannel)}
                      selectedChannels={preference.channels}
                      onChange={(channels) => handlePreferenceUpdate(type, { channels })}
                      contactInfo={contactInfo}
                    />
                  </div>
                  
                  {/* Horários Silenciosos (apenas para tipo GENERAL) */}
                  {type === NotificationType.GENERAL && (
                    <QuietHoursConfig
                      quietHours={preference.quietHours}
                      onChange={(quietHours) => handlePreferenceUpdate(type, { quietHours })}
                    />
                  )}
                  
                  {/* Prioridade Mínima */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Prioridade Mínima
                    </label>
                    <select
                      value={preference.minimumPriority}
                      onChange={(e) => handlePreferenceUpdate(type, { minimumPriority: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      <option value={NotificationPriority.LOW}>Baixa</option>
                      <option value={NotificationPriority.NORMAL}>Normal</option>
                      <option value={NotificationPriority.HIGH}>Alta</option>
                      <option value={NotificationPriority.URGENT}>Urgente</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Teste de Notificação */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          🧪 Testar Notificações
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mensagem de Teste
            </label>
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Digite uma mensagem de teste..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Canais para Teste
            </label>
            <ChannelSelector
              channels={Object.values(NotificationChannel)}
              selectedChannels={testChannels}
              onChange={setTestChannels}
              contactInfo={contactInfo}
            />
          </div>
          
          <button
            onClick={handleTestNotification}
            disabled={testChannels.length === 0 || !testMessage.trim()}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {saving ? 'Enviando...' : 'Enviar Teste'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const NotificationSettingsPage: React.FC = () => {
  return (
    <NotificationPreferencesProvider>
      <NotificationSettingsContent />
    </NotificationPreferencesProvider>
  );
};

export default NotificationSettingsPage;