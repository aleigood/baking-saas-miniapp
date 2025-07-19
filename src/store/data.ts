import { defineStore } from 'pinia';
import { ref } from 'vue'; // 移除了 computed
import type { Tenant, Recipe, Ingredient, Member } from '@/types/api';
import { useUserStore } from './user';
import { request } from '@/utils/request';

export const useDataStore = defineStore('data', () => {
	// State
	const tenants = ref<Tenant[]>([]);
	const currentTenantId = ref<string>(uni.getStorageSync('tenant_id') || '');
	const currentTenant = ref<Tenant | null>(null); // [修复] 从 computed 改为 ref

	const production = ref<any[]>([]);
	const recipes = ref<Recipe[]>([]);
	const ingredients = ref<Ingredient[]>([]);
	const members = ref<Member[]>([]);
	const recipeStats = ref<any[]>([]);
	const ingredientStats = ref<any[]>([]);

	// Actions
	async function fetchTenants() {
		try {
			const fetchedTenants = await request<Tenant[]>({ url: '/tenants' });
			tenants.value = fetchedTenants;

			if (fetchedTenants.length > 0) {
				const storedIdIsValid = fetchedTenants.some(t => t.id === currentTenantId.value);

				if (!storedIdIsValid || !currentTenantId.value) {
					currentTenantId.value = fetchedTenants[0].id;
					uni.setStorageSync('tenant_id', currentTenantId.value);
				}
			} else {
				currentTenantId.value = '';
				uni.removeStorageSync('tenant_id');
			}

			// [修复] 主动更新 currentTenant 对象
			currentTenant.value = tenants.value.find(t => t.id === currentTenantId.value) || null;

		} catch (error) {
			console.error("Failed to fetch tenants", error);
		}
	}

	async function loadDataForCurrentTenant() {
		if (!currentTenantId.value) return;
		try {
			const tenantId = currentTenantId.value;
			const [
				prodData, recipeData, ingredientData, memberData, recipeStatData, ingredientStatData
			] = await Promise.all([
				request({ url: `/tenants/${tenantId}/production` }),
				request({ url: `/tenants/${tenantId}/recipes` }),
				request({ url: `/tenants/${tenantId}/ingredients` }),
				request({ url: `/tenants/${tenantId}/members` }),
				request({ url: `/tenants/${tenantId}/stats/recipes` }),
				request({ url: `/tenants/${tenantId}/stats/ingredients` }),
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
		currentTenantId.value = tenantId;
		uni.setStorageSync('tenant_id', tenantId);

		// [修复] 主动更新 currentTenant 对象
		currentTenant.value = tenants.value.find(t => t.id === currentTenantId.value) || null;

		await loadDataForCurrentTenant();
		const userStore = useUserStore();
		await userStore.fetchUserInfo();
	}

	function reset() {
		tenants.value = [];
		currentTenantId.value = '';
		currentTenant.value = null; // [修复] 重置 currentTenant
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