/**
 * 文件路径: src/api/recipes.ts
 * 文件描述: (已更新) 封装所有与配方(Recipe)相关的API请求。
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

/**
 * [新增] 创建一个新的配方家族
 * @param data 完整的配方数据，符合后端的 CreateRecipeFamilyDto 结构
 */
export function createRecipe(data : any) : Promise<any> {
	return request({
		url: '/recipes',
		method: 'POST',
		data,
	});
}