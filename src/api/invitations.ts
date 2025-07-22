/**
 * 文件路径: src/api/invitations.ts
 * 文件描述: [新增] 封装所有与邀请(Invitation)相关的API请求。
 */
import { request } from '@/utils/request';
import type { InvitationResponse } from '@/types/api';

/**
 * 创建一个新的邀请码
 * @returns 返回包含邀请码和过期时间的对象
 */
export function createInvitation() : Promise<InvitationResponse> {
	return request<InvitationResponse>({
		url: '/invitations',
		method: 'POST',
	});
}