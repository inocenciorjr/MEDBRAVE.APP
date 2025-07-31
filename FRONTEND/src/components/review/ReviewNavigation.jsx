import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Componente de navegação para o sistema de revisões
 * Permite navegar entre diferentes páginas e modos de revisão
 */
const ReviewNavigation = ({ currentPage, onPageChange }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Itens de navegação do sistema de revisões
  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      description: 'Visão geral e estatísticas',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6a2 2 0 01-2 2H10a2 2 0 01-2-2V5z" />
        </svg>
      )
    },
    {
      id: 'session',
      label: 'Nova Sessão',
      description: 'Iniciar sessão de revisão',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      )
    },
    {
      id: 'history',
      label: 'Histórico',
      description: 'Sessões anteriores',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      id: 'analytics',
      label: 'Análises',
      description: 'Relatórios detalhados',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    }
  ];

  // Manipular clique em item de navegação
  const handleItemClick = (itemId) => {
    if (onPageChange) {
      onPageChange(itemId);
    }

    // Navegação baseada no item selecionado
    switch (itemId) {
      case 'dashboard':
        navigate('/dashboard/unified-review');
        break;
      case 'session':
        navigate('/dashboard/review-session');
        // Disparar evento para atualizar a página no App.jsx
        window.dispatchEvent(new CustomEvent('navigateToPage', {
          detail: { page: 'review-session', params: {} }
        }));
        break;
      case 'history':
        navigate('/dashboard/review-history');
        break;
      case 'analytics':
        navigate('/dashboard/review-analytics');
        break;

      default:
        break;
    }
  };

  // Breadcrumb para navegação contextual
  const Breadcrumb = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    
    return (
      <nav className="flex mb-4" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white"
            >
              <svg className="w-3 h-3 mr-2.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              Dashboard
            </button>
          </li>
          
          {pathSegments.includes('review') && (
            <li>
              <div className="flex items-center">
                <svg className="w-3 h-3 text-gray-400 mx-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2 dark:text-gray-400">
                  Revisões
                </span>
              </div>
            </li>
          )}
          
          {pathSegments.includes('session') && (
            <li>
              <div className="flex items-center">
                <svg className="w-3 h-3 text-gray-400 mx-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2 dark:text-gray-400">
                  Sessão
                </span>
              </div>
            </li>
          )}
        </ol>
      </nav>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <div className="py-3">
          <Breadcrumb />
        </div>
        
        {/* Navigation Items */}
        <div className="flex space-x-1 pb-4">
          {navigationItems.map((item) => {
            const isActive = currentPage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title={item.description}
              >
                <span className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}>
                  {item.icon}
                </span>
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ReviewNavigation;