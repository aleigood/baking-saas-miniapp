/**
 * 文件路径: src/api/ingredients.ts
 * 文件描述: (已更新) 封装所有与原料(Ingredient)相关的API请求。
 */
import { request } from '@/utils/request';
// [核心修改] 导入新的分页响应类型
import type { Ingredient, IngredientLedgerResponse } from '@/types/api';

/**
 * 获取当前店铺的原料列表
 */
export function getIngredients() : Promise<Ingredient[]> {
	return request<Ingredient[]>({
		url: '/ingredients',
	});
}

/**
 * [新增] 获取单个原料的详细信息
 * @param ingredientId 原料的ID
 */
export function getIngredient(ingredientId : string) : Promise<Ingredient> {
	return request<Ingredient>({
		url: `/ingredients/${ingredientId}`,
	});
}

/**
 * [核心修改] 获取原料的库存流水（支持分页）
 * @param ingredientId 原料的ID
 * @param page 页码
 * @param limit 每页数量
 */
export function getIngredientLedger(ingredientId : string, page : number, limit : number) : Promise<IngredientLedgerResponse> {
	return request<IngredientLedgerResponse>({
		url: `/ingredients/${ingredientId}/ledger`,
		// [核心修改] 将分页参数作为查询字符串发送
		data: {
			page: String(page),
			limit: String(limit)
		}
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
 * [新增] 更新原料的属性
 * @param ingredientId 原料的ID
 * @param data 要更新的数据
 */
export function updateIngredient(ingredientId : string, data : { name ?: string; isFlour ?: boolean; waterContent ?: number }) : Promise<Ingredient> {
	return request<Ingredient>({
		url: `/ingredients/${ingredientId}`,
		method: 'PATCH',
		data,
	});
}

/**
 * [核心修改] 调整原料的库存 (原子操作)
 * @param ingredientId 原料的ID
 * @param data 包含库存变化量和原因的对象
 */
export function adjustStock(ingredientId : string, data : { changeInGrams : number; reason ?: string }) : Promise<Ingredient> {
	return request<Ingredient>({
		url: `/ingredients/${ingredientId}/stock`,
		method: 'PATCH',
		data,
	});
}

/**
 * [新增] 删除一个原料品类
 * @param ingredientId 原料的ID
 */
export function deleteIngredient(ingredientId : string) : Promise<any> {
	return request({
		url: `/ingredients/${ingredientId}`,
		method: 'DELETE',
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
 * [新增] 删除一个SKU
 * @param skuId SKU的ID
 */
export function deleteSku(skuId : string) : Promise<any> {
	return request({
		url: `/ingredients/skus/${skuId}`,
		method: 'DELETE',
	});
}

/**
 * [新增] 创建一条采购记录
 * @param data 包含SKU ID、采购数量和价格
 */
// [核心修复] 修正 createProcurement 函数，确保 skuId 包含在请求体中
export function createProcurement(data : { skuId : string; packagesPurchased : number; pricePerPackage : number, purchaseDate ?: string }) : Promise<any> {
	// 直接将接收到的 data 对象作为请求体发送，因为它已经包含了所有必需的字段
	return request({
		url: `/ingredients/skus/${data.skuId}/procurements`,
		method: 'POST',
		data: data, // 直接使用传入的完整 data 对象
	});
}


/**
 * [核心新增] 删除一条采购记录
 * @param procurementId 采购记录的ID
 */
export function deleteProcurement(procurementId : string) : Promise<any> {
	return request({
		url: `/ingredients/procurements/${procurementId}`,
		method: 'DELETE',
	});
}

/**
 * [新增] 更新一条采购记录
 * @param procurementId 采购记录的ID
 * @param data 包含新价格的对象
 */
// 修改：根据业务需求，只允许更新 pricePerPackage
export function updateProcurement(procurementId : string, data : { pricePerPackage : number; }) : Promise<any> {
	return request({
		url: `/ingredients/procurements/${procurementId}`,
		method: 'PATCH',
		data,
	});
}

/**
 * 设置指定原料的激活SKU
 * @param ingredientId 原料品类的ID
 * @param skuId 要激活的SKU的ID
 */
export function setActiveSku(ingredientId : string, skuId : string) : Promise<any> {
	return request({
		url: `/ingredients/${ingredientId}/active-sku`,
		method: 'POST', // 后端使用的是 POST
		data: { skuId },
	});
}