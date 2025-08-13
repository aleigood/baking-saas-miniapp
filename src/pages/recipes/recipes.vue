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
					<!-- [核心修改] 使用新的文本排名列表 -->
					<view class="ranking-list">
						<view v-for="(item, index) in recipeStatsForChart.slice(0, 10)" :key="item.name"
							class="ranking-item">
							<text class="rank">{{ index + 1 }}</text>
							<text class="name">{{ item.name }}</text>
							<text class="count">{{ item.value }} 个</text>
						</view>
					</view>
				</view>

				<FilterTabs>
					<FilterTab :active="recipeFilter === 'MAIN'" @click="recipeFilter = 'MAIN'">面团</FilterTab>
					<FilterTab :active="recipeFilter === 'OTHER'" @click="recipeFilter = 'OTHER'">其他</FilterTab>
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
								<!-- [核心修改] 直接使用后端返回的 productionTaskCount 字段 -->
								<view class="rating">★ {{ getRating(family.productionTaskCount || 0) }}</view>
								<view class="desc">{{ family.productionTaskCount || 0 }} 次制作</view>
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
	import ListItem from '@/components/ListItem.vue';
	import FilterTabs from '@/components/FilterTabs.vue';
	import FilterTab from '@/components/FilterTab.vue';

	const userStore = useUserStore();
	const dataStore = useDataStore();
	const uiStore = useUiStore();

	const isLoading = ref(false);
	const recipeFilter = ref<'MAIN' | 'OTHER'>('MAIN');

	const recipeTypeMap = {
		MAIN: '面团',
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
		// 总是取第一个版本（通常是激活的）来计算
		return family.versions[0].products?.length || 0;
	};

	// [FIXED] 修复原料数量计算逻辑
	const getIngredientCount = (family : RecipeFamily) => {
		if (family.type === 'MAIN' || !family.versions || family.versions.length === 0) {
			return 0;
		}
		// 累加激活版本中所有面团的原料数量
		return family.versions[0].doughs.reduce((sum, dough) => sum + (dough._count?.ingredients || 0), 0);
	};

	const getRating = (count : number) => {
		if (count > 20) return '4.9'; // 根据任务数调整评级标准
		if (count > 10) return '4.8';
		if (count > 3) return '4.7';
		return '4.5';
	};

	// [REFACTORED] 更新筛选和排序逻辑
	const filteredRecipes = computed(() => {
		if (!dataStore.recipes) {
			return [];
		}
		const recipesCopy = [...dataStore.recipes];
		if (recipeFilter.value === 'MAIN') {
			// [核心修改] 筛选出主面团并按制作任务次数降序排序
			return recipesCopy
				.filter((family) => family.type === 'MAIN')
				.sort((a, b) => (b.productionTaskCount || 0) - (a.productionTaskCount || 0));
		} else {
			// 筛选出其他类型（面种和馅料）并按名称字母顺序排序
			return recipesCopy
				.filter((family) => family.type === 'PRE_DOUGH' || family.type === 'EXTRA')
				.sort((a, b) => a.name.localeCompare(b.name));
		}
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

	.ranking-list {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 15px 25px;
		padding-top: 10px;
	}

	.ranking-item {
		display: flex;
		align-items: center;
		font-size: 14px;
	}

	.rank {
		font-style: italic;
		font-weight: bold;
		width: 12px;
		color: var(--accent-color);
	}

	.name {
		flex-grow: 1;
		margin: 0 8px 0 4px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: var(--text-primary);
	}

	.count {
		color: var(--text-secondary);
		font-size: 13px;
	}
</style>