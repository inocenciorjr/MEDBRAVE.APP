import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { formatDateLong } from '../../utils/dateUtils';

const adminMenu = [
  { label: 'Dashboard', icon: 'fas fa-home', href: '/admin' },
  { label: 'Questões', icon: 'fas fa-question-circle', href: '/admin/questions' },
  { label: 'Bulk de Questões', icon: 'fas fa-layer-group', href: '/admin/questions/bulk' },
  { label: 'Criar Questão', icon: 'fas fa-plus-circle', href: '/admin/questions/create' },
  { label: 'Filtros', icon: 'fas fa-filter', href: '/admin/filters' },
  { label: 'Usuários', icon: 'fas fa-users', href: '/admin/users' },
  { label: 'Flashcards', icon: 'fas fa-clone', href: '/admin/flashcards' },
  { label: 'Notificações', icon: 'fas fa-bell', href: '/admin/notifications' },
  { label: 'Auditoria', icon: 'fas fa-clipboard-list', href: '/admin/audit' },
  { label: 'Pagamentos', icon: 'fas fa-credit-card', href: '/admin/payments' },
  { label: 'Tarefas', icon: 'fas fa-tasks', href: '/admin/tasks' },
  { label: 'Planos', icon: 'fas fa-briefcase', href: '/admin/plans' },
  { label: 'Cupons', icon: 'fas fa-ticket-alt', href: '/admin/coupons' },
  { label: 'Financeiro', icon: 'fas fa-chart-line', href: '/admin/finance' },
  { label: 'Pulse AI', icon: 'fas fa-brain', href: '/admin/pulse-ai' },
];

const AdminLayout = () => {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Font Awesome for icons */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
      
      <style>{`
        .admin-sidebar {
          width: 260px;
          background: var(--bg-card);
          border-right: 1px solid var(--border-primary);
          min-height: 100vh;
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          z-index: 100;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-lg);
        }
        
        .admin-sidebar .logo {
          font-weight: 700;
          font-size: 1.5rem;
          color: var(--text-accent);
          padding: 2rem 1.5rem 1.5rem 1.5rem;
          letter-spacing: -0.5px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .admin-menu {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 0 1rem;
        }
        
        .admin-menu-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          color: var(--text-secondary);
          text-decoration: none;
          font-weight: 500;
          transition: all 0.2s ease;
          font-size: 0.9rem;
        }
        
        .admin-menu-link:hover {
          background: var(--bg-interactive-hover);
          color: var(--text-primary);
        }
        
        .admin-menu-link.active {
          background: var(--bg-interactive);
          color: var(--text-accent);
          font-weight: 600;
          border-left: 3px solid var(--border-accent);
        }
        
        .admin-menu-link i {
          width: 18px;
          text-align: center;
          font-size: 0.95rem;
        }
        
        .admin-content {
          margin-left: 260px;
          min-height: 100vh;
          background: var(--bg-primary);
          display: flex;
          flex-direction: column;
        }
        
        .admin-header {
          background: var(--bg-card);
          border-bottom: 1px solid var(--border-primary);
          padding: 1.5rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: var(--shadow-sm);
          position: sticky;
          top: 0;
          z-index: 50;
        }
        
        .admin-header h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }
        
        .admin-main {
          flex: 1;
          padding: 2rem;
          background: var(--bg-primary);
        }
        
        /* Garantir que componentes do frontbrave funcionem corretamente */
        .admin-content .dashboard-card {
          background: var(--bg-card);
          border: 1px solid var(--border-primary);
          border-radius: 0.75rem;
          box-shadow: var(--shadow-md);
          padding: 1.5rem;
          transition: all 0.2s ease;
        }
        
        .admin-content .dashboard-card:hover {
          box-shadow: var(--shadow-lg);
        }
        
        /* Botões seguindo o tema */
        .admin-content .btn-primary {
          background: var(--primary);
          color: var(--primary-foreground);
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .admin-content .btn-primary:hover {
          background: var(--accent);
          box-shadow: var(--shadow-md);
        }
        
        /* Inputs seguindo o tema */
        .admin-content input, .admin-content textarea, .admin-content select {
          background: var(--bg-card);
          border: 1px solid var(--border-primary);
          color: var(--text-primary);
          border-radius: 0.5rem;
          padding: 0.75rem;
          transition: all 0.2s ease;
        }
        
        .admin-content input:focus, .admin-content textarea:focus, .admin-content select:focus {
          outline: none;
          border-color: var(--border-accent);
          box-shadow: 0 0 0 3px var(--border-accent)20;
        }
      `}</style>
      
      <aside className="admin-sidebar">
        <div className="logo">
          <i className="fas fa-brain text-xl"></i>
          <span>MedBrave Admin</span>
        </div>
        <nav className="admin-menu">
          {adminMenu.map(item => (
            <Link 
              key={item.href} 
              to={item.href} 
              className={`admin-menu-link ${
                location.pathname === item.href || 
                (item.href !== '/admin' && location.pathname.startsWith(item.href)) 
                  ? 'active' 
                  : ''
              }`}
            >
              <i className={item.icon}></i>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      
      <div className="admin-content">
        <header className="admin-header">
          <h1>Painel Administrativo</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-secondary">
              {formatDateLong(new Date())}
            </span>
          </div>
        </header>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;