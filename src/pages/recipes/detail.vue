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

				<!-- 配方详情卡片 -->
				<view class="card">
					<view class="card-title">{{ displayedVersion?.notes || `配方详情 (v${displayedVersion?.version})` }}
					</view>

					<!-- [核心修改] 面团配方列表移到产品轮播之前 -->
					<view v-if="currentRecipeDetails.length > 0">
						<!-- 循环渲染每个面团的表格 -->
						<view v-for="(dough, index) in currentRecipeDetails" :key="index"
							class="recipe-table-container">
							<!-- 标题后显示总价 -->
							<view class="dough-title">{{ dough.name }}
								<span v-if="dough.totalCost > 0">(合计: ¥{{ dough.totalCost.toFixed(2) }})</span>
							</view>
							<view class="recipe-table">
								<view class="table-header">
									<text class="col-ingredient">原料</text>
									<text class="col-ratio">比例</text>
									<text class="col-price">单价</text>
									<text class="col-total">成本</text>
								</view>
								<view v-for="(ing, ingIndex) in dough.ingredients" :key="ingIndex" class="table-row">
									<text class="col-ingredient">{{ ing.name }}</text>
									<text class="col-ratio">{{ ing.ratio.toFixed(1) }}%</text>
									<text class="col-price">¥{{ ing.pricePerKg }}/kg</text>
									<text class="col-total">¥{{ ing.cost.toFixed(2) }}</text>
								</view>
							</view>
							<!-- 制作要点 -->
							<view v-if="dough.procedure && dough.procedure.length > 0" class="procedure-notes">
								<text class="notes-title">制作要点:</text>
								<text v-for="(step, stepIndex) in dough.procedure" :key="stepIndex"
									class="note-item">{{ stepIndex + 1 }}. {{ step }}</text>
							</view>
						</view>
					</view>
					<view v-else class="empty-state" style="padding: 20px 0">
						暂无原料信息
					</view>

					<!-- [核心修改] 最终产品卡片组移到面团配方之后 -->
					<view v-if="displayedVersion && displayedVersion.products.length > 0"
						class="product-swiper-container">
						<!-- 指示器移到上方 -->
						<view class="swiper-indicator">
							<view class="indicator-dot" v-for="(product, index) in displayedVersion.products"
								:key="product.id" :class="{ active: index === currentProductIndex }"></view>
						</view>
						<swiper class="product-swiper" circular @change="onSwiperChange">
							<swiper-item v-for="(product) in displayedVersion.products" :key="product.id"
								class="product-swiper-item">
								<view class="product-card">
									<!-- [核心修改] 产品名称后增加总成本 -->
									<view class="product-title">{{ product.name }}
										<span>(总成本: ¥{{ getProductCost(product.id).totalCost.toFixed(2) }})</span>
									</view>
									<!-- [核心修改] 产品原料改为表格展示 -->
									<view class="product-ingredient-table">
										<view class="table-header">
											<text class="col-ingredient">原料</text>
											<text class="col-usage">用量</text>
											<text class="col-cost">成本</text>
										</view>
										<!-- 面团行 -->
										<view class="table-row">
											<text class="col-ingredient">面团</text>
											<text class="col-usage">{{ product.baseDoughWeight }}g</text>
											<text class="col-cost">¥{{ getProductCost(product.id).doughCost.toFixed(2)
												}}</text>
										</view>
										<!-- 附加原料行 -->
										<template v-for="pIng in getProductCost(product.id).extraIngredients"
											:key="pIng.id">
											<view class="table-row">
												<text class="col-ingredient">{{ pIng.name }} ({{ pIng.type }})</text>
												<!-- [核心修改] 搅拌原料显示比例和克重 -->
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
	import type { RecipeFamily, RecipeVersion, Ingredient, DoughIngredient, ProductIngredient, Product } from '@/types/api';
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
	const currentProductIndex = ref(0); // 用于swiper指示器

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
			// 确保在加载配方信息前，原料数据已准备好
			if (!dataStore.dataLoaded.ingredients) {
				await dataStore.fetchIngredientsData();
			}
			const fullFamilyData = await getRecipeFamily(id);
			recipeFamily.value = fullFamilyData;
			recipeVersions.value = fullFamilyData.versions.sort((a, b) => b.version - a.version);
			const currentActiveVersion = recipeVersions.value.find(v => v.isActive);

			if (currentActiveVersion) {
				if (!displayedVersionId.value || !recipeVersions.value.some(v => v.id === displayedVersionId.value)) {
					displayedVersionId.value = currentActiveVersion.id;
				}

				if (currentActiveVersion.products && currentActiveVersion.products.length > 0) {
					// 默认加载第一个产品的成本数据
					const firstProductId = currentActiveVersion.products[0].id;
					const [historyData, breakdownData] = await Promise.all([
						getProductCostHistory(firstProductId),
						getProductCostBreakdown(firstProductId)
					]);
					costHistory.value = historyData;
					costBreakdown.value = breakdownData;
				}
			} else if (recipeVersions.value.length > 0) {
				// 如果没有激活版本，默认显示最新版本
				displayedVersionId.value = recipeVersions.value[0].id;
			}

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

	// 计算当前选中产品和配方版本的详细信息，包括成本
	const currentRecipeDetails = computed(() => {
		if (!displayedVersion.value || !displayedVersion.value.products.length) return [];
		const currentProduct = displayedVersion.value.products[currentProductIndex.value];
		if (!currentProduct) return [];

		type IngredientWithCost = DoughIngredient & { pricePerKg : string; cost : number; };
		type DoughGroup = { name : string; ingredients : IngredientWithCost[]; procedure ?: string[]; totalCost : number };

		const preDoughGroups : DoughGroup[] = [];
		const mainDoughGroups : DoughGroup[] = [];

		for (const dough of displayedVersion.value.doughs) {
			const mainDoughGroup : DoughGroup = {
				name: dough.name,
				ingredients: [],
				procedure: dough.procedure,
				totalCost: 0
			};

			const mainDoughTotalFlourRatio = dough.ingredients.filter(i => i.isFlour).reduce((sum, i) => sum + i.ratio, 0) || 100;
			const weightPerMainRatioPoint = currentProduct.baseDoughWeight / mainDoughTotalFlourRatio;

			for (const ingredient of dough.ingredients) {
				// @ts-ignore 后端返回了此字段，但TS类型未定义
				const linkedPreDough = ingredient.linkedPreDough;

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

								preDoughGroupForDisplay.ingredients.push({
									...preDoughIngredient,
									ratio: preDoughIngredient.ratio,
									pricePerKg,
									cost,
								});
								preDoughGroupForDisplay.totalCost += cost;
							}
							preDoughGroups.push(preDoughGroupForDisplay);
						}
					}
				} else {
					const ingredientInfo = dataStore.ingredients.find(i => i.name === ingredient.name);
					const pricePerKg = getPricePerKg(ingredientInfo);
					const weightInGrams = weightPerMainRatioPoint * ingredient.ratio;
					const cost = (parseFloat(pricePerKg) / 1000) * weightInGrams;

					mainDoughGroup.ingredients.push({
						...ingredient,
						pricePerKg,
						cost,
					});
					mainDoughGroup.totalCost += cost;
				}
			}

			if (mainDoughGroup.ingredients.length > 0) {
				mainDoughGroups.push(mainDoughGroup);
			}
		}

		return [...preDoughGroups, ...mainDoughGroups];
	});

	// [核心重构] 计算产品总成本和附加原料的详细信息
	const getProductCost = (productId : string) => {
		const product = displayedVersion.value?.products.find(p => p.id === productId);
		if (!product || !displayedVersion.value) {
			return { doughCost: 0, extraIngredients: [], totalCost: 0 };
		}

		let totalDoughCost = 0;
		let totalFlourWeight = 0; // [核心新增] 计算总粉量

		// 第一次遍历：计算总粉量和基础面团成本
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

			// [核心修改] 如果是搅拌原料，则根据总粉量计算实际克重
			if (ing.type === 'MIX_IN') {
				// 假设ing.weightInGrams此时存的是百分比
				finalWeightInGrams = (ing.weightInGrams / 100) * totalFlourWeight;
			}

			const cost = (parseFloat(pricePerKg) / 1000) * finalWeightInGrams;
			totalExtraCost += cost;

			return {
				...ing,
				type: getProductIngredientTypeName(ing.type),
				cost: cost || 0,
				ratio: ing.type === 'MIX_IN' ? ing.weightInGrams : undefined, // 保留原始比例
				weightInGrams: finalWeightInGrams, // 使用计算后的克重
			};
		});

		return {
			doughCost: totalDoughCost,
			extraIngredients,
			totalCost: totalDoughCost + totalExtraCost,
		};
	};


	// 从 dataStore 中获取原料信息并计算单价
	const getPricePerKg = (ingredient : Ingredient | undefined | null) => {
		if (!ingredient || !ingredient.activeSku || !ingredient.currentPricePerPackage) {
			return '0.00';
		}
		const sku = ingredient.activeSku;
		if (!sku.specWeightInGrams || sku.specWeightInGrams === 0) return '0.00';
		return ((Number(ingredient.currentPricePerPackage) / sku.specWeightInGrams) * 1000).toFixed(2);
	};


	// 获取产品附加原料的中文名称
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
		// 切换版本时，重置产品滑动卡片到第一个
		currentProductIndex.value = 0;
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

	// Swiper 切换事件处理
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

	/* 表格化配方详情样式 */
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

	/* 产品滑动卡片组样式 */
	.product-swiper-container {
		margin-top: 20px;
	}

	/* 指示器样式 */
	.swiper-indicator {
		display: flex;
		justify-content: center;
		margin-bottom: 10px;
	}

	.indicator-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background-color: #e6b89c;
		margin: 0 4px;
		transition: background-color 0.3s;
	}

	.indicator-dot.active {
		background-color: var(--primary-color);
	}

	/* [核心修复] 为swiper设置一个足以容纳新表格的高度 */
	.product-swiper {
		height: 320px;
	}

	/* 为 swiper-item 添加间距 */
	.product-swiper-item {
		padding: 0 5px;
		box-sizing: border-box;
	}

	.product-card {
		background-color: #faf8f5;
		border-radius: 16px;
		padding: 15px;
		box-sizing: border-box;
		width: 100%;
		height: 100%; // 确保卡片填满swiper-item
	}

	/* 产品名称标题样式 */
	.product-title {
		font-weight: 600;
		font-size: 15px;
		margin-bottom: 10px;
		padding-bottom: 10px;
		border-bottom: 1px solid var(--border-color);
		text-align: center;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	/* [核心新增] 产品原料表格样式 */
	.product-ingredient-table {
		width: 100%;
		font-size: 14px;
		margin-bottom: 15px;

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