<template>
	<view>
		<view class="page-header">
			<!-- [核心修改] 使用 IconButton 组件包裹用户头像 -->
			<view class="store-selector" @click="uiStore.openModal('store')">{{ dataStore.currentTenant?.name }} &#9662;
			</view>
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
					<view class="card-title"><span>本月消耗排行</span></view>
					<BarChart :chart-data="ingredientStatsForChart" unit="kg" />
				</view>
				<!-- [核心修改] 替换为 FilterTabs 和 FilterTab 组件 -->
				<FilterTabs>
					<FilterTab :active="ingredientFilter === 'all'" @click="ingredientFilter = 'all'">全部</FilterTab>
					<FilterTab :active="ingredientFilter === 'low'" @click="ingredientFilter = 'low'">库存紧张</FilterTab>
				</FilterTabs>
				<ListItem v-for="ing in filteredIngredients" :key="ing.id" @click="navigateToDetail(ing.id)">
					<view class="main-info">
						<view class="name">{{ ing.name }}</view>
						<view class="desc">品牌: {{ ing.activeSku?.brand || '未设置' }}</view>
					</view>
					<view class="side-info">
						<!-- [REFACTORED] 显示可供应天数，并根据天数判断是否库存紧张 -->
						<view class="value" :class="{ 'stock-low': ing.daysOfSupply < 7 }">
							{{ getDaysOfSupplyText(ing.daysOfSupply) }}
						</view>
						<view class="desc">库存: {{ (ing.currentStockInGrams / 1000).toFixed(2) }} kg</view>
					</view>
				</ListItem>
			</template>
		</view>
		<AppFab @click="navigateToEditPage" />
	</view>
</template>
<script setup lang="ts">
	import IconButton from '@/components/IconButton.vue'; // 引入 IconButton 组件
	import { ref, computed } from 'vue';
	import { onShow } from '@dcloudio/uni-app';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import { useUiStore } from '@/store/ui';
	import type { Ingredient } from '@/types/api';
	import AppFab from '@/components/AppFab.vue';
	import BarChart from '@/components/BarChart.vue';
	import ListItem from '@/components/ListItem.vue';
	import FilterTabs from '@/components/FilterTabs.vue'; // 引入新组件
	import FilterTab from '@/components/FilterTab.vue'; // 引入新组件

	const userStore = useUserStore();
	const dataStore = useDataStore();
	const uiStore = useUiStore();
	const ingredientFilter = ref('all');
	const isLoading = ref(false);

	onShow(async () => {
		if (!dataStore.dataLoaded.ingredients) {
			isLoading.value = true;
			await dataStore.fetchIngredientsData();
			isLoading.value = false;
		}
	});

	const ingredientStatsForChart = computed(() => {
		return dataStore.ingredientStats
			.map(item => ({
				name: item.name,
				value: item.consumedGrams / 1000,
			}))
			.sort((a, b) => b.value - a.value);
	});

	const filteredIngredients = computed(() => {
		if (ingredientFilter.value === 'low') {
			// [REFACTORED] 按可供应天数筛选和排序
			return [...dataStore.ingredients] // 创建一个新数组以避免直接修改store
				.filter((ing) => ing.daysOfSupply < 7) // 筛选出供应天数少于7天的原料
				.sort((a, b) => a.daysOfSupply - b.daysOfSupply); // 按天数升序排列
		}
		return dataStore.ingredients;
	});

	// [DELETED] getPricePerKg 方法不再在列表页使用，可以移除

	// [ADDED] 新增一个辅助函数来格式化显示可供应天数
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

	.side-info .stock-low {
		color: var(--danger-color);
		font-weight: bold;
	}
</style>