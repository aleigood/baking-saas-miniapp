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
					<span class="tag" v-for="productName in productNames" :key="productName">{{ productName }}</span>
					<span v-if="productNames.length === 0" class="tag">暂无产品</span>
				</view>

				<!-- 1. [核心重构] 成本分析图表区 -->
				<view class="card">
					<view class="filter-tabs">
						<view class="filter-tab" :class="{ active: detailChartTab === 'trend' }"
							@click="detailChartTab = 'trend'">
							成本走势
						</view>
						<view class="filter-tab" :class="{ active: detailChartTab === 'breakdown' }"
							@click="detailChartTab = 'breakdown'">
							原料成本
						</view>
					</view>
					<!-- 成本走势折线图 -->
					<LineChart v-if="detailChartTab === 'trend'" :chart-data="costHistory" />
					<!-- 原料成本环形图 -->
					<PieChart v-if="detailChartTab === 'breakdown'" :chart-data="costBreakdown" />
				</view>

				<!-- 2. 版本历史 -->
				<view class="card card-full-bleed-list">
					<view class="card-title-wrapper">
						<span class="card-title">版本历史</span>
					</view>
					<view v-if="isLoadingVersions">加载中...</view>
					<!-- [核心修正] 使用 template 替代 view 来确保最后一个 list-item 的边框在按钮上方正确显示 -->
					<template v-else>
						<!-- [核心重构] 替换 @click 和 @longpress 为底层的触摸事件 -->
						<view v-for="version in recipeVersions" :key="version.id" class="list-item"
							:class="{ 'item-selected': displayedVersionId === version.id }" hover-class="item-hover"
							@touchstart="handleTouchStart(version)" @touchmove="handleTouchMove"
							@touchend="handleTouchEnd(version)">
							<view class="main-info">
								<view class="name">{{ version.notes || `版本 ${version.version}` }}
									(v{{ version.version }})</view>
								<view class="desc">创建于:
									{{ new Date(version.createdAt).toLocaleDateString()
									}}
								</view>
							</view>
							<view class="side-info">
								<view v-if="version.isActive" class="status-tag active">已激活</view>
							</view>
						</view>
					</template>
					<button v-if="canEditRecipe" class="btn-add-sm" @click="handleCreateVersion">+
						创建新版本</button>
				</view>

				<!-- 3. 当前配方原料列表 -->
				<view class="card">
					<view class="card-title">{{ displayedVersion?.notes || `配方详情 (v${displayedVersion?.version})` }}
					</view>
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

		<AppModal v-model:visible="showVersionActionsModal" title="版本操作">
			<view class="list-item" hover-class="item-hover" @click="handleActivateFromModal">
				激活当前版本
			</view>
		</AppModal>
	</view>
</template>

<script setup lang="ts">
	import { ref, computed } from 'vue';
	import { onLoad, onShow } from '@dcloudio/uni-app';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import type { RecipeFamily, RecipeVersion, IngredientSKU, DoughIngredient } from '@/types/api';
	import { getRecipeFamily, activateRecipeVersion } from '@/api/recipes';
	import { getProductCostHistory, getProductCostBreakdown } from '@/api/costing';
	import AppFab from '@/components/AppFab.vue';
	import AppModal from '@/components/AppModal.vue';
	import LineChart from '@/components/LineChart.vue';
	import PieChart from '@/components/PieChart.vue';

	const userStore = useUserStore();
	const dataStore = useDataStore();
	const isLoading = ref(true);
	const isLoadingVersions = ref(false);
	const recipeFamily = ref<RecipeFamily | null>(null);
	const recipeVersions = ref<RecipeVersion[]>([]);

	const displayedVersionId = ref<string | null>(null);
	const showVersionActionsModal = ref(false);
	const selectedVersionForAction = ref<RecipeVersion | null>(null);

	const detailChartTab = ref<'trend' | 'breakdown'>('trend');
	const costHistory = ref<{ cost : number }[]>([]);
	const costBreakdown = ref<{ name : string, value : number }[]>([]);
	const familyId = ref<string | null>(null);

	// [核心新增] 用于手动实现长按逻辑的状态变量
	const longPressTimer = ref<any>(null);
	const touchMoved = ref(false);
	const LONG_PRESS_DURATION = 350; // 长按的毫秒数

	onLoad(async (options) => {
		if (options?.familyId) {
			familyId.value = options.familyId;
			await loadRecipeData(familyId.value);
		}
	});

	onShow(async () => {
		if (familyId.value && !isLoading.value) {
			await loadRecipeData(familyId.value);
		}
	});


	const loadRecipeData = async (id : string) => {
		isLoading.value = true;
		try {
			await Promise.all([
				(async () => {
					const fullFamilyData = await getRecipeFamily(id);
					recipeFamily.value = fullFamilyData;
					recipeVersions.value = fullFamilyData.versions.sort((a, b) => b.version - a.version);
					const currentActiveVersion = recipeVersions.value.find(v => v.isActive);
					if (currentActiveVersion) {
						if (!displayedVersionId.value || !recipeVersions.value.some(v => v.id === displayedVersionId.value)) {
							displayedVersionId.value = currentActiveVersion.id;
						}

						if (currentActiveVersion.products && currentActiveVersion.products.length > 0) {
							const firstProductId = currentActiveVersion.products[0].id;
							const [historyData, breakdownData] = await Promise.all([
								getProductCostHistory(firstProductId),
								getProductCostBreakdown(firstProductId)
							]);
							costHistory.value = historyData;
							costBreakdown.value = breakdownData;
						}
					} else if (recipeVersions.value.length > 0) {
						displayedVersionId.value = recipeVersions.value[0].id;
					}
				})(),
				dataStore.fetchIngredientsData(),
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

	const productNames = computed(() => {
		if (!activeVersion.value || !activeVersion.value.products) {
			return [];
		}
		return activeVersion.value.products.map(p => p.name);
	});

	const displayedVersion = computed(() => {
		return recipeVersions.value.find(v => v.id === displayedVersionId.value);
	});

	const currentRecipeIngredients = computed(() => {
		if (!displayedVersion.value || !displayedVersion.value.doughs) {
			return [];
		}

		const finalDoughGroups : { name : string, ingredients : (DoughIngredient & { pricePerKg : string })[] }[] = [];
		const mainDoughGroups : { name : string, ingredients : (DoughIngredient & { pricePerKg : string })[] }[] = [];

		for (const dough of displayedVersion.value.doughs) {
			const mainDoughGroup = {
				name: dough.name,
				ingredients: [] as (DoughIngredient & { pricePerKg : string })[],
			};

			for (const ingredient of dough.ingredients) {
				// @ts-ignore
				const linkedPreDough = ingredient.linkedPreDough;

				if (linkedPreDough && linkedPreDough.versions && linkedPreDough.versions.length > 0) {
					const preDoughActiveVersion = linkedPreDough.versions[0];
					const preDough = preDoughActiveVersion.doughs[0];

					if (preDough && preDough.ingredients) {
						const preDoughTotalRatio = preDough.ingredients.reduce((sum, ing) => sum + ing.ratio, 0);

						if (preDoughTotalRatio > 0) {
							const preDoughGroupForDisplay = {
								name: `${linkedPreDough.name} (用量: ${ingredient.ratio}%)`,
								ingredients: [] as (DoughIngredient & { pricePerKg : string })[],
							};

							for (const preDoughIngredient of preDough.ingredients) {
								const finalRatio = (ingredient.ratio * preDoughIngredient.ratio) / preDoughTotalRatio;
								const ingredientInfo = dataStore.ingredients.find(i => i.name === preDoughIngredient.name);

								preDoughGroupForDisplay.ingredients.push({
									...preDoughIngredient,
									ratio: parseFloat(finalRatio.toFixed(2)),
									pricePerKg: getPricePerKg(ingredientInfo?.activeSku || null),
								});
							}
							finalDoughGroups.push(preDoughGroupForDisplay);
						}
					}
				} else {
					const ingredientInfo = dataStore.ingredients.find(i => i.name === ingredient.name);
					mainDoughGroup.ingredients.push({
						...ingredient,
						pricePerKg: getPricePerKg(ingredientInfo?.activeSku || null),
					});
				}
			}

			if (mainDoughGroup.ingredients.length > 0) {
				mainDoughGroups.push(mainDoughGroup);
			}
		}

		return [...finalDoughGroups, ...mainDoughGroups];
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

	// [核心重构] 手动实现长按与点击事件
	const handleTouchStart = (version : RecipeVersion) => {
		touchMoved.value = false;
		clearTimeout(longPressTimer.value);
		longPressTimer.value = setTimeout(() => {
			if (!touchMoved.value) {
				handleVersionLongPressAction(version);
			}
		}, LONG_PRESS_DURATION);
	};

	const handleTouchMove = () => {
		touchMoved.value = true;
		clearTimeout(longPressTimer.value);
	};

	const handleTouchEnd = (version : RecipeVersion) => {
		clearTimeout(longPressTimer.value);
		if (!touchMoved.value) {
			handleVersionClick(version);
		}
	};

	// 原始的点击逻辑
	const handleVersionClick = (versionToDisplay : RecipeVersion) => {
		displayedVersionId.value = versionToDisplay.id;
	};

	// 原始的长按逻辑
	const handleVersionLongPressAction = (versionToActivate : RecipeVersion) => {
		if (!canEditRecipe.value || versionToActivate.isActive || !recipeFamily.value) {
			return;
		}
		selectedVersionForAction.value = versionToActivate;
		showVersionActionsModal.value = true;
	};

	const handleActivateFromModal = () => {
		if (selectedVersionForAction.value) {
			activateVersionAction(selectedVersionForAction.value);
		}
		showVersionActionsModal.value = false;
	};

	const activateVersionAction = async (versionToActivate : RecipeVersion) => {
		if (!recipeFamily.value) return;

		uni.showLoading({ title: '正在激活...' });
		try {
			await activateRecipeVersion(recipeFamily.value.id, versionToActivate.id);
			uni.hideLoading();
			uni.showToast({ title: '激活成功', icon: 'success' });

			// 激活成功后，重新加载一次当前配方的完整数据
			await loadRecipeData(recipeFamily.value.id);

			// 异步更新列表页数据
			dataStore.fetchRecipesData();

		} catch (error) {
			uni.hideLoading();
			console.error('Failed to activate version:', error);
			uni.showToast({ title: '激活失败，请重试', icon: 'none' });
		}
	};
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	.fab-no-tab-bar {
		bottom: 30px;
	}

	.detail-page .tag-group {
		margin-bottom: 20px;
		padding: 0 5px;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	/* [核心修改] 修正图表切换标签的样式 */
	.filter-tabs {
		display: flex;
		justify-content: center;
		gap: 10px;
		margin-bottom: 20px;
	}

	/* [核心新增] 增加 filter-tab 样式，与原料页保持一致 */
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

	.list-item {
		position: relative;
		/* #ifdef H5 */
		cursor: pointer;
		/* #endif */
		transition: background-color 0.2s ease;
	}

	.item-hover {
		background-color: #f9f9f9;
	}

	.list-item.item-selected {
		background-color: transparent;
	}

	.list-item.item-selected::before {
		content: '';
		position: absolute;
		left: 0;
		top: 50%;
		transform: translateY(-50%);
		width: 4px;
		height: 50%;
		background-color: var(--primary-color);
		border-radius: 0 4px 4px 0;
	}


	.card-full-bleed-list {
		padding-left: 0;
		padding-right: 0;
	}

	.card-full-bleed-list .card-title-wrapper {
		padding-left: 20px;
		padding-right: 20px;
	}

	.card-full-bleed-list .list-item {
		padding-left: 20px;
		padding-right: 20px;
	}

	/* [核心新增] “创建新版本”按钮的样式 */
	.btn-add-sm {
		width: 100%;
		padding: 8px;
		border: none;
		color: var(--primary-color);
		background: transparent;
		border-radius: 10px;
		margin-top: 10px;
		font-size: 14px;

		&::after {
			border: none;
		}
	}

	/* [核心修改] 移除 with-border-top 样式块 */
</style>