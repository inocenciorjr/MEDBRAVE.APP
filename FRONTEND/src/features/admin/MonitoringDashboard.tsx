/**
 * 📊 DASHBOARD DE MONITORAMENTO
 * 
 * Página administrativa para visualizar estatísticas de monitoramento,
 * incluindo requisições, page views, ações do usuário e métricas de performance.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Tabs,
  Tab,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Timeline as TimelineIcon,
  Speed as SpeedIcon,
  Visibility as VisibilityIcon,
  Mouse as MouseIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { fetchWithAuth } from '../../services/fetchWithAuth';

// Declaração de tipo para o monitor frontend
declare global {
  interface Window {
    frontendMonitor?: {
      enableFullMonitoring: () => void;
      disableFullMonitoring: () => void;
    };
  }
}

interface MonitoringStats {
  totalRequests: number;
  errorRequests: number;
  errorRate: number;
  avgResponseTime: number;
  requestsByMethod: Record<string, number>;
  requestsByEndpoint: Record<string, number>;
  requestsByUser: Record<string, number>;
  requestsByStatus: Record<string, number>;
  requestsBySource: Record<string, number>;
  errorsByType: Record<string, number>;
  slowestEndpoints: Array<{
    endpoint: string;
    avgResponseTime: number;
    requestCount: number;
  }>;
  totalPageViews: number;
  pageViewsByPath: Record<string, number>;
  totalUserActions: number;
  actionsByType: Record<string, number>;
  timeRange?: {
    start: string;
    end: string;
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`monitoring-tabpanel-${index}`}
      aria-labelledby={`monitoring-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const MonitoringDashboard: React.FC = () => {
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth('/api/monitoring/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        setError(null);
      } else if (response.status === 401) {
        // Erro de autenticação - desabilitar auto-refresh
        setAutoRefresh(false);
        throw new Error('Erro de autenticação - auto-refresh desabilitado');
      } else {
        throw new Error('Erro ao carregar estatísticas');
      }
    } catch (err) {
      // Se for erro de autenticação, desabilitar auto-refresh
      if (err instanceof Error && (err.message.includes('401') || err.message.includes('autenticação'))) {
        setAutoRefresh(false);
      }
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const toggleMonitoring = async () => {
    try {
      const response = await fetchWithAuth('/api/monitoring/toggle', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled: !isEnabled })
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsEnabled(data.enabled);
      }
    } catch (err) {
      setError('Erro ao alterar status do monitoramento');
    }
  };

  const clearData = async () => {
    try {
      const response = await fetchWithAuth('/api/monitoring/clear', {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchStats();
      }
    } catch (err) {
      setError('Erro ao limpar dados');
    }
  };

  const exportReport = async (format: 'json' | 'csv') => {
    try {
      const response = await fetchWithAuth(`/api/monitoring/export?format=${format}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `monitoring-report-${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      setError('Erro ao exportar relatório');
    }
  };

  useEffect(() => {
    // Habilitar monitoramento frontend apenas nesta página
    if (window.frontendMonitor) {
      window.frontendMonitor.enableFullMonitoring();
    }
    
    fetchStats();
    
    // Cleanup: desabilitar monitoramento ao sair da página
    return () => {
      if (window.frontendMonitor) {
        window.frontendMonitor.disableFullMonitoring();
      }
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchStats, 30000); // Atualizar a cada 30 segundos
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) {
      return '0';
    }
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  const formatPercentage = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) {
      return '0.00%';
    }
    return `${num.toFixed(2)}%`;
  };

  const getStatusColor = (errorRate: number) => {
    if (errorRate < 1) return 'success';
    if (errorRate < 5) return 'warning';
    return 'error';
  };

  if (loading && !stats) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Dashboard de Monitoramento
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          📊 Dashboard de Monitoramento
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
            }
            label="Auto-refresh"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={isEnabled}
                onChange={toggleMonitoring}
                color="primary"
              />
            }
            label="Monitoramento Ativo"
          />
          
          <Tooltip title="Atualizar dados">
            <IconButton onClick={fetchStats} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Exportar JSON">
            <IconButton onClick={() => exportReport('json')}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Limpar dados">
            <IconButton onClick={clearData} color="error">
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {stats && (
        <>
          {/* Cards de Resumo */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TimelineIcon color="primary" />
                    <Typography variant="h6">Requisições</Typography>
                  </Box>
                  <Typography variant="h4">
                    {formatNumber(stats.totalRequests)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total de requisições
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ErrorIcon color="error" />
                    <Typography variant="h6">Taxa de Erro</Typography>
                  </Box>
                  <Typography variant="h4">
                    <Chip 
                      label={formatPercentage(stats.errorRate)}
                      color={getStatusColor(stats.errorRate)}
                      size="small"
                    />
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatNumber(stats.errorRequests)} erros
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SpeedIcon color="info" />
                    <Typography variant="h6">Tempo Médio</Typography>
                  </Box>
                  <Typography variant="h4">
                    {stats.avgResponseTime ? stats.avgResponseTime.toFixed(0) : '0'}ms
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tempo de resposta
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <VisibilityIcon color="success" />
                    <Typography variant="h6">Page Views</Typography>
                  </Box>
                  <Typography variant="h4">
                    {formatNumber(stats.totalPageViews)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Visualizações de página
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Tabs de Detalhes */}
          <Card>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                <Tab label="Requisições" />
                <Tab label="Páginas" />
                <Tab label="Ações" />
                <Tab label="Performance" />
              </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="h6" gutterBottom>
                    Requisições por Método
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Método</TableCell>
                          <TableCell align="right">Quantidade</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(stats.requestsByMethod || {}).map(([method, count]) => (
                          <TableRow key={method}>
                            <TableCell>
                              <Chip label={method} size="small" />
                            </TableCell>
                            <TableCell align="right">{formatNumber(count)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
                
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="h6" gutterBottom>
                    Endpoints Mais Lentos
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Endpoint</TableCell>
                          <TableCell align="right">Tempo Médio</TableCell>
                          <TableCell align="right">Requisições</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(stats.slowestEndpoints || []).slice(0, 10).map((endpoint, index) => (
                          <TableRow key={index}>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                              {endpoint.endpoint}
                            </TableCell>
                            <TableCell align="right">
                              <Chip 
                                label={`${endpoint.avgResponseTime}ms`}
                                size="small"
                                color={endpoint.avgResponseTime > 1000 ? 'error' : 'default'}
                              />
                            </TableCell>
                            <TableCell align="right">{formatNumber(endpoint.requestCount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Typography variant="h6" gutterBottom>
                Páginas Mais Visitadas
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Página</TableCell>
                      <TableCell align="right">Visualizações</TableCell>
                      <TableCell align="right">Porcentagem</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(stats.pageViewsByPath || {})
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 20)
                      .map(([path, count]) => (
                        <TableRow key={path}>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{path}</TableCell>
                          <TableCell align="right">{formatNumber(count)}</TableCell>
                          <TableCell align="right">
                            {formatPercentage(stats.totalPageViews ? (count / stats.totalPageViews) * 100 : 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Typography variant="h6" gutterBottom>
                Ações do Usuário
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Ação</TableCell>
                      <TableCell align="right">Quantidade</TableCell>
                      <TableCell align="right">Porcentagem</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(stats.actionsByType || {})
                      .sort(([,a], [,b]) => b - a)
                      .map(([action, count]) => (
                        <TableRow key={action}>
                          <TableCell>
                            <Chip label={action} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell align="right">{formatNumber(count)}</TableCell>
                          <TableCell align="right">
                            {formatPercentage(stats.totalUserActions ? (count / stats.totalUserActions) * 100 : 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="h6" gutterBottom>
                    Requisições por Fonte
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Fonte</TableCell>
                          <TableCell align="right">Quantidade</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(stats.requestsBySource || {}).map(([source, count]) => (
                          <TableRow key={source}>
                            <TableCell>
                              <Chip 
                                label={source} 
                                size="small" 
                                color={source === 'frontend' ? 'primary' : 'secondary'}
                              />
                            </TableCell>
                            <TableCell align="right">{formatNumber(count)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
                
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="h6" gutterBottom>
                    Status das Requisições
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Status</TableCell>
                          <TableCell align="right">Quantidade</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(stats.requestsByStatus || {}).map(([status, count]) => (
                          <TableRow key={status}>
                            <TableCell>
                              <Chip 
                                label={status} 
                                size="small" 
                                color={status.startsWith('2') ? 'success' : status.startsWith('4') || status.startsWith('5') ? 'error' : 'default'}
                              />
                            </TableCell>
                            <TableCell align="right">{formatNumber(count)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </Grid>
            </TabPanel>
          </Card>
        </>
      )}
    </Box>
  );
};

export default MonitoringDashboard;