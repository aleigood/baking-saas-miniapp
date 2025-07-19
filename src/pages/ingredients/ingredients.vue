<template>
	<view class="page-container">
		<view class="page-header">
			<view class="store-selector" @click="showStoreModal = true">{{ dataStore.currentTenant?.name }} &#9662;
			</view>
			<view class="user-avatar" @click="showUserMenu = true">{{ userStore.userInfo?.name[0] || '管' }}</view>
		</view>
		<view class="page-content">
			<view v-if="!selectedIngredient">
				<view class="card">
					<view class="card-title"><span>本月消耗统计</span></view>
					<view v-for="(item, index) in dataStore.ingredientStats" :key="item.name" class="stats-item">
						<span class="rank">{{ index + 1 }}</span>
						<span class="name">{{ item.name }}</span>
						<span class="count">{{ item.consumed }} kg</span>
					</view>
				</view>
				<view class="filter-tabs">
					<view class="filter-tab" :class="{active: ingredientFilter === 'all'}"
						@click="ingredientFilter = 'all'">全部</view>
					<view class="filter-tab" :class="{active: ingredientFilter === 'low'}"
						@click="ingredientFilter = 'low'">库存紧张</view>
				</view>
				<view v-for="ing in filteredIngredients" :key="ing.id" class="list-item"
					@click="selectedIngredient = ing">
					<view class="main-info">
						<view class="name">{{ ing.name }}</view>
						<view class="desc">品牌: {{ ing.brand }}</view>
					</view>
					<view class="side-info">
						<view class="value" :class="{'stock-low': ing.stock < 50}">{{ ing.stock }} kg</view>
						<view class="desc">¥ {{ ing.price }}/kg</view>
					</view>
				</view>
			</view>
			<view v-else>
				<view class="detail-page">
					<view class="detail-header">
						<view class="back-btn" @click="selectedIngredient = null">&#10094;</view>
						<h2 class="detail-title">{{ selectedIngredient.name }}</h2>
					</view>
					<view class="tag-group"><span class="tag">品牌: {{ selectedIngredient.brand }}</span><span
							class="tag">单价: ¥{{ selectedIngredient.price }}/kg</span></view>
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
		</view>
		<view v-if="!selectedIngredient" class="fab">+</view>

		<!-- Modals -->
		<view v-if="showStoreModal" class="modal-overlay" @click="showStoreModal = false">
			<view class="modal-content" @click.stop>
				<view class="card-title" style="margin-bottom: 10px;">选择门店</view>
				<view v-for="tenant in dataStore.tenants" :key="tenant.id" class="list-item"
					@click="handleSelectTenant(tenant.id)">{{ tenant.name }}</view>
			</view>
		</view>
		<view v-if="showUserMenu" class="modal-overlay" @click="showUserMenu = false">
			<view class="modal-content" @click.stop
				style="width: auto; position: absolute; top: 85px; right: 15px; padding: 5px;">
				<view class="list-item" style="border: none; padding: 10px 15px;" @click="userStore.logout()">退出登录
				</view>
			</view>
		</view>
	</view>
</template>
<script setup lang="ts">
	import { ref, computed, watch } from 'vue';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import type { Ingredient } from '@/types/api';

	const userStore = useUserStore();
	const dataStore = useDataStore();
	const selectedIngredient = ref<Ingredient | null>(null);
	const ingredientFilter = ref('all');
	const showStoreModal = ref(false);
	const showUserMenu = ref(false);

	const filteredIngredients = computed(() => {
		if (ingredientFilter.value === 'low') {
			return dataStore.ingredients.filter(ing => ing.stock < 50);
		}
		return dataStore.ingredients;
	});

	const handleSelectTenant = async (tenantId : string) => {
		await dataStore.selectTenant(tenantId);
		showStoreModal.value = false;
	};

	watch(() => dataStore.currentTenantId, () => {
		selectedIngredient.value = null;
	});
</script>
<style scoped lang="scss">
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