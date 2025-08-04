/**
 * 文件路径: src/store/data.ts
 * 文件描述: (性能优化) 将全量数据加载拆分为按需加载，提升切换店铺的响应速度。
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
	Tenant,
	ProductListItem, // 这个类型需要重新思考，因为后端返回的是 RecipeFamily
	RecipeFamily,
	Ingredient,
	Member,
	ProductionTaskDto,
	RecipeStatDto,
	IngredientStatDto,
} from '@/types/api';
import { useUserStore } from './user';
import { getTenants as getTenantsApi } from '@/api/tenants';
import { switchTenant as switchTenantApi } from '@/api/auth';
import { getTasks } from '@/api/tasks';
import { getRecipes } from '@/api/recipes';
import { getIngredients } from '@/api/ingredients';
import { getMembers } from '@/api/members';
import { getRecipeStats, getIngredientStats } from '@/api/stats';

// 辅助函数：获取本月起止日期
function getMonthDateRange() {
	const now = new Date();
	const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
	const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
	return { startDate, endDate };
}

export const useDataStore = defineStore('data', () => {
	// State
	const tenants = ref<Tenant[]>([]);
	const currentTenantId = ref<string>(uni.getStorageSync('tenant_id') || '');

	// 业务数据
	const production = ref<ProductionTaskDto[]>([]);
	const recipes = ref<RecipeFamily[]>([]); // 更新为 RecipeFamily 数组
	const ingredients = ref<Ingredient[]>([]);
	const members = ref<Member[]>([]);
	const recipeStats = ref<RecipeStatDto[]>([]);
	const ingredientStats = ref<IngredientStatDto[]>([]);

	// [新增] 用于跟踪各模块数据是否已加载的状态
	const dataLoaded = ref({
		production: false,
		recipes: false,
		ingredients: false,
		members: false,
	});

	// Getters
	const currentTenant = computed(() => tenants.value.find((t) => t.id === currentTenantId.value));

	// [新增] 将 RecipeFamily 转换为旧的 ProductListItem 结构以兼容UI
	const productList = computed(() : ProductListItem[] => {
		const list : ProductListItem[] = [];
		recipes.value.forEach((family) => {
			family.versions
				.filter((v) => v.isActive) // 只选择激活的版本
				.forEach((version) => {
					version.products.forEach((product) => {
						list.push({
							id: product.id,
							name: product.name,
							type: family.name, // 类型是配方家族名
							familyId: family.id,
							// 旧的模拟数据，可以保留或移除
							weight: product.baseDoughWeight,
							rating: 4.5,
							publicCount: 100,
							ingredients: [], // 详情数据后续获取
						});
					});
				});
		});
		return list;
	});

	// Actions
	async function fetchTenants() {
		try {
			const userStore = useUserStore();
			if (!userStore.userInfo) {
				await userStore.fetchUserInfo();
			}
			const userTenants = userStore.userInfo?.tenants.map((t) => t.tenant) || [];
			tenants.value = userTenants;

			if (userTenants.length > 0) {
				const storedIdIsValid = userTenants.some((t) => t.id === currentTenantId.value);
				if (!currentTenantId.value || !storedIdIsValid) {
					currentTenantId.value = userTenants[0].id;
					uni.setStorageSync('tenant_id', currentTenantId.value);
				}
			} else {
				currentTenantId.value = '';
				uni.removeStorageSync('tenant_id');
			}
		} catch (error) {
			console.error('Failed to fetch tenants', error);
		}
	}

	// [重构] 将原来的 `loadDataForCurrentTenant` 拆分为独立的、按需调用的函数

	async function fetchProductionData() {
		if (!currentTenantId.value) return;
		try {
			const { startDate, endDate } = getMonthDateRange();
			const [prodData, recipeStatData] = await Promise.all([getTasks(), getRecipeStats(startDate, endDate)]);
			production.value = prodData;
			recipeStats.value = recipeStatData;
			dataLoaded.value.production = true;
		} catch (error) {
			console.error('Failed to fetch production data', error);
		}
	}

	async function fetchRecipesData() {
		if (!currentTenantId.value) return;
		try {
			const { startDate, endDate } = getMonthDateRange();
			const [recipeData, recipeStatData] = await Promise.all([getRecipes(), getRecipeStats(startDate, endDate)]);
			recipes.value = recipeData;
			recipeStats.value = recipeStatData;
			dataLoaded.value.recipes = true;
		} catch (error) {
			console.error('Failed to fetch recipes data', error);
		}
	}

	async function fetchIngredientsData() {
		if (!currentTenantId.value) return;
		try {
			const { startDate, endDate } = getMonthDateRange();
			const [ingredientData, ingredientStatData] = await Promise.all([
				getIngredients(),
				getIngredientStats(startDate, endDate),
			]);
			ingredients.value = ingredientData;
			ingredientStats.value = ingredientStatData;
			dataLoaded.value.ingredients = true;
		} catch (error) {
			console.error('Failed to fetch ingredients data', error);
		}
	}

	async function fetchMembersData() {
		if (!currentTenantId.value) return;
		try {
			members.value = await getMembers();
			dataLoaded.value.members = true;
		} catch (error) {
			console.error('Failed to fetch members data', error);
		}
	}

	/**
	 * [重构] 切换店铺时，调用后端接口切换token，然后重置状态。
	 * 数据加载将由各个页面在 onShow 时触发。
	 */
	async function selectTenant(tenantId : string) {
		const userStore = useUserStore();
		try {
			const res = await switchTenantApi(tenantId);
			userStore.setToken(res.accessToken); // 更新token
			currentTenantId.value = tenantId;
			uni.setStorageSync('tenant_id', tenantId);
			// 重置业务数据和加载状态
			resetData();
			// 重新获取用户信息，因为角色可能在不同店铺中不同
			await userStore.fetchUserInfo();
		} catch (error) {
			console.error('Failed to switch tenant', error);
			uni.showToast({ title: '切换店铺失败', icon: 'none' });
		}
	}

	// [新增] 用于重置业务数据和加载状态的辅助函数
	function resetData() {
		production.value = [];
		recipes.value = [];
		ingredients.value = [];
		members.value = [];
		recipeStats.value = [];
		ingredientStats.value = [];
		dataLoaded.value = {
			production: false,
			recipes: false,
			ingredients: false,
			members: false,
		};
	}

	function reset() {
		tenants.value = [];
		currentTenantId.value = '';
		resetData();
	}

	return {
		tenants,
		currentTenantId,
		currentTenant,
		production,
		recipes,
		productList, // 暴露转换后的产品列表
		ingredients,
		members,
		recipeStats,
		ingredientStats,
		dataLoaded, // 暴露加载状态
		fetchTenants,
		selectTenant,
		reset,
		// 暴露独立的加载函数
		fetchProductionData,
		fetchRecipesData,
		fetchIngredientsData,
		fetchMembersData,
	};
});