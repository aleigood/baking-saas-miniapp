/**
 * 文件路径: src/store/data.ts
 * 文件描述: (性能优化) 将全量数据加载拆分为按需加载，提升切换店铺的响应速度。
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
	Tenant,
	ProductListItem,
	RecipeFamily,
	Ingredient,
	Member,
	ProductionTaskDto,
	RecipeStatDto,
	IngredientStatDto,
	PrepTask,
} from '@/types/api';
import { useUserStore } from './user';
import { useToastStore } from './toast';
import { getTenants as getTenantsApi } from '@/api/tenants';
import { switchTenant as switchTenantApi } from '@/api/auth';
import { getTasks, getHistoryTasks } from '@/api/tasks';
// [核心修改] 导入新的 API 函数
import { getRecipes, getProductsForTasks } from '@/api/recipes';
import { getIngredients } from '@/api/ingredients';
import { getMembers } from '@/api/members';
// [核心修复] 移除了对 getProductionDashboard 的导入
import { getRecipeStats, getIngredientStats } from '@/api/stats';

function getMonthDateRange() {
	const now = new Date();
	const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
	const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
	return { startDate, endDate };
}

export const useDataStore = defineStore('data', () => {
	const tenants = ref<Tenant[]>([]);
	const currentTenantId = ref<string>(uni.getStorageSync('tenant_id') || '');
	// [核心修改] production 的类型现在是一个联合类型数组
	const production = ref<(ProductionTaskDto | (PrepTask & { status : 'PREP' }))[]>([]);
	// [核心修改] prepTask 不再需要单独存储
	const homeStats = ref({ pendingCount: 0 });
	const historicalTasks = ref<Record<string, ProductionTaskDto[]>>({});
	const historicalTasksMeta = ref({
		page: 1,
		limit: 10,
		hasMore: true,
	});
	const recipes = ref<{ mainRecipes : RecipeFamily[]; otherRecipes : RecipeFamily[] }>({
		mainRecipes: [],
		otherRecipes: [],
	});
	const productsForTaskCreation = ref<Record<string, ProductListItem[]>>({});
	const ingredients = ref<{ allIngredients : Ingredient[]; lowStockIngredients : Ingredient[] }>({
		allIngredients: [],
		lowStockIngredients: [],
	});
	const members = ref<Member[]>([]);
	const recipeStats = ref<RecipeStatDto[]>([]);
	const ingredientStats = ref<IngredientStatDto[]>([]);

	const dataLoaded = ref({
		production: false,
		recipes: false,
		productsForTaskCreation: false,
		ingredients: false,
		members: false,
		historicalTasks: false,
	});

	const currentTenant = computed(() => tenants.value.find((t) => t.id === currentTenantId.value));

	const allRecipes = computed(() => [...recipes.value.mainRecipes, ...recipes.value.otherRecipes]);

	const allIngredients = computed(() => ingredients.value.allIngredients);


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

	async function fetchProductionData(date ?: string) {
		if (!currentTenantId.value) return;
		try {
			const payload = await getTasks(date);
			// [核心修改] 直接使用后端返回的已合并和排序的 tasks 列表
			production.value = payload.tasks;
			if (payload.stats) {
				homeStats.value.pendingCount = payload.stats.todayPendingCount;
			}
			dataLoaded.value.production = true;
		} catch (error) {
			console.error('Failed to fetch production data', error);
		}
	}

	async function fetchHistoricalTasks(loadMore = false) {
		if (!currentTenantId.value || (!loadMore && dataLoaded.value.historicalTasks) || !historicalTasksMeta.value.hasMore) {
			return;
		}

		try {
			let pageToFetch = 1;
			if (loadMore) {
				pageToFetch = historicalTasksMeta.value.page + 1;
			} else {
				resetHistoricalTasks();
			}

			const res = await getHistoryTasks(pageToFetch, historicalTasksMeta.value.limit);

			const newTasksData = res?.data || {};
			const newMeta = res?.meta || { page: pageToFetch, hasMore: false };

			if (loadMore) {
				for (const date in newTasksData) {
					if (historicalTasks.value[date]) {
						historicalTasks.value[date].push(...newTasksData[date]);
					} else {
						historicalTasks.value[date] = newTasksData[date];
					}
				}
			} else {
				historicalTasks.value = newTasksData;
			}

			historicalTasksMeta.value.page = newMeta.page;
			historicalTasksMeta.value.hasMore = newMeta.hasMore;
			dataLoaded.value.historicalTasks = true;

		} catch (error) {
			console.error('Failed to fetch historical tasks', error);
			historicalTasksMeta.value.hasMore = false;
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

	async function fetchProductsForTaskCreation() {
		if (!currentTenantId.value) return;
		try {
			productsForTaskCreation.value = await getProductsForTasks();
			dataLoaded.value.productsForTaskCreation = true;
		} catch (error) {
			console.error('Failed to fetch products for task creation', error);
		}
	}

	async function fetchIngredientsData() {
		if (!currentTenantId.value) return;
		try {
			ingredients.value = await getIngredients();
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

	async function selectTenant(tenantId : string) {
		const userStore = useUserStore();
		const toastStore = useToastStore();
		try {
			const res = await switchTenantApi(tenantId);
			userStore.setToken(res.accessToken);
			currentTenantId.value = tenantId;
			uni.setStorageSync('tenant_id', tenantId);
			resetData();
			await userStore.fetchUserInfo();
		} catch (error) {
			console.error('Failed to switch tenant', error);
			toastStore.show({ message: '切换店铺失败', type: 'error' });
		}
	}

	function resetHistoricalTasks() {
		historicalTasks.value = {};
		historicalTasksMeta.value = { page: 0, limit: 10, hasMore: true };
		dataLoaded.value.historicalTasks = false;
	}

	function resetData() {
		production.value = [];
		// [核心修改] 移除 prepTask.value 的重置
		homeStats.value = { pendingCount: 0 };
		recipes.value = { mainRecipes: [], otherRecipes: [] };
		productsForTaskCreation.value = {};
		ingredients.value = { allIngredients: [], lowStockIngredients: [] };
		members.value = [];
		recipeStats.value = [];
		ingredientStats.value = [];
		dataLoaded.value = {
			production: false,
			recipes: false,
			productsForTaskCreation: false,
			ingredients: false,
			members: false,
			historicalTasks: false,
		};
		resetHistoricalTasks();
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
		// [核心修改] 移除 prepTask 的导出
		homeStats,
		historicalTasks,
		historicalTasksMeta,
		recipes,
		productsForTaskCreation,
		allRecipes,
		ingredients,
		allIngredients,
		members,
		recipeStats,
		ingredientStats,
		dataLoaded,
		fetchTenants,
		selectTenant,
		reset,
		fetchProductionData,
		fetchHistoricalTasks,
		fetchRecipesData,
		fetchProductsForTaskCreation,
		fetchIngredientsData,
		fetchMembersData,
	};
});