// G-Code-Note: Client API
// 路径: src/api/recipes.ts
// [核心修改] 新增 exportRecipes 函数

/**
 * 文件路径: src/api/recipes.ts
 * 文件描述: (已更新) 封装所有与配方(Recipe)相关的API请求，新增版本管理接口。
 */
import { request, uploadFile } from '@/utils/request';
// [G-Code-Note] 导入 BatchImportRecipeDto 用于导出函数的类型提示
import type { RecipeFamily, RecipeVersion, RecipesListResponse, ProductsForTaskResponse, RecipeFormTemplate, BatchImportResult, BatchImportRecipeDto } from '@/types/api';

/**
 * [修改] 批量导入配方，增加 tenantIds 参数
 * @param filePath 临时文件路径
 * @param tenantIds 要导入的店铺ID列表
 * @returns 导入结果
 */
export function batchImportRecipes(filePath: string, tenantIds?: string[]): Promise<BatchImportResult> {
	return uploadFile<BatchImportResult>({
		url: '/recipes/batch-import',
		filePath: filePath,
		name: 'file',
		formData: {
			// [修复] 显式地将 tenantIds 数组转换为逗号分隔的字符串
			tenantIds: tenantIds ? tenantIds.join(',') : ''
		}
	});
}

// [G-Code-Note] 【新增】导出指定店铺的所有配方
/**
 * 导出指定店铺的所有配方 (生成的文件与批量导入格式兼容)
 * @param tenantId 店铺ID
 * @returns 包含所有配方族和版本的数组
 */
export const exportRecipes = (tenantId: string): Promise<BatchImportRecipeDto[]> => {
	return request<BatchImportRecipeDto[]>({
		url: `/recipes/export/${tenantId}`, // [G-Code-Note] 这是我们将要创建的后端新接口
		method: 'GET'
	});
};

/**
 * 获取当前店铺的配方/产品列表
 * @returns 返回配方家族列表，每个家族包含其激活的版本信息
 */
export function getRecipes(): Promise<RecipesListResponse> {
	return request<RecipesListResponse>({
		url: '/recipes'
	});
}

/**
 * [核心改造] 获取用于创建生产任务的、按品类分组的产品列表
 */
export function getProductsForTasks(): Promise<ProductsForTaskResponse> {
	return request<ProductsForTaskResponse>({
		url: '/recipes/products-for-tasks'
	});
}

/**
 * [新增] 获取指定配方家族的所有版本列表
 * @param familyId 配方家族的ID
 */
export function getRecipeVersions(familyId: string): Promise<RecipeVersion[]> {
	// 注意：这个接口在后端 recipes.controller.ts 中并未直接提供，
	// 后端 findOne(id) 可以获取所有版本，这里模拟前端调用，实际项目中后端可能需要单独接口。
	// 为符合重构要求，我们假设前端将通过调用 findOne 实现。
	// 这里保留函数名，但在页面中会通过调用 findOne 实现。
	// 实际调用将是 getRecipeFamily(familyId)。
	return request<RecipeVersion[]>({
		url: `/recipes/${familyId}/versions` // 假设后端提供了此端点
	});
}

/**
 * [新增] 获取单个配方家族的完整信息，包括所有版本
 * @param familyId 配方家族的ID
 */
export function getRecipeFamily(familyId: string): Promise<RecipeFamily> {
	return request<RecipeFamily>({
		url: `/recipes/${familyId}`
	});
}

/**
 * [核心新增] 获取用于“创建新版本”的表单预填充数据
 * @param familyId 配方家族的ID
 * @param versionId 源版本的ID
 */
export function getRecipeVersionFormTemplate(familyId: string, versionId: string): Promise<RecipeFormTemplate> {
	return request<RecipeFormTemplate>({
		url: `/recipes/${familyId}/versions/${versionId}/form-template`
	});
}

/**
 * [核心修改] 为指定的配方家族创建一个新版本
 * @param familyId 配方家族的ID
 * @param createDto 新版本的配方数据
 */
export function createRecipeVersion(familyId: string, createDto: any): Promise<RecipeVersion> {
	return request<RecipeVersion>({
		url: `/recipes/${familyId}/versions`, // [修改] 调用新的版本创建接口
		method: 'POST',
		data: createDto
	});
}

/**
 * [核心新增] 修改一个尚未被使用的配方版本
 * @param familyId 配方家族的ID
 * @param versionId 要修改的版本ID
 * @param updateDto 新的配方数据
 */
export function updateRecipeVersion(familyId: string, versionId: string, updateDto: any): Promise<RecipeVersion> {
	return request<RecipeVersion>({
		url: `/recipes/${familyId}/versions/${versionId}`,
		method: 'PATCH',
		data: updateDto
	});
}

/**
 * [修改] 此函数现在只用于创建全新的配方家族
 * @param data 完整的配方数据，符合后端的 CreateRecipeDto 结构
 */
export function createRecipe(data: any): Promise<any> {
	return request({
		url: '/recipes',
		method: 'POST',
		data
	});
}

/**
 * [核心修改] 激活一个指定的配方版本
 * @param familyId 配方家族的ID
 * @param versionId 要激活的版本ID
 */
export function activateRecipeVersion(familyId: string, versionId: string): Promise<any> {
	return request({
		url: `/recipes/${familyId}/versions/${versionId}/activate`,
		method: 'PATCH'
	});
}

/**
 * [新增] 删除一个指定的配方版本
 * @param familyId 配方家族的ID
 * @param versionId 要删除的版本ID
 */
export function deleteRecipeVersion(familyId: string, versionId: string): Promise<any> {
	return request({
		url: `/recipes/${familyId}/versions/${versionId}`,
		method: 'DELETE'
	});
}

/**
 * [新增] 停用一个配方家族
 * @param familyId 配方家族的ID
 */
export function discontinueRecipe(familyId: string): Promise<any> {
	return request({
		url: `/recipes/${familyId}/discontinue`,
		method: 'PATCH'
	});
}

/**
 * [新增] 恢复一个已停用的配方家族
 * @param familyId 配方家族的ID
 */
export function restoreRecipe(familyId: string): Promise<any> {
	return request({
		url: `/recipes/${familyId}/restore`,
		method: 'PATCH'
	});
}

/**
 * [新增] 删除一个配方家族
 * @param familyId 配方家族的ID
 */
export function deleteRecipe(familyId: string): Promise<any> {
	return request({
		url: `/recipes/${familyId}`,
		method: 'DELETE'
	});
}
