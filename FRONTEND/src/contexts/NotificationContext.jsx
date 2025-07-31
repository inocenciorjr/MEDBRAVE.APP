import React, { createContext, useContext, useState } from 'react';

// Criar o contexto
const NotificationContext = createContext({});

// Hook para usar o contexto
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Provider do contexto
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  // Função para buscar notificações (simplificada)
  const fetchNotifications = async () => {
    try {
      // Por enquanto, retornar array vazio
      // No futuro, implementar chamada à API
      setNotifications([]);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    }
  };

  // Função para adicionar notificação
  const addNotification = (notification) => {
    setNotifications(prev => [...prev, { ...notification, id: Date.now() }]);
  };

  // Função para remover notificação
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const value = {
    notifications,
    fetchNotifications,
    addNotification,
    removeNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext; 