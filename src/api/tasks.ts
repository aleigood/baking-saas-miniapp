/**
 * 文件路径: src/api/tasks.ts
 * 文件描述: 封装所有与生产任务相关的API请求。
 */
import { request } from '@/utils/request';
import type { ProductionTaskDto } from '@/types/api'; // 假设类型已在 api.d.ts 中定义

/**
 * 获取当前店铺的生产任务列表
 */
export function getTasks() : Promise<ProductionTaskDto[]> {
	return request<ProductionTaskDto[]>({
		url: '/tasks',
	});
}

/**
 * 创建一个新的生产任务
 * @param data 包含 productId 和 plannedQuantity
 */
export function createTask(data : { productId : string; plannedQuantity : number }) : Promise<any> {
	return request({
		url: '/tasks',
		method: 'POST',
		data,
	});
}

/**
 * 更新一个生产任务的状态
 * @param taskId 任务ID
 * @param status 新的状态
 */
export function updateTaskStatus(taskId : string, status : 'COMPLETED' | 'CANCELED') : Promise<any> {
	return request({
		url: `/tasks/${taskId}/status`,
		method: 'PATCH',
		data: { status },
	});
}