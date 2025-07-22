/**
 * 文件路径: src/api/recipes.ts
 * 文件描述: (已更新) 封装所有与配方(Recipe)相关的API请求，新增版本管理接口。
 */
import { request } from '@/utils/request';
// [更新] 导入新增的类型
import type { ProductListItem, RecipeVersion } from '@/types/api';

/**
 * 获取当前店铺的配方/产品列表
 */
export function getRecipes() : Promise<ProductListItem[]> {
	return request<ProductListItem[]>({
		url: '/recipes',
	});
}

/**
 * [新增] 获取指定配方家族的所有版本列表
 * @param familyId 配方家族的ID
 */
export function getRecipeVersions(familyId : string) : Promise<RecipeVersion[]> {
	return request<RecipeVersion[]>({
		url: `/recipes/${familyId}/versions`,
	});
}

/**
 * [新增] 为指定的配方家族创建一个新版本
 * @param familyId 配方家族的ID
 * @param name 新版本的名称
 */
export function createRecipeVersion(
	familyId : string,
	name : string,
) : Promise<RecipeVersion> {
	return request<RecipeVersion>({
		url: `/recipes/${familyId}/versions`,
		method: 'POST',
		data: { name },
	});
}

/**
 * [新增] 激活一个指定的配方版本
 * @param familyId 配方家族的ID
 * @param versionId 要激活的版本ID
 */
export function activateRecipeVersion(
	familyId : string,
	versionId : string,
) : Promise<any> {
	return request({
		url: `/recipes/${familyId}/versions/${versionId}/activate`,
		method: 'PATCH',
	});
}

/**
 * 创建一个新的配方家族
 * @param data 完整的配方数据，符合后端的 CreateRecipeFamilyDto 结构
 */
export function createRecipe(data : any) : Promise<any> {
	return request({
		url: '/recipes',
		method: 'POST',
		data,
	});
}