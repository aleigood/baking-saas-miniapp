/**
 * 文件路径: src/api/tasks.ts
 * 文件描述: (已更新) 封装所有与生产任务相关的API请求。
 */
import { request } from '@/utils/request';
// [修改] 导入新的响应类型，以支持前置准备任务
import type { ProductionTaskDto, CreateTaskResponse, ProductionDataPayload, PrepTask, ProductionTaskDetailDto } from '@/types/api';

/**
 * [REFACTORED] 根据状态获取历史任务列表，并支持分页
 * @param page 页码
 * @param limit 每页数量
 */
export function getHistoryTasks(page : number, limit : number) : Promise<{ data : Record<string, ProductionTaskDto[]>, meta : any }> {
	return request({
		url: '/production-tasks',
		// [核心修复] 将 params 修改为 data，以匹配 request 工具函数对 GET 请求参数的处理方式
		data: {
			// 后端现在支持接收状态数组
			status: ['COMPLETED', 'CANCELLED'],
			page: String(page),
			limit: String(limit)
		},
	});
}


/**
 * 获取当前店铺的生产任务列表 (包含前置准备任务)
 */
export function getTasks(params : { status : string[] }) : Promise<ProductionDataPayload> { // [修改] 更新函数签名和返回类型
	return request<ProductionDataPayload>({
		url: '/production-tasks',
		method: 'GET', // [新增] 明确请求方法
		data: params, // [核心修复] 同样将此处的 params 修改为 data
	});
}

/**
 * [修改] 获取单个生产任务或前置任务的详情
 * (Modified: Get details of a single production task or prep task)
 * @param taskId 任务ID
 */
export function getTaskDetail(taskId : string) : Promise<ProductionTaskDetailDto | PrepTask> { // [修改] 函数名和返回类型
	return request<ProductionTaskDetailDto | PrepTask>({ // [修改] 返回类型
		url: `/production-tasks/${taskId}`,
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
	status : 'CANCELLED', // [修改] 目前业务逻辑只支持取消操作
) : Promise<any> {
	return request({
		url: `/production-tasks/${taskId}`,
		method: 'PATCH',
		data: { status },
	});
}

/**
 * [核心新增] 完成一个生产任务的专用接口
 * (New: Dedicated API to complete a production task)
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