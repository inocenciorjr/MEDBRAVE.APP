'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { CouponForm } from '@/components/admin/coupons/CouponForm';
import { createCoupon } from '@/services/admin/couponService';
import type { CreateCouponPayload } from '@/types/admin/coupon';

export default function NewCouponPage() {
  const router = useRouter();

  const handleSubmit = async (data: CreateCouponPayload) => {
    await createCoupon(data);
    router.push('/admin/coupons');
  };

  const handleCancel = () => {
    router.push('/admin/coupons');
  };

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Admin', icon: 'dashboard', href: '/admin' },
          { label: 'Cupons', icon: 'local_offer', href: '/admin/coupons' },
          { label: 'Novo Cupom', icon: 'add' },
        ]}
      />

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-200 font-display">
            Criar Novo Cupom
          </h1>
          <p className="text-text-light-secondary dark:text-text-dark-secondary mt-1">
            Preencha as informações abaixo para criar um novo cupom de desconto
          </p>
        </div>

        <CouponForm onSubmit={handleSubmit} onCancel={handleCancel} />
      </div>
    </>
  );
}
