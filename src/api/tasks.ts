/**
 * 文件路径: src/api/tasks.ts
 * 文件描述: (已更新) 封装所有与生产任务相关的API请求。
 */
import { request } from '@/utils/request';
import type { ProductionTaskDto } from '@/types/api';

/**
 * 获取当前店铺的生产任务列表
 */
export function getTasks() : Promise<ProductionTaskDto[]> {
	return request<ProductionTaskDto[]>({
		url: '/production-tasks', // 路由已更新
	});
}

/**
 * [修改] 创建一个新的生产任务，该任务可以包含多个产品
 * (Modified: Create a new production task which can contain multiple products)
 * @param data 包含 plannedDate 和 products 数组等信息
 */
export function createTask(data : {
	plannedDate : string;
	notes ?: string;
	products : { productId : string; quantity : number }[];
}) : Promise<any> {
	return request({
		url: '/production-tasks', // 路由已更新
		method: 'POST',
		data,
	});
}

/**
 * 更新一个生产任务的状态
 * @param taskId 任务ID
 * @param status 新的状态
 */
export function updateTaskStatus(
	taskId : string,
	status : 'COMPLETED' | 'CANCELLED' | 'IN_PROGRESS',
) : Promise<any> {
	return request({
		url: `/production-tasks/${taskId}`, // 路由已更新
		method: 'PATCH',
		data: { status },
	});
}