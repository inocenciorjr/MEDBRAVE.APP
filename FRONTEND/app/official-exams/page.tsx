'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PagePlanGuard } from '@/components/guards/PagePlanGuard';

export default function OfficialExamsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/prova-integra');
  }, [router]);

  return (
    <PagePlanGuard>
      <div>Redirecionando...</div>
    </PagePlanGuard>
  );
}
