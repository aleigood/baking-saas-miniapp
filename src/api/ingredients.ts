/**
 * 文件路径: src/api/ingredients.ts
 * 文件描述: (已更新) 封装所有与原料(Ingredient)相关的API请求。
 */
import { request } from '@/utils/request';
// [核心修改] 导入新的分页响应类型
// [修改] 导入 UpdateSkuDto
import type { Ingredient, IngredientConsumptionLedgerResponse, IngredientsListResponse, UpdateSkuDto } from '@/types/api';

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

export function getIngredientConsumptionLedger(
	ingredientId: string,
	params: { page?: number; limit?: number; startDate?: string; endDate?: string; keyword?: string; userId?: string } = {}
): Promise<IngredientConsumptionLedgerResponse> {
	return request<IngredientConsumptionLedgerResponse>({
		url: `/ingredients/${ingredientId}/consumption-ledger`,
		data: params
	});
}

/**
 * [新增] 创建一个新的原料品类
 * @param data 包含原料名称等信息
 */
export function createIngredient(data: { name: string; type: 'STANDARD' | 'NON_INVENTORIED' | 'UNTRACKED'; isFlour: boolean; waterContent: number }): Promise<{ id: string }> {
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
export function updateIngredient(ingredientId: string, data: { name?: string; type?: 'STANDARD' | 'NON_INVENTORIED' | 'UNTRACKED' | 'SELF_MADE'; isFlour?: boolean; waterContent?: number; shelfLife?: number }): Promise<Ingredient> {
	return request<Ingredient>({
		url: `/ingredients/${ingredientId}`,
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
 * [新增] 更新一个 SKU
 * @param skuId SKU的ID
 * @param data 要更新的数据 (brand, specName, specWeightInGrams)
 */
export function updateSku(skuId: string, data: UpdateSkuDto): Promise<any> {
	return request({
		url: `/ingredients/skus/${skuId}`,
		method: 'PATCH',
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
 * 创建一条价格记录
 * @param data 包含SKU ID、数量和价格
 */
export function createPriceRecord(data: { skuId: string; packageCount: number; pricePerPackage: number }): Promise<any> {
	return request({
		url: `/ingredients/skus/${data.skuId}/price-records`,
		method: 'POST',
		data: data
	});
}

/**
 * 更新一条价格记录
 * @param priceRecordId 价格记录的ID
 * @param data 包含新价格的对象
 */
export function updatePriceRecord(priceRecordId: string, data: { pricePerPackage: number }): Promise<any> {
	return request({
		url: `/ingredients/price-records/${priceRecordId}`,
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
