import { request } from '@/utils/request';
import type { LoginRes, Role, Tenant } from '@/types/api';

export interface StoreInvitation {
	id: string;
	role: Role;
	expiresAt: string;
	tenant: Pick<Tenant, 'id' | 'name'>;
}

export const getPendingInvitations = () => request<StoreInvitation[]>({ url: '/onboarding/invitations' });

export const createFirstTenant = (name: string) =>
	request<LoginRes & { tenant: Tenant; role: 'OWNER' }>({ url: '/onboarding/tenant', method: 'POST', data: { name } });

export const acceptStoreInvitation = (invitationId: string) =>
	request<LoginRes & { role: Role }>({ url: `/onboarding/invitations/${invitationId}/accept`, method: 'POST' });
