/**
 * 文件路径: src/api/tenants.ts
 * 文件描述: 封装所有与店铺(Tenant)相关的API请求。
 */
import { request } from '@/utils/request';
import type { Tenant } from '@/types/api';

/**
 * 获取当前用户有权访问的所有店铺列表
 */
export function getTenants(): Promise<Tenant[]> {
	return request<Tenant[]>({
		url: '/tenants'
	});
}

/**
 * [核心新增] 创建一个新的店铺
 * @param data 包含店铺名称
 */
export function createTenant(data: { name: string }): Promise<Tenant> {
	return request<Tenant>({
		url: '/tenants',
		method: 'POST',
		data
	});
}

/**
 * [核心新增] 更新一个店铺的信息
 * @param tenantId 店铺ID
 * @param data 包含要更新的店铺名称或状态
 */
export function updateTenant(tenantId: string, data: Partial<{ name: string; status: 'ACTIVE' | 'INACTIVE' }>): Promise<Tenant> {
	return request<Tenant>({
		url: `/tenants/${tenantId}`,
		method: 'PATCH',
		data
	});
}
