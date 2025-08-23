/**
 * 文件路径: src/api/tasks.ts
 * 文件描述: (已更新) 封装所有与生产任务相关的API请求。
 */
import { request } from '@/utils/request';
import type { ProductionTaskDto, CreateTaskResponse, ProductionDataPayload, PrepTask, ProductionTaskDetailDto } from '@/types/api';

/**
 * [核心改造] API 指向新的 history 专用接口
 * @param page 页码
 * @param limit 每页数量
 */
export function getHistoryTasks(page : number, limit : number) : Promise<{ data : Record<string, ProductionTaskDto[]>, meta : any }> {
	return request({
		url: '/production-tasks/history', // [修改] URL 指向新接口
		data: {
			page: String(page),
			limit: String(limit)
		},
	});
}


/**
 * [核心改造] API 指向新的 active 专用接口
 */
export function getTasks() : Promise<ProductionDataPayload> {
	return request<ProductionDataPayload>({
		url: '/production-tasks/active', // [修改] URL 指向新接口
		method: 'GET',
	});
}

/**
 * 获取单个生产任务或前置任务的详情
 * @param taskId 任务ID
 */
export function getTaskDetail(taskId : string) : Promise<ProductionTaskDetailDto | PrepTask> {
	return request<ProductionTaskDetailDto | PrepTask>({
		url: `/production-tasks/${taskId}`,
	});
}


/**
 * 创建一个新的生产任务，该任务可以包含多个产品
 * @param data 包含 plannedDate 和 products 数组等信息
 */
export function createTask(data : {
	plannedDate : string;
	notes ?: string;
	products : { productId : string; quantity : number }[];
}) : Promise<CreateTaskResponse> {
	return request<CreateTaskResponse>({
		url: '/production-tasks',
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
	status : 'CANCELLED',
) : Promise<any> {
	return request({
		url: `/production-tasks/${taskId}`,
		method: 'PATCH',
		data: { status },
	});
}

/**
 * 完成一个生产任务的专用接口
 * @param taskId 任务ID
 * @param data 包含备注等信息
 */
export function completeTask(taskId : string, data : { notes ?: string }) : Promise<any> {
	return request({
		url: `/production-tasks/${taskId}/complete`,
		method: 'POST',
		data,
	});
}