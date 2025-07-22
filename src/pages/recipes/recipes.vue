<template>
	<view class="page-container">
		<view class="page-header">
			<view class="store-selector" @click="showStoreModal = true">{{ dataStore.currentTenant?.name }} &#9662;
			</view>
			<view class="user-avatar" @click="showUserMenu = true">{{
        userStore.userInfo?.name[0] || '管'
      }}</view>
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
						<view v-else class="empty-state" style="padding: 20px 0">暂无排行数据</view>
					</view>
					<view v-if="dataStore.recipes.length > 0">
						<view v-for="recipe in dataStore.recipes" :key="recipe.id" class="list-item"
							@click="handleSelectRecipe(recipe)">
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
							<view class="card-title-wrapper">
								<span class="card-title">版本历史</span>
								<button v-if="canEditRecipe" class="btn-primary-sm"
									@click="showCreateVersionModal = true">
									新建版本
								</button>
							</view>
							<view v-if="isLoadingVersions">加载中...</view>
							<view v-else>
								<view v-for="version in recipeVersions" :key="version.id" class="list-item">
									<view class="main-info">
										<view class="name">{{ version.name }} (v{{ version.versionNumber }})</view>
										<view class="desc">创建于:
											{{ new Date(version.createdAt).toLocaleDateString()
                      }}
										</view>
									</view>
									<view class="side-info">
										<view v-if="version.isActive" class="status-tag active">当前版本</view>
										<button v-else-if="canEditRecipe" class="btn-secondary-sm"
											@click="handleActivateVersion(version)">
											激活
										</button>
									</view>
								</view>
							</view>
						</view>
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
		<view v-if="!selectedRecipe && canEditRecipe" class="fab" @click="navigateToEditPage">+</view>
		<AppModal v-model:visible="showStoreModal" title="选择门店">
			<view v-for="tenant in dataStore.tenants" :key="tenant.id" class="list-item"
				@click="handleSelectTenant(tenant.id)">{{ tenant.name }}</view>
		</AppModal>
		<AppModal v-model:visible="showUserMenu">
			<view class="list-item" style="border: none; padding: 10px 15px" @click="userStore.logout()">退出登录</view>
		</AppModal>
		<AppModal v-model:visible="showCreateVersionModal" title="创建新版本">
			<FormItem label="新版本名称">
				<input class="input-field" v-model="newVersionName" placeholder="例如：冬季调整版" />
			</FormItem>
			<view class="modal-actions">
				<button class="btn-cancel" @click="showCreateVersionModal = false">
					取消
				</button>
				<button class="btn-confirm" @click="handleCreateVersion" :disabled="isSubmitting"
					:loading="isSubmitting">
					{{ isSubmitting ? '创建中...' : '确认创建' }}
				</button>
			</view>
		</AppModal>
	</view>
</template>

<script setup lang="ts">
	import { ref, watch, computed } from 'vue';
	import { onShow } from '@dcloudio/uni-app'; // [新增] 导入 onShow
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import type { ProductListItem, RecipeVersion } from '@/types/api';
	import {
		getRecipeVersions,
		createRecipeVersion,
		activateRecipeVersion,
	} from '@/api/recipes';
	import AppModal from '@/components/AppModal.vue';
	import FormItem from '@/components/FormItem.vue';

	const userStore = useUserStore();
	const dataStore = useDataStore();

	const selectedRecipe = ref<ProductListItem | null>(null);
	const showStoreModal = ref(false);
	const showUserMenu = ref(false);
	const isLoading = ref(false);
	const isSubmitting = ref(false);
	const isLoadingVersions = ref(false);
	const recipeVersions = ref<RecipeVersion[]>([]);
	const showCreateVersionModal = ref(false);
	const newVersionName = ref('');

	// [新增] 使用 onShow 生命周期钩子按需加载数据
	onShow(async () => {
		if (!dataStore.dataLoaded.recipes) {
			isLoading.value = true;
			await dataStore.fetchRecipesData();
			isLoading.value = false;
		}
	});

	const currentUserRole = computed(
		() => dataStore.members.find((m) => m.id === userStore.userInfo?.id)?.role,
	);

	const canEditRecipe = computed(() => {
		return (
			currentUserRole.value === 'OWNER' || currentUserRole.value === 'MANAGER'
		);
	});

	const handleSelectTenant = async (tenantId : string) => {
		isLoading.value = true;
		await dataStore.selectTenant(tenantId);
		showStoreModal.value = false;
		// 切换店铺后，重新加载当前页数据
		await dataStore.fetchRecipesData();
		isLoading.value = false;
	};

	const navigateToEditPage = () => {
		uni.navigateTo({
			url: '/pages/recipes/edit',
		});
	};

	const handleSelectRecipe = async (recipe : ProductListItem) => {
		selectedRecipe.value = recipe;
		isLoadingVersions.value = true;
		try {
			recipeVersions.value = await getRecipeVersions(recipe.familyId);
		} catch (error) {
			console.error('Failed to fetch recipe versions:', error);
			uni.showToast({ title: '获取版本历史失败', icon: 'none' });
		} finally {
			isLoadingVersions.value = false;
		}
	};

	const handleCreateVersion = async () => {
		if (!newVersionName.value || !selectedRecipe.value) {
			uni.showToast({ title: '请输入版本名称', icon: 'none' });
			return;
		}
		isSubmitting.value = true;
		try {
			await createRecipeVersion(
				selectedRecipe.value.familyId,
				newVersionName.value,
			);
			uni.showToast({ title: '新版本创建成功', icon: 'success' });
			showCreateVersionModal.value = false;
			newVersionName.value = '';
			await handleSelectRecipe(selectedRecipe.value);
		} catch (error) {
			console.error('Failed to create version:', error);
			uni.showToast({ title: '创建失败，请重试', icon: 'none' });
		} finally {
			isSubmitting.value = false;
		}
	};

	const handleActivateVersion = async (version : RecipeVersion) => {
		if (!selectedRecipe.value) return;
		uni.showModal({
			title: '确认激活',
			content: `确定要将 "${version.name}" 设为当前生产版本吗？`,
			success: async (res) => {
				if (res.confirm) {
					isLoadingVersions.value = true;
					try {
						await activateRecipeVersion(
							selectedRecipe.value!.familyId,
							version.id,
						);
						uni.showToast({ title: '激活成功', icon: 'success' });
						await handleSelectRecipe(selectedRecipe.value!);
					} catch (error) {
						console.error('Failed to activate version:', error);
						uni.showToast({ title: '激活失败，请重试', icon: 'none' });
					} finally {
						isLoadingVersions.value = false;
					}
				}
			},
		});
	};

	watch(
		() => dataStore.currentTenantId,
		() => {
			selectedRecipe.value = null;
		},
	);
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

	.status-tag {
		padding: 4px 12px;
		border-radius: 15px;
		font-size: 13px;
		color: white;
		font-weight: 500;

		&.active {
			background-color: #5ac725;
		}
	}

	.btn-primary-sm,
	.btn-secondary-sm {
		border: none;
		border-radius: 8px;
		font-size: 12px;
		padding: 6px 12px;
		line-height: 1.5;
		font-weight: 500;
	}

	.btn-primary-sm {
		background-color: var(--primary-color);
		color: white;
	}

	.btn-secondary-sm {
		background-color: #f3e9e3;
		color: var(--text-secondary);
	}

	.input-field {
		width: 100%;
		height: 44px;
		line-height: 44px;
		padding: 0 12px;
		border: 1px solid var(--border-color);
		border-radius: 10px;
		font-size: 14px;
		background-color: #f8f9fa;
		box-sizing: border-box;
	}

	.modal-actions {
		display: flex;
		gap: 10px;
		margin-top: 30px;
	}

	.modal-actions button {
		flex: 1;
		padding: 12px;
		border: none;
		border-radius: 12px;
		font-size: 16px;
		font-weight: 500;
	}

	.btn-cancel {
		background-color: #f3e9e3;
		color: var(--text-secondary);
	}

	.btn-confirm {
		background-color: var(--primary-color);
		color: white;
	}
</style>