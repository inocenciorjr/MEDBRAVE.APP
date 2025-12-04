import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    'text-cyan-800',
    'bg-cyan-100',
    'text-rose-800',
    'bg-rose-100',
    'text-pink-800',
    'bg-pink-100',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#7C3AED',
        'background-light': '#F8F8FA',
        'background-dark': '#0A0A0A',
        'surface-light': '#FFFFFF',
        'surface-dark': '#1A1A1A',
        'text-light-primary': '#111827',
        'text-dark-primary': '#FFFFFF',
        'text-light-secondary': '#6B7280',
        'text-dark-secondary': '#A0A0A0',
        'sidebar-light': '#F5F3FF',
        'sidebar-dark': '#000000',
        'sidebar-active-light': '#E9E5FF',
        'sidebar-active-dark': '#7C3AED',
        'border-light': '#E5E7EB',
        'border-dark': '#2A2A2A',
        // Cores customizadas para barras de progresso com contraste garantido
        'progress-bar': {
          'cyan-light': '#0891b2',      // cyan-600 - escuro o suficiente para contrastar com cyan-100
          'cyan-dark': '#06b6d4',       // cyan-500 - claro o suficiente para contrastar com cyan-900/50
          'cyan-indicator-light': '#164e63',  // cyan-900
          'cyan-indicator-dark': '#67e8f9',   // cyan-300
          'purple-light': '#9333ea',    // purple-600
          'purple-dark': '#a855f7',     // purple-500
          'purple-indicator-light': '#581c87',  // purple-900
          'purple-indicator-dark': '#d8b4fe',   // purple-300
          'red-light': '#dc2626',       // red-600
          'red-dark': '#ef4444',        // red-500
          'red-indicator-light': '#7f1d1d',     // red-900
          'red-indicator-dark': '#fca5a5',      // red-300
          'orange-light': '#ea580c',    // orange-600
          'orange-dark': '#f97316',     // orange-500
          'orange-indicator-light': '#7c2d12',  // orange-900
          'orange-indicator-dark': '#fdba74',   // orange-300
          'pink-light': '#db2777',      // pink-600
          'pink-dark': '#ec4899',       // pink-500
          'pink-indicator-light': '#831843',    // pink-900
          'pink-indicator-dark': '#f9a8d4',     // pink-300
          'blue-light': '#2563eb',      // blue-600
          'blue-dark': '#3b82f6',       // blue-500
          'blue-indicator-light': '#1e3a8a',    // blue-900
          'blue-indicator-dark': '#93c5fd',     // blue-300
        },
      },
      fontFamily: {
        display: ['var(--font-poppins)', 'IBM Plex Sans', 'sans-serif'],
        inter: ['var(--font-inter)', 'Inter', 'sans-serif'],
        azonix: ['Azonix', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '1rem',
      },
      boxShadow: {
        'dark-xl': '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
        'dark-lg': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
        'dark-2xl': '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in-from-top': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-from-bottom': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'zoom-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in-from-top': 'slide-in-from-top 0.3s ease-out',
        'slide-in-from-bottom': 'slide-in-from-bottom 0.3s ease-out',
        'slide-down': 'slide-down 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'zoom-in': 'zoom-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
}

export default config
