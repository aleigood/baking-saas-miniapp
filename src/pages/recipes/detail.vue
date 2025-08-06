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

				<!-- 1. 成本变化曲线 -->
				<view class="card">
					<view class="card-title">成本变化曲线</view>
					<view class="mock-chart">模拟图表区域</view>
				</view>

				<!-- 2. 版本历史 -->
				<view class="card">
					<view class="card-title-wrapper">
						<span class="card-title">版本历史</span>
					</view>
					<view v-if="isLoadingVersions">加载中...</view>
					<view v-else>
						<!-- [修改] 点击列表项时调用 handleActivateVersion -->
						<view v-for="version in recipeVersions" :key="version.id" class="list-item"
							@click="handleActivateVersion(version)">
							<view class="main-info">
								<view class="name">{{ version.notes || `版本 ${version.version}` }}
									(v{{ version.version }})</view>
								<view class="desc">创建于:
									{{ new Date(version.createdAt).toLocaleDateString()
                  }}
								</view>
							</view>
							<view class="side-info">
								<!-- [修改] 根据 version.isActive 动态显示标签 -->
								<view v-if="version.isActive" class="status-tag active">当前激活</view>
								<!-- [新增] 如果可编辑且不是当前激活版本，显示一个激活按钮的占位符或箭头 -->
								<button v-else-if="canEditRecipe" class="btn btn-secondary btn-sm">
									设为激活
								</button>
							</view>
						</view>
					</view>
				</view>

				<!-- 3. 当前配方原料列表 -->
				<view class="card">
					<!-- [修改] 标题动态显示当前激活版本的说明 -->
					<view class="card-title">{{ activeVersion?.notes || `配方详情 (v${activeVersion?.version})` }}</view>
					<view v-if="currentRecipeIngredients.length > 0">
						<view v-for="dough in currentRecipeIngredients" :key="dough.name" class="dough-group">
							<view class="dough-title">{{ dough.name }}</view>
							<view v-for="ing in dough.ingredients" :key="ing.name" class="ingredient-item">
								<view class="main-info">
									<view class="name">{{ ing.name }}</view>
									<view class="desc">
										单价: ¥{{ ing.pricePerKg }}/kg
									</view>
								</view>
								<view class="side-info">
									<view class="value">{{ ing.ratio }}%</view>
								</view>
							</view>
						</view>
					</view>
					<view v-else class="empty-state" style="padding: 20px 0">
						暂无原料信息
					</view>
				</view>

			</view>
		</view>
		<view class="loading-spinner" v-else>
			<text>加载中...</text>
		</view>

		<!-- [修改] FAB 按钮应用新的样式类 -->
		<AppFab v-if="canEditRecipe && !isLoading" @click="handleCreateVersion" class="fab-no-tab-bar" />
	</view>
</template>

<script setup lang="ts">
	import { ref, computed } from 'vue';
	import { onLoad } from '@dcloudio/uni-app';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import type { RecipeFamily, RecipeVersion, IngredientSKU } from '@/types/api';
	import { getRecipeFamily, activateRecipeVersion } from '@/api/recipes';
	import AppFab from '@/components/AppFab.vue';

	const userStore = useUserStore();
	const dataStore = useDataStore();
	const isLoading = ref(true);
	const isLoadingVersions = ref(false);
	const recipeFamily = ref<RecipeFamily | null>(null);
	const recipeVersions = ref<RecipeVersion[]>([]);

	onLoad(async (options) => {
		const familyId = options?.familyId;
		if (familyId) {
			await loadRecipeData(familyId);
		}
	});

	// [新增] 封装加载数据的函数，以便激活后可以复用
	const loadRecipeData = async (familyId : string) => {
		isLoading.value = true;
		try {
			await Promise.all([
				(async () => {
					const fullFamilyData = await getRecipeFamily(familyId);
					recipeFamily.value = fullFamilyData;
					recipeVersions.value = fullFamilyData.versions.sort((a, b) => b.version - a.version);
				})(),
				dataStore.fetchIngredientsData()
			]);
		} catch (error) {
			console.error('Failed to fetch recipe details:', error);
			uni.showToast({ title: '获取配方详情失败', icon: 'none' });
		} finally {
			isLoading.value = false;
		}
	};

	const activeVersion = computed(() => {
		return recipeVersions.value.find(v => v.isActive);
	});

	// [修改] 原料列表现在总是基于 activeVersion 计算
	const currentRecipeIngredients = computed(() => {
		if (!activeVersion.value || !activeVersion.value.doughs) {
			return [];
		}

		return activeVersion.value.doughs.map(dough => {
			return {
				name: dough.name,
				ingredients: dough.ingredients.map(ing => {
					const ingredientInfo = dataStore.ingredients.find(i => i.name === ing.name);
					return {
						...ing,
						pricePerKg: getPricePerKg(ingredientInfo?.activeSku || null)
					};
				})
			}
		});
	});

	const getPricePerKg = (sku : IngredientSKU | null) => {
		if (!sku || !sku.specWeightInGrams || !sku.currentPricePerPackage) {
			return '0.00';
		}
		return ((Number(sku.currentPricePerPackage) / sku.specWeightInGrams) * 1000).toFixed(2);
	};

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
		if (!familyId) return;
		// [修改] 传递给编辑页的版本，应该是当前激活的版本
		if (activeVersion.value) {
			uni.setStorageSync('source_recipe_version', JSON.stringify(activeVersion.value));
		}
		const url = `/pages/recipes/edit?familyId=${familyId}`;
		uni.navigateTo({ url });
	};

	const handleCreateVersion = () => {
		if (!recipeFamily.value) return;
		navigateToEditPage(recipeFamily.value.id);
	};

	// [核心修改] 处理版本激活的逻辑
	const handleActivateVersion = async (versionToActivate : RecipeVersion) => {
		if (!canEditRecipe.value || versionToActivate.isActive || !recipeFamily.value) {
			return;
		}

		uni.showLoading({ title: '正在激活...' });
		try {
			await activateRecipeVersion(recipeFamily.value.id, versionToActivate.id);
			uni.hideLoading();
			uni.showToast({ title: '激活成功', icon: 'success' });
			// [修改] 激活成功后，在前端直接更新状态，实现立即响应
			recipeVersions.value.forEach(v => {
				v.isActive = v.id === versionToActivate.id;
			});
			// 刷新配方列表页的数据
			dataStore.fetchRecipesData();
		} catch (error) {
			uni.hideLoading();
			console.error('Failed to activate version:', error);
		}
	};
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	/* [新增] 针对无 TabBar 页面的 FAB 按钮位置调整 */
	.fab-no-tab-bar {
		bottom: 30px;
	}

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

	.dough-group {
		margin-bottom: 20px;
	}

	.dough-title {
		font-weight: 600;
		font-size: 15px;
		margin-bottom: 10px;
		padding-bottom: 10px;
		border-bottom: 1px solid var(--border-color);
	}

	.ingredient-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 0;
	}

	/* [移除] 不再需要 item-selected 样式 */
</style>