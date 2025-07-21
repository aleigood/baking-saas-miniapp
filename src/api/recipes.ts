/**
 * 文件路径: src/api/recipes.ts
 * 文件描述: 封装所有与配方(Recipe)相关的API请求。
 */
import { request } from '@/utils/request';
import type { Recipe } from '@/types/api';

/**
 * 获取当前店铺的配方/产品列表
 */
export function getRecipes() : Promise<Recipe[]> {
	return request<Recipe[]>({
		url: '/recipes',
	});
}