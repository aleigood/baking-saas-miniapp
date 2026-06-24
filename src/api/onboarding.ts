import { request } from '@/utils/request';
import type { LoginRes, Tenant, TenantRole } from '@/types/api';

export interface StoreInvitation {
	id: string;
	role: TenantRole;
	expiresAt: string;
	tenant: Pick<Tenant, 'id' | 'name'>;
}

export const getPendingInvitations = () => request<StoreInvitation[]>({ url: '/onboarding/invitations' });

export const createFirstTenant = (name: string) =>
	request<LoginRes & { tenant: Tenant; role: 'OWNER' }>({ url: '/onboarding/tenant', method: 'POST', data: { name } });

export const acceptStoreInvitation = (invitationId: string) =>
	request<LoginRes & { role: TenantRole }>({ url: `/onboarding/invitations/${invitationId}/accept`, method: 'POST' });
