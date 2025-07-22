/**
 * 文件路径: src/store/data.ts
 * 文件描述: (性能优化) 将全量数据加载拆分为按需加载，提升切换店铺的响应速度。
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
	Tenant,
	ProductListItem,
	Ingredient,
	Member,
	ProductionTaskDto,
	RecipeStatDto,
	IngredientStatDto,
} from '@/types/api';
import { useUserStore } from './user';
import { getTenants } from '@/api/tenants';
import { getTasks } from '@/api/tasks';
import { getRecipes } from '@/api/recipes';
import { getIngredients } from '@/api/ingredients';
import { getMembers } from '@/api/members';
import { getRecipeStats, getIngredientStats } from '@/api/stats';

export const useDataStore = defineStore('data', () => {
	// State
	const tenants = ref<Tenant[]>([]);
	const currentTenantId = ref<string>(uni.getStorageSync('tenant_id') || '');

	const production = ref<ProductionTaskDto[]>([]);
	const recipes = ref<ProductListItem[]>([]);
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
	const currentTenant = computed(() =>
		tenants.value.find((t) => String(t.id) === String(currentTenantId.value)),
	);

	// Actions
	async function fetchTenants() {
		try {
			const fetchedTenants = await getTenants();
			tenants.value = fetchedTenants;

			if (fetchedTenants.length > 0) {
				const storedIdIsValid = fetchedTenants.some(
					(t) => String(t.id) === String(currentTenantId.value),
				);

				if (!storedIdIsValid || !currentTenantId.value) {
					currentTenantId.value = String(fetchedTenants[0].id);
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
			const [prodData, recipeStatData] = await Promise.all([
				getTasks(),
				getRecipeStats(),
			]);
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
			// [修正] 同时获取配方排行数据
			const [recipeData, recipeStatData] = await Promise.all([
				getRecipes(),
				getRecipeStats(),
			]);
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
			const [ingredientData, ingredientStatData] = await Promise.all([
				getIngredients(),
				getIngredientStats(),
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
	 * [重构] 切换店铺时，只重置状态，不再主动加载所有数据。
	 * 数据加载将由各个页面在 onShow 时触发。
	 */
	async function selectTenant(tenantId : string) {
		currentTenantId.value = String(tenantId);
		uni.setStorageSync('tenant_id', tenantId);
		// 重置业务数据和加载状态
		resetData();
		const userStore = useUserStore();
		// 重新获取用户信息，因为角色可能在不同店铺中不同
		await userStore.fetchUserInfo();
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