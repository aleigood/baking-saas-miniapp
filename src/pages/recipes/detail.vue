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

				<view class="card">
					<FilterTabs style="justify-content: center;">
						<FilterTab :active="detailChartTab === 'trend'" @click="detailChartTab = 'trend'">
							成本走势
						</FilterTab>
						<FilterTab :active="detailChartTab === 'breakdown'" @click="detailChartTab = 'breakdown'">
							原料成本
						</FilterTab>
					</FilterTabs>
					<LineChart v-if="detailChartTab === 'trend'" :chart-data="costHistory" />
					<PieChart v-if="detailChartTab === 'breakdown'" :chart-data="costBreakdown" />
				</view>

				<view class="card card-full-bleed-list">
					<view class="card-title-wrapper">
						<span class="card-title">版本历史</span>
					</view>
					<view v-if="isLoadingVersions">加载中...</view>
					<template v-else>
						<ListItem v-for="version in recipeVersions" :key="version.id"
							:class="{ 'item-selected': displayedVersionId === version.id }"
							@click="handleVersionClick(version)" @longpress="handleVersionLongPressAction(version)">
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

				<!-- [核心重构] 配方详情卡片 -->
				<view class="card">
					<view class="card-title">{{ displayedVersion?.notes || `配方详情 (v${displayedVersion?.version})` }}
					</view>
					<view v-if="currentRecipeIngredients.length > 0">
						<!-- 循环渲染每个面团的表格 -->
						<view v-for="(dough, index) in currentRecipeIngredients" :key="index"
							class="recipe-table-container">
							<view class="dough-title">{{ dough.name }}</view>
							<view class="recipe-table">
								<view class="table-header">
									<text class="col-ingredient">原料</text>
									<text class="col-price">单价</text>
									<text class="col-ratio">比例</text>
								</view>
								<view v-for="(ing, ingIndex) in dough.ingredients" :key="ingIndex" class="table-row">
									<text class="col-ingredient">{{ ing.name }}</text>
									<text class="col-price">¥{{ ing.pricePerKg }}/kg</text>
									<text class="col-ratio">{{ ing.ratio }}%</text>
								</view>
							</view>
							<!-- 制作要点 -->
							<view v-if="dough.procedure && dough.procedure.length > 0" class="procedure-notes">
								<text class="notes-title">制作要点:</text>
								<text v-for="(step, stepIndex) in dough.procedure" :key="stepIndex"
									class="note-item">{{ stepIndex + 1 }}. {{ step }}</text>
							</view>
						</view>
						<view v-if="displayedVersion && displayedVersion.products.length > 0">
							<swiper class="product-swiper" indicator-dots circular @change="onSwiperChange">
								<swiper-item v-for="(product, index) in displayedVersion.products" :key="product.id">
									<view class="product-card">
										<view class="product-table">
											<view class="product-table-row">
												<text class="product-label">产品名称</text>
												<text class="product-value">{{ product.name }}</text>
											</view>
											<view class="product-table-row">
												<text class="product-label">面团克重</text>
												<text class="product-value">{{ product.baseDoughWeight }}g</text>
											</view>
											<!-- 渲染附加原料 -->
											<template v-for="pIng in product.ingredients" :key="pIng.id">
												<view class="product-table-row">
													<text
														class="product-label">{{ getProductIngredientTypeName(pIng.type) }}</text>
													<text class="product-value">{{ pIng.name }}
														{{ pIng.weightInGrams }}g</text>
												</view>
											</template>
										</view>
										<!-- 产品制作要点 -->
										<view v-if="product.procedure && product.procedure.length > 0"
											class="procedure-notes">
											<text class="notes-title">制作要点:</text>
											<text v-for="(step, stepIndex) in product.procedure" :key="stepIndex"
												class="note-item">{{ stepIndex + 1 }}. {{ step }}</text>
										</view>
									</view>
								</swiper-item>
							</swiper>
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
	import { ref, computed } from 'vue';
	import { onLoad, onShow } from '@dcloudio/uni-app';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import type { RecipeFamily, RecipeVersion, IngredientSKU, DoughIngredient, ProductIngredient } from '@/types/api';
	import { getRecipeFamily, activateRecipeVersion } from '@/api/recipes';
	import { getProductCostHistory, getProductCostBreakdown } from '@/api/costing';
	import AppFab from '@/components/AppFab.vue';
	import AppModal from '@/components/AppModal.vue';
	import LineChart from '@/components/LineChart.vue';
	import PieChart from '@/components/PieChart.vue';
	import ListItem from '@/components/ListItem.vue';
	import FilterTabs from '@/components/FilterTabs.vue';
	import FilterTab from '@/components/FilterTab.vue';
	import AppButton from '@/components/AppButton.vue';
	import { formatChineseDate } from '@/utils/format';

	const userStore = useUserStore();
	const dataStore = useDataStore();
	const isLoading = ref(true);
	const isSubmitting = ref(false);
	const isLoadingVersions = ref(false);
	const recipeFamily = ref<RecipeFamily | null>(null);
	const recipeVersions = ref<RecipeVersion[]>([]);
	const currentProductIndex = ref(0); // [核心新增] 用于swiper指示器

	const displayedVersionId = ref<string | null>(null);
	const showVersionActionsModal = ref(false);
	const selectedVersionForAction = ref<RecipeVersion | null>(null);

	const detailChartTab = ref<'trend' | 'breakdown'>('trend');
	const costHistory = ref<{ cost : number }[]>([]);
	const costBreakdown = ref<{ name : string, value : number }[]>([]);
	const familyId = ref<string | null>(null);

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

		type IngredientWithPrice = DoughIngredient & { pricePerKg : string };
		type DoughGroup = { name : string; ingredients : IngredientWithPrice[]; procedure ?: string[] };

		const finalDoughGroups : DoughGroup[] = [];
		const mainDoughGroups : DoughGroup[] = [];

		for (const dough of displayedVersion.value.doughs) {
			const mainDoughGroup : DoughGroup = {
				name: dough.name,
				ingredients: [],
				procedure: dough.procedure,
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
							const preDoughGroupForDisplay : DoughGroup = {
								name: `${linkedPreDough.name} (用量: ${ingredient.ratio}%)`,
								ingredients: [],
								procedure: preDough.procedure,
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

	// [核心新增] 获取产品附加原料的中文名称
	const getProductIngredientTypeName = (type : ProductIngredient['type']) => {
		const map = {
			MIX_IN: '搅拌原料',
			FILLING: '馅料',
			TOPPING: '表面装饰'
		};
		return map[type] || '附加原料';
	}

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

	const handleVersionClick = (versionToDisplay : RecipeVersion) => {
		displayedVersionId.value = versionToDisplay.id;
	};

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
	};

	const activateVersionAction = async (versionToActivate : RecipeVersion) => {
		if (!recipeFamily.value) return;

		isSubmitting.value = true;
		try {
			await activateRecipeVersion(recipeFamily.value.id, versionToActivate.id);
			uni.showToast({ title: '设置成功', icon: 'success' });

			await loadRecipeData(recipeFamily.value.id);
			dataStore.fetchRecipesData();

		} catch (error) {
			console.error('Failed to activate version:', error);
			uni.showToast({ title: '设置失败，请重试', icon: 'none' });
		} finally {
			isSubmitting.value = false;
			showVersionActionsModal.value = false;
		}
	};

	// [核心新增] Swiper 切换事件处理
	const onSwiperChange = (e : any) => {
		currentProductIndex.value = e.detail.current;
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

	/* [核心新增] 表格化配方详情样式 */
	.recipe-table-container {
		background-color: #faf8f5;
		/* 与图表背景色一致 */
		border-radius: 16px;
		padding: 15px;
		margin-bottom: 15px;
	}

	.dough-title {
		font-weight: 600;
		font-size: 15px;
		margin-bottom: 10px;
		padding-bottom: 10px;
		border-bottom: 1px solid var(--border-color);
	}

	.recipe-table {
		width: 100%;
		font-size: 14px;

		.table-header,
		.table-row {
			display: grid;
			grid-template-columns: 2fr 1.5fr 1fr;
			padding: 8px 0;
			align-items: center;
		}

		.table-header {
			color: var(--text-secondary);
			font-weight: 500;
			border-bottom: 1px solid var(--border-color);
		}

		.table-row {
			color: var(--text-primary);
			border-bottom: 1px solid var(--border-color);

			&:last-child {
				border-bottom: none;
			}
		}

		.col-price,
		.col-ratio {
			text-align: right;
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

	/* [核心新增] 产品滑动卡片样式 */
	.product-swiper-container {
		padding-bottom: 30px;
		/* 为指示器留出空间 */
	}

	.product-swiper {
		height: 220px;
	}

	.product-card {
		background-color: #faf8f5;
		border-radius: 16px;
		padding: 15px;
		height: 100%;
		box-sizing: border-box;
	}

	.product-table {
		font-size: 14px;

		.product-table-row {
			display: flex;
			justify-content: space-between;
			padding: 6px 0;
			border-bottom: 1px solid var(--border-color);

			&:last-of-type {
				border-bottom: none;
			}
		}

		.product-label {
			color: var(--text-secondary);
		}

		.product-value {
			color: var(--text-primary);
			font-weight: 500;
		}
	}

	/* [核心新增] 自定义swiper指示器样式 */
	::v-deep .uni-swiper-dot {
		background-color: #e6b89c;
	}

	::v-deep .uni-swiper-dot-active {
		background-color: var(--primary-color);
	}


	.list-item {
		position: relative;
		cursor: pointer;
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