/**
 * 文件路径: src/api/members.ts
 * 文件描述: (已更新) 封装所有与人员(Member)相关的API请求，包括更新和删除。
 */
import { request } from '@/utils/request';
import type { Member } from '@/types/api';

/**
 * 获取当前店铺的人员列表
 */
export function getMembers() : Promise<Member[]> {
	return request<Member[]>({
		url: '/members',
	});
}

/**
 * [新增] 更新指定成员的角色
 * @param memberId 成员的用户ID
 * @param role 新的角色
 */
export function updateMemberRole(memberId : string, role : Member['role']) : Promise<any> {
	return request({
		url: `/members/${memberId}/role`,
		method: 'PATCH',
		data: { role },
	});
}

/**
 * [新增] "软删除"一个成员 (将其状态更新为 INACTIVE)
 * @param memberId 成员的用户ID
 */
export function removeMember(memberId : string) : Promise<any> {
	return request({
		url: `/members/${memberId}`,
		method: 'DELETE',
	});
}