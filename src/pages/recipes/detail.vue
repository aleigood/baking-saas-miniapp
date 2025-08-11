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
				<view class="card card-full-bleed-list">
					<view class="card-title-wrapper">
						<span class="card-title">配方版本</span>
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

				<view class="product-tabs-container">
					<FilterTabs v-if="displayedVersion && displayedVersion.products.length > 0">
						<FilterTab v-for="product in displayedVersion.products" :key="product.id"
							:active="selectedProductId === product.id" @click="handleProductClick(product.id)">
							{{ product.name }}
						</FilterTab>
					</FilterTabs>
					<view v-else class="empty-state" style="padding: 10px 0;">
						当前版本暂无产品
					</view>
				</view>


				<view class="card" v-if="selectedProduct">
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

					<view v-if="currentRecipeDetails.length > 0">
						<view v-for="(dough, index) in currentRecipeDetails" :key="dough.name + index"
							class="dough-section">
							<view class="group-title" @click="toggleCollapse(dough.name)">
								<span>{{ dough.name }} (总成本: ¥{{ dough.totalCost.toFixed(2) }})</span>
								<span class="arrow"
									:class="{ collapsed: collapsedSections.has(dough.name) }">&#10094;</span>
							</view>
							<view v-show="!collapsedSections.has(dough.name)">
								<view class="recipe-table-container">
									<view class="recipe-table">
										<view class="table-header">
											<text class="col-ingredient">原料</text>
											<text class="col-ratio">比例</text>
											<text class="col-price">单价</text>
											<text class="col-total">成本</text>
										</view>
										<view v-for="(ing, ingIndex) in dough.ingredients" :key="ingIndex"
											class="table-row">
											<text class="col-ingredient">{{ ing.name }}</text>
											<text class="col-ratio">{{ ing.ratio.toFixed(1) }}%</text>
											<text class="col-price">¥{{ ing.pricePerKg }}/kg</text>
											<text class="col-total">¥{{ ing.cost.toFixed(2) }}</text>
										</view>
									</view>
									<view v-if="dough.procedure && dough.procedure.length > 0" class="procedure-notes">
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
							<span>其他原料 (总成本: ¥{{ productCostDetails.extraCost.toFixed(2) }})</span>
							<span class="arrow"
								:class="{ collapsed: collapsedSections.has('otherIngredients') }">&#10094;</span>
						</view>
						<view v-show="!collapsedSections.has('otherIngredients')">
							<view class="recipe-table-container">
								<view v-if="productCostDetails.extraIngredients.length > 0"
									class="product-ingredient-table">
									<view class="table-header">
										<text class="col-ingredient">原料</text>
										<text class="col-usage">用量</text>
										<text class="col-cost">成本</text>
									</view>
									<template v-for="pIng in productCostDetails.extraIngredients" :key="pIng.id">
										<view class="table-row">
											<text class="col-ingredient">{{ pIng.name }} ({{ pIng.type }})</text>
											<text class="col-usage">
												<template v-if="pIng.type === '搅拌原料'">
													{{ pIng.ratio }}% ({{ pIng.weightInGrams.toFixed(1) }}g)
												</template>
												<template v-else>
													{{ pIng.weightInGrams }}g
												</template>
											</text>
											<text class="col-cost">¥{{ pIng.cost.toFixed(2) }}</text>
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
	import { ref, computed, watch } from 'vue';
	import { onLoad, onShow } from '@dcloudio/uni-app';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import type { RecipeFamily, RecipeVersion, Ingredient, DoughIngredient, ProductIngredient, Product } from '@/types/api';
	import { getRecipeFamily, activateRecipeVersion } from '@/api/recipes';
	import { getProductCostHistory, getProductCostBreakdown } from '@/api/costing';
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

	// 状态管理
	const familyId = ref<string | null>(null);
	const displayedVersionId = ref<string | null>(null);
	const selectedProductId = ref<string | null>(null);
	const collapsedSections = ref(new Set<string>());

	const showVersionActionsModal = ref(false);
	const selectedVersionForAction = ref<RecipeVersion | null>(null);

	const detailChartTab = ref<'trend' | 'breakdown'>('trend');
	const costHistory = ref<{ cost : number }[]>([]);
	const costBreakdown = ref<{ name : string, value : number }[]>([]);


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
				const products = versionToShow.products;
				if (products && products.length > 0) {
					const currentProductIsValid = products.some(p => p.id === selectedProductId.value);
					if (!selectedProductId.value || !currentProductIsValid) {
						selectedProductId.value = products[0].id;
					}
				} else {
					selectedProductId.value = null;
				}
			} else {
				displayedVersionId.value = null;
				selectedProductId.value = null;
			}
		} catch (error) {
			console.error('Failed to fetch recipe details:', error);
			uni.showToast({ title: '获取配方详情失败', icon: 'none' });
		} finally {
			isLoading.value = false;
		}
	};

	watch(selectedProductId, async (newProductId) => {
		if (newProductId) {
			try {
				const [historyData, breakdownData] = await Promise.all([
					getProductCostHistory(newProductId),
					getProductCostBreakdown(newProductId)
				]);
				costHistory.value = historyData;
				costBreakdown.value = breakdownData;
			} catch (error) {
				console.error('Failed to fetch cost data for product:', error);
				costHistory.value = [];
				costBreakdown.value = [];
			}
		} else {
			costHistory.value = [];
			costBreakdown.value = [];
		}
	}, { immediate: true });

	// --- Computed Properties ---

	const displayedVersion = computed(() => {
		return recipeVersions.value.find(v => v.id === displayedVersionId.value);
	});

	const selectedProduct = computed(() => {
		if (!displayedVersion.value || !selectedProductId.value) return null;
		return displayedVersion.value.products.find(p => p.id === selectedProductId.value);
	});

	// [核心重构] 恢复了对预制面团的独立处理逻辑
	const currentRecipeDetails = computed(() => {
		if (!displayedVersion.value || !selectedProduct.value) return [];
		const currentProduct = selectedProduct.value;

		type IngredientWithCost = DoughIngredient & { pricePerKg : string; cost : number; };
		type DoughGroup = { name : string; ingredients : IngredientWithCost[]; procedure ?: string[]; totalCost : number };

		const preDoughGroups : DoughGroup[] = [];
		const mainDoughGroups : DoughGroup[] = [];

		for (const dough of displayedVersion.value.doughs) {
			const mainDoughGroup : DoughGroup = { name: dough.name, ingredients: [], procedure: dough.procedure, totalCost: 0 };
			const mainDoughTotalFlourRatio = dough.ingredients.filter(i => i.isFlour).reduce((sum, i) => sum + i.ratio, 0) || 100;
			const weightPerMainRatioPoint = currentProduct.baseDoughWeight / mainDoughTotalFlourRatio;

			for (const ingredient of dough.ingredients) {
				// @ts-ignore 后端返回了此字段，但TS类型未定义
				const linkedPreDough = ingredient.linkedPreDough;

				// 检查这个原料是不是一个预制面团
				if (linkedPreDough && linkedPreDough.versions && linkedPreDough.versions.length > 0) {
					const preDoughActiveVersion = linkedPreDough.versions.find((v : RecipeVersion) => v.isActive) || linkedPreDough.versions[0];
					const preDough = preDoughActiveVersion.doughs[0];

					if (preDough && preDough.ingredients) {
						const preDoughTotalRatio = preDough.ingredients.reduce((sum : number, ing : DoughIngredient) => sum + ing.ratio, 0);

						if (preDoughTotalRatio > 0) {
							const preDoughGroupForDisplay : DoughGroup = {
								name: `${linkedPreDough.name} (用量: ${ingredient.ratio}%)`,
								ingredients: [],
								procedure: preDough.procedure,
								totalCost: 0
							};
							const totalPreDoughWeight = weightPerMainRatioPoint * ingredient.ratio;
							for (const preDoughIngredient of preDough.ingredients) {
								const ingredientInfo = dataStore.ingredients.find(i => i.name === preDoughIngredient.name);
								const pricePerKg = getPricePerKg(ingredientInfo);
								const weightInGrams = (preDoughIngredient.ratio / preDoughTotalRatio) * totalPreDoughWeight;
								const cost = (parseFloat(pricePerKg) / 1000) * weightInGrams;

								preDoughGroupForDisplay.ingredients.push({ ...preDoughIngredient, ratio: preDoughIngredient.ratio, pricePerKg, cost });
								preDoughGroupForDisplay.totalCost += cost;
							}
							preDoughGroups.push(preDoughGroupForDisplay);
						}
					}
				} else { // 如果是普通原料
					const ingredientInfo = dataStore.ingredients.find(i => i.name === ingredient.name);
					const pricePerKg = getPricePerKg(ingredientInfo);
					const weightInGrams = weightPerMainRatioPoint * ingredient.ratio;
					const cost = (parseFloat(pricePerKg) / 1000) * weightInGrams;

					mainDoughGroup.ingredients.push({ ...ingredient, pricePerKg, cost });
					mainDoughGroup.totalCost += cost;
				}
			}

			if (mainDoughGroup.ingredients.length > 0) {
				mainDoughGroups.push(mainDoughGroup);
			}
		}
		// 保证预制面团在前，主面团在后
		return [...preDoughGroups, ...mainDoughGroups];
	});


	const productCostDetails = computed(() => {
		if (!selectedProductId.value || !displayedVersion.value) {
			return { doughCost: 0, extraCost: 0, extraIngredients: [], totalCost: 0 };
		}
		const product = displayedVersion.value.products.find(p => p.id === selectedProductId.value);
		if (!product) return { doughCost: 0, extraCost: 0, extraIngredients: [], totalCost: 0 };

		let totalDoughCost = 0;
		let totalFlourWeight = 0;

		for (const dough of displayedVersion.value.doughs) {
			const mainDoughTotalFlourRatio = dough.ingredients.filter(i => i.isFlour).reduce((sum, i) => sum + i.ratio, 0) || 100;
			const weightPerMainRatioPoint = product.baseDoughWeight / mainDoughTotalFlourRatio;

			for (const ingredient of dough.ingredients) {
				const weightInGrams = weightPerMainRatioPoint * ingredient.ratio;
				if (ingredient.isFlour) {
					totalFlourWeight += weightInGrams;
				}
				// @ts-ignore
				const linkedPreDough = ingredient.linkedPreDough;
				if (linkedPreDough && linkedPreDough.versions?.length > 0) {
					const preDoughVersion = linkedPreDough.versions.find((v : RecipeVersion) => v.isActive) || linkedPreDough.versions[0];
					const preDough = preDoughVersion.doughs[0];
					if (preDough?.ingredients) {
						const preDoughTotalRatio = preDough.ingredients.reduce((sum : number, ing : DoughIngredient) => sum + ing.ratio, 0);
						if (preDoughTotalRatio > 0) {
							const totalPreDoughWeight = weightPerMainRatioPoint * ingredient.ratio;
							for (const preDoughIngredient of preDough.ingredients) {
								const ingredientInfo = dataStore.ingredients.find(i => i.name === preDoughIngredient.name);
								const pricePerKg = getPricePerKg(ingredientInfo);
								const preDoughIngWeight = (preDoughIngredient.ratio / preDoughTotalRatio) * totalPreDoughWeight;
								totalDoughCost += (parseFloat(pricePerKg) / 1000) * preDoughIngWeight;
								if (preDoughIngredient.isFlour) {
									totalFlourWeight += preDoughIngWeight;
								}
							}
						}
					}
				} else {
					const ingredientInfo = dataStore.ingredients.find(i => i.name === ingredient.name);
					const pricePerKg = getPricePerKg(ingredientInfo);
					totalDoughCost += (parseFloat(pricePerKg) / 1000) * weightInGrams;
				}
			}
		}

		let totalExtraCost = 0;
		const extraIngredients = (product.ingredients || []).map(ing => {
			const ingredientInfo = dataStore.ingredients.find(i => i.name === ing.name);
			const pricePerKg = getPricePerKg(ingredientInfo);
			let finalWeightInGrams = ing.weightInGrams;

			if (ing.type === 'MIX_IN') {
				finalWeightInGrams = (ing.weightInGrams / 100) * totalFlourWeight;
			}
			const cost = (parseFloat(pricePerKg) / 1000) * finalWeightInGrams;
			totalExtraCost += cost;

			return {
				...ing,
				type: getProductIngredientTypeName(ing.type),
				cost: cost || 0,
				ratio: ing.type === 'MIX_IN' ? ing.weightInGrams : undefined,
				weightInGrams: finalWeightInGrams,
			};
		});

		return {
			doughCost: totalDoughCost,
			extraCost: totalExtraCost,
			extraIngredients,
			totalCost: totalDoughCost + totalExtraCost,
		};
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

	const toggleCollapse = (sectionName : string) => {
		const newSet = new Set(collapsedSections.value);
		if (newSet.has(sectionName)) {
			newSet.delete(sectionName);
		} else {
			newSet.add(sectionName);
		}
		collapsedSections.value = newSet;
	};

	const getPricePerKg = (ingredient : Ingredient | undefined | null) => {
		if (!ingredient || !ingredient.activeSku || !ingredient.currentPricePerPackage) return '0.00';
		const sku = ingredient.activeSku;
		if (!sku.specWeightInGrams || sku.specWeightInGrams === 0) return '0.00';
		return ((Number(ingredient.currentPricePerPackage) / sku.specWeightInGrams) * 1000).toFixed(2);
	};

	const getProductIngredientTypeName = (type : ProductIngredient['type']) => {
		const map = { MIX_IN: '搅拌原料', FILLING: '馅料', TOPPING: '表面装饰' };
		return map[type] || '附加原料';
	}

	const navigateBack = () => { uni.navigateBack(); };

	const navigateToEditPage = (familyId : string | null) => {
		if (!familyId) return;
		if (displayedVersion.value) {
			uni.setStorageSync('source_recipe_version', JSON.stringify(displayedVersion.value));
		}
		uni.navigateTo({ url: `/pages/recipes/edit?familyId=${familyId}` });
	};

	const handleCreateVersion = () => {
		if (recipeFamily.value) navigateToEditPage(recipeFamily.value.id);
	};

	const handleVersionClick = (versionToDisplay : RecipeVersion) => {
		displayedVersionId.value = versionToDisplay.id;
		const products = versionToDisplay.products;
		if (products && products.length > 0) {
			selectedProductId.value = products[0].id;
		} else {
			selectedProductId.value = null;
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
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	.product-tabs-container {
		padding: 0 5px 15px;

		.filter-tabs {
			flex-wrap: wrap;
			margin-bottom: 0;
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

	.recipe-table-container {
		background-color: #faf8f5;
		border-radius: 16px;
		padding: 15px;
		margin-top: 15px; // 为容器增加上边距
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
		width: 100%;
		font-size: 14px;

		.table-header,
		.table-row {
			display: grid;
			grid-template-columns: 2fr 1.2fr 1.5fr 1.2fr;
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
		.col-ratio,
		.col-total {
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

	.product-ingredient-table {
		width: 100%;
		font-size: 14px;
		// [核心修改] 移除外边距，因为现在由父容器 .recipe-table-container 控制
		// margin-top: 15px; 

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

		.col-usage,
		.col-cost {
			text-align: right;
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