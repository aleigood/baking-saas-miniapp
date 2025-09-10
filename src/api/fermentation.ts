/**
 * 文件路径: src/api/fermentation.ts
 * 文件描述: [新增] 封装所有与发酵用量计算相关的API请求。
 */
import { request } from '@/utils/request';
import type { FermentationType, YeastBrand } from '@/types/fermentation';

/**
 * 获取可用的温度列表 (摄氏度)
 * @param type - 发酵类型 (酵母或鲁邦种)
 */
export function getAvailableTemperatures(type : FermentationType) : Promise<number[]> {
	return request<number[]>({
		url: '/fermentation/temperatures',
		data: { type },
	});
}

/**
 * 根据温度获取可用的发酵时间列表
 * @param type - 发酵类型
 * @param temperatureC - 摄氏温度
 */
export function getAvailableTimes(type : FermentationType, temperatureC : number) : Promise<number[]> {
	return request<number[]>({
		url: '/fermentation/times',
		data: { type, temperatureC },
	});
}

/**
 * 查询在特定条件下的酵母/鲁邦种用量
 * @param params - 查询参数
 * @returns 用量百分比数组
 */
export function findAmount(params : {
	type : FermentationType;
	brand : YeastBrand;
	temperatureC : number;
	time : number;
}) : Promise<number[]> {
	return request<number[]>({
		url: '/fermentation/amount',
		data: params,
	});
}