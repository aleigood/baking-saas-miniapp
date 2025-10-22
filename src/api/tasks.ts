/**
 * 文件路径: src/api/tasks.ts
 * 文件描述: (已更新) 封装所有与生产任务相关的API请求。
 */
import { request } from '@/utils/request';
import type { ProductionTaskDto, CreateTaskResponse, ProductionDataPayload, PrepTask, ProductionTaskDetailDto } from '@/types/api';
import type { TemperatureSettings } from '@/store/temperature';

/**
 * 修改一个尚未开始的生产任务
 * @param taskId 要修改的任务ID
 * @param data 任务的最新信息
 */
export function updateTask(
	taskId: string,
	data: { startDate: string; endDate?: string; notes?: string; products: { productId: string; quantity: number }[] }
): Promise<ProductionTaskDto> {
	return request<ProductionTaskDto>({
		url: `/production-tasks/${taskId}`,
		method: 'PUT',
		data
	});
}

/**
 * 获取历史任务（分页）
 * @param page 页码
 * @param limit 每页数量
 */
export function getHistoryTasks(page: number, limit: number): Promise<{ data: Record<string, ProductionTaskDto[]>; meta: any }> {
	return request({
		url: '/production-tasks/history',
		data: {
			page: String(page),
			limit: String(limit)
		}
	});
}

/**
 * 获取指定日期的活动任务列表（轻量级）
 * @param date 'YYYY-MM-DD' 格式的日期字符串
 */
export function getTasks(date?: string): Promise<ProductionDataPayload> {
	return request<ProductionDataPayload>({
		url: '/production-tasks/active',
		method: 'GET',
		data: { date }
	});
}

/**
 * [新增] 获取指定日期的前置准备任务详情 (重量级)
 * @param date 'YYYY-MM-DD' 格式的日期字符串
 */
export const getPrepTaskDetails = (date: string): Promise<PrepTask | null> => {
	return request({
		url: `/production-tasks/prep-task-details`,
		method: 'GET',
		data: { date }
	});
};

/**
 * 获取所有存在任务的日期
 */
export function getTaskDates(): Promise<string[]> {
	return request<string[]>({
		url: '/production-tasks/task-dates',
		method: 'GET'
	});
}

/**
 * 获取预设的损耗阶段列表
 */
export function getSpoilageStages(): Promise<{ key: string; label: string }[]> {
	return request<{ key: string; label: string }[]>({
		url: '/production-tasks/spoilage-stages',
		method: 'GET'
	});
}

/**
 * 获取单个生产任务的详情
 * @param taskId 任务ID
 * @param params 温度相关的查询参数
 */
export function getTaskDetail(taskId: string, params?: Partial<TemperatureSettings>): Promise<ProductionTaskDetailDto> {
	return request<ProductionTaskDetailDto>({
		url: `/production-tasks/${taskId}`,
		data: params
	});
}

/**
 * 创建一个新的生产任务
 * @param data 包含 startDate, endDate 和 products 数组等信息
 */
export function createTask(data: { startDate: string; endDate?: string; notes?: string; products: { productId: string; quantity: number }[] }): Promise<CreateTaskResponse> {
	return request<CreateTaskResponse>({
		url: '/production-tasks',
		method: 'POST',
		data
	});
}

/**
 * 更新一个生产任务的状态
 * @param taskId 任务ID
 * @param status 新的状态
 */
export function updateTaskStatus(taskId: string, status: 'CANCELLED' | 'IN_PROGRESS'): Promise<any> {
	return request({
		url: `/production-tasks/${taskId}`,
		method: 'PATCH',
		data: { status }
	});
}

interface SpoilageDetail {
	stage: string;
	quantity: number;
	notes?: string;
}

interface CompletedTaskItem {
	productId: string;
	completedQuantity: number;
	spoilageDetails?: SpoilageDetail[];
}

/**
 * 完成一个生产任务
 * @param taskId 任务ID
 * @param data 包含 completedItems 数组等信息
 */
export function completeTask(taskId: string, data: { notes?: string; completedItems: CompletedTaskItem[] }): Promise<any> {
	return request({
		url: `/production-tasks/${taskId}/complete`,
		method: 'POST',
		data
	});
}
