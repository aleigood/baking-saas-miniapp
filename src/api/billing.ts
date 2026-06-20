import { request } from '@/utils/request';

export interface SubscriptionPlan {
	id: string;
	name: string;
	durationDays: number;
	priceInCents: number;
	originalPriceInCents?: number | null;
}

export interface SubscriptionSummary {
	active: boolean;
	entitledUntil: string | null;
	current: { expiresAt: string; plan: SubscriptionPlan } | null;
}

export const getSubscriptionPlans = () => request<SubscriptionPlan[]>({ url: '/billing/plans' });
export const getSubscriptionSummary = () => request<SubscriptionSummary>({ url: '/billing/subscription' });
export const createPaymentOrder = (planId: string) =>
	request<{ orderNo: string; amountInCents: number; paymentParams: UniApp.RequestPaymentOptions }>({ url: '/billing/orders', method: 'POST', data: { planId } });
export const syncPaymentOrder = (orderNo: string) => request<any>({ url: `/billing/orders/${orderNo}/sync`, method: 'POST' });
