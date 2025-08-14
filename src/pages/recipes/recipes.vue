<template>
	<view class="page-container-flex">
		<view class="page-header">
			<view class="store-selector" @click="uiStore.openModal('store')">{{ dataStore.currentTenant?.name }} &#9662;
			</view>
			<!-- [核心修改] 使用 IconButton 组件包裹用户头像 -->
			<IconButton circle class="user-avatar" @click="uiStore.openModal('userOptions')">
				{{ userStore.userInfo?.name?.[0] || '管' }}
			</IconButton>
		</view>
		<view class="page-content page-content-with-tabbar-fab page-content-swiper">
			<!-- [重构] 移除全屏加载动画，直接展示页面布局 -->
			<view class="card">
				<view class="card-title"><span>本周制作排行</span></view>
				<!-- [核心修改] 使用新的文本排名列表 -->
				<view v-if="recipeStatsForChart.length > 0" class="ranking-list">
					<view v-for="(item, index) in recipeStatsForChart.slice(0, 10)" :key="item.name"
						class="ranking-item">
						<text class="rank">{{ index + 1 }}</text>
						<text class="name">{{ item.name }}</text>
						<text class="count">{{ item.value }} 个</text>
					</view>
				</view>
				<!-- [新增] 当没有排行数据时显示占位符 -->
				<view v-else class="empty-state">
					<text>暂无排行信息</text>
				</view>
			</view>

			<FilterTabs>
				<FilterTab :active="recipeFilter === 'MAIN'" @click="recipeFilter = 'MAIN'">面团</FilterTab>
				<FilterTab :active="recipeFilter === 'OTHER'" @click="recipeFilter = 'OTHER'">其他</FilterTab>
			</FilterTabs>

			<!-- [新增] 使用 swiper 组件实现滑动切换 -->
			<swiper class="swiper-container" :current="currentTabIndex" @change="onSwiperChange">
				<!-- 面团列表 -->
				<swiper-item>
					<scroll-view scroll-y class="swiper-scroll-view">
						<template v-if="mainRecipes.length > 0">
							<ListItem v-for="family in mainRecipes" :key="family.id"
								@click="navigateToDetail(family.id)">
								<view class="main-info">
									<view class="name">{{ family.name }}</view>
									<view class="desc">
										{{ getProductCount(family) }} 种面包
									</view>
								</view>
								<view class="side-info">
									<view class="rating">★ {{ getRating(family.productionTaskCount || 0) }}</view>
									<view class="desc">{{ family.productionTaskCount || 0 }} 次制作</view>
								</view>
							</ListItem>
						</template>
						<view v-else class="empty-state">
							<text>暂无面团配方信息</text>
						</view>
					</scroll-view>
				</swiper-item>

				<!-- 其他配方列表 -->
				<swiper-item>
					<scroll-view scroll-y class="swiper-scroll-view">
						<template v-if="otherRecipes.length > 0">
							<ListItem v-for="family in otherRecipes" :key="family.id"
								@click="navigateToDetail(family.id)">
								<view class="main-info">
									<view class="name">{{ family.name }}</view>
									<view class="desc">
										类型: {{ getRecipeTypeDisplay(family.type) }}
									</view>
								</view>
								<view class="side-info">
									<view class="desc">{{ getIngredientCount(family) }} 种原料</view>
								</view>
							</ListItem>
						</template>
						<view v-else class="empty-state">
							<text>暂无其他配方信息</text>
						</view>
					</scroll-view>
				</swiper-item>
			</swiper>
		</view>
		<AppFab v-if="canEditRecipe" @click="navigateToEditPage(null)" />
	</view>
</template>

<script setup lang="ts">
	import IconButton from '@/components/IconButton.vue';
	import { ref, computed, watch } from 'vue';
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

	const recipeFilter = ref<'MAIN' | 'OTHER'>('MAIN');
	const currentTabIndex = ref(0); // [新增] 用于swiper的索引

	const recipeTypeMap = {
		MAIN: '面团',
		PRE_DOUGH: '面种',
		EXTRA: '馅料',
	};

	onShow(async () => {
		if (!dataStore.dataLoaded.recipes) {
			await dataStore.fetchRecipesData();
		}
	});

	// [新增] 监听 recipeFilter 变化，同步更新 swiper 的 currentTabIndex
	watch(recipeFilter, (newVal) => {
		currentTabIndex.value = newVal === 'MAIN' ? 0 : 1;
	});

	// [新增] swiper 滑动事件处理
	const onSwiperChange = (e : any) => {
		const newIndex = e.detail.current;
		currentTabIndex.value = newIndex;
		recipeFilter.value = newIndex === 0 ? 'MAIN' : 'OTHER';
	};

	const recipeStatsForChart = computed(() => {
		return dataStore.recipeStats
			.map(item => ({
				name: item.name,
				value: item.count,
			}))
			.sort((a, b) => b.value - a.value);
	});

	// [新增] 将原来的 filteredRecipes 拆分为两个独立的 computed 属性
	const mainRecipes = computed(() => {
		if (!dataStore.recipes) return [];
		return [...dataStore.recipes]
			.filter((family) => family.type === 'MAIN')
			.sort((a, b) => (b.productionTaskCount || 0) - (a.productionTaskCount || 0));
	});

	const otherRecipes = computed(() => {
		if (!dataStore.recipes) return [];
		return [...dataStore.recipes]
			.filter((family) => family.type === 'PRE_DOUGH' || family.type === 'EXTRA')
			.sort((a, b) => a.name.localeCompare(b.name));
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

	const getRating = (count : number) => {
		if (count > 20) return '4.9';
		if (count > 10) return '4.8';
		if (count > 3) return '4.7';
		return '4.5';
	};

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

	// [新增] 页面和Swiper相关样式
	.page-container-flex {
		display: flex;
		flex-direction: column;
		height: 100vh;
	}

	.page-content-swiper {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
	}

	.swiper-container {
		flex: 1;
		height: 100%;
	}

	.swiper-scroll-view {
		height: 100%;
	}

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

	.empty-state {
		text-align: center;
		padding: 50px 20px;
		color: var(--text-secondary);
	}
</style>