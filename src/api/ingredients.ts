/**
 * 文件路径: src/api/ingredients.ts
 * 文件描述: (已更新) 封装所有与原料(Ingredient)相关的API请求。
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

/**
 * [新增] 创建一个新的原料品类
 * @param data 包含原料名称等信息
 */
export function createIngredient(data : { name : string; type : 'STANDARD' | 'UNTRACKED' }) : Promise<{ id : string }> {
	return request({
		url: '/ingredients',
		method: 'POST',
		data,
	});
}

/**
 * [新增] 为指定原料创建一个新的SKU
 * @param ingredientId 原料品类的ID
 * @param data 包含品牌、规格等信息
 */
export function createSku(ingredientId : string, data : { brand ?: string; specName : string; specWeightInGrams : number }) : Promise<{ id : string }> {
	return request({
		url: `/ingredients/${ingredientId}/skus`,
		method: 'POST',
		data,
	});
}

/**
 * [新增] 创建一条采购记录
 * @param data 包含SKU ID、采购数量和价格
 */
export function createProcurement(data : { skuId : string; packagesPurchased : number; pricePerPackage : number }) : Promise<any> {
	return request({
		url: '/ingredients/procurements',
		method: 'POST',
		data,
	});
}