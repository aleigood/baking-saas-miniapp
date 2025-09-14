/**
 * 文件路径: src/api/user.ts
 * 文件描述: [新增] 封装所有与当前用户个人信息相关的API请求。
 */
import { request } from '@/utils/request';
import type { UserInfo } from '@/types/api';

/**
 * 更新当前用户的个人资料（姓名、头像等）
 * @param data 包含要更新字段的对象
 */
export function updateProfile(data: { name?: string; avatarUrl?: string }): Promise<UserInfo> {
	return request<UserInfo>({
		url: '/users/me/profile',
		method: 'PATCH',
		data
	});
}

/**
 * 修改当前用户的密码
 * @param data 包含当前密码和新密码的对象
 */
export function changePassword(data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
	return request({
		url: '/users/me/password',
		method: 'PATCH',
		data
	});
}
