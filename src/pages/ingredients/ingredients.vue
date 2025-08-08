<template>
	<view class="page-container">
		<view class="page-header">
			<view class="store-selector" @click="showStoreModal = true">{{ dataStore.currentTenant?.name }} &#9662;
			</view>
			<!-- [核心修改] 用户头像优先显示姓名的第一个字 -->
			<view class="user-avatar" @click="showUserMenu = true">{{
        userStore.userInfo?.name?.[0] || '管'
      }}</view>
		</view>
		<view class="page-content">
			<view class="loading-spinner" v-if="isLoading">
				<text>加载中...</text>
			</view>
			<template v-else>
				<view>
					<!-- [核心修改] 使用 BarChart 组件替换原有的列表 -->
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

		<AppModal v-model:visible="showStoreModal" title="选择门店">
			<view v-for="tenant in dataStore.tenants" :key="tenant.id" class="list-item"
				@click="handleSelectTenant(tenant.id)">{{ tenant.name }}</view>
		</AppModal>
		<AppModal v-model:visible="showUserMenu">
			<view class="list-item" style="border: none; padding: 10px 15px" @click="userStore.logout()">退出登录</view>
		</AppModal>
	</view>
</template>
<script setup lang="ts">
	import { ref, computed } from 'vue';
	import { onShow } from '@dcloudio/uni-app';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import type { Ingredient } from '@/types/api';
	import AppModal from '@/components/AppModal.vue';
	import AppFab from '@/components/AppFab.vue';
	import BarChart from '@/components/BarChart.vue'; // [新增] 引入 BarChart 组件

	const userStore = useUserStore();
	const dataStore = useDataStore();
	const ingredientFilter = ref('all');
	const showStoreModal = ref(false);
	const showUserMenu = ref(false);
	const isLoading = ref(false);

	onShow(async () => {
		isLoading.value = true;
		await dataStore.fetchIngredientsData();
		isLoading.value = false;
	});

	// [核心修正] 将原料消耗统计数据转换为图表所需格式，并按降序排序
	const ingredientStatsForChart = computed(() => {
		return dataStore.ingredientStats
			.map(item => ({
				name: item.name,
				value: item.consumedGrams / 1000, // 转换为 kg
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

	const handleSelectTenant = async (tenantId : string) => {
		if (dataStore.currentTenantId === tenantId) {
			showStoreModal.value = false;
			return;
		}
		isLoading.value = true;
		await dataStore.selectTenant(tenantId);
		showStoreModal.value = false;
		await dataStore.fetchIngredientsData();
		isLoading.value = false;
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