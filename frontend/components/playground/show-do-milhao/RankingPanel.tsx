'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/app/providers';
import { formatPrize } from './types';
import * as showDoMilhaoService from '@/services/showDoMilhaoService';

type TabType = 'personal' | 'daily' | 'alltime' | 'fatality' | 'millionaires';

interface GameHistoryEntry {
  id: string;
  prize: number;
  correctAnswers: number;
  totalQuestions: number;
  timeSpent: number;
  multiplier: number;
  createdAt: string;
}

interface RankingPanelProps {
  onBack: () => void;
}

export function RankingPanel({ onBack }: RankingPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('daily');
  const [ranking, setRanking] = useState<showDoMilhaoService.IRankingEntry[]>([]);
  const [allTimeRanking, setAllTimeRanking] = useState<showDoMilhaoService.IRankingEntry[]>([]);
  const [fatalityRanking, setFatalityRanking] = useState<showDoMilhaoService.IFatalityEntry[]>([]);
  const [millionaires, setMillionaires] = useState<showDoMilhaoService.IMillionaireEntry[]>([]);
  const [userHistory, setUserHistory] = useState<GameHistoryEntry[]>([]);
  const [stats, setStats] = useState<{ totalPlayers: number; winners: number; millionaires: number; date: string } | null>(null);
  const [allTimeStats, setAllTimeStats] = useState<{ totalPlayers: number } | null>(null);
  const [fatalityStats, setFatalityStats] = useState<{ totalPlayers: number; highestMultiplier: number } | null>(null);
  const [millionairesStats, setMillionairesStats] = useState<{ totalMillionaires: number; yearMonth: string } | null>(null);
  const [userStats, setUserStats] = useState<showDoMilhaoService.IShowDoMilhaoStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [rankingData, userStatsData, fatalityData, millionairesData, allTimeData, historyData] = await Promise.all([
        showDoMilhaoService.getDailyRanking(),
        showDoMilhaoService.getStats(),
        showDoMilhaoService.getFatalityRanking(),
        showDoMilhaoService.getMonthlyMillionaires(),
        showDoMilhaoService.getAllTimeRanking().catch(() => ({ ranking: [], stats: { totalPlayers: 0 } })),
        showDoMilhaoService.getUserGameHistory().catch(() => ({ history: [] })),
      ]);

      setRanking(rankingData.ranking);
      setStats(rankingData.stats);
      setUserStats(userStatsData);
      setFatalityRanking(fatalityData.ranking);
      setFatalityStats(fatalityData.stats);
      setMillionaires(millionairesData.ranking);
      setMillionairesStats(millionairesData.stats);
      setAllTimeRanking(allTimeData.ranking || []);
      setAllTimeStats(allTimeData.stats || { totalPlayers: 0 });
      setUserHistory(historyData.history || []);
    } catch (error) {
      console.error('Erro ao carregar ranking:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatYearMonth = (yearMonth: string) => {
    const [year, month] = yearMonth.split('-');
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${months[parseInt(month) - 1]} de ${year}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const tabs = [
    { id: 'personal' as TabType, label: 'Meu Histórico', icon: 'person' },
    { id: 'daily' as TabType, label: 'Ranking do Dia', icon: 'today' },
    { id: 'alltime' as TabType, label: 'Ranking Geral', icon: 'leaderboard' },
    { id: 'fatality' as TabType, label: 'Fatality', icon: 'local_fire_department', isFatality: true },
    { id: 'millionaires' as TabType, label: 'Milionários', icon: 'emoji_events' },
  ];


  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4">
      {/* Header com botão voltar - RESPONSIVO */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <button
          onClick={onBack}
          className="p-1.5 sm:p-2 rounded-lg transition-all hover:bg-white/10 hover:scale-105"
        >
          <span className="material-symbols-outlined text-white text-xl sm:text-2xl">arrow_back</span>
        </button>
        
        {/* Título - RESPONSIVO */}
        <div className="relative inline-block px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl"
          style={{
            background: 'linear-gradient(180deg, rgba(88,28,135,0.7) 0%, rgba(30,10,60,0.9) 100%)',
            border: '2px solid rgba(168,85,247,0.5)',
            boxShadow: '0 0 20px rgba(168,85,247,0.3)',
          }}
        >
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400">
            RANKING
          </h1>
        </div>
        
        <div className="w-8 sm:w-10" /> {/* Spacer */}
      </div>

      {/* Tabs - RESPONSIVO */}
      <div className="flex justify-center gap-1 sm:gap-2 mb-4 sm:mb-6 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all duration-300
              ${activeTab === tab.id
                ? tab.isFatality
                  ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white scale-105'
                  : 'bg-gradient-to-r from-purple-600 to-violet-500 text-white scale-105'
                : 'bg-white/5 text-purple-200/70 hover:bg-white/10 border border-purple-500/20'
              }
            `}
            style={activeTab === tab.id ? { boxShadow: tab.isFatality ? '0 0 20px rgba(239,68,68,0.4)' : '0 0 20px rgba(168,85,247,0.4)' } : {}}
          >
            <span className="material-symbols-outlined text-base sm:text-lg">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Conteúdo das Tabs - RESPONSIVO */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="max-h-[50vh] sm:max-h-[55vh] md:max-h-[60vh] overflow-y-auto custom-scrollbar"
        >
          {isLoading ? (
            <LoadingSkeleton />
          ) : (
            <>
              {activeTab === 'personal' && <PersonalTab userStats={userStats} userHistory={userHistory} formatPrize={formatPrize} formatTime={formatTime} formatDate={formatDate} />}
              {activeTab === 'daily' && <DailyTab ranking={ranking} stats={stats} formatTime={formatTime} formatPrize={formatPrize} />}
              {activeTab === 'alltime' && <AllTimeTab ranking={allTimeRanking} stats={allTimeStats} formatTime={formatTime} formatPrize={formatPrize} />}
              {activeTab === 'fatality' && <FatalityTab ranking={fatalityRanking} stats={fatalityStats} formatTime={formatTime} />}
              {activeTab === 'millionaires' && <MillionairesTab ranking={millionaires} stats={millionairesStats} formatTime={formatTime} formatYearMonth={formatYearMonth} />}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Botão Jogar - RESPONSIVO */}
      <div className="text-center mt-4 sm:mt-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 sm:gap-3 px-6 sm:px-8 py-2.5 sm:py-3 rounded-full font-bold text-base sm:text-lg text-white transition-all duration-300 hover:scale-105"
          style={{
            background: 'linear-gradient(180deg, rgba(139,92,246,0.9) 0%, rgba(88,28,135,1) 100%)',
            border: '2px solid rgba(216,180,254,0.8)',
            boxShadow: '0 0 15px #a855f7, 0 0 30px rgba(168,85,247,0.5)',
          }}
        >
          <span className="material-symbols-outlined text-lg sm:text-xl">play_arrow</span>
          Jogar
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="animate-pulse h-16 rounded-xl"
          style={{ background: 'linear-gradient(90deg, rgba(88,28,135,0.3) 0%, rgba(88,28,135,0.1) 100%)' }}
        />
      ))}
    </div>
  );
}

function PanelContainer({ children, title, icon, subtitle, isFatality = false }: { children: React.ReactNode; title: string; icon: string; subtitle?: string; isFatality?: boolean }) {
  return (
    <div 
      className="rounded-lg sm:rounded-xl overflow-hidden"
      style={{
        background: isFatality 
          ? 'linear-gradient(180deg, rgba(127,29,29,0.4) 0%, rgba(30,10,20,0.9) 100%)'
          : 'linear-gradient(180deg, rgba(88,28,135,0.4) 0%, rgba(30,10,60,0.9) 100%)',
        border: isFatality ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(168,85,247,0.3)',
      }}
    >
      <div 
        className="px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2"
        style={{
          background: isFatality 
            ? 'linear-gradient(90deg, rgba(185,28,28,0.3) 0%, rgba(127,29,29,0.2) 100%)'
            : 'linear-gradient(90deg, rgba(139,92,246,0.3) 0%, rgba(88,28,135,0.2) 100%)',
          borderBottom: isFatality ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(168,85,247,0.2)',
        }}
      >
        <span className={`material-symbols-outlined text-lg sm:text-xl ${isFatality ? 'text-red-400' : 'text-purple-400'}`}>{icon}</span>
        <div>
          <h2 className={`text-base sm:text-lg font-bold ${isFatality ? 'text-red-300' : 'text-purple-200'}`}>{title}</h2>
          {subtitle && <p className="text-[10px] sm:text-xs text-purple-300/60">{subtitle}</p>}
        </div>
      </div>
      <div className="p-2 sm:p-3">{children}</div>
    </div>
  );
}

function RankingPosition({ position }: { position: number }) {
  if (position === 1) {
    return (
      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)', boxShadow: '0 0 10px rgba(251,191,36,0.5)' }}>
        <span className="text-xs sm:text-sm font-black text-amber-900">1</span>
      </div>
    );
  }
  if (position === 2) {
    return (
      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'linear-gradient(180deg, #e5e7eb 0%, #9ca3af 100%)' }}>
        <span className="text-xs sm:text-sm font-black text-gray-700">2</span>
      </div>
    );
  }
  if (position === 3) {
    return (
      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'linear-gradient(180deg, #f59e0b 0%, #92400e 100%)' }}>
        <span className="text-xs sm:text-sm font-black text-amber-900">3</span>
      </div>
    );
  }
  return (
    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-purple-900/50 border border-purple-500/30 flex-shrink-0">
      <span className="text-xs sm:text-sm font-bold text-purple-300">{position}</span>
    </div>
  );
}

function EmptyState({ message, icon }: { message: string; icon: string }) {
  return (
    <div className="text-center py-8">
      <span className="material-symbols-outlined text-5xl text-purple-500/30 mb-3 block">{icon}</span>
      <p className="text-purple-300/60 text-sm">{message}</p>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: 'purple' | 'amber' | 'yellow' | 'green' | 'red' }) {
  const colors = {
    purple: { bg: 'rgba(139,92,246,0.2)', border: 'rgba(139,92,246,0.3)', text: 'text-purple-300', iconColor: 'text-purple-400' },
    amber: { bg: 'rgba(251,191,36,0.2)', border: 'rgba(251,191,36,0.3)', text: 'text-amber-300', iconColor: 'text-amber-400' },
    yellow: { bg: 'rgba(234,179,8,0.2)', border: 'rgba(234,179,8,0.3)', text: 'text-yellow-300', iconColor: 'text-yellow-400' },
    green: { bg: 'rgba(34,197,94,0.2)', border: 'rgba(34,197,94,0.3)', text: 'text-green-300', iconColor: 'text-green-400' },
    red: { bg: 'rgba(239,68,68,0.2)', border: 'rgba(239,68,68,0.3)', text: 'text-red-300', iconColor: 'text-red-400' },
  };
  const c = colors[color];

  return (
    <div className="p-2 sm:p-3 rounded-lg text-center" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
      <span className={`material-symbols-outlined text-lg sm:text-xl ${c.iconColor} mb-0.5 sm:mb-1 block`}>{icon}</span>
      <div className={`text-sm sm:text-lg font-bold ${c.text}`}>{value}</div>
      <div className="text-[10px] sm:text-xs text-purple-300/60">{label}</div>
    </div>
  );
}


// ============================================================================
// TAB: PERSONAL
// ============================================================================

interface PersonalTabProps {
  userStats: showDoMilhaoService.IShowDoMilhaoStats | null;
  userHistory: GameHistoryEntry[];
  formatPrize: (value: number) => string;
  formatTime: (seconds: number) => string;
  formatDate: (dateStr: string) => string;
}

function PersonalTab({ userStats, userHistory, formatPrize, formatTime, formatDate }: PersonalTabProps) {
  return (
    <div className="space-y-4">
      {userStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatCard icon="sports_esports" label="Jogos" value={userStats.gamesPlayed.toString()} color="purple" />
          <StatCard icon="emoji_events" label="Vitórias" value={userStats.wins.toString()} color="amber" />
          <StatCard icon="workspace_premium" label="Milhões" value={userStats.millionWins.toString()} color="yellow" />
          <StatCard icon="trending_up" label="Maior Prêmio" value={formatPrize(userStats.highestPrize)} color="green" />
        </div>
      )}

      <PanelContainer title="Meu Histórico" icon="history" subtitle="Todas as suas tentativas">
        {userHistory.length === 0 ? (
          <EmptyState message="Você ainda não jogou nenhuma partida" icon="sports_esports" />
        ) : (
          <div className="space-y-2">
            {userHistory.slice(0, 10).map((game, index) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{
                  background: game.prize >= 1000000 
                    ? 'linear-gradient(90deg, rgba(251,191,36,0.2) 0%, rgba(88,28,135,0.3) 100%)'
                    : 'linear-gradient(90deg, rgba(88,28,135,0.3) 0%, rgba(30,10,60,0.5) 100%)',
                  border: game.prize >= 1000000 ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(168,85,247,0.2)',
                }}
              >
                <div className="w-6 h-6 rounded-full flex items-center justify-center bg-purple-900/50 border border-purple-500/30">
                  <span className="text-xs font-bold text-purple-300">#{userHistory.length - index}</span>
                </div>
                <div className="flex-grow">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${game.prize >= 1000000 ? 'text-amber-400' : 'text-purple-200'}`}>
                      {formatPrize(game.prize)}
                    </span>
                    {game.prize >= 1000000 && <span className="material-symbols-outlined text-amber-400 text-sm">emoji_events</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-purple-300/60">
                    <span>{game.correctAnswers}/{game.totalQuestions}</span>
                    <span>•</span>
                    <span>{formatTime(game.timeSpent)}</span>
                    {game.multiplier > 1 && <><span>•</span><span className="text-red-400">{game.multiplier}x</span></>}
                  </div>
                </div>
                <div className="text-xs text-purple-300/50">{formatDate(game.createdAt)}</div>
              </motion.div>
            ))}
          </div>
        )}
      </PanelContainer>
    </div>
  );
}

// ============================================================================
// TAB: DAILY
// ============================================================================

interface DailyTabProps {
  ranking: showDoMilhaoService.IRankingEntry[];
  stats: { totalPlayers: number; winners: number; millionaires: number; date: string } | null;
  formatTime: (seconds: number) => string;
  formatPrize: (value: number) => string;
}

function DailyTab({ ranking, stats, formatTime, formatPrize }: DailyTabProps) {
  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-3 gap-2">
          <StatCard icon="group" label="Jogadores" value={stats.totalPlayers.toString()} color="purple" />
          <StatCard icon="emoji_events" label="Vencedores" value={stats.winners.toString()} color="amber" />
          <StatCard icon="workspace_premium" label="Milionários" value={stats.millionaires.toString()} color="yellow" />
        </div>
      )}

      <PanelContainer title="Ranking do Dia" icon="today" subtitle="Melhor resultado de cada jogador">
        {ranking.length === 0 ? (
          <EmptyState message="Nenhum jogador ainda hoje" icon="leaderboard" />
        ) : (
          <div className="space-y-2">
            {ranking.map((entry, index) => (
              <RankingRow key={entry.id} entry={entry} index={index} formatTime={formatTime} formatPrize={formatPrize} />
            ))}
          </div>
        )}
      </PanelContainer>
    </div>
  );
}

// ============================================================================
// TAB: ALL TIME
// ============================================================================

interface AllTimeTabProps {
  ranking: showDoMilhaoService.IRankingEntry[];
  stats: { totalPlayers: number } | null;
  formatTime: (seconds: number) => string;
  formatPrize: (value: number) => string;
}

function AllTimeTab({ ranking, stats, formatTime, formatPrize }: AllTimeTabProps) {
  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-1 gap-2">
          <StatCard icon="public" label="Total de Jogadores" value={stats.totalPlayers.toString()} color="purple" />
        </div>
      )}

      <PanelContainer title="Ranking Geral" icon="leaderboard" subtitle="Melhor de cada jogador (todos os tempos)">
        {ranking.length === 0 ? (
          <EmptyState message="Nenhum jogador ainda" icon="leaderboard" />
        ) : (
          <div className="space-y-2">
            {ranking.map((entry, index) => (
              <RankingRow key={entry.id} entry={entry} index={index} formatTime={formatTime} formatPrize={formatPrize} />
            ))}
          </div>
        )}
      </PanelContainer>
    </div>
  );
}

function RankingRow({ entry, index, formatTime, formatPrize }: { entry: showDoMilhaoService.IRankingEntry; index: number; formatTime: (s: number) => string; formatPrize: (v: number) => string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-center gap-3 p-3 rounded-lg"
      style={{
        background: index < 3 
          ? `linear-gradient(90deg, rgba(251,191,36,${0.2 - index * 0.05}) 0%, rgba(88,28,135,0.3) 100%)`
          : 'linear-gradient(90deg, rgba(88,28,135,0.3) 0%, rgba(30,10,60,0.5) 100%)',
        border: index < 3 ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(168,85,247,0.2)',
      }}
    >
      <RankingPosition position={index + 1} />
      <div className="flex items-center gap-2 flex-grow">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center overflow-hidden">
          {entry.avatarUrl ? (
            <img src={entry.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-bold text-xs">{entry.userName?.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div>
          <div className="font-semibold text-purple-100 text-sm">{entry.userName}</div>
          <div className="text-xs text-purple-300/60">
            {entry.correctAnswers}/{entry.totalQuestions} • {formatTime(entry.timeSpent)}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className={`font-bold text-sm ${entry.prize >= 1000000 ? 'text-amber-400' : 'text-green-400'}`}>
          {formatPrize(entry.prize)}
        </div>
        {entry.multiplier > 1 && <div className="text-xs text-red-400">{entry.multiplier}x</div>}
      </div>
    </motion.div>
  );
}


// ============================================================================
// TAB: FATALITY
// ============================================================================

interface FatalityTabProps {
  ranking: showDoMilhaoService.IFatalityEntry[];
  stats: { totalPlayers: number; highestMultiplier: number } | null;
  formatTime: (seconds: number) => string;
}

function FatalityTab({ ranking, stats, formatTime }: FatalityTabProps) {
  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 gap-2">
          <StatCard icon="local_fire_department" label="Maior Multiplicador" value={`${stats.highestMultiplier}x`} color="red" />
          <StatCard icon="group" label="Jogadores Fatality" value={stats.totalPlayers.toString()} color="red" />
        </div>
      )}

      <PanelContainer title="Ranking Fatality" icon="local_fire_department" subtitle="Os mais corajosos" isFatality>
        {ranking.length === 0 ? (
          <EmptyState message="Nenhum jogador usou Fatality ainda" icon="local_fire_department" />
        ) : (
          <div className="space-y-2">
            {ranking.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{
                  background: index < 3 
                    ? `linear-gradient(90deg, rgba(239,68,68,${0.25 - index * 0.05}) 0%, rgba(127,29,29,0.3) 100%)`
                    : 'linear-gradient(90deg, rgba(127,29,29,0.3) 0%, rgba(30,10,20,0.5) 100%)',
                  border: index < 3 ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(239,68,68,0.2)',
                }}
              >
                <RankingPosition position={index + 1} />
                <div className="flex items-center gap-2 flex-grow">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center overflow-hidden">
                    {entry.avatarUrl ? (
                      <img src={entry.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold text-xs">{entry.userName?.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-red-100 text-sm">{entry.userName}</div>
                    <div className="text-xs text-red-300/60">
                      {entry.correctAnswers}/{entry.totalQuestions} • {formatTime(entry.timeSpent)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-xl text-red-400">{entry.multiplier}x</div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </PanelContainer>
    </div>
  );
}

// ============================================================================
// TAB: MILLIONAIRES
// ============================================================================

interface MillionairesTabProps {
  ranking: showDoMilhaoService.IMillionaireEntry[];
  stats: { totalMillionaires: number; yearMonth: string } | null;
  formatTime: (seconds: number) => string;
  formatYearMonth: (yearMonth: string) => string;
}

function MillionairesTab({ ranking, stats, formatTime, formatYearMonth }: MillionairesTabProps) {
  return (
    <div className="space-y-4">
      {stats && (
        <div 
          className="p-3 rounded-lg text-center"
          style={{ 
            background: 'linear-gradient(90deg, rgba(251,191,36,0.2) 0%, rgba(234,179,8,0.1) 100%)', 
            border: '1px solid rgba(251,191,36,0.3)',
          }}
        >
          <span className="material-symbols-outlined text-2xl text-amber-400 mb-1 block">emoji_events</span>
          <div className="text-xl font-bold text-amber-300">{stats.totalMillionaires} Milionários</div>
          <div className="text-xs text-amber-300/60">{formatYearMonth(stats.yearMonth)}</div>
        </div>
      )}

      <PanelContainer title="Hall dos Milionários" icon="emoji_events" subtitle="Os que conquistaram o milhão">
        {ranking.length === 0 ? (
          <EmptyState message="Nenhum milionário este mês" icon="emoji_events" />
        ) : (
          <div className="space-y-2">
            {ranking.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{
                  background: 'linear-gradient(90deg, rgba(251,191,36,0.15) 0%, rgba(88,28,135,0.3) 100%)',
                  border: '1px solid rgba(251,191,36,0.3)',
                }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)' }}>
                  <span className="material-symbols-outlined text-xl text-amber-900">emoji_events</span>
                </div>
                <div className="flex items-center gap-2 flex-grow">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center overflow-hidden">
                    {entry.avatarUrl ? (
                      <img src={entry.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold text-xs">{entry.userName?.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-amber-100 text-sm">{entry.userName}</div>
                    <div className="text-xs text-amber-300/60">
                      {formatTime(entry.timeSpent)} • {new Date(entry.achievedAt).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm text-amber-400">R$ 1.000.000</div>
                  {entry.multiplier > 1 && <div className="text-xs text-red-400">{entry.multiplier}x</div>}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </PanelContainer>
    </div>
  );
}
