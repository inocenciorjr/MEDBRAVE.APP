'use client';

import React from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import { useTheme } from '@/app/providers';

interface PlanRequired403Props {
  message?: string;
}

/**
 * Componente 403 - Plano Requerido
 * 
 * Baseado no design do code.html com leão piscando
 * Mostra quando usuário não tem plano ativo
 * Inclui sidebar e botão de tema para melhor UX
 */
export function PlanRequired403({ 
  message = 'Não identificamos um plano ativo na sua conta.',
}: PlanRequired403Props) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="fixed lg:static inset-y-0 left-0 z-50">
        <Sidebar />
      </div>

      {/* Conteúdo principal */}
      <div className="relative flex-1 flex items-center justify-center p-4 bg-background-light dark:bg-background-dark overflow-auto">
        {/* Botão de tema - canto superior direito */}
        <button
          onClick={toggleTheme}
          className="fixed top-6 right-6 z-50 p-3 rounded-full bg-surface-light dark:bg-surface-dark shadow-lg dark:shadow-dark-xl hover:shadow-xl dark:hover:shadow-dark-2xl transition-all duration-200 hover:scale-110"
          aria-label="Alternar tema"
        >
          <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">
            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        {/* Animação customizada de piscar */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes blink-eyes {
              0%, 10%, 100% { opacity: 1; }
              5% { opacity: 0; }
            }
            .blink-animation {
              animation: blink-eyes 4s ease-in-out infinite;
            }
          `
        }} />
      {/* Background com nuvens */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Nuvem 1 */}
        <div className="absolute top-[15%] left-[10%] opacity-80">
          <div className="relative">
            <div className="absolute w-[100px] h-[100px] bg-surface-light dark:bg-surface-dark rounded-full shadow-lg dark:shadow-dark-lg" />
            <div className="absolute w-[60px] h-[60px] bg-surface-light dark:bg-surface-dark rounded-full shadow-lg dark:shadow-dark-lg top-5 -left-10" />
            <div className="absolute w-[80px] h-[80px] bg-surface-light dark:bg-surface-dark rounded-full shadow-lg dark:shadow-dark-lg top-2.5 left-[50px]" />
          </div>
        </div>

        {/* Nuvem 2 */}
        <div className="absolute top-[25%] right-[12%] opacity-80">
          <div className="relative">
            <div className="absolute w-[120px] h-[120px] bg-surface-light dark:bg-surface-dark rounded-full shadow-lg dark:shadow-dark-lg" />
            <div className="absolute w-[70px] h-[70px] bg-surface-light dark:bg-surface-dark rounded-full shadow-lg dark:shadow-dark-lg top-[30px] -left-[50px]" />
            <div className="absolute w-[90px] h-[90px] bg-surface-light dark:bg-surface-dark rounded-full shadow-lg dark:shadow-dark-lg top-5 left-[60px]" />
          </div>
        </div>

        {/* Nuvem 3 - apenas desktop */}
        <div className="absolute hidden md:block top-[40%] left-[25%] opacity-80">
          <div className="relative">
            <div className="absolute w-[80px] h-[80px] bg-surface-light dark:bg-surface-dark rounded-full shadow-lg dark:shadow-dark-lg" />
            <div className="absolute w-[50px] h-[50px] bg-surface-light dark:bg-surface-dark rounded-full shadow-lg dark:shadow-dark-lg top-[15px] -left-[30px]" />
            <div className="absolute w-[60px] h-[60px] bg-surface-light dark:bg-surface-dark rounded-full shadow-lg dark:shadow-dark-lg top-2.5 left-10" />
          </div>
        </div>

        {/* Chão com tijolos */}
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-border-light dark:bg-border-dark">
          <div className="absolute inset-0 bg-gradient-to-t from-transparent to-black/5 dark:to-white/5">
            <div className="absolute bottom-0 w-full h-full" style={{ perspective: '300px' }}>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px]" style={{ transform: 'rotateX(60deg) translateY(100px)' }}>
                <div className="w-full h-full relative">
                  {/* Tijolos */}
                  {[
                    { w: 48, h: 24, b: 0, l: 180 },
                    { w: 48, h: 24, b: 0, l: 230 },
                    { w: 48, h: 24, b: 0, l: 330 },
                    { w: 48, h: 24, b: 0, l: 380 },
                    { w: 24, h: 24, b: 26, l: 180 },
                    { w: 48, h: 24, b: 26, l: 206 },
                    { w: 48, h: 24, b: 26, l: 256 },
                    { w: 48, h: 24, b: 26, l: 356 },
                    { w: 22, h: 24, b: 26, l: 406 },
                    { w: 48, h: 24, b: 52, l: 190 },
                    { w: 48, h: 24, b: 52, l: 340 },
                    { w: 38, h: 24, b: 78, l: 180 },
                    { w: 48, h: 24, b: 78, l: 220 },
                    { w: 48, h: 24, b: 78, l: 370 },
                  ].map((brick, i) => (
                    <div
                      key={i}
                      className="absolute bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm"
                      style={{
                        width: `${brick.w}px`,
                        height: `${brick.h}px`,
                        bottom: `${brick.b}px`,
                        left: `${brick.l}px`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="container mx-auto z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-16 lg:gap-8">
          {/* Texto */}
          <div className="text-center lg:text-left">
            <p className="text-xl font-medium text-primary">Erro 403</p>
            <h1 className="text-5xl md:text-6xl font-bold text-text-light-primary dark:text-text-dark-primary tracking-tight mt-2">
              Acesso Negado
            </h1>
            <p className="text-text-light-secondary dark:text-text-dark-secondary mt-4 max-w-md mx-auto lg:mx-0">
              {message}
            </p>
            <Link
              href="/planos"
              className="inline-block mt-8 px-6 py-3 bg-primary text-white font-medium rounded-lg shadow-lg dark:shadow-dark-lg hover:bg-primary/90 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Adquirir um Plano
            </Link>
          </div>

          {/* Leão com barreira */}
          <div className="flex items-end justify-center h-full">
            <div className="relative w-full max-w-sm drop-shadow-2xl">
              {/* Linha do chão */}
              <div className="absolute bottom-10 left-0 right-0 h-0.5 bg-border-light dark:bg-border-dark w-full" />

              {/* Container do leão */}
              <div className="relative flex items-end justify-center h-64">
                {/* Leão com efeito 3D */}
                <div className="absolute bottom-10 bg-primary w-32 h-48 rounded-t-full z-10">
                  {/* Efeito de profundidade 3D */}
                  <div className="absolute inset-0 rounded-t-full shadow-[inset_0_8px_16px_rgba(0,0,0,0.4)]" />
                  <div className="absolute inset-0 rounded-t-full shadow-[0_0_0_5px_rgba(124,58,237,0.7),0_0_0_8px_rgba(100,40,200,0.5),0_10px_30px_rgba(0,0,0,0.3)]" />
                  
                  {/* Olhos piscando sincronizados */}
                  <div className="absolute top-16 left-1/2 -translate-x-1/2 flex gap-4 z-10">
                    <div className="w-2.5 h-1.5 bg-surface-light rounded-full blink-animation" />
                    <div className="w-2.5 h-1.5 bg-surface-light rounded-full blink-animation" />
                  </div>
                </div>

                {/* Postes */}
                <div className="absolute bottom-10 left-1/2 -translate-x-28 w-2 h-24 bg-surface-light dark:bg-surface-dark shadow-md dark:shadow-dark-lg" />
                <div className="absolute bottom-10 left-1/2 translate-x-[6.75rem] w-2 h-24 bg-surface-light dark:bg-surface-dark shadow-md dark:shadow-dark-lg" />

                {/* Barreira NO ENTRY */}
                <div className="absolute bottom-28 w-64 h-8 bg-yellow-400 dark:bg-yellow-500 flex items-center justify-around z-20 shadow-lg dark:shadow-dark-lg">
                  <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.7)_10px,rgba(0,0,0,0.7)_12px)]" />
                  <span className="relative text-black text-xs font-bold tracking-wider">NO ENTRY</span>
                  <span className="relative text-black text-xs font-bold tracking-wider">NO ENTRY</span>
                  <span className="relative text-black text-xs font-bold tracking-wider">NO ENTRY</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
