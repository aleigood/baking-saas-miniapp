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
		<view class="page-content">
			<view class="loading-spinner" v-if="isLoading">
				<text>加载中...</text>
			</view>
			<template v-else>
				<view>
					<view class="card">
						<view class="card-title"><span>本月消耗排行</span></view>
						<BarChart :chart-data="ingredientStatsForChart" unit="kg" />
					</view>
					<view class="filter-tabs">
						<view class="filter-tab" :class="{ active: ingredientFilter === 'all' }"
							@click="ingredientFilter = 'all'">全部</view>
						<view class="filter-tab" :class="{ active: ingredientFilter === 'low' }"
							@click="ingredientFilter = 'low'">库存紧张</view>
					</view>
					<view v-for="ing in filteredIngredients" :key="ing.id" class="list-item"
						@click="navigateToDetail(ing.id)">
						<view class="main-info">
							<view class="name">{{ ing.name }}</view>
							<view class="desc">品牌: {{ ing.activeSku?.brand || '未设置' }}</view>
						</view>
						<view class="side-info">
							<view class="value"
								:class="{ 'stock-low': ing.currentStockInGrams < ing.avgConsumptionPerTask }">
								{{ (ing.currentStockInGrams / 1000).toFixed(2) }} kg
							</view>
							<view class="desc">¥ {{ getPricePerKg(ing) }}/kg</view>
						</view>
					</view>
				</view>
			</template>
		</view>
		<AppFab @click="navigateToEditPage" />

		<!-- [核心删除] 移除页面内部的所有 AppModal 和 CustomTabBar 组件 -->
	</view>
</template>
<script setup lang="ts">
	import { ref, computed } from 'vue';
	import { onShow } from '@dcloudio/uni-app';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import { useUiStore } from '@/store/ui'; // [核心新增]
	import type { Ingredient } from '@/types/api';
	import AppFab from '@/components/AppFab.vue';
	import BarChart from '@/components/BarChart.vue';

	const userStore = useUserStore();
	const dataStore = useDataStore();
	const uiStore = useUiStore(); // [核心新增]
	const ingredientFilter = ref('all');
	const isLoading = ref(false);

	onShow(async () => {
		// [核心修改] 仅当数据未加载时才去获取，避免重复请求
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
			return dataStore.ingredients.filter((ing) => ing.avgConsumptionPerTask > 0 && ing.currentStockInGrams < ing.avgConsumptionPerTask);
		}
		return dataStore.ingredients;
	});

	const getPricePerKg = (ing : Ingredient) => {
		if (!ing.activeSku || !ing.activeSku.specWeightInGrams || !ing.currentPricePerPackage) {
			return '0.00';
		}
		return ((Number(ing.currentPricePerPackage) / ing.activeSku.specWeightInGrams) * 1000).toFixed(2);
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