// Componente de ícones customizados para o MedBrave
import React from 'react';

// Ícone de busca customizado
export const CustomSearchIcon = ({ className = "w-4 h-4", ...props }) => (
  <img 
    src="/src/assets/icons/search-icon.png" 
    alt="Search" 
    className={className}
    {...props}
  />
);

// Ícone de filtro customizado
export const CustomFilterIcon = ({ className = "w-4 h-4", ...props }) => (
  <img 
    src="/src/assets/icons/filter-icon.png" 
    alt="Filter" 
    className={className}
    {...props}
  />
);

// Ícone de estatísticas customizado
export const CustomStatsIcon = ({ className = "w-4 h-4", ...props }) => (
  <img 
    src="/src/assets/icons/stats-icon.png" 
    alt="Statistics" 
    className={className}
    {...props}
  />
);

// Ícone de coração customizado
export const CustomHeartIcon = ({ className = "w-4 h-4", ...props }) => (
  <img 
    src="/src/assets/icons/heart-icon.png" 
    alt="Heart" 
    className={className}
    {...props}
  />
);

// Ícone de pasta customizado
export const CustomFolderIcon = ({ className = "w-4 h-4", ...props }) => (
  <img 
    src="/src/assets/icons/folder-icon.png" 
    alt="Folder" 
    className={className}
    {...props}
  />
);

// Ícone de pasta aberta customizado
export const CustomFolderOpenIcon = ({ className = "w-4 h-4", ...props }) => (
  <img 
    src="/src/assets/icons/folder-icon.png" 
    alt="Folder Open" 
    className={className}
    style={{ filter: 'brightness(1.2)' }}
    {...props}
  />
);

// Ícone de dashboard customizado
export const CustomDashboardIcon = ({ className = "w-5 h-5", ...props }) => (
  <img 
    src="/src/assets/icons/dashboard-icon.png" 
    alt="Dashboard" 
    className={className}
    {...props}
  />
);

// Ícone de revisões customizado
export const CustomRevisionIcon = ({ className = "w-5 h-5", ...props }) => (
  <img 
    src="/src/assets/icons/revision-icon.png" 
    alt="Revision" 
    className={className}
    {...props}
  />
);

// Ícone de flashcards customizado
export const CustomFlashcardIcon = ({ className = "w-5 h-5", ...props }) => (
  <img 
    src="/src/assets/icons/flashcard-icon.png" 
    alt="Flashcard" 
    className={className}
    {...props}
  />
);

// Ícone de questões customizado
export const CustomQuestionIcon = ({ className = "w-5 h-5", ...props }) => (
  <img 
    src="/src/assets/icons/question-icon.png" 
    alt="Question" 
    className={className}
    {...props}
  />
);

// Ícone de simulados customizado
export const CustomSimulationIcon = ({ className = "w-5 h-5", ...props }) => (
  <img 
    src="/src/assets/icons/simulation-icon.png" 
    alt="Simulation" 
    className={className}
    {...props}
  />
);

// Ícone de conquistas customizado
export const CustomAchievementIcon = ({ className = "w-5 h-5", ...props }) => (
  <img 
    src="/src/assets/icons/achievement-icon.png" 
    alt="Achievement" 
    className={className}
    {...props}
  />
);

// Ícone de perfil customizado
export const CustomProfileIcon = ({ className = "w-5 h-5", ...props }) => (
  <img 
    src="/src/assets/icons/profile-icon.png" 
    alt="Profile" 
    className={className}
    {...props}
  />
);

// Ícone de configurações customizado
export const CustomSettingsIcon = ({ className = "w-5 h-5", ...props }) => (
  <img 
    src="/src/assets/icons/settings-icon.png" 
    alt="Settings" 
    className={className}
    {...props}
  />
);

// Ícone de notificação customizado
export const CustomNotificationIcon = ({ className = "w-4 h-4", ...props }) => (
  <img 
    src="/src/assets/icons/notification-icon.png" 
    alt="Notification" 
    className={className}
    {...props}
  />
);

// Ícone de email customizado
export const CustomMailIcon = ({ className = "w-4 h-4", ...props }) => (
  <img 
    src="/src/assets/icons/mail-icon.png" 
    alt="Mail" 
    className={className}
    {...props}
  />
);

// Ícone de ajuda customizado
export const CustomHelpIcon = ({ className = "w-4 h-4", ...props }) => (
  <img 
    src="/src/assets/icons/help-icon.png" 
    alt="Help" 
    className={className}
    {...props}
  />
);

// Ícone de listas de questões customizado
export const CustomQuestionListIcon = ({ className = "w-5 h-5", ...props }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
    {...props}
  >
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2z"/>
    <circle cx="12" cy="17" r="1.5" fill="currentColor"/>
    <path d="M9 17h2M13 17h2" stroke="currentColor" strokeWidth="1" fill="none"/>
  </svg>
);

// Ícone de planner customizado
export const CustomPlannerIcon = ({ className = "w-5 h-5", ...props }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
    {...props}
  >
    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
    <circle cx="16" cy="11" r="1" fill="currentColor"/>
    <circle cx="16" cy="14" r="1" fill="currentColor"/>
  </svg>
);

