import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Tenant, Recipe, Ingredient, Member } from '@/types/api';
import { useUserStore } from './user';
import { request } from '@/utils/request';

export const useDataStore = defineStore('data', () => {
	// State
	const tenants = ref<Tenant[]>([]);
	const currentTenantId = ref<string>(uni.getStorageSync('tenant_id') || '');

	const production = ref<any[]>([]);
	const recipes = ref<Recipe[]>([]);
	const ingredients = ref<Ingredient[]>([]);
	const members = ref<Member[]>([]);
	const recipeStats = ref<any[]>([]);
	const ingredientStats = ref<any[]>([]);

	// Getters
	const currentTenant = computed(() => tenants.value.find(t => String(t.id) === String(currentTenantId.value)));

	// Actions
	async function fetchTenants() {
		try {
			const fetchedTenants = await request<Tenant[]>({ url: '/tenants' });
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
			// [核心修复] 使用正确的后端模块化路由
			const [
				prodData, recipeData, ingredientData, memberData, recipeStatData, ingredientStatData
			] = await Promise.all([
				request({ url: `/tasks` }),          // 对应 TasksModule
				request({ url: `/recipes` }),        // 对应 RecipesModule
				request({ url: `/ingredients` }),    // 对应 IngredientsModule
				request({ url: `/members` }),        // 对应 MembersModule
				request({ url: `/stats/recipes` }),    // 对应 StatsModule
				request({ url: `/stats/ingredients` }),// 对应 StatsModule
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