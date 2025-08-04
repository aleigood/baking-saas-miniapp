/**
 * 文件路径: src/api/stats.ts
 * 文件描述: 封装所有与统计数据(Stats)相关的API请求。
 */
import { request } from '@/utils/request';
import type { RecipeStatDto, IngredientStatDto } from '@/types/api';

/**
 * 获取配方制作排行统计
 * @param startDate 开始日期 'YYYY-MM-DD'
 * @param endDate 结束日期 'YYYY-MM-DD'
 */
export function getRecipeStats(startDate : string, endDate : string) : Promise<RecipeStatDto[]> {
	return request<any>({
		url: '/stats/production',
		data: { startDate, endDate },
	}).then((data) => data.productStats); // 从返回数据中提取产品统计
}

/**
 * 获取原料消耗排行统计
 * @param startDate 开始日期 'YYYY-MM-DD'
 * @param endDate 结束日期 'YYYY-MM-DD'
 */
export function getIngredientStats(startDate : string, endDate : string) : Promise<IngredientStatDto[]> {
	return request<any>({
		url: '/stats/production',
		data: { startDate, endDate },
	}).then((data) => data.ingredientConsumption); // 从返回数据中提取原料消耗
}