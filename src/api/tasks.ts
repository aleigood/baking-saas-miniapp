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
 * 创建一个新的生产任务
 * @param data 包含 productId 和 plannedQuantity 等信息
 */
export function createTask(data : {
	productId : string;
	quantity : number;
	unit : string;
	plannedDate : string;
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


/**
 * [新增] 批量创建生产任务


 */
export function createTasks(tasks : { productId : string; quantity : number; plannedDate : string }[]) : Promise<ProductionTaskDto[]> {
	return request({
		url: '/tasks/batch', // 调用新的批量接口
		method: 'POST',
		data: { tasks }, // 将任务数组包装在 tasks 字段中
	});
}