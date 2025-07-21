<template>
	<view class="page-container">
		<view class="page-header">
			<view class="store-selector" @click="showStoreModal = true">{{ dataStore.currentTenant?.name }} &#9662;
			</view>
			<view class="user-avatar" @click="showUserMenu = true">{{ userStore.userInfo?.name[0] || '管' }}</view>
		</view>
		<view class="page-content">
			<view class="loading-spinner" v-if="isLoading">
				<text>加载中...</text>
			</view>
			<template v-else>
				<!-- 列表页 -->
				<view v-if="!selectedRecipe">
					<view class="card">
						<view class="card-title"><span>本周制作排行</span></view>
						<view v-if="dataStore.recipeStats.length > 0">
							<view v-for="(item, index) in dataStore.recipeStats" :key="item.name" class="stats-item">
								<span class="rank">{{ index + 1 }}</span>
								<span class="name">{{ item.name }}</span>
								<span class="count">{{ item.count }} 次</span>
							</view>
						</view>
						<view v-else class="empty-state" style="padding: 20px 0;">暂无排行数据</view>
					</view>
					<view v-if="dataStore.recipes.length > 0">
						<view v-for="recipe in dataStore.recipes" :key="recipe.id" class="list-item"
							@click="selectedRecipe = recipe">
							<view class="main-info">
								<view class="name">{{ recipe.name }}</view>
								<view class="desc">类型: {{ recipe.type }}</view>
							</view>
							<view class="side-info">
								<view class="rating">★ {{ recipe.rating }}</view>
								<view class="desc">{{ recipe.publicCount }}次制作</view>
							</view>
						</view>
					</view>
					<view v-else class="empty-state">
						<text>暂无配方信息</text>
					</view>
				</view>
				<!-- 详情页 -->
				<view v-else>
					<view class="detail-page">
						<view class="detail-header">
							<view class="back-btn" @click="selectedRecipe = null">&#10094;</view>
							<h2 class="detail-title">{{ selectedRecipe.name }}</h2>
						</view>
						<view class="tag-group"><span class="tag">类型: {{ selectedRecipe.type }}</span><span
								class="tag">克重: {{ selectedRecipe.weight }}g</span></view>
						<view class="card">
							<view class="card-title">成本变化曲线</view>
							<view class="mock-chart">模拟图表区域</view>
						</view>
						<view class="card">
							<view class="card-title">原料用量及成本</view>
							<view v-for="ing in selectedRecipe.ingredients" :key="ing.name"
								class="list-item detail-list-item"><span>{{ ing.name }} ({{ ing.amount }})</span><span>¥
									{{ ing.cost }}</span></view>
						</view>
					</view>
				</view>
			</template>
		</view>

		<!-- [核心更新] fab按钮现在会跳转到新建页面 -->
		<view v-if="!selectedRecipe" class="fab" @click="navigateToEditPage">+</view>

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
	import { ref, watch } from 'vue';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import type { Recipe } from '@/types/api';

	const userStore = useUserStore();
	const dataStore = useDataStore();
	const selectedRecipe = ref<Recipe | null>(null);
	const showStoreModal = ref(false);
	const showUserMenu = ref(false);
	const isLoading = ref(false);

	const handleSelectTenant = async (tenantId : string) => {
		isLoading.value = true;
		await dataStore.selectTenant(tenantId);
		showStoreModal.value = false;
		isLoading.value = false;
	};

	// [新增] 跳转到新建/编辑页面的方法
	const navigateToEditPage = () => {
		uni.navigateTo({
			url: '/pages/recipes/edit'
		});
	};

	watch(() => dataStore.currentTenantId, () => {
		selectedRecipe.value = null;
	});
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	.rating {
		color: var(--accent-color);
		font-weight: bold;
	}

	.detail-list-item {
		padding: 15px 0;

		&:last-child {
			border-bottom: none;
		}

		span:last-child {
			font-weight: 500;
		}
	}
</style>