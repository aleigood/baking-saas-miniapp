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
				<!-- 配方版本选择卡片 (所有类型配方都显示) -->
				<view class="card card-full-bleed-list">
					<view class="card-title-wrapper">
						<span class="card-title">配方版本</span>
					</view>
					<view v-if="isLoadingVersions">加载中...</view>
					<template v-else>
						<ListItem v-for="version in recipeVersions" :key="version.id"
							:class="{ 'item-selected': displayedVersionId === version.id }"
							@click="handleVersionClick(version)" @longpress="handleVersionLongPressAction(version)"
							:vibrate-on-long-press="canEditRecipe && !version.isActive">
							<view class="main-info">
								<view class="name">{{ version.notes || `版本 ${version.version}` }}
									(v{{ version.version }})</view>
								<view class="desc">创建于:
									{{ formatChineseDate(version.createdAt)
									}}
								</view>
							</view>
							<view class="side-info">
								<view v-if="version.isActive" class="status-tag active">使用中</view>
							</view>
						</ListItem>
					</template>
					<AppButton v-if="canEditRecipe" type="text-link" @click="handleCreateVersion">+ 创建新版本</AppButton>
				</view>

				<!-- ============================================================ -->
				<!--               仅 主面团(MAIN) 类型配方显示的内容             -->
				<!-- ============================================================ -->
				<template v-if="recipeFamily.type === 'MAIN'">
					<!-- 产品切换标签 -->
					<view class="product-tabs-wrapper">
						<FilterTabs v-if="displayedVersion && displayedVersion.products.length > 0">
							<FilterTab v-for="product in displayedVersion.products" :key="product.id"
								:active="selectedProductId === product.id" @click="handleProductClick(product.id)">
								{{ product.name }}
							</FilterTab>
						</FilterTabs>
					</view>

					<!-- 主内容卡片 -->
					<view class="card" v-if="selectedProduct && recipeDetails">
						<!-- 数据分析区域 -->
						<view class="data-analysis-section">
							<AnimatedTabs v-model="detailChartTab" :tabs="chartTabs" />
							<LineChart v-if="detailChartTab === 'trend'" :chart-data="costHistory" />
							<PieChart v-if="detailChartTab === 'breakdown'" :chart-data="costBreakdown" />
						</view>

						<!-- 原料与流程详情 -->
						<view v-if="recipeDetails.doughGroups.length > 0">
							<view v-for="(dough, index) in recipeDetails.doughGroups" :key="dough.name + index"
								class="dough-section">
								<view class="group-title" @click="toggleCollapse(dough.name)">
									<span>{{ dough.name }}</span>
									<span class="arrow"
										:class="{ collapsed: collapsedSections.has(dough.name) }">&#10094;</span>
								</view>
								<view v-show="!collapsedSections.has(dough.name)">
									<view class="recipe-table-container">
										<view class="recipe-table">
											<view class="table-header">
												<text class="col-ingredient">原料</text>
												<text class="col-ratio">比例</text>
												<text class="col-usage">用量</text>
												<text class="col-price">单价</text>
												<text class="col-total">成本</text>
											</view>
											<view v-for="(ing, ingIndex) in dough.ingredients" :key="ingIndex"
												class="table-row">
												<text class="col-ingredient">{{ ing.name }}</text>
												<text class="col-ratio">{{ formatNumber(ing.ratio) }}%</text>
												<text class="col-usage">{{ formatNumber(ing.weightInGrams) }}g</text>
												<text class="col-price">¥{{ ing.pricePerKg }}/kg</text>
												<text class="col-total">¥{{ formatNumber(ing.cost) }}</text>
											</view>
										</view>
										<view v-if="dough.procedure && dough.procedure.length > 0"
											class="procedure-notes">
											<text class="notes-title">制作要点:</text>
											<text v-for="(step, stepIndex) in dough.procedure" :key="stepIndex"
												class="note-item">{{ stepIndex + 1 }}. {{ step }}</text>
										</view>
									</view>
								</view>
							</view>
						</view>
						<view v-else class="empty-state" style="padding: 20px 0">
							暂无面团原料信息
						</view>


						<view class="other-ingredients-section">
							<view class="group-title" @click="toggleCollapse('otherIngredients')">
								<span>原料汇总 (总成本: ¥{{ formatNumber(recipeDetails.totalCost) }})</span>
								<span class="arrow"
									:class="{ collapsed: collapsedSections.has('otherIngredients') }">&#10094;</span>
							</view>
							<view v-show="!collapsedSections.has('otherIngredients')">
								<view class="recipe-table-container">
									<view v-if="recipeDetails.extraIngredients.length > 0"
										class="product-ingredient-table">
										<view class="table-header">
											<text class="col-group">类型</text>
											<text class="col-ingredient">原料</text>
											<text class="col-usage">用量</text>
											<text class="col-cost">成本</text>
										</view>
										<template v-for="(group, groupName) in recipeDetails.groupedExtraIngredients"
											:key="groupName">
											<view v-for="(pIng, index) in group" :key="pIng.id" class="table-row">
												<text v-if="index === 0" class="col-group"
													:style="{ 'vertical-align': group.length > 1 ? 'top' : 'middle' }">
													{{ groupName }}
												</text>
												<text v-else class="col-group"></text>
												<text class="col-ingredient">{{ pIng.name }}</text>
												<text class="col-usage">
													<template v-if="pIng.id === 'dough-summary'">
														{{ formatNumber(pIng.weightInGrams) }}g
													</template>
													<template v-else-if="pIng.type === '搅拌原料'">
														{{ formatNumber(pIng.ratio) }}% ({{
														formatNumber(pIng.weightInGrams)
													}}g)
													</template>
													<template v-else-if="pIng.weightInGrams != null">
														{{ formatNumber(pIng.weightInGrams) }}g
													</template>
												</text>
												<text class="col-cost">¥{{ formatNumber(pIng.cost) }}</text>
											</view>
										</template>
									</view>
									<view v-else class="empty-state" style="padding: 20px 0;">
										暂无其他原料
									</view>
								</view>
							</view>
						</view>
					</view>
					<view v-else-if="displayedVersion && displayedVersion.products.length === 0" class="empty-state">
						当前版本暂无产品
					</view>
				</template>

				<!-- ============================================================ -->
				<!--           仅 非面团(PRE_DOUGH / EXTRA) 类型配方显示的内容      -->
				<!-- ============================================================ -->
				<template v-else>
					<view class="card">
						<view class="card-title">原料列表</view>
						<view class="recipe-table-container">
							<view class="recipe-table simple-table">
								<view class="table-header">
									<text class="col-ingredient">原料名称</text>
									<text class="col-ratio">比例</text>
									<text class="col-price">单价</text>
								</view>
								<view v-for="(ing, ingIndex) in nonMainRecipeIngredients" :key="ingIndex"
									class="table-row">
									<text class="col-ingredient">{{ ing.name }}</text>
									<text class="col-ratio">{{ formatNumber(ing.ratio) }}%</text>
									<text class="col-price">¥{{ ing.pricePerKg }}/kg</text>
								</view>
							</view>
						</view>
					</view>
				</template>
			</view>
		</view>
		<view class="loading-spinner" v-else>
			<text>加载中...</text>
		</view>

		<AppModal v-model:visible="showVersionActionsModal" title="设为使用中">
			<view class="modal-prompt-text">
				要将这个版本设为当前使用的配方吗？
			</view>
			<view class="modal-warning-text">
				后续创建生产任务时将默认使用此版本配方。
			</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showVersionActionsModal = false">取消</AppButton>
				<AppButton type="primary" @click="handleActivateFromModal" :loading="isSubmitting">
					{{ isSubmitting ? '设置中...' : '确认设置' }}
				</AppButton>
			</view>
		</AppModal>
	</view>
</template>

<script setup lang="ts">
	import {
		ref,
		computed,
		watch
	} from 'vue';
	import {
		onLoad,
		onShow
	} from '@dcloudio/uni-app';
	import {
		useUserStore
	} from '@/store/user';
	import {
		useDataStore
	} from '@/store/data';
	import type {
		RecipeFamily,
		RecipeVersion,
		Product,
		RecipeDetails
	} from '@/types/api';
	import {
		getRecipeFamily,
		activateRecipeVersion
	} from '@/api/recipes';
	import {
		getProductCostHistory,
		getProductCostBreakdown,
		getRecipeDetails
	} from '@/api/costing';
	import AppModal from '@/components/AppModal.vue';
	import LineChart from '@/components/LineChart.vue';
	import PieChart from '@/components/PieChart.vue';
	import ListItem from '@/components/ListItem.vue';
	import FilterTabs from '@/components/FilterTabs.vue';
	import FilterTab from '@/components/FilterTab.vue';
	import AppButton from '@/components/AppButton.vue';
	import AnimatedTabs from '@/components/AnimatedTabs.vue';
	import {
		formatChineseDate,
		formatNumber
	} from '@/utils/format';

	const userStore = useUserStore();
	const dataStore = useDataStore();
	const isLoading = ref(true);
	const isSubmitting = ref(false);
	const isLoadingVersions = ref(false);
	const recipeFamily = ref<RecipeFamily | null>(null);
	const recipeVersions = ref<RecipeVersion[]>([]);
	const recipeDetails = ref<RecipeDetails | null>(null);


	// 状态管理
	const familyId = ref<string | null>(null);
	const displayedVersionId = ref<string | null>(null);
	const selectedProductId = ref<string | null>(null);
	const collapsedSections = ref(new Set<string>());

	const showVersionActionsModal = ref(false);
	const selectedVersionForAction = ref<RecipeVersion | null>(null);

	const detailChartTab = ref<'trend' | 'breakdown'>('trend');
	const chartTabs = ref([{
		key: 'trend',
		label: '成本走势'
	}, {
		key: 'breakdown',
		label: '原料成本'
	},]);
	const costHistory = ref<{
		cost : number
	}[]>([]);
	const costBreakdown = ref<{
		name : string,
		value : number
	}[]>([]);


	onLoad(async (options) => {
		if (options?.familyId) {
			familyId.value = options.familyId;
			await loadRecipeData(familyId.value);
		}
	});

	onShow(async () => {
		if (familyId.value && !isLoading.value) {
			await dataStore.fetchIngredientsData();
			await loadRecipeData(familyId.value);
		}
	});

	const fetchCostData = async (productId : string | null) => {
		// 仅当配方类型为主面团且有产品ID时才获取成本数据
		if (!productId || recipeFamily.value?.type !== 'MAIN') {
			costHistory.value = [];
			costBreakdown.value = [];
			recipeDetails.value = null;
			return;
		}
		try {
			const [historyData, breakdownData, detailsData] = await Promise.all([
				getProductCostHistory(productId),
				getProductCostBreakdown(productId),
				getRecipeDetails(productId)
			]);
			costHistory.value = historyData;
			costBreakdown.value = breakdownData;
			recipeDetails.value = detailsData;
		} catch (error) {
			console.error('Failed to fetch cost data for product:', error);
			costHistory.value = [];
			costBreakdown.value = [];
			recipeDetails.value = null;
		}
	};


	const loadRecipeData = async (id : string) => {
		isLoading.value = true;
		try {
			if (!dataStore.dataLoaded.ingredients) {
				await dataStore.fetchIngredientsData();
			}
			const fullFamilyData = await getRecipeFamily(id);
			recipeFamily.value = fullFamilyData;
			recipeVersions.value = fullFamilyData.versions.sort((a, b) => b.version - a.version);
			const currentActiveVersion = recipeVersions.value.find(v => v.isActive);
			let versionToShow = currentActiveVersion || (recipeVersions.value.length > 0 ? recipeVersions.value[0] : null);

			if (versionToShow) {
				if (!displayedVersionId.value || !recipeVersions.value.some(v => v.id === displayedVersionId.value)) {
					displayedVersionId.value = versionToShow.id;
				}
				// 只有主面团配方才需要处理产品
				if (fullFamilyData.type === 'MAIN') {
					// @ts-ignore
					const products = versionToShow.products;
					if (products && products.length > 0) {
						const currentProductIsValid = products.some(p => p.id === selectedProductId.value);
						if (!selectedProductId.value || !currentProductIsValid) {
							selectedProductId.value = products[0].id;
						}
					} else {
						selectedProductId.value = null;
					}
					await fetchCostData(selectedProductId.value);
				} else {
					// 非主面团配方，不需要产品和成本计算
					selectedProductId.value = null;
					await fetchCostData(null);
				}
			} else {
				displayedVersionId.value = null;
				selectedProductId.value = null;
				await fetchCostData(null);
			}
		} catch (error) {
			console.error('Failed to fetch recipe details:', error);
			uni.showToast({
				title: '获取配方详情失败',
				icon: 'none'
			});
		} finally {
			isLoading.value = false;
		}
	};

	watch(selectedProductId, (newProductId) => {
		fetchCostData(newProductId);
	});


	// --- Computed Properties ---

	const displayedVersion = computed(() => {
		return recipeVersions.value.find(v => v.id === displayedVersionId.value);
	});

	const selectedProduct = computed(() => {
		if (!displayedVersion.value || !selectedProductId.value) return null;
		// @ts-ignore
		return displayedVersion.value.products.find(p => p.id === selectedProductId.value);
	});

	// [核心新增] 为非面团类型配方计算原料列表
	const nonMainRecipeIngredients = computed(() => {
		if (!displayedVersion.value || recipeFamily.value?.type === 'MAIN') {
			return [];
		}
		// 非面团配方通常只有一个 dough 定义
		const dough = displayedVersion.value.doughs[0];
		if (!dough || !dough.ingredients) {
			return [];
		}
		return dough.ingredients.map(ing => {
			const ingredientData = dataStore.ingredients.find(i => i.name === ing.name);
			const pricePerKg = ingredientData ? getPricePerKg(ingredientData) : '0.00';
			return {
				...ing,
				pricePerKg,
			};
		});
	});

	const currentUserRoleInTenant = computed(
		() => userStore.userInfo?.tenants.find(t => t.tenant.id === dataStore.currentTenantId)?.role
	);

	const canEditRecipe = computed(() => {
		return (
			currentUserRoleInTenant.value === 'OWNER' || currentUserRoleInTenant.value === 'ADMIN'
		);
	});

	// --- Methods ---
	// [核心新增] 辅助函数，用于查找并计算原料单价
	const getPricePerKg = (ing : Ingredient) => {
		if (!ing || !ing.activeSku || !ing.currentPricePerPackage || !ing.activeSku.specWeightInGrams) {
			return '0.00';
		}
		return ((Number(ing.currentPricePerPackage) / ing.activeSku.specWeightInGrams) * 1000).toFixed(2);
	};


	const toggleCollapse = (sectionName : string) => {
		const newSet = new Set(collapsedSections.value);
		if (newSet.has(sectionName)) {
			newSet.delete(sectionName);
		} else {
			newSet.add(sectionName);
		}
		collapsedSections.value = newSet;
	};

	const navigateBack = () => {
		uni.navigateBack();
	};

	const navigateToEditPage = (familyId : string | null) => {
		if (!familyId) return;
		if (displayedVersion.value) {
			uni.setStorageSync('source_recipe_version', JSON.stringify(displayedVersion.value));
		}
		uni.navigateTo({
			url: `/pages/recipes/edit?familyId=${familyId}`
		});
	};

	const handleCreateVersion = () => {
		if (recipeFamily.value) navigateToEditPage(recipeFamily.value.id);
	};

	const handleVersionClick = (versionToDisplay : RecipeVersion) => {
		displayedVersionId.value = versionToDisplay.id;
		if (recipeFamily.value?.type === 'MAIN') {
			// @ts-ignore
			const products = versionToDisplay.products;
			if (products && products.length > 0) {
				selectedProductId.value = products[0].id;
			} else {
				selectedProductId.value = null;
			}
		}
	};

	const handleProductClick = (productId : string) => {
		selectedProductId.value = productId;
	};

	const handleVersionLongPressAction = (versionToActivate : RecipeVersion) => {
		if (!canEditRecipe.value || versionToActivate.isActive || !recipeFamily.value) return;
		selectedVersionForAction.value = versionToActivate;
		showVersionActionsModal.value = true;
	};

	const handleActivateFromModal = () => {
		if (selectedVersionForAction.value) {
			activateVersionAction(selectedVersionForAction.value);
		}
	};

	const activateVersionAction = async (versionToActivate : RecipeVersion) => {
		if (!recipeFamily.value) return;
		isSubmitting.value = true;
		try {
			await activateRecipeVersion(recipeFamily.value.id, versionToActivate.id);
			uni.showToast({
				title: '设置成功',
				icon: 'success'
			});
			await loadRecipeData(recipeFamily.value.id);
			dataStore.fetchRecipesData();
		} catch (error) {
			console.error('Failed to activate version:', error);
			uni.showToast({
				title: '设置失败，请重试',
				icon: 'none'
			});
		} finally {
			isSubmitting.value = false;
			showVersionActionsModal.value = false;
		}
	};
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

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

	.recipe-table-container {
		background-color: #faf8f5;
		border-radius: 16px;
		padding: 15px;
		margin-top: 15px;
	}

	.group-title {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary);
		padding: 15px 5px 15px 5px;
		border-bottom: 1px solid var(--border-color);
		margin-top: 10px;
	}

	.arrow {
		font-size: 14px;
		color: var(--text-secondary);
		transform: rotate(90deg);
		transition: transform 0.3s ease;
	}

	.arrow.collapsed {
		transform: rotate(-90deg);
	}


	.dough-title {
		font-weight: 600;
		font-size: 15px;
		margin-bottom: 10px;
		padding-bottom: 10px;
		border-bottom: 1px solid var(--border-color);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.recipe-table {
		display: table;
		width: 100%;
		font-size: 14px;
		border-collapse: collapse;

		.table-header,
		.table-row {
			display: table-row;
		}

		.table-header {
			color: var(--text-secondary);
			font-weight: 500;
		}

		.table-row {
			color: var(--text-primary);
			border-bottom: 1px solid var(--border-color);

			&:last-child {
				border-bottom: none;
			}
		}

		.col-ingredient,
		.col-ratio,
		.col-usage,
		.col-price,
		.col-total {
			display: table-cell;
			padding: 8px 4px;
			vertical-align: middle;
		}

		.col-ratio,
		.col-usage,
		.col-price,
		.col-total {
			text-align: right;
			white-space: nowrap;
		}

		.col-ingredient {
			min-width: 80px;
			word-break: break-word;
		}

		/* [核心新增] 为非面团配方的简单表格调整列宽 */
		&.simple-table {
			.col-ingredient {
				width: 50%;
			}

			.col-ratio {
				width: 25%;
			}

			.col-price {
				width: 25%;
			}
		}
	}

	.procedure-notes {
		margin-top: 15px;
		font-size: 12px;
		color: var(--text-secondary);
		line-height: 1.6;

		.notes-title {
			font-weight: 600;
			display: block;
			margin-bottom: 5px;
		}

		.note-item {
			display: block;
		}
	}

	.product-tabs-wrapper {
		padding: 0;
		margin-bottom: 20px;

		:deep(.filter-tabs) {
			flex-wrap: wrap;
			margin-bottom: 0;
		}
	}

	.data-analysis-section {
		margin-bottom: 20px;
	}

	.product-ingredient-table {
		display: table;
		width: 100%;
		font-size: 14px;

		.table-header,
		.table-row {
			display: table-row;
		}

		.table-header {
			color: var(--text-secondary);
			font-weight: 500;
		}

		.table-row {
			color: var(--text-primary);
			border-bottom: 1px solid var(--border-color);

			&:last-child {
				border-bottom: none;
			}
		}

		.col-group,
		.col-ingredient,
		.col-usage,
		.col-cost {
			display: table-cell;
			padding: 8px 4px;
			vertical-align: middle;
		}

		.col-group {
			width: 25%;
			word-break: break-word;
			font-weight: 500;
			color: var(--text-secondary);
		}

		.col-ingredient {
			width: 35%;
			word-break: break-word;
		}

		.col-usage,
		.col-cost {
			text-align: right;
			white-space: nowrap;
		}
	}


	.list-item {
		position: relative;
		cursor: pointer;
		transition: background-color 0.2s ease;
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

	.modal-prompt-text {
		font-size: 16px;
		color: var(--text-primary);
		text-align: center;
		margin-bottom: 10px;
	}

	.modal-warning-text {
		font-size: 13px;
		color: var(--text-secondary);
		text-align: center;
		margin-bottom: 20px;
		line-height: 1.5;
	}
</style>