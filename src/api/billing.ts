import { request } from '@/utils/request';

export interface SubscriptionPlan {
	id: string;
	code: string;
	name: string;
	durationDays: number;
	priceInCents: number;
	originalPriceInCents?: number | null;
}

export interface SubscriptionSummary {
	state: 'PAID' | 'TRIAL' | 'GRACE' | 'FREE';
	fullAccess: boolean;
	active: boolean;
	entitledUntil: string | null;
	current: { expiresAt: string; plan: SubscriptionPlan } | null;
	graceEndsAt: string | null;
	trial: {
		eligible: boolean;
		startedAt: string | null;
		endsAt: string | null;
		days: number;
	};
	limits: {
		mainRecipes: number | null;
		productionTasksPerMonth: number | null;
		members: number | null;
	};
	usage: {
		mainRecipes: number;
		productionTasksThisMonth: number;
		members: number;
	};
	recipeSelection: {
		required: boolean;
		recipes: Array<{ id: string; name: string; freeTierUnlocked: boolean; updatedAt: string }>;
	};
}

export interface EntitlementPolicyConfig {
	limits: { mainRecipes: number | null; productionTasksPerMonth: number | null; members: number | null };
	features: { costing: boolean; statistics: boolean; batchImport: boolean; export: boolean };
}

export interface BillingCatalog {
	catalogVersion: string;
	updatedAt: string;
	trialDays: number;
	graceDays: number;
	tiers: Array<{ id: string; tier: 'FREE' | 'PRO'; version: number; name: string; config: EntitlementPolicyConfig; updatedAt: string }>;
	plans: SubscriptionPlan[];
}

export const getSubscriptionPlans = () => request<SubscriptionPlan[]>({ url: '/billing/plans' });
export const getBillingCatalog = () => request<BillingCatalog>({ url: '/billing/catalog' });
export const getPaymentCapabilities = () => request<{ paymentMode: 'mock' | 'wechat' }>({ url: '/billing/capabilities' });
export const getSubscriptionSummary = () => request<SubscriptionSummary>({ url: '/billing/subscription' });
export const startProfessionalTrial = () => request<SubscriptionSummary>({ url: '/billing/trial/start', method: 'POST' });
export const unrestrictFreeTierRecipe = (recipeId: string) =>
	request<{ remaining: number | null }>({ url: `/billing/free-tier/recipes/${recipeId}/unrestrict`, method: 'POST' });
export const createPaymentOrder = (planId: string) =>
	request<{ orderNo: string; amountInCents: number; mockPaid?: boolean; paymentParams: UniApp.RequestPaymentOptions | null }>({ url: '/billing/orders', method: 'POST', data: { planId } });
export const syncPaymentOrder = (orderNo: string) => request<any>({ url: `/billing/orders/${orderNo}/sync`, method: 'POST' });
