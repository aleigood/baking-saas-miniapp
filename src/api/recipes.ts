// G-Code-Note: Client API
// 路径: src/api/recipes.ts
/**
 * 文件路径: src/api/recipes.ts
 * 文件描述: 封装配方与版本管理接口。
 */
import { request } from '@/utils/request';
import type {
	ApplyDependencyUpgradeResult,
	DependencyUpgradePlan,
	PendingDependencyUpgradePlan,
	ProductsForTaskResponse,
	RecipeFamily,
	RecipeFormTemplate,
	RecipeOperationLog,
	RecipesListResponse,
	RecipeVersion
} from '@/types/api';

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

export function getDependencyUpgradePlan(familyId: string, versionId: string): Promise<DependencyUpgradePlan> {
	return request<DependencyUpgradePlan>({
		url: `/recipes/${familyId}/versions/${versionId}/dependency-upgrades`,
		method: 'GET',
		hideErrorToast: true
	});
}

export function applyDependencyUpgrades(familyId: string, versionId: string): Promise<ApplyDependencyUpgradeResult> {
	return request<ApplyDependencyUpgradeResult>({
		url: `/recipes/${familyId}/versions/${versionId}/dependency-upgrades/apply`,
		method: 'POST'
	});
}

export function getPendingDependencyUpgrades(familyId: string): Promise<PendingDependencyUpgradePlan> {
	return request<PendingDependencyUpgradePlan>({
		url: `/recipes/${familyId}/pending-dependency-upgrades`,
		method: 'GET',
		hideErrorToast: true
	});
}

export function applyPendingDependencyUpgrades(familyId: string): Promise<ApplyDependencyUpgradeResult> {
	return request<ApplyDependencyUpgradeResult>({
		url: `/recipes/${familyId}/pending-dependency-upgrades/apply`,
		method: 'POST'
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

export function updateRecipeVersionNotes(familyId: string, versionId: string, notes: string): Promise<RecipeVersion> {
	return request<RecipeVersion>({
		url: `/recipes/${familyId}/versions/${versionId}/notes`,
		method: 'PATCH',
		data: { notes }
	});
}

export function getRecipeOperationLogs(familyId: string): Promise<RecipeOperationLog[]> {
	return request<RecipeOperationLog[]>({
		url: `/recipes/${familyId}/operation-logs`,
		method: 'GET'
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
