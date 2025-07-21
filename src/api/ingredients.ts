/**
 * 文件路径: src/api/ingredients.ts
 * 文件描述: 封装所有与原料(Ingredient)相关的API请求。
 */
import { request } from '@/utils/request';
import type { Ingredient } from '@/types/api';

/**
 * 获取当前店铺的原料列表
 */
export function getIngredients() : Promise<Ingredient[]> {
	return request<Ingredient[]>({
		url: '/ingredients',
	});
}