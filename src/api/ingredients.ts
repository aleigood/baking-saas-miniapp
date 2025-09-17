/**
 * 文件路径: src/api/ingredients.ts
 * 文件描述: (已更新) 封装所有与原料(Ingredient)相关的API请求。
 */
import { request } from '@/utils/request';
// [核心修改] 导入新的分页响应类型
import type { Ingredient, IngredientLedgerResponse, IngredientsListResponse } from '@/types/api';

/**
 * 获取当前店铺的原料列表
 */
// [核心修改] 更新 getIngredients 的返回类型
export function getIngredients(): Promise<IngredientsListResponse> {
	return request<IngredientsListResponse>({
		url: '/ingredients'
	});
}

/**
 * [新增] 获取单个原料的详细信息
 * @param ingredientId 原料的ID
 */
export function getIngredient(ingredientId: string): Promise<Ingredient> {
	return request<Ingredient>({
		url: `/ingredients/${ingredientId}`
	});
}

/**
 * [核心改造] 获取原料的库存流水（支持高级筛选和分页）
 * @param ingredientId 原料的ID
 * @param params 包含分页和筛选条件的对象
 */
export function getIngredientLedger(
	ingredientId: string,
	params: {
		page: number;
		limit: number;
		type?: string;
		userId?: string;
		startDate?: string;
		endDate?: string;
		keyword?: string;
	}
): Promise<IngredientLedgerResponse> {
	return request<IngredientLedgerResponse>({
		url: `/ingredients/${ingredientId}/ledger`,
		data: params
	});
}

/**
 * [新增] 创建一个新的原料品类
 * @param data 包含原料名称等信息
 */
export function createIngredient(data: { name: string; type: 'STANDARD' | 'UNTRACKED'; isFlour: boolean; waterContent: number }): Promise<{ id: string }> {
	return request({
		url: '/ingredients',
		method: 'POST',
		data
	});
}

/**
 * [新增] 更新原料的属性
 * @param ingredientId 原料的ID
 * @param data 要更新的数据
 */
export function updateIngredient(ingredientId: string, data: { name?: string; type?: 'STANDARD' | 'UNTRACKED'; isFlour?: boolean; waterContent?: number }): Promise<Ingredient> {
	return request<Ingredient>({
		url: `/ingredients/${ingredientId}`,
		method: 'PATCH',
		data
	});
}

/**
 * [核心修改] 调整原料的库存 (原子操作)
 * @param ingredientId 原料的ID
 * @param data 包含库存变化量和原因的对象
 */
export function adjustStock(ingredientId: string, data: { changeInGrams: number; reason?: string; initialCostPerKg?: number }): Promise<Ingredient> {
	return request<Ingredient>({
		url: `/ingredients/${ingredientId}/stock`,
		method: 'PATCH',
		data
	});
}

/**
 * [新增] 删除一个原料品类
 * @param ingredientId 原料的ID
 */
export function deleteIngredient(ingredientId: string): Promise<any> {
	return request({
		url: `/ingredients/${ingredientId}`,
		method: 'DELETE'
	});
}

/**
 * [新增] 为指定原料创建一个新的SKU
 * @param ingredientId 原料品类的ID
 * @param data 包含品牌、规格等信息
 */
export function createSku(ingredientId: string, data: { brand?: string; specName: string; specWeightInGrams: number }): Promise<{ id: string }> {
	return request({
		url: `/ingredients/${ingredientId}/skus`,
		method: 'POST',
		data
	});
}

/**
 * [新增] 删除一个SKU
 * @param skuId SKU的ID
 */
export function deleteSku(skuId: string): Promise<any> {
	return request({
		url: `/ingredients/skus/${skuId}`,
		method: 'DELETE'
	});
}

/**
 * [新增] 创建一条采购记录
 * @param data 包含SKU ID、采购数量和价格
 */
// [核心修改] 修正 createProcurement 函数，确保 skuId 在 URL 中，并使 purchaseDate 成为必需字段
export function createProcurement(data: { skuId: string; packagesPurchased: number; pricePerPackage: number; purchaseDate: string }): Promise<any> {
	return request({
		url: `/ingredients/skus/${data.skuId}/procurements`,
		method: 'POST',
		data: data
	});
}

/**
 * [核心新增] 删除一条采购记录
 * @param procurementId 采购记录的ID
 */
export function deleteProcurement(procurementId: string): Promise<any> {
	return request({
		url: `/ingredients/procurements/${procurementId}`,
		method: 'DELETE'
	});
}

/**
 * [新增] 更新一条采购记录
 * @param procurementId 采购记录的ID
 * @param data 包含新价格的对象
 */
// 修改：根据业务需求，只允许更新 pricePerPackage
export function updateProcurement(procurementId: string, data: { pricePerPackage: number }): Promise<any> {
	return request({
		url: `/ingredients/procurements/${procurementId}`,
		method: 'PATCH',
		data
	});
}

/**
 * 设置指定原料的激活SKU
 * @param ingredientId 原料品类的ID
 * @param skuId 要激活的SKU的ID
 */
export function setActiveSku(ingredientId: string, skuId: string): Promise<any> {
	return request({
		url: `/ingredients/${ingredientId}/active-sku`,
		method: 'POST', // 后端使用的是 POST
		data: { skuId }
	});
}
