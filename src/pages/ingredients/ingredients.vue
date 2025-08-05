<template>
	<view class="page-container">
		<view class="page-header">
			<view class="store-selector" @click="showStoreModal = true">{{ dataStore.currentTenant?.name }} &#9662;
			</view>
			<view class="user-avatar" @click="showUserMenu = true">{{
        userStore.userInfo?.phone[0] || '管'
      }}</view>
		</view>
		<view class="page-content">
			<view class="loading-spinner" v-if="isLoading">
				<text>加载中...</text>
			</view>
			<template v-else>
				<!-- [核心重构] 移除详情页逻辑，只保留列表页 -->
				<view>
					<view class="card">
						<view class="card-title"><span>本月消耗统计</span></view>
						<view v-for="(item, index) in dataStore.ingredientStats" :key="item.name" class="stats-item">
							<span class="rank">{{ index + 1 }}</span>
							<span class="name">{{ item.name }}</span>
							<span class="count">{{ (item.consumedGrams / 1000).toFixed(2) }} kg</span>
						</view>
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
								:class="{ 'stock-low': (ing.activeSku?.currentStockInGrams || 0) < 50000 }">
								{{ ((ing.activeSku?.currentStockInGrams || 0) / 1000).toFixed(2) }} kg
							</view>
							<view class="desc">¥ {{ getPricePerKg(ing.activeSku) }}/kg</view>
						</view>
					</view>
				</view>
			</template>
		</view>
		<!-- [修改] 将 "+" 替换为 SVG 图标 -->
		<view class="fab" @click="navigateToEditPage">
			<image class="fab-icon"
				src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z'/%3E%3C/svg%3E" />
		</view>

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
	import type { IngredientSKU } from '@/types/api';
	import AppModal from '@/components/AppModal.vue';

	const userStore = useUserStore();
	const dataStore = useDataStore();
	const ingredientFilter = ref('all');
	const showStoreModal = ref(false);
	const showUserMenu = ref(false);
	const isLoading = ref(false);

	onShow(async () => {
		// [修改] 每次进入页面都刷新数据，以保证从详情页返回时数据是最新的
		isLoading.value = true;
		await dataStore.fetchIngredientsData();
		isLoading.value = false;
	});

	const filteredIngredients = computed(() => {
		if (ingredientFilter.value === 'low') {
			return dataStore.ingredients.filter((ing) => (ing.activeSku?.currentStockInGrams || 0) < 50000);
		}
		return dataStore.ingredients;
	});

	const getPricePerKg = (sku : IngredientSKU | null) => {
		if (!sku || !sku.specWeightInGrams || !sku.currentPricePerPackage) {
			return '0.00';
		}
		return ((Number(sku.currentPricePerPackage) / sku.specWeightInGrams) * 1000).toFixed(2);
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

	// [新增] 跳转到新的详情页
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