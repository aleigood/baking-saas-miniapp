/**
 * 文件路径: src/store/data.ts
 * 文件描述: (已重构) 负责管理所有业务数据，通过调用API模块来获取数据。
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Tenant, Recipe, Ingredient, Member, ProductionTaskDto, RecipeStatDto, IngredientStatDto } from '@/types/api';
import { useUserStore } from './user';
// [核心重构] 引入模块化的 API 方法
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
	const recipes = ref<Recipe[]>([]);
	const ingredients = ref<Ingredient[]>([]);
	const members = ref<Member[]>([]);
	const recipeStats = ref<RecipeStatDto[]>([]);
	const ingredientStats = ref<IngredientStatDto[]>([]);

	// Getters
	const currentTenant = computed(() => tenants.value.find(t => String(t.id) === String(currentTenantId.value)));

	// Actions
	async function fetchTenants() {
		try {
			const fetchedTenants = await getTenants(); // [核心重构] 使用 API 文件
			tenants.value = fetchedTenants;

			if (fetchedTenants.length > 0) {
				const storedIdIsValid = fetchedTenants.some(t => String(t.id) === String(currentTenantId.value));

				if (!storedIdIsValid || !currentTenantId.value) {
					currentTenantId.value = String(fetchedTenants[0].id);
					uni.setStorageSync('tenant_id', currentTenantId.value);
				}
			} else {
				currentTenantId.value = '';
				uni.removeStorageSync('tenant_id');
			}
		} catch (error) {
			console.error("Failed to fetch tenants", error);
		}
	}

	async function loadDataForCurrentTenant() {
		if (!currentTenantId.value) return;
		try {
			// [核心重构] 使用模块化的 API 方法并行获取数据
			const [
				prodData, recipeData, ingredientData, memberData, recipeStatData, ingredientStatData
			] = await Promise.all([
				getTasks(),
				getRecipes(),
				getIngredients(),
				getMembers(),
				getRecipeStats(),
				getIngredientStats(),
			]);

			production.value = prodData;
			recipes.value = recipeData;
			ingredients.value = ingredientData;
			members.value = memberData;
			recipeStats.value = recipeStatData;
			ingredientStats.value = ingredientStatData;

		} catch (error) {
			console.error(`Failed to load data for tenant ${currentTenantId.value}`, error);
		}
	}

	async function selectTenant(tenantId : string) {
		currentTenantId.value = String(tenantId);
		uni.setStorageSync('tenant_id', tenantId);
		await loadDataForCurrentTenant();
		const userStore = useUserStore();
		await userStore.fetchUserInfo();
	}

	function reset() {
		tenants.value = [];
		currentTenantId.value = '';
		production.value = [];
		recipes.value = [];
		ingredients.value = [];
		members.value = [];
		recipeStats.value = [];
		ingredientStats.value = [];
	}

	return {
		tenants, currentTenantId, currentTenant,
		production, recipes, ingredients, members, recipeStats, ingredientStats,
		fetchTenants, loadDataForCurrentTenant, selectTenant,
		reset,
	};
});