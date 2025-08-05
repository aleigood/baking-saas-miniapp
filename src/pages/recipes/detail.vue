<template>
	<view class="page-container">
		<view class="page-header">
			<view class="detail-header">
				<view class="back-btn" @click="navigateBack">&#10094;</view>
				<h2 class="detail-title">{{ recipeFamily?.name || '加载中...' }}</h2>
			</view>
		</view>
		<view class="page-content" v-if="!isLoading && recipeFamily">
			<view class="detail-page">
				<view class="tag-group">
					<span class="tag">类型: {{ getRecipeTypeDisplay(recipeFamily.type) }}</span>
				</view>
				<view class="card">
					<view class="card-title-wrapper">
						<span class="card-title">版本历史</span>
						<button v-if="canEditRecipe" class="btn btn-primary btn-sm" @click="handleCreateVersion">
							新建版本
						</button>
					</view>
					<view v-if="isLoadingVersions">加载中...</view>
					<view v-else>
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
								<button v-else-if="canEditRecipe" class="btn btn-secondary btn-sm" disabled
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
		<view class="loading-spinner" v-else>
			<text>加载中...</text>
		</view>
	</view>
</template>

<script setup lang="ts">
	import { ref, computed } from 'vue';
	import { onLoad } from '@dcloudio/uni-app';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import type { RecipeFamily, RecipeVersion } from '@/types/api';
	import { getRecipeFamily, activateRecipeVersion } from '@/api/recipes';

	const userStore = useUserStore();
	const dataStore = useDataStore();
	const isLoading = ref(true);
	const isLoadingVersions = ref(false); // 虽然现在一次性加载，但保留此状态以备将来分页加载
	const recipeFamily = ref<RecipeFamily | null>(null);
	const recipeVersions = ref<RecipeVersion[]>([]);

	onLoad(async (options) => {
		const familyId = options?.familyId;
		if (familyId) {
			try {
				const fullFamilyData = await getRecipeFamily(familyId);
				recipeFamily.value = fullFamilyData;
				recipeVersions.value = fullFamilyData.versions.sort((a, b) => b.version - a.version);
			} catch (error) {
				console.error('Failed to fetch recipe details:', error);
				uni.showToast({ title: '获取配方详情失败', icon: 'none' });
			}
		}
		isLoading.value = false;
	});

	const recipeTypeMap = {
		MAIN: '主面团',
		PRE_DOUGH: '面种',
		EXTRA: '馅料',
	};

	const getRecipeTypeDisplay = (type : 'MAIN' | 'PRE_DOUGH' | 'EXTRA') => {
		return recipeTypeMap[type] || type;
	};

	const currentUserRoleInTenant = computed(
		() => userStore.userInfo?.tenants.find(t => t.tenant.id === dataStore.currentTenantId)?.role
	);

	const canEditRecipe = computed(() => {
		return (
			currentUserRoleInTenant.value === 'OWNER' || currentUserRoleInTenant.value === 'ADMIN'
		);
	});

	const navigateBack = () => {
		uni.navigateBack();
	};

	const navigateToEditPage = (familyId : string | null) => {
		const url = familyId ? `/pages/recipes/edit?familyId=${familyId}` : '/pages/recipes/edit';
		uni.navigateTo({ url });
	};

	const handleCreateVersion = () => {
		if (!recipeFamily.value) return;
		navigateToEditPage(recipeFamily.value.id);
	};

	const handleActivateVersion = async (version : RecipeVersion) => {
		if (!recipeFamily.value) return;
		uni.showToast({
			title: '后端暂不支持激活旧版本',
			icon: 'none',
		});
	};
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	.detail-page .tag-group {
		margin-bottom: 20px;
		padding: 0 20px;
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
</style>