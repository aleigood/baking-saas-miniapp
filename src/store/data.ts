/**
 * 文件路径: src/store/data.ts
 * 文件描述: (性能优化) 将全量数据加载拆分为按需加载，提升切换店铺的响应速度。
 */
import { defineStore } from 'pinia';
import { ref, computed, reactive } from 'vue';
// [核心改造] 导入新的 ProductsForTaskResponse 和 RecipesListResponse 类型
import type {
	Tenant,
	ProductsForTaskResponse,
	RecipesListResponse,
	RecipeFamily,
	Ingredient,
	Member,
	ProductionTaskDto,
	RecipeStatDto,
	IngredientStatDto,
	PrepTask
} from '@/types/api';
import { useUserStore } from './user';
import { useToastStore } from './toast';
import { getTenants as getTenantsApi } from '@/api/tenants';
import { switchTenant as switchTenantApi } from '@/api/auth';
import { getTasks, getHistoryTasks } from '@/api/tasks';
import { getRecipes, getProductsForTasks } from '@/api/recipes';
import { getIngredients } from '@/api/ingredients';
import { getMembers, getAllMembersByOwner } from '@/api/members';
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
	const production = ref<(ProductionTaskDto | (PrepTask & { status: 'PREP' }))[]>([]);
	const homeStats = ref({ pendingCount: 0 });
	const historicalTasks = ref<Record<string, ProductionTaskDto[]>>({});
	const historicalTasksMeta = ref({
		page: 1,
		limit: 10,
		hasMore: true
	});
	// [核心修改] 更新 recipes 状态的类型定义以匹配 RecipesListResponse
	const recipes = ref<RecipesListResponse>({
		mainRecipes: [],
		preDoughs: [],
		extras: []
	});
	const productsForTaskCreation = ref<ProductsForTaskResponse>({});
	const ingredients = ref<{ allIngredients: Ingredient[]; lowStockIngredients: Ingredient[] }>({
		allIngredients: [],
		lowStockIngredients: []
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
		historicalTasks: false
	});

	const dataStale = reactive({
		production: true,
		recipes: true,
		ingredients: true,
		members: true,
		historicalTasks: true,
		productsForTaskCreation: true
	});

	const currentTenant = computed(() => tenants.value.find((t) => t.id === currentTenantId.value));

	// [核心修改] 更新 allRecipes 计算属性，正确合并所有配方类型
	const allRecipes = computed(() => {
		const main = recipes.value.mainRecipes || [];
		const preDoughs = recipes.value.preDoughs || [];
		const extras = recipes.value.extras || [];
		return [...main, ...preDoughs, ...extras];
	});

	const allIngredients = computed(() => ingredients.value.allIngredients);

	const markProductionAsStale = () => {
		dataStale.production = true;
	};
	const markHistoricalTasksAsStale = () => {
		dataStale.historicalTasks = true;
	};
	const markRecipesAsStale = () => {
		dataStale.recipes = true;
	};
	const markProductsForTaskCreationAsStale = () => {
		dataStale.productsForTaskCreation = true;
	};
	const markIngredientsAsStale = () => {
		dataStale.ingredients = true;
	};
	const markMembersAsStale = () => {
		dataStale.members = true;
	};

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

	async function fetchProductionData(date?: string) {
		if (!currentTenantId.value) return;
		try {
			const payload = await getTasks(date);
			production.value = payload.tasks;
			if (payload.stats) {
				homeStats.value.pendingCount = payload.stats.pendingCount;
			}
			dataLoaded.value.production = true;
			dataStale.production = false;
		} catch (error) {
			console.error('Failed to fetch production data', error);
		}
	}

	async function fetchHistoricalTasks(loadMore = false) {
		if (!currentTenantId.value || (!loadMore && !dataStale.historicalTasks && dataLoaded.value.historicalTasks) || !historicalTasksMeta.value.hasMore) {
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
			dataStale.historicalTasks = false;
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
			dataStale.recipes = false;
		} catch (error) {
			console.error('Failed to fetch recipes data', error);
		}
	}

	async function fetchProductsForTaskCreation() {
		if (!currentTenantId.value) return;
		try {
			productsForTaskCreation.value = await getProductsForTasks();
			dataLoaded.value.productsForTaskCreation = true;
			dataStale.productsForTaskCreation = false;
		} catch (error) {
			console.error('Failed to fetch products for task creation', error);
		}
	}

	async function fetchIngredientsData() {
		if (!currentTenantId.value) return;
		try {
			ingredients.value = await getIngredients();
			dataLoaded.value.ingredients = true;
			dataStale.ingredients = false;
		} catch (error) {
			console.error('Failed to fetch ingredients data', error);
		}
	}

	async function fetchMembersData() {
		if (!currentTenantId.value) return;
		const userStore = useUserStore();
		try {
			const currentUserRole = userStore.userInfo?.tenants.find((t) => t.tenant.id === currentTenantId.value)?.role;

			if (currentUserRole === 'OWNER') {
				const allTenantsWithMembers = await getAllMembersByOwner();
				const currentTenantMembers = allTenantsWithMembers.find((t) => t.tenantId === currentTenantId.value);
				members.value = currentTenantMembers ? currentTenantMembers.members : [];
			} else {
				members.value = await getMembers();
			}

			dataLoaded.value.members = true;
			dataStale.members = false;
		} catch (error) {
			console.error('Failed to fetch members data', error);
			members.value = [];
		}
	}

	async function selectTenant(tenantId: string) {
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
		homeStats.value = { pendingCount: 0 };
		// [核心修改] 重置 recipes 状态时，使用新的结构
		recipes.value = { mainRecipes: [], preDoughs: [], extras: [] };
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
			historicalTasks: false
		};
		Object.keys(dataStale).forEach((key) => (dataStale[key as keyof typeof dataStale] = true));
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
		dataStale,
		fetchTenants,
		selectTenant,
		reset,
		fetchProductionData,
		fetchHistoricalTasks,
		fetchRecipesData,
		fetchProductsForTaskCreation,
		fetchIngredientsData,
		fetchMembersData,
		markProductionAsStale,
		markHistoricalTasksAsStale,
		markRecipesAsStale,
		markProductsForTaskCreationAsStale,
		markIngredientsAsStale,
		markMembersAsStale
	};
});
