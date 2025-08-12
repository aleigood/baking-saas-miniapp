<template>
	<view>
		<view class="page-header">
			<view class="store-selector" @click="uiStore.openModal('store')">{{ dataStore.currentTenant?.name }} &#9662;
			</view>
			<!-- [核心修改] 使用 IconButton 组件包裹用户头像 -->
			<IconButton circle class="user-avatar" @click="uiStore.openModal('userMenu')">
				{{ userStore.userInfo?.name?.[0] || '管' }}
			</IconButton>
		</view>
		<view class="page-content page-content-with-tabbar-fab">
			<view class="loading-spinner" v-if="isLoading">
				<text>加载中...</text>
			</view>
			<template v-else>
				<view class="card">
					<view class="card-title"><span>本周制作排行</span></view>
					<BarChart :chart-data="recipeStatsForChart" unit="次" />
				</view>

				<!-- [核心修改] 替换为 FilterTabs 和 FilterTab 组件 -->
				<FilterTabs>
					<FilterTab :active="recipeFilter === 'MAIN'" @click="recipeFilter = 'MAIN'">主面团</FilterTab>
					<FilterTab :active="recipeFilter === 'PRE_DOUGH'" @click="recipeFilter = 'PRE_DOUGH'">面种</FilterTab>
					<FilterTab :active="recipeFilter === 'EXTRA'" @click="recipeFilter = 'EXTRA'">馅料</FilterTab>
				</FilterTabs>

				<template v-if="filteredRecipes.length > 0">
					<ListItem v-for="family in filteredRecipes" :key="family.id" @click="navigateToDetail(family.id)">
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
					</ListItem>
				</template>
				<view v-else class="empty-state">
					<text>暂无配方信息</text>
				</view>
			</template>
		</view>
		<AppFab v-if="canEditRecipe" @click="navigateToEditPage(null)" />
	</view>
</template>

<script setup lang="ts">
	import IconButton from '@/components/IconButton.vue'; // 引入 IconButton 组件
	import { ref, computed } from 'vue';
	import { onShow } from '@dcloudio/uni-app';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import { useUiStore } from '@/store/ui';
	import type { RecipeFamily } from '@/types/api';
	import AppFab from '@/components/AppFab.vue';
	import BarChart from '@/components/BarChart.vue';
	import ListItem from '@/components/ListItem.vue';
	import FilterTabs from '@/components/FilterTabs.vue'; // 引入新组件
	import FilterTab from '@/components/FilterTab.vue'; // 引入新组件

	const userStore = useUserStore();
	const dataStore = useDataStore();
	const uiStore = useUiStore();

	const isLoading = ref(false);
	const recipeFilter = ref<'MAIN' | 'PRE_DOUGH' | 'EXTRA'>('MAIN');

	const recipeTypeMap = {
		MAIN: '主面团',
		PRE_DOUGH: '面种',
		EXTRA: '馅料',
	};

	onShow(async () => {
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

	// [REFACTORED] 制作次数的计算逻辑被极大简化
	const getFamilyProductionCount = (family : RecipeFamily) => {
		// 直接从后端返回的数据中获取制作次数，如果不存在则默认为0
		return family.productionCount || 0;
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
</style>