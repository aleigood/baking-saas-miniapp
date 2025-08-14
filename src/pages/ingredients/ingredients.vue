<template>
	<view class="page-container page-container-flex">
		<view class="page-header">
			<view class="store-selector" @click="uiStore.openModal('store')">{{ dataStore.currentTenant?.name }} &#9662;
			</view>
			<IconButton circle class="user-avatar" @click="uiStore.openModal('userOptions')">
				{{ userStore.userInfo?.name?.[0] || '管' }}
			</IconButton>
		</view>
		<view class="page-content page-content-with-tabbar-fab page-content-swiper">
			<FilterTabs>
				<FilterTab :active="ingredientFilter === 'all'" @click="ingredientFilter = 'all'">全部</FilterTab>
				<FilterTab :active="ingredientFilter === 'low'" @click="ingredientFilter = 'low'">库存紧张</FilterTab>
			</FilterTabs>

			<!-- [新增] 使用 swiper 组件实现滑动切换 -->
			<swiper class="swiper-container" :current="currentTabIndex" @change="onSwiperChange">
				<!-- 全部原料列表 -->
				<swiper-item>
					<scroll-view scroll-y class="swiper-scroll-view">
						<template v-if="allIngredients.length > 0">
							<ListItem v-for="ing in allIngredients" :key="ing.id" @click="navigateToDetail(ing.id)">
								<view class="main-info">
									<view class="name">{{ ing.name }}</view>
									<view class="desc">品牌: {{ ing.activeSku?.brand || '未设置' }}</view>
								</view>
								<view class="side-info">
									<view class="value">
										{{ (ing.currentStockInGrams / 1000).toFixed(2) }} kg
									</view>
									<view v-if="ing.totalConsumptionInGrams > 0" class="desc consumption">
										已消耗: {{ (ing.totalConsumptionInGrams / 1000).toFixed(2) }} kg
									</view>
								</view>
							</ListItem>
						</template>
						<view v-else class="empty-state">
							<text>暂无原料信息</text>
						</view>
					</scroll-view>
				</swiper-item>

				<!-- 库存紧张列表 -->
				<swiper-item>
					<scroll-view scroll-y class="swiper-scroll-view">
						<template v-if="lowStockIngredients.length > 0">
							<ListItem v-for="ing in lowStockIngredients" :key="ing.id"
								@click="navigateToDetail(ing.id)">
								<view class="main-info">
									<view class="name">{{ ing.name }}</view>
									<view class="desc">品牌: {{ ing.activeSku?.brand || '未设置' }}</view>
								</view>
								<view class="side-info">
									<view class="value-tag" :class="getStockStatusClass(ing.daysOfSupply)">
										{{ getDaysOfSupplyText(ing.daysOfSupply) }}
									</view>
									<view class="desc">库存: {{ (ing.currentStockInGrams / 1000).toFixed(2) }} kg</view>
								</view>
							</ListItem>
						</template>
						<view v-else class="empty-state">
							<text>暂无库存紧张的原料</text>
						</view>
					</scroll-view>
				</swiper-item>
			</swiper>
		</view>
		<AppFab @click="navigateToEditPage" />
	</view>
</template>
<script setup lang="ts">
	import IconButton from '@/components/IconButton.vue';
	import { ref, computed, watch } from 'vue';
	import { onShow } from '@dcloudio/uni-app';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import { useUiStore } from '@/store/ui';
	import type { Ingredient } from '@/types/api';
	import AppFab from '@/components/AppFab.vue';
	import ListItem from '@/components/ListItem.vue';
	import FilterTabs from '@/components/FilterTabs.vue';
	import FilterTab from '@/components/FilterTab.vue';

	const userStore = useUserStore();
	const dataStore = useDataStore();
	const uiStore = useUiStore();
	const ingredientFilter = ref('all');
	const currentTabIndex = ref(0); // [新增] 用于swiper的索引

	onShow(async () => {
		if (!dataStore.dataLoaded.ingredients) {
			await dataStore.fetchIngredientsData();
		}
	});

	// [新增] 监听 ingredientFilter 变化，同步更新 swiper 的 currentTabIndex
	watch(ingredientFilter, (newVal) => {
		currentTabIndex.value = newVal === 'all' ? 0 : 1;
	});

	// [新增] swiper 滑动事件处理
	const onSwiperChange = (e : any) => {
		const newIndex = e.detail.current;
		currentTabIndex.value = newIndex;
		ingredientFilter.value = newIndex === 0 ? 'all' : 'low';
	};

	// [新增] 将原来的 filteredIngredients 拆分为两个独立的 computed 属性
	const allIngredients = computed(() => {
		if (!dataStore.ingredients) return [];
		return [...dataStore.ingredients].sort((a, b) => b.totalConsumptionInGrams - a.totalConsumptionInGrams);
	});

	const lowStockIngredients = computed(() => {
		if (!dataStore.ingredients) return [];
		return [...dataStore.ingredients]
			.filter((ing) => ing.daysOfSupply < 7)
			.sort((a, b) => a.daysOfSupply - b.daysOfSupply);
	});

	const getDaysOfSupplyText = (days : number) => {
		if (!isFinite(days) || days > 365) {
			return '充足';
		}
		if (days < 1 && days > 0) {
			return '不足1天';
		}
		if (days <= 0) {
			return '已用尽';
		}
		return `约剩 ${Math.floor(days)} 天`;
	};

	const getStockStatusClass = (days : number) => {
		if (days <= 0) {
			return 'stock-danger';
		}
		if (days < 7) {
			return 'stock-warning';
		}
		return '';
	};

	const navigateToEditPage = () => {
		uni.navigateTo({
			url: '/pages/ingredients/edit',
		});
	};

	const navigateToDetail = (ingredientId : string) => {
		uni.navigateTo({
			url: `/pages/ingredients/detail?ingredientId=${ingredientId}`,
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

	.side-info .consumption {
		margin-top: 2px;
	}

	.value-tag {
		font-size: 12px;
		font-weight: 500;
		padding: 3px 8px;
		border-radius: 6px;
		color: var(--text-secondary);
		background-color: #f3f4f6;
		display: inline-block;
	}

	.value-tag.stock-warning {
		background-color: #fef3c7;
		color: #92400e;
	}

	.value-tag.stock-danger {
		background-color: #fee2e2;
		color: #991b1b;
	}
</style>