/**
 * 文件路径: src/api/stats.ts
 * 文件描述: 封装所有与统计数据(Stats)相关的API请求。
 */
import { request } from '@/utils/request';
import type { RecipeStatDto, IngredientStatDto } from '@/types/api';

/**
 * 获取配方制作排行统计
 */
export function getRecipeStats() : Promise<RecipeStatDto[]> {
	return request<RecipeStatDto[]>({
		url: '/stats/recipes',
	});
}

/**
 * 获取原料消耗排行统计
 */
export function getIngredientStats() : Promise<IngredientStatDto[]> {
	return request<IngredientStatDto[]>({
		url: '/stats/ingredients',
	});
}