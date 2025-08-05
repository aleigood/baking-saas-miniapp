/**
 * 文件路径: src/api/tasks.ts
 * 文件描述: (已更新) 封装所有与生产任务(ProductionTask)相关的API请求。
 */
import { request } from '@/utils/request';
import type { ProductionTaskDto } from '@/types/api';

/**
 * [修改] 创建单个生产任务 (保留)
 */
export function createTask(data : {
	productId : string;
	quantity : number;
	plannedDate : string;
}) : Promise<ProductionTaskDto> {
	return request({
		url: '/tasks',
		method: 'POST',
		data,
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


/**
 * 获取生产任务列表
 */
export function getTasks() : Promise<ProductionTaskDto[]> {
	return request<ProductionTaskDto[]>({
		url: '/tasks',
	});
}