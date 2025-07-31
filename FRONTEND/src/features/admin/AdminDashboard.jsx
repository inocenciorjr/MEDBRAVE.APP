import React, { useEffect, useState } from "react";
import { Outlet } from 'react-router-dom';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cache para evitar consultas desnecessárias
  const [lastFetch, setLastFetch] = useState(0);
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  useEffect(() => {
    async function fetchStats() {
      // Verificar cache antes de fazer nova consulta
      const now = Date.now();
      if (stats && (now - lastFetch) < CACHE_TTL) {
        console.log('📋 [AdminDashboard] Usando dados em cache');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        console.log('🔄 [AdminDashboard] Buscando estatísticas otimizadas...');
        
        // ✅ USAR count() EM VEZ DE getDocs() - MUITO MAIS EFICIENTE
        const usersRef = collection(db, 'users');
        const usersCountSnapshot = await getCountFromServer(usersRef);
        const totalUsers = usersCountSnapshot.data().count;
        
        // Usuários ativos (logados nos últimos 30 dias)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const activeUsersQuery = query(
          usersRef,
          where('lastLogin', '>=', thirtyDaysAgo)
        );
        const activeUsersCountSnapshot = await getCountFromServer(activeUsersQuery);
        const activeUsers = activeUsersCountSnapshot.data().count;
        
        // ✅ USAR count() PARA OUTRAS COLEÇÕES TAMBÉM
        let totalPosts = 0;
        let reportedContent = 0;
        
        try {
          const postsRef = collection(db, 'posts');
          const postsCountSnapshot = await getCountFromServer(postsRef);
          totalPosts = postsCountSnapshot.data().count;
        } catch (error) {
          console.log('Coleção posts não existe ainda');
        }
        
        try {
          const reportsRef = collection(db, 'reports');
          const reportsCountSnapshot = await getCountFromServer(reportsRef);
          reportedContent = reportsCountSnapshot.data().count;
        } catch (error) {
          console.log('Coleção reports não existe ainda');
        }
        
        const statsData = {
          totalUsers,
          activeUsers,
          totalPosts,
          reportedContent
        };
        
        setStats(statsData);
        setLastFetch(now);
        console.log('✅ [AdminDashboard] Estatísticas carregadas:', statsData);
      } catch (err) {
        console.error("❌ [AdminDashboard] Erro ao buscar estatísticas:", err);
        setError("Erro ao buscar estatísticas do dashboard: " + err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [stats, lastFetch]);

  return (
    <div className="space-y-6">
      {/* Header do Dashboard */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Dashboard Administrativo</h1>
        <p className="text-muted-foreground">
          Visão geral do sistema e estatísticas principais
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}
      
      {error && (
        <div className="dashboard-card p-6 border-l-4 border-destructive bg-red-50 dark:bg-red-950/20">
          <h3 className="text-lg font-semibold text-destructive mb-2">Erro ao carregar dados</h3>
          <p className="text-destructive/80">{error}</p>
        </div>
      )}
      
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="dashboard-card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-primary/10 rounded-lg">
                <i className="fas fa-users text-primary text-xl"></i>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-muted-foreground">Total de Usuários</h3>
                <p className="text-2xl font-bold text-foreground">{stats.totalUsers}</p>
              </div>
            </div>
          </div>
          
          <div className="dashboard-card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <i className="fas fa-user-check text-green-500 text-xl"></i>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-muted-foreground">Usuários Ativos</h3>
                <p className="text-2xl font-bold text-foreground">{stats.activeUsers}</p>
              </div>
            </div>
          </div>
          
          <div className="dashboard-card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <i className="fas fa-file-alt text-blue-500 text-xl"></i>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-muted-foreground">Total de Posts</h3>
                <p className="text-2xl font-bold text-foreground">{stats.totalPosts}</p>
              </div>
            </div>
          </div>
          
          <div className="dashboard-card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <i className="fas fa-exclamation-triangle text-red-500 text-xl"></i>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-muted-foreground">Conteúdo Reportado</h3>
                <p className="text-2xl font-bold text-destructive">{stats.reportedContent}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ações Rápidas */}
      <div className="dashboard-card p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <a 
            href="/admin/questions" 
            className="flex flex-col items-center p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            <i className="fas fa-question-circle text-primary text-2xl mb-2"></i>
            <span className="text-sm font-medium text-foreground">Questões</span>
          </a>
          
          <a 
            href="/admin/users" 
            className="flex flex-col items-center p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            <i className="fas fa-users text-primary text-2xl mb-2"></i>
            <span className="text-sm font-medium text-foreground">Usuários</span>
          </a>
          
          <a 
            href="/admin/filters" 
            className="flex flex-col items-center p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            <i className="fas fa-filter text-primary text-2xl mb-2"></i>
            <span className="text-sm font-medium text-foreground">Filtros</span>
          </a>
          
          <a 
            href="/admin/notifications" 
            className="flex flex-col items-center p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            <i className="fas fa-bell text-primary text-2xl mb-2"></i>
            <span className="text-sm font-medium text-foreground">Notificações</span>
          </a>
          
          <a 
            href="/admin/audit" 
            className="flex flex-col items-center p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            <i className="fas fa-clipboard-list text-primary text-2xl mb-2"></i>
            <span className="text-sm font-medium text-foreground">Auditoria</span>
          </a>
          
          <a 
            href="/admin/pulse-ai" 
            className="flex flex-col items-center p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            <i className="fas fa-brain text-primary text-2xl mb-2"></i>
            <span className="text-sm font-medium text-foreground">Pulse AI</span>
          </a>
        </div>
      </div>

      <Outlet />
    </div>
  );
};

export default AdminDashboard;