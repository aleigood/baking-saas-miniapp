/**
 * 文件路径: src/api/members.ts
 * 文件描述: (已更新) 封装所有与人员(Member)相关的API请求，包括更新和删除。
 */
import { request } from '@/utils/request';
import type { Member, Role } from '@/types/api';

/**
 * [核心新增] 直接创建一个新成员并将其添加到当前店铺
 * @param data 包含姓名、手机、初始密码和角色
 */
export function createMember(data: { name: string; phone: string; password: string; role: Role }): Promise<Member> {
	return request<Member>({
		url: '/members',
		method: 'POST',
		data
	});
}

/**
 * 获取店铺的人员列表
 * @param tenantId [可选] 店铺ID，仅所有者可传递此参数以查询指定店铺
 */
export function getMembers(tenantId?: string): Promise<Member[]> {
	return request<Member[]>({
		url: '/members',
		data: { tenantId }
	});
}

/**
 * [重构] 更新指定成员的角色或状态
 * @param memberId 成员的用户ID
 * @param data 包含新角色或新状态的对象
 */
export function updateMember(memberId: string, data: { role?: Role; status?: Member['status'] }): Promise<any> {
	return request({
		url: `/members/${memberId}`,
		method: 'PATCH',
		data
	});
}

/**
 * [已更新] 从当前店铺中移除一个成员
 * @param memberId 成员的用户ID
 */
export function removeMember(memberId: string): Promise<any> {
	return request({
		url: `/members/${memberId}`,
		method: 'DELETE'
	});
}
