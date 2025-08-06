/**
 * 文件路径: src/api/costing.ts
 * 文件描述: [新增] 封装所有与成本计算(Costing)相关的API请求。
 */
import { request } from '@/utils/request';

/**
 * [新增] 获取单个产品成本的历史变化记录
 * @param productId 产品的ID
 * @returns 返回一个包含成本变化点的数组，每个点是一个 { cost: number } 对象
 */
export function getProductCostHistory(productId : string) : Promise<{ cost : number }[]> {
	return request<{ cost : number }[]>({
		url: `/costing/products/${productId}/cost-history`,
	});
}

/**
 * [新增] 获取单个原料成本的历史变化记录
 * @param ingredientId 原料的ID
 * @returns 返回一个包含成本变化点的数组，每个点是一个 { cost: number } 对象
 */
export function getIngredientCostHistory(ingredientId : string) : Promise<{ cost : number }[]> {
	return request<{ cost : number }[]>({
		url: `/costing/ingredients/${ingredientId}/cost-history`,
	});
}