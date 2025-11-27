'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { CouponForm } from '@/components/admin/coupons/CouponForm';
import { getCouponById, updateCoupon } from '@/services/admin/couponService';
import type { Coupon, CreateCouponPayload } from '@/types/admin/coupon';

export default function EditCouponPage() {
  const router = useRouter();
  const params = useParams();
  const couponId = params.id as string;

  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCoupon();
  }, [couponId]);

  const loadCoupon = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCouponById(couponId);
      setCoupon(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar cupom');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: CreateCouponPayload) => {
    await updateCoupon(couponId, data);
    router.push('/admin/coupons');
  };

  const handleCancel = () => {
    router.push('/admin/coupons');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-surface-light dark:bg-surface-dark rounded animate-pulse" />
        <div className="h-96 bg-surface-light dark:bg-surface-dark rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !coupon) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-red-500 mb-4">
            error
          </span>
          <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
            Erro ao carregar cupom
          </h2>
          <p className="text-text-light-secondary dark:text-text-dark-secondary mb-4">
            {error || 'Cupom não encontrado'}
          </p>
          <button
            onClick={() => router.push('/admin/coupons')}
            className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
          >
            Voltar para Cupons
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Admin', icon: 'dashboard', href: '/admin' },
          { label: 'Cupons', icon: 'local_offer', href: '/admin/coupons' },
          { label: coupon.code, icon: 'edit' },
        ]}
      />

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-200 font-display font-mono">
            Editar Cupom: {coupon.code}
          </h1>
          <p className="text-text-light-secondary dark:text-text-dark-secondary mt-1">
            Atualize as informações do cupom de desconto
          </p>
        </div>

        <CouponForm coupon={coupon} onSubmit={handleSubmit} onCancel={handleCancel} />
      </div>
    </>
  );
}
