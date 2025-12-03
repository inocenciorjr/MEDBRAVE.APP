'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import MentorSidebar from '@/components/mentor/MentorSidebar';
import MentorHeader from '@/components/mentor/MentorHeader';
import { MedBraveLoader } from '@/components/ui/MedBraveLoader';

export interface MentorProfile {
  id?: string;
  userId?: string;
  name?: string;
  email?: string;
  avatar?: string;
  bio?: string;
  specialties?: string[];
  isActive?: boolean;
}

interface MentorLayoutProps {
  children: ReactNode;
}

export default function MentorLayout({ children }: MentorLayoutProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isMentor, setIsMentor] = useState(false);
  const [mentorProfile, setMentorProfile] = useState<MentorProfile | null>(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const checkMentorAccess = async () => {
      try {
        const supabase = createClient();
        
        // Primeiro tentar getSession (mais rápido e funciona logo após callback)
        let { data: { session } } = await supabase.auth.getSession();
        
        // Se não tiver sessão, aguardar um pouco e tentar novamente
        // (pode estar no meio de um redirect do OAuth)
        if (!session) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const retry = await supabase.auth.getSession();
          session = retry.data.session;
        }

        if (!session?.user) {
          router.push('/mentor-login');
          return;
        }

        const user = session.user;

        // Verificar se o usuário tem role de mentor na tabela users
        const { data: userData } = await supabase
          .from('users')
          .select('role, display_name, photo_url')
          .eq('id', user.id)
          .single();

        if (!userData || userData.role?.toUpperCase() !== 'MENTOR') {
          router.push('/?error=not_mentor');
          return;
        }

        // Buscar perfil de mentor
        const { data: mentorData } = await supabase
          .from('mentor_profiles')
          .select('*')
          .eq('userId', user.id)
          .single();

        setMentorProfile({
          ...mentorData,
          name: userData.display_name,
          avatar: userData.photo_url,
          email: user.email,
        });
        setIsMentor(true);
      } catch (error) {
        console.error('Erro ao verificar acesso de mentor:', error);
        router.push('/mentor-login');
      } finally {
        setIsLoading(false);
      }
    };

    checkMentorAccess();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <MedBraveLoader variant="breathing" size="lg" text="Carregando painel do mentor..." />
      </div>
    );
  }

  if (!isMentor) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background-light dark:bg-background-dark">
      {/* Mobile Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Fixed para sobrepor o conteúdo */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-out
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        onMouseEnter={() => !isMobileSidebarOpen && setIsSidebarExpanded(true)}
        onMouseLeave={() => !isMobileSidebarOpen && setIsSidebarExpanded(false)}
      >
        <MentorSidebar
          isExpanded={isSidebarExpanded}
          isMobile={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          mentorProfile={mentorProfile}
        />
      </div>

      {/* Main Content - Com margem para a sidebar colapsada */}
      <main className="flex-1 lg:ml-20">
        <div className="min-h-screen">
          {/* Header */}
          <MentorHeader
            mentorProfile={mentorProfile}
            onMenuClick={() => setIsMobileSidebarOpen(true)}
          />

          {/* Page Content */}
          <div className="p-4 md:p-6 lg:p-8">
            <div className="max-w-[1600px] mx-auto">
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
