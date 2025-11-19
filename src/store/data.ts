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
// [中文注释] 核心修正：从公共文件导入 getLocalDate
import { getLocalDate } from '@/utils/format';

function getMonthDateRange() {
	const now = new Date();
	const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
	const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
	// [中文注释] 核心修正：使用新的 getLocalDate 函数来格式化日期，避免时区问题
	return {
		startDate: getLocalDate(startDate),
		endDate: getLocalDate(endDate)
	};
}

const getTaskProgressStorageKey = (taskId: string) => `task-progress-${taskId}`;
const getPrepTaskProgressStorageKey = (date: string) => `prep-task-progress-${date}`;

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

	// --- 任务进度缓存管理 ---
	// [中文注释] 核心重构：加载指定任务的进度
	const loadTaskProgress = (taskId: string): Set<string> => {
		const storageKey = getTaskProgressStorageKey(taskId);
		const savedKeys = uni.getStorageSync(storageKey);
		if (savedKeys && Array.isArray(savedKeys)) {
			return new Set(savedKeys);
		}
		return new Set();
	};

	// [中文注释] 核心重构：保存指定任务的进度
	const saveTaskProgress = (taskId: string, addedIngredients: Set<string>) => {
		try {
			const storageKey = getTaskProgressStorageKey(taskId);
			const keysToSave = Array.from(addedIngredients);
			uni.setStorageSync(storageKey, keysToSave);
		} catch (e) {
			const toastStore = useToastStore();
			toastStore.show({ message: '保存进度失败', type: 'error' });
			console.error('Failed to save task progress to storage:', e);
		}
	};

	// [中文注释] 核心重构：清除指定任务的进度缓存
	const clearTaskProgress = (taskId: string) => {
		const storageKey = getTaskProgressStorageKey(taskId);
		uni.removeStorageSync(storageKey);
	};

	// [新增] 加载指定日期的前置任务进度
	const loadPrepTaskProgress = (date: string): { addedIngredients: Set<string>; completedItems: Set<string> } => {
		const storageKey = getPrepTaskProgressStorageKey(date);
		const savedData = uni.getStorageSync(storageKey);
		if (savedData) {
			// 确保解析安全
			try {
				const parsed = JSON.parse(savedData);
				const addedIngredients = Array.isArray(parsed.addedIngredients) ? new Set(parsed.addedIngredients) : new Set<string>();
				const completedItems = Array.isArray(parsed.completedItems) ? new Set(parsed.completedItems) : new Set<string>();
				return { addedIngredients, completedItems };
			} catch (e) {
				console.error('Failed to parse prep task progress:', e);
			}
		}
		// [中文注释] 如果没有缓存，返回两个空的 Set
		return { addedIngredients: new Set<string>(), completedItems: new Set<string>() };
	};

	// [新增] 保存指定日期的前置任务进度
	const savePrepTaskProgress = (date: string, addedIngredients: Set<string>, completedItems: Set<string>) => {
		try {
			const storageKey = getPrepTaskProgressStorageKey(date);
			// [中文注释] 将两个 Set 转换为数组，存入一个对象中
			const dataToSave = {
				addedIngredients: Array.from(addedIngredients),
				completedItems: Array.from(completedItems)
			};
			uni.setStorageSync(storageKey, JSON.stringify(dataToSave));
		} catch (e) {
			const toastStore = useToastStore();
			toastStore.show({ message: '保存前置任务进度失败', type: 'error' });
			console.error('Failed to save prep task progress to storage:', e);
		}
	};

	// [新增] 清除指定日期的前置任务进度
	const clearPrepTaskProgress = (date: string) => {
		const storageKey = getPrepTaskProgressStorageKey(date);
		uni.removeStorageSync(storageKey);
	};
	// --- End of 任务进度缓存管理 ---

	const clearProductionTasks = () => {
		production.value = [];
	};

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
		// [核心修复] 修正卫语句逻辑
		// 1. 如果没有租户ID，总
		if (!currentTenantId.value) {
			return;
		}
		// 2. 如果是“加载更多”，但已经没有更多了，则返回
		if (loadMore && !historicalTasksMeta.value.hasMore) {
			return;
		}
		// 3. 如果是“刷新”（非加载更多），并且数据不是stale，并且已经加载过，则返回
		if (!loadMore && !dataStale.historicalTasks && dataLoaded.value.historicalTasks) {
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

	// [核心新增] 暴露一个公开的清理方法，供页面调用以释放内存
	function clearHistoricalTasks() {
		resetHistoricalTasks();
		markHistoricalTasksAsStale();
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
		// [中文注释] 核心重构：导出新的缓存管理方法
		loadTaskProgress,
		saveTaskProgress,
		clearTaskProgress,
		// [新增] 导出前置任务的缓存管理方法
		loadPrepTaskProgress,
		savePrepTaskProgress,
		clearPrepTaskProgress,
		clearProductionTasks,
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
		markMembersAsStale,
		// [新增] 导出清理历史任务的方法
		clearHistoricalTasks
	};
});
