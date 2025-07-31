import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './App.css';
import { Sun, Moon, Plus, MoreHorizontal, RotateCcw, Calendar, Play, ArrowRight, Pause, Video, BookOpen, X, Filter, BarChart3, FileText, Gem, User as UserIcon } from 'lucide-react';
import { 
  CustomDashboardIcon, 
  CustomRevisionIcon, 
  CustomFlashcardIcon, 
  CustomQuestionIcon, 
  CustomQuestionListIcon,
  CustomSimulationIcon, 
  CustomStatsIcon, 
  CustomAchievementIcon, 
  CustomProfileIcon, 
  CustomSettingsIcon,
  CustomNotificationIcon,
  CustomMailIcon,
  CustomHelpIcon,
  CustomSearchIcon,
  CustomPlannerIcon
} from './components/CustomIcons';
import QuestoesPageNew from './pages/dashboard/QuestoesPage';
import QuestoesResolverPage from './pages/dashboard/QuestoesResolverPage';
import QuestionListsPage from './pages/dashboard/QuestionListsPage';
import FlashcardsPage from './pages/dashboard/flashcards/FlashcardsPage';
import RevisoesPage from './pages/revisoes/RevisoesPage';
import UnifiedReviewDashboard from './components/review/UnifiedReviewDashboard';
import ReviewSessionPage from './components/review/ReviewSessionPage';
import RetentionDashboard from './pages/dashboard/RetentionDashboard';
import PlannerDashboard from './components/planner/PlannerDashboard';
// import PlannerCard from './components/planner/PlannerCard'; // Removido - só usado na página específica


// Import dos contextos
import { useAuth } from './contexts/AuthContext';
import { useUnifiedReview } from './contexts/UnifiedReviewContext';


// SVG Icons Components
const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
  </svg>
);

const RevisoesIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
    <circle cx="12" cy="12" r="2" fill="white"/>
    <path d="M12 8v8M8 12h8" stroke="white" strokeWidth="1"/>
  </svg>
);

const FlashcardsIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2z"/>
    <path d="M21 7H7c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2z" opacity="0.7"/>
  </svg>
);

const QuestoesIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="white" strokeWidth="2" fill="none"/>
    <circle cx="12" cy="17" r="1" fill="white"/>
  </svg>
);

const SimuladosIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
    <path d="M7 7h2v2H7zM7 11h2v2H7zM7 15h2v2H7zM11 7h6v2h-6zM11 11h6v2h-6zM11 15h6v2h-6z" fill="white"/>
  </svg>
);

const EstatisticasIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M3 18v-6h4v6H3zM9 18V9h4v9H9zM15 18v-3h4v3h-4zM15 13V6h4v7h-4z"/>
  </svg>
);

const RetentionIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    <circle cx="12" cy="8" r="2" fill="white"/>
    <path d="M8 14h8v2H8z" fill="white"/>
  </svg>
);

const ConquistasIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M7 4V2C7 1.45 7.45 1 8 1h8c.55 0 1 .45 1 1v2h4c.55 0 1 .45 1 1v3c0 .55-.45 1-1 1h-1l-1 13c-.1 1-.9 2-2 2H7c-1.1 0-1.9-1-2-2L4 9H3c-.55 0-1-.45-1-1V5c0-.55.45-1 1-1h4z"/>
    <path d="M12 6l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z" fill="white"/>
  </svg>
);

const PerfilIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <circle cx="12" cy="8" r="4"/>
    <path d="M12 14c-4.42 0-8 1.79-8 4v2h16v-2c0-2.21-3.58-4-8-4z"/>
  </svg>
);

const ConfiguracoesIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
  </svg>
);



// Menu Button Component
const MenuButton = ({ icon: Icon, label, isActive, onClick }) => (
  <button 
    className={`menu-button ${isActive ? 'active' : ''}`}
    onClick={onClick}
  >
    <Icon />
    <span className="tooltip">{label}</span>
  </button>
);

// Status Indicator Component
const StatusIndicator = ({ status }) => (
  <span className={`status-indicator status-${status}`}></span>
);

// Revisao Item Component
const RevisaoItem = ({ status, title, description, action }) => (
  <div className="flex items-center gap-4 p-4 rounded-lg transition-colors duration-200 hover:shadow-sm" style={{background: 'var(--bg-primary)'}}>
    <StatusIndicator status={status} />
    <div className="flex-1">
      <h4 className="text-sm font-semibold mb-1" style={{color: 'var(--text-primary)'}}>{title}</h4>
      <p className="text-xs" style={{color: 'var(--text-secondary)'}}>{description}</p>
    </div>
    <button className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-colors duration-200 hover:bg-purple-600 hover:text-white" style={{color: 'var(--text-muted)'}}>
      {action}
    </button>
  </div>
);

// Mentoria Item Component
const MentoriaItem = ({ time, title, platform }) => (
  <div className="flex items-center gap-4 p-4 rounded-lg transition-colors duration-200 hover:shadow-sm" style={{background: 'var(--bg-primary)'}}>
    <span className="text-sm font-medium min-w-[60px]" style={{color: 'var(--text-secondary)'}}>{time}</span>
    <div className="flex-1">
      <h4 className="text-sm font-semibold mb-1" style={{color: 'var(--text-primary)'}}>{title}</h4>
      <p className="text-xs flex items-center gap-1" style={{color: 'var(--text-secondary)'}}>
        <Video className="w-3 h-3 text-blue-500" /> {platform}
      </p>
    </div>
    <button className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-colors duration-200 hover:bg-purple-600 hover:text-white" style={{color: 'var(--text-muted)'}}>
      <ArrowRight className="w-3 h-3" />
    </button>
  </div>
);

// Ticket Item Component
const TicketItem = ({ name, message }) => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
  const colors = [
    'from-blue-500 to-purple-600',
    'from-green-500 to-teal-600', 
    'from-orange-500 to-red-600',
    'from-pink-500 to-rose-600',
    'from-indigo-500 to-blue-600'
  ];
  const colorIndex = name.length % colors.length;
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg transition-colors duration-200 hover:shadow-sm" style={{background: 'var(--bg-primary)'}}>
      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center text-white font-semibold text-xs`}>
        {initials}
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-semibold" style={{color: 'var(--text-primary)'}}>{name}</h4>
        <p className="text-xs" style={{color: 'var(--text-secondary)'}}>{message}</p>
      </div>
      <button className="px-3 py-1 text-xs rounded bg-purple-600 text-white hover:bg-purple-700 transition-colors">
        Check
      </button>
    </div>
  );
};

// Progress Bar Component
const ProgressBar = ({ label, value, amount, color, percentage }) => (
  <div className="flex items-center justify-between mb-3">
    <span className="text-sm" style={{color: 'var(--text-secondary)'}}>{label}</span>
    <div className="flex-1 mx-3 h-2 rounded-full overflow-hidden" style={{background: 'var(--bg-primary)'}}>
      <div 
        className={`h-full rounded-full bg-${color}-500`}
        style={{width: `${percentage}%`}}
      ></div>
    </div>
    <span className="text-sm font-medium" style={{color: 'var(--text-primary)'}}>{value}</span>
    <span className="text-sm ml-2" style={{color: 'var(--text-secondary)'}}>{amount}</span>
  </div>
);

// Action Button Component
const ActionButton = ({ icon, label, onClick }) => (
  <button 
    className="flex flex-col items-center gap-2 p-4 rounded-lg transition-colors duration-200 hover:shadow-md"
    style={{background: 'var(--bg-primary)'}}
    onClick={onClick}
  >
    <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center">
      {icon}
    </div>
    <span className="text-xs font-medium" style={{color: 'var(--text-primary)'}}>{label}</span>
  </button>
);

// Componente principal do Dashboard (conteúdo anterior)
const DashboardApp = () => {
  // Determinar página atual baseada na URL
  const [currentPage, setCurrentPage] = useState(() => {
    const pathname = window.location.pathname;
    if (pathname.startsWith('/dashboard/')) {
      const page = pathname.replace('/dashboard/', '');
      return page || 'dashboard';
    } else if (pathname === '/dashboard') {
      return 'dashboard';
    }
    return 'dashboard';
  });
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    const saved = localStorage.getItem('isDarkTheme');
    return saved ? JSON.parse(saved) : false;
  });
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('activeTab') || 'Hoje';
  });
  const navigate = useNavigate();
  const location = useLocation();

  // Salvar estados no localStorage (exceto currentPage que vem da URL)

  useEffect(() => {
    localStorage.setItem('isDarkTheme', JSON.stringify(isDarkTheme));
  }, [isDarkTheme]);

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  // Sincronizar currentPage com a URL atual
  useEffect(() => {
    // Extrair página da URL
    let pageFromUrl = 'dashboard';
    if (location.pathname.startsWith('/dashboard/')) {
      pageFromUrl = location.pathname.replace('/dashboard/', '');
    } else if (location.pathname === '/dashboard') {
      pageFromUrl = 'dashboard';
    }
    
    // Atualizar currentPage se for diferente
    if (pageFromUrl !== currentPage) {
      setCurrentPage(pageFromUrl);
    }
  }, [location.pathname]);

  useEffect(() => {
    // Apply theme class to document - optimized for performance
    if (isDarkTheme) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkTheme]);

  // Listener para navegação de listas
  useEffect(() => {
    const handleNavigateToPage = (event) => {
      const { page, params } = event.detail;
      console.log('Navegando para página:', page, 'com parâmetros:', params);
      

      
      setCurrentPage(page);
      
      // Salvar parâmetros no sessionStorage para que a página de destino possa acessar
      if (params) {
        sessionStorage.setItem('navigationParams', JSON.stringify(params));
      }
    };

    window.addEventListener('navigateToPage', handleNavigateToPage);
    
    return () => {
      window.removeEventListener('navigateToPage', handleNavigateToPage);
    };
  }, [navigate]);

  // Detectar scroll para mostrar scrollbar
  useEffect(() => {
    let scrollTimeout;
    
    const handleScroll = () => {
      // Adicionar classe scrolling
      document.body.classList.add('scrolling');
      
      // Remover classe após 1 segundo sem scroll
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        document.body.classList.remove('scrolling');
      }, 1000);
    };

    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  const { user } = useAuth();
  const { dueReviews, loading: reviewsLoading } = useUnifiedReview();

  const menuItems = [
    { id: 'dashboard', icon: CustomDashboardIcon, label: 'Dashboard' },
    { id: 'revisoes', icon: CustomRevisionIcon, label: 'Revisões' },
    { id: 'unified-review', icon: CustomRevisionIcon, label: 'Central de Revisões' },
    { id: 'planner', icon: CustomPlannerIcon, label: 'Planner' },
    { id: 'flashcards', icon: CustomFlashcardIcon, label: 'Flashcards' },
    { id: 'questoes', icon: CustomQuestionIcon, label: 'Questões' },
    { id: 'listas-questoes', icon: CustomQuestionListIcon, label: 'Listas de Questões' },
    { id: 'questoes-resolver', icon: CustomQuestionIcon, label: 'Resolver Questões' },
    { id: 'simulados', icon: CustomSimulationIcon, label: 'Simulados' },
    { id: 'estatisticas', icon: CustomStatsIcon, label: 'Estatísticas' },
    { id: 'retencao', icon: RetentionIcon, label: 'Retenção' },
    { id: 'conquistas', icon: CustomAchievementIcon, label: 'Conquistas' },
    { id: 'perfil', icon: CustomProfileIcon, label: 'Perfil' },
    { id: 'configuracoes', icon: CustomSettingsIcon, label: 'Configurações' },


  ];

  const tabs = ['Hoje', 'Esta Semana', 'Este Mês', 'Relatório'];

  return (
      <div className="app-container">
      <div className="main-container">
      {/* Left Menu */}
      <div className="absolute left-8 top-32 flex flex-col gap-4 z-10">
        {menuItems.map((item) => (
          <MenuButton
            key={item.id}
            icon={item.icon}
            label={item.label}
            isActive={currentPage === item.id}
            onClick={() => {
              if (item.route) {
                navigate(item.route);
              } else {
                const newPath = item.id === 'dashboard' ? '/dashboard' : `/dashboard/${item.id}`;
                navigate(newPath);
              }
            }}
          />
        ))}
      </div>

      {/* Content Area */}
      <div className={`pl-28 pr-4 py-6 flex-1 flex flex-col ${currentPage === 'questoes' ? 'overflow-hidden' : 'overflow-auto'}`} style={{width: '100%', boxSizing: 'border-box'}}>
        {/* Top Section */}
        <div className={`flex justify-between items-center ${currentPage === 'questoes' ? 'mb-4 pb-2' : 'mb-8 pb-4'}`}>
          {/* Logo Section */}
          <div className="flex items-center gap-3">
            <img 
              src={isDarkTheme ? "/medbravelogo-dark.png" : "/medbravelogo.png"} 
              alt="MedBrave" 
              className={`${currentPage === 'questoes' ? 'w-12 h-12' : 'w-16 h-16'} transition-all duration-200 ease-in-out`} 
            />
            <span className={`${currentPage === 'questoes' ? 'text-xl' : 'text-2xl'} font-bold transition-all duration-200`} style={{color: 'var(--text-primary)'}}>MedBrave</span>
          </div>

          {/* Center Tabs */}
          <div className="flex gap-2 p-1 rounded-2xl border" style={{background: 'var(--bg-primary)', borderColor: 'var(--border-primary)'}}>
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`nav-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            <button className="action-btn">
              <CustomNotificationIcon className="w-4 h-4" />
              <span className="badge">3</span>
            </button>
            <button className="action-btn">
              <CustomMailIcon className="w-4 h-4" />
              <span className="badge">2</span>
            </button>
            <button className="action-btn">
              <CustomHelpIcon className="w-4 h-4" />
            </button>
            <div className="user-profile">
              <div className={`${currentPage === 'questoes' ? 'w-8 h-8' : 'w-10 h-10'} rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm transition-all duration-300`}>
                DU
              </div>
              <div className="flex flex-col">
                <span className={`${currentPage === 'questoes' ? 'text-xs' : 'text-sm'} font-semibold transition-all duration-300`} style={{color: 'var(--text-primary)'}}>Dr. Usuário</span>
                <span className={`${currentPage === 'questoes' ? 'text-xs' : 'text-xs'} transition-all duration-300`} style={{color: 'var(--text-muted)'}}>Médico</span>
              </div>
            </div>
            <button 
              className="theme-toggle"
              onClick={() => setIsDarkTheme(!isDarkTheme)}
            >
              {isDarkTheme ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Conditional Page Rendering */}
        {currentPage === 'dashboard' && (
          <>
            {/* Page Title Section */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-base font-medium mb-2" style={{color: 'var(--text-secondary)'}}>
                  Gerencie e acompanhe seus estudos
                </p>
                <h1 className="text-4xl font-bold" style={{color: 'var(--text-primary)'}}>
                  Dashboard de Estudos
                </h1>
              </div>
              <div className="search-box">
                <CustomSearchIcon className="w-4 h-4" style={{color: 'var(--text-muted)'}} />
                <input 
                  type="text" 
                  placeholder="Buscar matéria, questão, flashcard..."
                />
              </div>
            </div>

            {/* Dashboard Grid - Estrutura Reorganizada */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 w-full max-w-none flex-1">
              
              {/* COLUNA 1 - Cards da Esquerda */}
              <div className="col-span-1 md:col-span-1 lg:col-span-3 space-y-6 flex flex-col">
                {/* Revisões Card - Agora ocupa toda a coluna */}
                <div className="dashboard-card flex-1">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold" style={{color: 'var(--text-primary)'}}>Revisões</h3>
                    <div className="flex gap-2">
                      <button className="w-8 h-8 rounded-md flex items-center justify-center transition-all duration-300 hover:bg-purple-600 hover:text-white hover:scale-105" style={{background: 'var(--bg-primary)', color: 'var(--text-secondary)'}}>
                        <Plus className="w-4 h-4" />
                      </button>
                      <button className="w-8 h-8 rounded-md flex items-center justify-center transition-all duration-300 hover:bg-purple-600 hover:text-white hover:scale-105" style={{background: 'var(--bg-primary)', color: 'var(--text-secondary)'}}>
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 mb-6">
                    <button className="nav-tab active">Hoje</button>
                    <button className="nav-tab">Amanhã</button>
                  </div>
                  <div className="space-y-4">
                    {reviewsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                      </div>
                    ) : dueReviews && dueReviews.length > 0 ? (
                      <>
                        {/* Contadores por tipo */}
                        <div className="grid grid-cols-3 gap-2 mb-4 p-3 rounded-lg" style={{background: 'var(--bg-primary)'}}>
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-500">
                              {dueReviews.filter(r => r.contentType === 'FLASHCARD' || r.type === 'FLASHCARD').length}
                            </div>
                            <div className="text-xs" style={{color: 'var(--text-secondary)'}}>Flashcards</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-500">
                              {dueReviews.filter(r => r.contentType === 'QUESTION' || r.type === 'QUESTION').length}
                            </div>
                            <div className="text-xs" style={{color: 'var(--text-secondary)'}}>Questões</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-orange-500">
                              {dueReviews.filter(r => r.contentType === 'ERROR_NOTEBOOK' || r.type === 'ERROR_NOTEBOOK').length}
                            </div>
                            <div className="text-xs" style={{color: 'var(--text-secondary)'}}>Caderno</div>
                          </div>
                        </div>
                        
                        {/* Lista de revisões (máximo 10) */}
                        {dueReviews.slice(0, 10).map((review, index) => {
                          const isOverdue = review.nextReviewAt && new Date(review.nextReviewAt.toDate ? review.nextReviewAt.toDate() : review.nextReviewAt) < new Date();
                          const status = isOverdue ? 'pending' : review.status === 'LEARNING' ? 'in-progress' : 'completed';
                          
                          return (
                            <RevisaoItem 
                              key={review.id || index}
                              status={status}
                              title={review.title || review.frontContent || `${review.contentType || review.type} - Revisão ${index + 1}`}
                              description={review.subtitle || review.backContent || 'Revisão programada'}
                              action={<ArrowRight className="w-3 h-3" />}
                            />
                          );
                        })}
                        
                        {/* Mostrar quantas revisões restam se houver mais de 10 */}
                        {dueReviews.length > 10 && (
                          <div className="text-center py-2">
                            <p className="text-xs" style={{color: 'var(--text-secondary)'}}>
                              +{dueReviews.length - 10} revisões adicionais
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <div className="mb-3">
                          <BookOpen className="w-12 h-12 mx-auto" style={{color: 'var(--text-secondary)', opacity: 0.5}} />
                        </div>
                        <p className="text-sm font-medium" style={{color: 'var(--text-primary)'}}>Nenhuma revisão pendente para hoje</p>
                        <p className="text-xs mt-1" style={{color: 'var(--text-secondary)'}}>Você está em dia com seus estudos! 🎉</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* COLUNA 2 - Card Central Maior */}
              <div className="col-span-1 md:col-span-2 lg:col-span-6 space-y-6 flex flex-col">
                {/* Novidades Card - Coluna Central Mais Larga */}
                <div className="dashboard-card">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold" style={{color: 'var(--text-primary)'}}>Novidades</h3>
                    <div className="flex gap-2">
                      <button className="w-8 h-8 rounded-md flex items-center justify-center transition-all duration-300 hover:bg-purple-600 hover:text-white hover:scale-105" style={{background: 'var(--bg-primary)', color: 'var(--text-secondary)'}}>
                        <BarChart3 className="w-4 h-4" />
                      </button>
                      <button className="w-8 h-8 rounded-md flex items-center justify-center transition-all duration-300 hover:bg-purple-600 hover:text-white hover:scale-105" style={{background: 'var(--bg-primary)', color: 'var(--text-secondary)'}}>
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button className="w-8 h-8 rounded-md flex items-center justify-center transition-all duration-300 hover:bg-purple-600 hover:text-white hover:scale-105" style={{background: 'var(--bg-primary)', color: 'var(--text-secondary)'}}>
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Progress Overview */}
                  <div className="flex gap-6 items-center mb-8">
                    <div className="w-32 h-32 relative">
                      {/* Placeholder for donut chart */}
                      <div className="w-full h-full rounded-full border-8 border-gray-200 relative">
                        <div className="absolute inset-0 rounded-full border-8 border-transparent border-t-orange-500 border-r-blue-500 border-b-gray-300"></div>
                      </div>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span style={{color: 'var(--text-secondary)'}}>Em Progresso:</span>
                        <span className="font-semibold" style={{color: 'var(--text-primary)'}}>14</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span style={{color: 'var(--text-secondary)'}}>Concluído:</span>
                        <span className="font-semibold" style={{color: 'var(--text-primary)'}}>32</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span style={{color: 'var(--text-secondary)'}}>Não Iniciado:</span>
                        <span className="font-semibold" style={{color: 'var(--text-primary)'}}>54</span>
                      </div>
                    </div>
                  </div>

                  {/* Performance Section */}
                  <div className="p-6 rounded-lg" style={{background: 'var(--bg-primary)'}}>
                    <div className="flex gap-6 mb-4">
                      <div className="flex items-center gap-2 text-sm" style={{color: 'var(--text-secondary)'}}>
                        <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                        Acertos: 24,600$
                      </div>
                      <div className="flex items-center gap-2 text-sm" style={{color: 'var(--text-secondary)'}}>
                        <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                        Erros: 12,900$
                      </div>
                    </div>
                    <div className="h-48 flex items-end justify-between gap-2">
                      {/* Placeholder for line chart */}
                      {[20, 22, 24, 23, 25, 24, 26].map((height, index) => (
                        <div key={index} className="flex flex-col items-center gap-1">
                          <div 
                            className="w-8 bg-blue-500 rounded-t"
                            style={{height: `${height * 4}px`}}
                          ></div>
                          <div 
                            className="w-8 bg-orange-500 rounded-b"
                            style={{height: `${(height - 8) * 3}px`}}
                          ></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Planner Card removido - agora só aparece na página específica do planner */}

                {/* Ações Rápidas Card - Centralizado */}
                <div className="dashboard-card">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold" style={{color: 'var(--text-primary)'}}>Ações Rápidas</h3>
                    <button className="w-8 h-8 rounded-md flex items-center justify-center transition-all duration-300 hover:bg-purple-600 hover:text-white hover:scale-105" style={{background: 'var(--bg-primary)', color: 'var(--text-secondary)'}}>
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <ActionButton icon={<BookOpen className="w-4 h-4" />} label="Flashcards" />
                    <ActionButton icon={<CustomQuestionIcon className="w-4 h-4" />} label="Questões" />
                    <ActionButton icon={<FileText className="w-4 h-4" />} label="Caderno de Erros" />
                    <ActionButton icon={<UserIcon className="w-4 h-4" />} label="Perfil" />
                    <ActionButton icon={<Gem className="w-4 h-4" />} label="Planos" />
                  </div>
                </div>
              </div>

              {/* COLUNA 3 - Cards da Direita */}
              <div className="col-span-1 md:col-span-1 lg:col-span-3 space-y-6 flex flex-col">
                {/* Mentorias Card */}
                <div className="dashboard-card flex-1">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold" style={{color: 'var(--text-primary)'}}>Mentorias</h3>
                    <div className="flex gap-2">
                      <button className="w-8 h-8 rounded-md flex items-center justify-center transition-all duration-300 hover:bg-purple-600 hover:text-white hover:scale-105" style={{background: 'var(--bg-primary)', color: 'var(--text-secondary)'}}>
                        <Calendar className="w-4 h-4" />
                      </button>
                      <button className="w-8 h-8 rounded-md flex items-center justify-center transition-all duration-300 hover:bg-purple-600 hover:text-white hover:scale-105" style={{background: 'var(--bg-primary)', color: 'var(--text-secondary)'}}>
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-4 mb-8">
                    <MentoriaItem 
                      time="6:45 PM"
                      title="Projeto Residência"
                      platform="Meet"
                    />
                    <MentoriaItem 
                      time="6:45 PM"
                      title="Pesquisa de Usuário"
                      platform="Zoom"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all duration-300 hover:bg-purple-600 hover:text-white" style={{background: 'var(--bg-primary)'}}>
                    <button className="text-sm font-medium">Ver Todas as Mentorias</button>
                    <span>→</span>
                  </div>
                </div>

                {/* Palácio da Memória Card */}
                <div className="dashboard-card flex-1">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold" style={{color: 'var(--text-primary)'}}>Palácio da Memória</h3>
                    <button className="w-8 h-8 rounded-md flex items-center justify-center transition-all duration-300 hover:bg-purple-600 hover:text-white hover:scale-105" style={{background: 'var(--bg-primary)', color: 'var(--text-secondary)'}}>
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <ProgressBar label="Pago" value={85} color="bg-green-500" />
                    <ProgressBar label="Pendente" value={60} color="bg-yellow-500" />
                    <ProgressBar label="Cancelado" value={25} color="bg-red-500" />
                  </div>
                </div>

                {/* Tickets Card - Movido da primeira coluna */}
                <div className="dashboard-card flex-1">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold" style={{color: 'var(--text-primary)'}}>Tickets Abertos</h3>
                    <div className="flex gap-2">
                      <button className="w-8 h-8 rounded-md flex items-center justify-center transition-all duration-300 hover:bg-purple-600 hover:text-white hover:scale-105" style={{background: 'var(--bg-primary)', color: 'var(--text-secondary)'}}>
                        <Filter className="w-4 h-4" />
                      </button>
                      <button className="w-8 h-8 rounded-md flex items-center justify-center transition-all duration-300 hover:bg-purple-600 hover:text-white hover:scale-105" style={{background: 'var(--bg-primary)', color: 'var(--text-secondary)'}}>
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <TicketItem 
                      name="Jacob Martinez"
                      message="Preciso de 3 novos recursos no app mobile"
                    />
                    <TicketItem 
                      name="Luke Bell"
                      message="Preciso de 3 novos recursos no app mobile"
                    />
                    <TicketItem 
                      name="Connor Mitchell"
                      message="Preciso de 3 novos recursos no app mobile"
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Planner Page */}
        {currentPage === 'planner' && <PlannerDashboard userId={user?.uid} />}

        {/* Questões Page */}
        {currentPage === 'questoes' && <QuestoesPageNew />}

        {/* Listas de Questões Page */}
        {currentPage === 'listas-questoes' && <QuestionListsPage />}

        {/* Questões Resolver Page */}
        {currentPage === 'questoes-resolver' && <QuestoesResolverPage />}

        {/* Flashcards Page */}
        {currentPage === 'flashcards' && <FlashcardsPage />}

        {/* Revisões Page */}
        {currentPage === 'revisoes' && <RevisoesPage />}

        {/* Unified Review Dashboard */}
        {currentPage === 'unified-review' && <UnifiedReviewDashboard />}

        {/* Review Session Page */}
        {currentPage === 'review-session' && <ReviewSessionPage />}

        {/* Retention Dashboard */}
        {currentPage === 'retencao' && <RetentionDashboard />}

        {/* Placeholder for other pages */}
        {currentPage !== 'dashboard' && currentPage !== 'questoes' && currentPage !== 'listas-questoes' && currentPage !== 'questoes-resolver' && currentPage !== 'flashcards' && currentPage !== 'revisoes' && currentPage !== 'unified-review' && currentPage !== 'review-session' && currentPage !== 'retencao' && currentPage !== 'planner' && (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-4" style={{color: 'var(--text-primary)'}}>
                Página em Desenvolvimento
              </h2>
              <p className="text-lg" style={{color: 'var(--text-secondary)'}}>
                A página "{currentPage}" está sendo desenvolvida.
              </p>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

// Componente principal da aplicação (volta ao formato original)
function App() {
  return <DashboardApp />;
}

export default App;

