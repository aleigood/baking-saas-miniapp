<template>
	<!-- [核心修改] 页面不再是独立的 page-container -->
	<view>
		<view class="page-header">
			<!-- [核心修改] 点击事件调用 uiStore 的方法 -->
			<view class="store-selector" @click="uiStore.openModal('store')">{{ dataStore.currentTenant?.name }} &#9662;
			</view>
			<view class="user-avatar" @click="uiStore.openModal('userMenu')">{{
        userStore.userInfo?.name?.[0] || '管'
      }}</view>
		</view>
		<view class="page-content page-content-with-fab">
			<view class="loading-spinner" v-if="isLoading">
				<text>加载中...</text>
			</view>
			<template v-else>
				<view>
					<view class="card">
						<view class="card-title"><span>本周制作排行</span></view>
						<BarChart :chart-data="recipeStatsForChart" unit="次" />
					</view>

					<view class="filter-tabs">
						<view class="filter-tab" :class="{ active: recipeFilter === 'MAIN' }"
							@click="recipeFilter = 'MAIN'">主面团</view>
						<view class="filter-tab" :class="{ active: recipeFilter === 'PRE_DOUGH' }"
							@click="recipeFilter = 'PRE_DOUGH'">面种</view>
						<view class="filter-tab" :class="{ active: recipeFilter === 'EXTRA' }"
							@click="recipeFilter = 'EXTRA'">馅料</view>
					</view>

					<view v-if="filteredRecipes.length > 0">
						<view v-for="family in filteredRecipes" :key="family.id" class="list-item"
							@click="navigateToDetail(family.id)">
							<view class="main-info">
								<view class="name">{{ family.name }}</view>
								<view v-if="family.type === 'MAIN'" class="desc">
									{{ getProductCount(family) }} 种面包
								</view>
								<view v-else class="desc">
									类型: {{ getRecipeTypeDisplay(family.type) }}
								</view>
							</view>
							<view class="side-info">
								<template v-if="family.type === 'MAIN'">
									<view class="rating">★ {{ getRating(getFamilyProductionCount(family)) }}</view>
									<view class="desc">{{ getFamilyProductionCount(family) }} 次制作</view>
								</template>
								<template v-else>
									<view class="desc">{{ getIngredientCount(family) }} 种原料</view>
								</template>
							</view>
						</view>
					</view>
					<view v-else class="empty-state">
						<text>暂无配方信息</text>
					</view>
				</view>
			</template>
		</view>
		<AppFab v-if="canEditRecipe" @click="navigateToEditPage(null)" />

		<!-- [核心删除] 移除页面内部的所有 AppModal 和 CustomTabBar 组件 -->
	</view>
</template>

<script setup lang="ts">
	import { ref, computed } from 'vue';
	import { onShow } from '@dcloudio/uni-app';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import { useUiStore } from '@/store/ui'; // [核心新增]
	import type { RecipeFamily } from '@/types/api';
	import AppFab from '@/components/AppFab.vue';
	import BarChart from '@/components/BarChart.vue';

	const userStore = useUserStore();
	const dataStore = useDataStore();
	const uiStore = useUiStore(); // [核心新增]

	const isLoading = ref(false);
	const recipeFilter = ref<'MAIN' | 'PRE_DOUGH' | 'EXTRA'>('MAIN');

	const recipeTypeMap = {
		MAIN: '主面团',
		PRE_DOUGH: '面种',
		EXTRA: '馅料',
	};

	onShow(async () => {
		// [核心修改] 仅当数据未加载时才去获取
		if (!dataStore.dataLoaded.recipes) {
			isLoading.value = true;
			await dataStore.fetchRecipesData();
			isLoading.value = false;
		}
	});

	const recipeStatsForChart = computed(() => {
		return dataStore.recipeStats
			.map(item => ({
				name: item.name,
				value: item.count,
			}))
			.sort((a, b) => b.value - a.value);
	});


	const getRecipeTypeDisplay = (type : 'MAIN' | 'PRE_DOUGH' | 'EXTRA') => {
		return recipeTypeMap[type] || type;
	};

	const getProductCount = (family : RecipeFamily) => {
		if (family.type !== 'MAIN' || !family.versions || family.versions.length === 0) {
			return 0;
		}
		return family.versions[0].products?.length || 0;
	};

	const getIngredientCount = (family : RecipeFamily) => {
		if (family.type === 'MAIN' || !family.versions || family.versions.length === 0) {
			return 0;
		}
		return family.versions[0].doughs.reduce((sum, dough) => sum + (dough._count?.ingredients || 0), 0);
	};

	const getFamilyProductionCount = (family : RecipeFamily) => {
		if (!family || !dataStore.recipeStats) return 0;
		if (family.type === 'MAIN') {
			const productNames =
				family.versions?.[0]?.products?.map(p => p.name) || [];
			if (productNames.length === 0) return 0;
			return dataStore.recipeStats
				.filter(stat => productNames.includes(stat.name))
				.reduce((sum, stat) => sum + stat.count, 0);
		}
		const stat = dataStore.recipeStats.find(s => s.name === family.name);
		return stat ? stat.count : 0;
	};

	const getRating = (count : number) => {
		if (count > 100) return '4.9';
		if (count > 50) return '4.8';
		if (count > 10) return '4.7';
		return '4.5';
	};

	const filteredRecipes = computed(() => {
		if (!dataStore.recipes) {
			return [];
		}
		return dataStore.recipes.filter(
			(family) => family.type === recipeFilter.value,
		);
	});

	const currentUserRoleInTenant = computed(
		() => userStore.userInfo?.tenants.find(t => t.tenant.id === dataStore.currentTenantId)?.role
	);

	const canEditRecipe = computed(() => {
		return (
			currentUserRoleInTenant.value === 'OWNER' || currentUserRoleInTenant.value === 'ADMIN'
		);
	});

	const navigateToEditPage = (familyId : string | null) => {
		const url = familyId ? `/pages/recipes/edit?familyId=${familyId}` : '/pages/recipes/edit';
		uni.navigateTo({ url });
	};

	const navigateToDetail = (familyId : string) => {
		uni.navigateTo({
			url: `/pages/recipes/detail?familyId=${familyId}`,
		});
	};
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	.rating {
		color: var(--accent-color);
		font-weight: bold;
	}

	.filter-tabs {
		display: flex;
		gap: 10px;
		margin-bottom: 20px;
	}

	.filter-tab {
		padding: 8px 18px;
		border-radius: 20px;
		background: #f3e9e3;
		color: var(--text-secondary);
		font-size: 14px;
	}

	.filter-tab.active {
		background: var(--primary-color);
		color: white;
	}
</style>