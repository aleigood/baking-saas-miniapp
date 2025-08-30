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
import { getRecipes } from '@/api/recipes';
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
	const production = ref<ProductionTaskDto[]>([]);
	const prepTask = ref<PrepTask | null>(null);
	// [修改] homeStats 不再包含 completedThisWeekCount
	const homeStats = ref({ pendingCount: 0 });
	const historicalTasks = ref<Record<string, ProductionTaskDto[]>>({});
	const historicalTasksMeta = ref({
		page: 1,
		limit: 10,
		hasMore: true,
	});
	const recipes = ref<RecipeFamily[]>([]);
	const ingredients = ref<Ingredient[]>([]);
	const members = ref<Member[]>([]);
	const recipeStats = ref<RecipeStatDto[]>([]);
	const ingredientStats = ref<IngredientStatDto[]>([]);

	const dataLoaded = ref({
		production: false,
		recipes: false,
		ingredients: false,
		members: false,
		historicalTasks: false,
	});

	const currentTenant = computed(() => tenants.value.find((t) => t.id === currentTenantId.value));

	const productList = computed(() : ProductListItem[] => {
		const list : ProductListItem[] = [];
		recipes.value
			.filter((family) => !family.deletedAt)
			.forEach((family) => {
				family.versions
					.filter((v) => v.isActive)
					.forEach((version) => {
						version.products.forEach((product) => {
							list.push({
								id: product.id,
								name: product.name,
								type: family.name,
								familyId: family.id,
							});
						});
					});
			});
		return list;
	});

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

	// [修改] fetchProductionData 现在接收日期参数
	async function fetchProductionData(date ?: string) {
		if (!currentTenantId.value) return;
		try {
			// [核心修复] 简化逻辑，始终调用 getTasks 接口。后端已优化此接口，无论是否传入日期都能返回正确的数据结构。
			const payload = await getTasks(date);
			production.value = payload.tasks;
			prepTask.value = payload.prepTask;
			// [核心修改] 如果返回体中包含 stats，则更新 homeStats 的 pendingCount
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
		prepTask.value = null;
		// [修改] 重置 homeStats
		homeStats.value = { pendingCount: 0 };
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
		prepTask,
		homeStats,
		historicalTasks,
		historicalTasksMeta,
		recipes,
		productList,
		ingredients,
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
		fetchIngredientsData,
		fetchMembersData,
	};
});