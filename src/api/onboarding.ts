import { request } from '@/utils/request';
import type { Tenant, TenantRole } from '@/types/api';

export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED';
export interface StoreApplication { id: string; storeName: string; address: string; description?: string; contactName: string; contactPhone: string; wechatNickname?: string; status: ApplicationStatus; reviewNote?: string; createdAt: string; createdTenant?: Pick<Tenant, 'id' | 'name'>; accessToken?: string; }
export interface JoinPreview { tenant: Pick<Tenant, 'id' | 'name'>; role: TenantRole; expiresAt: string; inviter: string; relationship: 'AVAILABLE' | 'OWNER' | 'MEMBER' | 'PENDING' | 'REJECTED'; }
export interface MembershipApplication { id: string; status: ApplicationStatus; displayName: string; reviewNote?: string; tenant: Pick<Tenant, 'id' | 'name'>; joinLink: { role: TenantRole }; createdAt: string; }

export const getStoreApplication = () => request<StoreApplication | null>({ url: '/onboarding/store-application' });
export interface ProfileSubmission { name: string; wechatNickname: string; phone: string; verificationCode?: string; }
export const createStoreApplication = (data: { storeName: string; address: string; description?: string } & ProfileSubmission) => request<StoreApplication>({ url: '/onboarding/store-applications', method: 'POST', data });
export const cancelStoreApplication = (id: string) => request({ url: `/onboarding/store-applications/${id}/cancel`, method: 'POST' });
export const getJoinPreview = (token: string) => request<JoinPreview>({ url: '/onboarding/join-link', data: { token }, hideErrorToast: true });
export const submitMembershipApplication = (data: { token: string; message?: string } & ProfileSubmission) => request<{ accessToken?: string }>({ url: '/onboarding/membership-applications', method: 'POST', data });
export const getMyMembershipApplications = () => request<MembershipApplication[]>({ url: '/onboarding/membership-applications/mine' });
