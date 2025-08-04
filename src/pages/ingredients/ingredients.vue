<template>
	<view class="page-container">
		<view class="page-header">
			<view class="store-selector" @click="showStoreModal = true">{{ dataStore.currentTenant?.name }} &#9662;
			</view>
			<!-- [修复] 使用 userInfo.phone 替代不存在的 userInfo.name -->
			<view class="user-avatar" @click="showUserMenu = true">{{
        userStore.userInfo?.phone[0] || '管'
      }}</view>
		</view>
		<view class="page-content">
			<view class="loading-spinner" v-if="isLoading">
				<text>加载中...</text>
			</view>
			<template v-else>
				<view v-if="!selectedIngredient">
					<view class="card">
						<view class="card-title"><span>本月消耗统计</span></view>
						<!-- [修复] 绑定到新的 ingredientStats 结构 -->
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
					<!-- [修复] 绑定到新的 ingredients 和 activeSku 结构 -->
					<view v-for="ing in filteredIngredients" :key="ing.id" class="list-item"
						@click="selectedIngredient = ing">
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
				<view v-else>
					<view class="detail-page">
						<view class="detail-header">
							<view class="back-btn" @click="selectedIngredient = null">&#10094;</view>
							<h2 class="detail-title">{{ selectedIngredient.name }}</h2>
						</view>
						<!-- [修复] 绑定到新的 activeSku 结构 -->
						<view class="tag-group">
							<span class="tag">品牌: {{ selectedIngredient.activeSku?.brand || '未设置' }}</span>
							<span class="tag">单价: ¥{{ getPricePerKg(selectedIngredient.activeSku) }}/kg</span>
						</view>
						<view class="card">
							<view class="card-title">价格历史</view>
							<view class="mock-chart">模拟图表区域</view>
						</view>
						<view class="card">
							<view class="card-title">近期用量</view>
							<view class="mock-chart">模拟图表区域</view>
						</view>
					</view>
				</view>
			</template>
		</view>
		<view v-if="!selectedIngredient" class="fab" @click="navigateToEditPage">+</view>
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
	import { ref, computed, watch } from 'vue';
	import { onShow } from '@dcloudio/uni-app';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import type { Ingredient, IngredientSKU } from '@/types/api';
	import AppModal from '@/components/AppModal.vue';

	const userStore = useUserStore();
	const dataStore = useDataStore();
	const selectedIngredient = ref<Ingredient | null>(null);
	const ingredientFilter = ref('all');
	const showStoreModal = ref(false);
	const showUserMenu = ref(false);
	const isLoading = ref(false);

	onShow(async () => {
		if (!dataStore.dataLoaded.ingredients) {
			isLoading.value = true;
			await dataStore.fetchIngredientsData();
			isLoading.value = false;
		}
	});

	// [修复] 过滤逻辑适配新的数据结构
	const filteredIngredients = computed(() => {
		if (ingredientFilter.value === 'low') {
			// 库存紧张定义为低于50kg
			return dataStore.ingredients.filter((ing) => (ing.activeSku?.currentStockInGrams || 0) < 50000);
		}
		return dataStore.ingredients;
	});

	// [新增] 计算每公斤价格的辅助函数
	const getPricePerKg = (sku : IngredientSKU | null) => {
		if (!sku || !sku.specWeightInGrams) {
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

	watch(
		() => dataStore.currentTenantId,
		() => {
			selectedIngredient.value = null;
		},
	);
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