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
				<!-- 列表页 -->
				<view v-if="!selectedRecipeFamily">
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
					<!-- [重构] 遍历配方家族 (RecipeFamily) -->
					<view v-if="dataStore.recipes.length > 0">
						<view v-for="family in dataStore.recipes" :key="family.id" class="list-item"
							@click="handleSelectRecipeFamily(family)">
							<view class="main-info">
								<view class="name">{{ family.name }}</view>
								<view class="desc">类型: {{ family.type }}</view>
							</view>
							<view class="side-info">
								<!-- 暂时显示版本数量 -->
								<view class="desc">{{ family.versions.length }}个版本</view>
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
							<view class="back-btn" @click="selectedRecipeFamily = null">&#10094;</view>
							<h2 class="detail-title">{{ selectedRecipeFamily.name }}</h2>
						</view>
						<view class="tag-group">
							<span class="tag">类型: {{ selectedRecipeFamily.type }}</span>
						</view>
						<view class="card">
							<view class="card-title-wrapper">
								<span class="card-title">版本历史</span>
								<button v-if="canEditRecipe" class="btn-primary-sm" @click="handleCreateVersion">
									新建版本
								</button>
							</view>
							<view v-if="isLoadingVersions">加载中...</view>
							<view v-else>
								<!-- [重构] 遍历版本历史 -->
								<view v-for="version in recipeVersions" :key="version.id" class="list-item">
									<view class="main-info">
										<view class="name">{{ version.notes || `版本 ${version.version}` }}
											(v{{ version.version }})</view>
										<view class="desc">创建于:
											{{ new Date(version.createdAt).toLocaleDateString()
                      }}
										</view>
									</view>
									<view class="side-info">
										<view v-if="version.isActive" class="status-tag active">当前版本</view>
										<button v-else-if="canEditRecipe" class="btn-secondary-sm" disabled
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
					</view>
				</view>
			</template>
		</view>
		<view v-if="!selectedRecipeFamily && canEditRecipe" class="fab" @click="navigateToEditPage(null)">+</view>

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
	import { ref, watch, computed } from 'vue';
	import { onShow } from '@dcloudio/uni-app';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import type { RecipeFamily, RecipeVersion } from '@/types/api';
	import { getRecipeFamily, activateRecipeVersion } from '@/api/recipes';
	import AppModal from '@/components/AppModal.vue';

	const userStore = useUserStore();
	const dataStore = useDataStore();

	const selectedRecipeFamily = ref<RecipeFamily | null>(null);
	const showStoreModal = ref(false);
	const showUserMenu = ref(false);
	const isLoading = ref(false);
	const isLoadingVersions = ref(false);
	const recipeVersions = ref<RecipeVersion[]>([]);

	onShow(async () => {
		if (!dataStore.dataLoaded.recipes) {
			isLoading.value = true;
			await dataStore.fetchRecipesData();
			isLoading.value = false;
		}
	});

	const currentUserRoleInTenant = computed(
		() => userStore.userInfo?.tenants.find(t => t.tenant.id === dataStore.currentTenantId)?.role
	);

	const canEditRecipe = computed(() => {
		return (
			currentUserRoleInTenant.value === 'OWNER' || currentUserRoleInTenant.value === 'ADMIN'
		);
	});

	const handleSelectTenant = async (tenantId : string) => {
		if (dataStore.currentTenantId === tenantId) {
			showStoreModal.value = false;
			return;
		}
		isLoading.value = true;
		await dataStore.selectTenant(tenantId);
		showStoreModal.value = false;
		await dataStore.fetchRecipesData();
		isLoading.value = false;
	};

	const navigateToEditPage = (familyId : string | null) => {
		const url = familyId ? `/pages/recipes/edit?familyId=${familyId}` : '/pages/recipes/edit';
		uni.navigateTo({ url });
	};

	const handleSelectRecipeFamily = async (family : RecipeFamily) => {
		selectedRecipeFamily.value = family;
		isLoadingVersions.value = true;
		try {
			// [重构] 调用新API获取家族详情，其中包含所有版本
			const fullFamilyData = await getRecipeFamily(family.id);
			recipeVersions.value = fullFamilyData.versions.sort((a, b) => b.version - a.version);
		} catch (error) {
			console.error('Failed to fetch recipe versions:', error);
			uni.showToast({ title: '获取版本历史失败', icon: 'none' });
		} finally {
			isLoadingVersions.value = false;
		}
	};

	// [重构] 创建新版本现在导航到编辑页
	const handleCreateVersion = () => {
		if (!selectedRecipeFamily.value) return;
		navigateToEditPage(selectedRecipeFamily.value.id);
	};

	// [重构] 激活版本功能，由于后端不支持，暂时提示用户
	const handleActivateVersion = async (version : RecipeVersion) => {
		if (!selectedRecipeFamily.value) return;

		uni.showToast({
			title: '后端暂不支持激活旧版本',
			icon: 'none',
		});
		// 下方为未来后端支持后的逻辑
		/*
		uni.showModal({
			title: '确认激活',
			content: `确定要将 "v${version.version}" 设为当前生产版本吗？`,
			success: async (res) => {
				if (res.confirm) {
					isLoadingVersions.value = true;
					try {
						await activateRecipeVersion(selectedRecipeFamily.value!.id, version.id);
						uni.showToast({ title: '激活成功', icon: 'success' });
						await handleSelectRecipeFamily(selectedRecipeFamily.value!);
					} catch (error) {
						console.error('Failed to activate version:', error);
						uni.showToast({ title: '激活失败，请重试', icon: 'none' });
					} finally {
						isLoadingVersions.value = false;
					}
				}
			},
		});
		*/
	};

	watch(
		() => dataStore.currentTenantId,
		() => {
			selectedRecipeFamily.value = null;
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

		&[disabled] {
			background-color: #e9ecef;
			color: #adb5bd;
			opacity: 0.7;
		}
	}
</style>