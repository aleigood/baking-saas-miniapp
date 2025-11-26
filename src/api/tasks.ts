/**
 * 文件路径: src/api/tasks.ts
 * 文件描述: (已更新) 封装所有与生产任务相关的API请求。
 */
import { request } from '@/utils/request';
import type { ProductionTaskDto, CreateTaskResponse, ProductionDataPayload, PrepTask, ProductionTaskDetailDto } from '@/types/api';
import type { TemperatureSettings } from '@/store/temperature';

// [核心修改] 统一使用环境变量，移除对 @/config 的引用
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * 修改一个尚未开始的生产任务
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
 */
export function getTaskDetail(taskId: string, params?: Partial<TemperatureSettings>): Promise<ProductionTaskDetailDto> {
	return request<ProductionTaskDetailDto>({
		url: `/production-tasks/${taskId}`,
		data: params
	});
}

/**
 * 创建一个新的生产任务
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
 */
export function updateTaskStatus(taskId: string, status: 'CANCELLED' | 'IN_PROGRESS'): Promise<any> {
	return request({
		url: `/production-tasks/${taskId}`,
		method: 'PATCH',
		data: { status }
	});
}

/**
 * 删除一个“待开始”的生产任务 (软删除)
 */
export function deleteTask(taskId: string): Promise<any> {
	return request({
		url: `/production-tasks/${taskId}`,
		method: 'DELETE'
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
 */
export function completeTask(taskId: string, data: { notes?: string; completedItems: CompletedTaskItem[] }): Promise<any> {
	return request({
		url: `/production-tasks/${taskId}/complete`,
		method: 'POST',
		data
	});
}

/**
 * [核心] 获取普通任务 PDF 下载的完整 URL
 * 使用 BASE_URL 拼接
 */
export const getTaskPdfUrl = (taskId: string) => {
	return `${BASE_URL}/production-tasks/${taskId}/pdf`;
};

/**
 * [核心] 获取前置任务 PDF 下载的完整 URL
 * 使用 BASE_URL 拼接
 */
export const getPrepTaskPdfUrl = (date: string) => {
	return `${BASE_URL}/production-tasks/prep-task-pdf?date=${date}`;
};
