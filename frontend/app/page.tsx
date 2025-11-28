'use client';

import { Suspense } from 'react';
import { PagePlanGuard } from '@/components/guards/PagePlanGuard';
import MainLayout from '@/components/layout/MainLayout';
import SimuladosGrid from '@/components/dashboard/SimuladosGrid';
import ActivityChart from '@/components/dashboard/ActivityChart';
import TasksChart from '@/components/dashboard/TasksChart';
import NextDelivery from '@/components/dashboard/NextDelivery';
import RightSidebar from '@/components/dashboard/RightSidebar';
import { DashboardSkeleton } from '@/components/skeletons';
import { Simulado, ActivityData, TaskCategory, Task, Delivery } from '@/types';

export default function Home() {
  // Mock data
  const simulados: Simulado[] = [
    {
      id: '1',
      title: 'Cardiologia Avançada',
      startDate: '28.08.2023',
      endDate: '30.11.2023',
      tags: [
        { id: '1', label: 'Medicina', color: 'text-purple-300 bg-purple-900/50 dark:bg-purple-900/50 dark:text-purple-300' },
        { id: '2', label: 'Cardio', color: 'text-indigo-300 bg-indigo-900/50 dark:bg-indigo-900/50 dark:text-indigo-300' },
      ],
      participants: [
        { id: '1', name: 'User 1', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDV5yQE0GsMMdaJR8DHCt09zdEc7Rwf74mroq8mKC1V1w58BMJjHSo59QseO1Xxq129gerXJ9SXnEov_VvG5eAwdakIu6tq_OwVyMASOJDIVUvwJLyRprPgTIH3w5U6aCLoGdp3_X2EBTmMqR8gnio4t7tnc8iBJ5q-VjehAQWIMYW6SZGAITBCwf7VrprGTKMsdthrMMSwbdNd5hJjOTTwzmyIc3HXQL_5NUUj4NyUlJ_vOoEDG78U295nnnqLv1OMt3VIWkDszZA' },
        { id: '2', name: 'User 2', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAr-I2mWhzDVde4Fia5TJ7iEsnTijssp4zh1Fingx_sFmOYxgkS8aCMRAYI6fNleiFmOyRzX1laCLS2SNpSSGQN4EFHO6vpwkxJCwoacvIbgCZzGP2ENhxUCoziTrlG2cC1NT5Zc3mQArTw1gQdYJnbzuFeIKu7SUAaFBSGt2QpUwWadx-nsxXSa01vJTXMQFKCC-3H_3WHwp7_yQTZOCE8eLYqDBwvE55DcGDh6DX1APcZUwv6vMfFO6YvyubphqpNC4HiJChJnv0' },
      ],
      totalParticipants: 17,
      progress: 80,
      filesCount: 2,
      questionsCount: 4,
      theme: 'violet',
    },
    {
      id: '2',
      title: 'Cirurgia Geral',
      startDate: '28.08.2023',
      endDate: '30.11.2023',
      tags: [
        { id: '3', label: 'Medicina', color: 'text-purple-300 bg-purple-900/50 dark:bg-purple-900/50 dark:text-purple-300' },
        { id: '4', label: 'Cirurgia', color: 'text-indigo-300 bg-indigo-900/50 dark:bg-indigo-900/50 dark:text-indigo-300' },
      ],
      participants: [
        { id: '3', name: 'User 3', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDLdCjjbCfkd1BqrZnzYONAebEyLLF6D3AsJSOarhEBWsfdFa0uuNswvPPhRo2FwC_KOZZlzEPFu3rz6ergW_V1EsvCYxv5FDV8PujF3u6NzEDtfb12k9Z3qMi-HFkfOEaW_LnJijutCkuAKCIWxnKEaivDYHQFMb8wR4h_2ci5S9WxWQtKsfk0AlfDDWjJhgagFgKDlW5UAyLbtk1VJZlqOYhq8eZ9l0c3t1dpP0ZmyNKzsmEzFOHfDZ1LpOvm07bMJk3Qxw9mNrU' },
        { id: '4', name: 'User 4', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD-NaW_6jGx20JqreNZyLf32WhAhHgE75stch02SY2DwTqWuOzfCnmW6cgxSQXYm-0iYrdThu4YXbJURfnI5aByNbqCYvoH_SHZ4RKdopf0lvXvbtZbWSbwRjhKwcXUJ8TGads6Ye8vf36LXHIthca5hvOrMRXCz2POq7-xeefsj3D1fam9mvk_J7E0xYy3yW5W68Dhi6hHd5qHYa_ifyulBT3GfEEQuXx8n2DrCw_bqrmTRqYIup14vEJolPSC_-kjQQvni8NFf2k' },
      ],
      totalParticipants: 22,
      progress: 50,
      filesCount: 3,
      questionsCount: 3,
      theme: 'indigo',
    },
    {
      id: '3',
      title: 'Dermatologia Clínica',
      startDate: '28.08.2023',
      endDate: '30.11.2023',
      tags: [
        { id: '5', label: 'Medicina', color: 'text-fuchsia-300 bg-fuchsia-900/50 dark:bg-fuchsia-900/50 dark:text-fuchsia-300' },
        { id: '6', label: 'Dermato', color: 'text-purple-300 bg-purple-900/50 dark:bg-purple-900/50 dark:text-purple-300' },
      ],
      participants: [
        { id: '5', name: 'User 5', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAxZFscyd-VMV1cEAaxxnyGoRDCd1aghTQnNR62dwIoeNhetEjoBoWrfeytN1VpepdYTx05a1_ze0EG-MluGAkJTnI9aQANKQUrNAJnM1_joOoMEX3q4RkF40SfHqlGjrgnRDbODgaaVR9jnAh_JGU6BrvB6LuySQVIvs3MpjjBWHAKeXwXY_tSDHI-HfhffXMqHyNY8LUSn0p-IvTuQT3ynZKJvMHvVrc6wc85lTlSvU1V46E_SrGLfF77-8f9CYo47TKHMK6MJCM' },
        { id: '6', name: 'User 6', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDS-IWc91LZeL5qWg6kPZfja3tJYsoEmdEBc2OoFRsts2_2y3p_zyACnGpqhQ3RjVgsChRGZ8QzzMZkYwHn8f0bxz5QS4tfYrBe-yxWpSSOoPt3aWecC399yh1onmiqsKxLZE3HInRYUO4cL_ucl4B-SMy0f4wF_bLgBmD5iLi-tKmPqCeZMdM9VdgGi3wkmCgeDTfQ2zCedZanxfsceTFKht64_ocLlB_r9Pk1gSS4uWR-VUvjaZT472c0si9HmjWjAQm63y6BEOk' },
      ],
      totalParticipants: 17,
      progress: 25,
      filesCount: 3,
      questionsCount: 4,
      theme: 'fuchsia',
    },
  ];

  const activityData: ActivityData[] = [
    { day: 'Dom', hours: 2, minutes: 30, date: '3 Julho 2022' },
    { day: 'Seg', hours: 4, minutes: 0, date: '4 Julho 2022' },
    { day: 'Ter', hours: 2, minutes: 0, date: '5 Julho 2022' },
    { day: 'Qua', hours: 5, minutes: 0, date: '6 Julho 2022' },
    { day: 'Qui', hours: 7, minutes: 14, date: '6 Julho 2022' },
    { day: 'Sex', hours: 4, minutes: 30, date: '8 Julho 2022' },
    { day: 'Sáb', hours: 3, minutes: 0, date: '9 Julho 2022' },
  ];

  const taskCategories: TaskCategory[] = [
    { name: 'Dermatologia', count: 70, color: 'text-primary' },
    { name: 'Cardiologia', count: 20, color: 'text-fuchsia-500' },
    { name: 'Cirurgia', count: 10, color: 'text-indigo-500' },
  ];

  const tasks: Task[] = [
    {
      id: '1',
      title: 'Selecione um app ou site e conduza uma auditoria de acessibilidade.',
      time: 'Hoje • 11:30',
      priority: 'high',
      completed: false,
    },
    {
      id: '2',
      title: 'Assistir a uma palestra sobre cardiologia e fazer o dever de casa',
      time: 'Hoje • 17:00',
      priority: 'high',
      completed: false,
    },
    {
      id: '3',
      title: 'Escolha um caso clínico do mundo real que você estuda regularmente e redesenhe o plano de tratamento.',
      time: 'Hoje • 10:00',
      priority: 'normal',
      completed: false,
    },
    {
      id: '4',
      title: 'Abordar questões de diagnóstico, melhorar a interface de exames e aprimorar a experiência geral do paciente.',
      time: 'Hoje • 12:00',
      priority: 'normal',
      completed: false,
    },
  ];

  const nextDelivery: Delivery = {
    id: '1',
    title: 'Teste de Usabilidade e Feedback',
    course: 'Cardiologia Avançada',
    dueDate: 'Seg 18 Julho 2023',
  };

  return (
    <PagePlanGuard>
      <MainLayout>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8">
          {/* Left Column */}
          <div className="lg:col-span-8 space-y-4 md:space-y-8">
            {/* Simulados Grid */}
            <SimuladosGrid simulados={simulados} />

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
              <ActivityChart weekData={activityData} weeklyIncrease={2} />
              <TasksChart tasks={taskCategories} total={100} />
            </div>

            {/* Next Delivery */}
            <NextDelivery delivery={nextDelivery} />
          </div>

          {/* Right Column */}
          <div className="lg:col-span-4">
            <RightSidebar tasks={tasks} />
          </div>
        </div>
      </MainLayout>
    </PagePlanGuard>
  );
}
