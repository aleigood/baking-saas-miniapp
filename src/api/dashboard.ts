/**
 * 文件路径: src/api/dashboard.ts
 * 文件描述: [新增] 封装与仪表盘数据相关的API请求。
 */
import { request } from '@/utils/request';
import type { DashboardStats } from '@/types/api';

/**
 * 获取客户端“我的”页面的看板统计数据
 * @returns 返回根据用户角色计算的统计数据
 */
export function getAppDashboardStats(): Promise<DashboardStats> {
	return request<DashboardStats>({
		url: '/dashboard/app-stats'
	});
}
