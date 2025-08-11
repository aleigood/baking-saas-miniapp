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

				<view class="product-tabs-wrapper">
					<FilterTabs v-if="displayedVersion && displayedVersion.products.length > 0">
						<FilterTab v-for="product in displayedVersion.products" :key="product.id"
							:active="selectedProductId === product.id" @click="handleProductClick(product.id)">
							{{ product.name }}
						</FilterTab>
					</FilterTabs>
				</view>

				<view class="card" v-if="selectedProduct">
					<view class="data-analysis-section">
						<AnimatedTabs v-model="detailChartTab" :tabs="chartTabs" />

						<LineChart v-if="detailChartTab === 'trend'" :chart-data="costHistory" />
						<PieChart v-if="detailChartTab === 'breakdown'" :chart-data="costBreakdownForChart" />
					</view>

					<view v-if="currentRecipeDetails.length > 0">
						<view v-for="(dough, index) in currentRecipeDetails" :key="dough.name + index"
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
							<span>原料汇总 (总成本: ¥{{ formatNumber(productCostDetails.totalCost) }})</span>
							<span class="arrow"
								:class="{ collapsed: collapsedSections.has('otherIngredients') }">&#10094;</span>
						</view>
						<view v-show="!collapsedSections.has('otherIngredients')">
							<view class="recipe-table-container">
								<view v-if="productCostDetails.extraIngredients.length > 0"
									class="product-ingredient-table">
									<view class="table-header">
										<text class="col-group">类型</text>
										<text class="col-ingredient">原料</text>
										<text class="col-usage">用量</text>
										<text class="col-cost">成本</text>
									</view>
									<template v-for="(group, groupName) in productCostDetails.groupedExtraIngredients"
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
		Ingredient,
		DoughIngredient,
		ProductIngredient,
		Product
	} from '@/types/api';
	import {
		getRecipeFamily,
		activateRecipeVersion
	} from '@/api/recipes';
	import {
		getProductCostHistory,
		getProductCostBreakdown
	} from '@/api/costing';
	import AppModal from '@/components/AppModal.vue';
	import LineChart from '@/components/LineChart.vue';
	import PieChart from '@/components/PieChart.vue';
	import ListItem from '@/components/ListItem.vue';
	import FilterTabs from '@/components/FilterTabs.vue';
	import FilterTab from '@/components/FilterTab.vue';
	import AppButton from '@/components/AppButton.vue';
	// [核心新增] 引入新的 AnimatedTabs 组件
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

	// 状态管理
	const familyId = ref<string | null>(null);
	const displayedVersionId = ref<string | null>(null);
	const selectedProductId = ref<string | null>(null);
	const collapsedSections = ref(new Set<string>());

	const showVersionActionsModal = ref(false);
	const selectedVersionForAction = ref<RecipeVersion | null>(null);

	const detailChartTab = ref<'trend' | 'breakdown'>('trend');
	// [核心新增] 为新组件定义 tab 数据
	const chartTabs = ref([
		{ key: 'trend', label: '成本走势' },
		{ key: 'breakdown', label: '原料成本' },
	]);
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
		if (!productId) {
			costHistory.value = [];
			costBreakdown.value = [];
			return;
		}
		try {
			const [historyData] = await Promise.all([
				getProductCostHistory(productId),
			]);
			costHistory.value = historyData;
		} catch (error) {
			console.error('Failed to fetch cost data for product:', error);
			costHistory.value = [];
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

	/**
	 * [核心重构] 新的计算属性，用于在前端计算精准的、包含所有成分的总成本构成，供饼图使用
	 * 这个算法会递归地解析所有嵌套的预制面团和馅料配方，将它们分解为最基础的原材料，并汇总成本。
	 */
	const costBreakdownForChart = computed(() => {
		if (!selectedProduct.value || !displayedVersion.value) {
			return [];
		}

		// 使用 Map 来聚合所有基础原材料的最终成本
		const ingredientCostMap = new Map<string, number>();

		/**
		 * 递归函数，用于解析任何面团（主面团、预制面团等）并累加其原料成本
		 * @param doughIngredients - 面团的原料数组
		 * @param totalDoughWeight - 该面团在最终产品中的总重量
		 */
		const parseDoughAndAggregate = (doughIngredients : DoughIngredient[], totalDoughWeight : number) => {
			const totalRatio = doughIngredients.reduce((sum, i) => sum + i.ratio, 0);
			if (totalRatio === 0) return;

			const weightPerRatioPoint = totalDoughWeight / totalRatio;

			for (const ingredient of doughIngredients) {
				const weight = weightPerRatioPoint * ingredient.ratio;
				const linkedPreDough = (ingredient as any).linkedPreDough;

				// 如果是预制面团（例如：烫种），则递归处理
				if (linkedPreDough && linkedPreDough.versions?.length > 0) {
					const preDoughVersion = linkedPreDough.versions.find((v : any) => v.isActive) || linkedPreDough.versions[0];
					const preDough = preDoughVersion.doughs[0];
					if (preDough?.ingredients) {
						parseDoughAndAggregate(preDough.ingredients, weight);
					}
				} else {
					// 如果是基础原料，计算成本并累加到 Map 中
					const ingredientInfo = dataStore.ingredients.find(i => i.name === ingredient.name);
					const pricePerKg = parseFloat(getPricePerKg(ingredientInfo));
					const cost = (pricePerKg / 1000) * weight;

					if (!isNaN(cost)) {
						ingredientCostMap.set(ingredient.name, (ingredientCostMap.get(ingredient.name) || 0) + cost);
					}
				}
			}
		};

		/**
		 * 递归函数，用于计算总面粉量（为计算“搅拌原料”的用量做准备）
		 * @param doughIngredients - 面团的原料数组
		 * @param totalDoughWeight - 该面团的总重量
		 */
		const getTotalFlourWeight = (doughIngredients : DoughIngredient[], totalDoughWeight : number) : number => {
			let totalFlour = 0;
			const totalRatio = doughIngredients.reduce((sum, i) => sum + i.ratio, 0);
			if (totalRatio === 0) return 0;
			const weightPerRatioPoint = totalDoughWeight / totalRatio;

			for (const ingredient of doughIngredients) {
				const weight = weightPerRatioPoint * ingredient.ratio;
				const linkedPreDough = (ingredient as any).linkedPreDough;
				if (linkedPreDough && linkedPreDough.versions?.length > 0) {
					const preDoughVersion = linkedPreDough.versions.find((v : any) => v.isActive) || linkedPreDough.versions[0];
					totalFlour += getTotalFlourWeight(preDoughVersion.doughs[0].ingredients, weight);
				} else {
					const ingredientInfo = dataStore.ingredients.find(i => i.name === ingredient.name);
					if (ingredientInfo?.isFlour) {
						totalFlour += weight;
					}
				}
			}
			return totalFlour;
		};

		// --- 1. 计算所有基础面团的成本 ---
		parseDoughAndAggregate(displayedVersion.value.doughs.flatMap(d => d.ingredients), selectedProduct.value.baseDoughWeight);

		// --- 2. 计算所有附加原料（馅料、装饰等）的成本 ---
		const totalFlourWeightForMixins = getTotalFlourWeight(displayedVersion.value.doughs.flatMap(d => d.ingredients), selectedProduct.value.baseDoughWeight);

		if (selectedProduct.value.ingredients) {
			for (const ing of (selectedProduct.value.ingredients as any[])) {
				// [核心修正] 检查附加原料本身是否为一个配方（例如卡仕达酱）
				if (ing.linkedExtraId) {
					const extraRecipeFamily = dataStore.recipes.find(r => r.id === ing.linkedExtraId);
					if (extraRecipeFamily && extraRecipeFamily.versions.length > 0) {
						const activeVersion = extraRecipeFamily.versions.find(v => v.isActive) || extraRecipeFamily.versions[0];
						if (activeVersion.doughs.length > 0) {
							// 递归解析这个作为馅料的配方
							parseDoughAndAggregate(activeVersion.doughs.flatMap(d => d.ingredients), ing.weightInGrams);
						}
					}
				} else {
					// 如果是普通的基础原料
					const ingredientInfo = dataStore.ingredients.find(i => i.name === ing.name);
					const pricePerKg = parseFloat(getPricePerKg(ingredientInfo));
					let finalWeightInGrams = 0;
					if (ing.type === 'MIX_IN') {
						finalWeightInGrams = (ing.ratio / 100) * totalFlourWeightForMixins;
					} else {
						finalWeightInGrams = ing.weightInGrams;
					}
					const cost = (pricePerKg / 1000) * finalWeightInGrams;
					if (!isNaN(cost)) {
						ingredientCostMap.set(ing.name, (ingredientCostMap.get(ing.name) || 0) + cost);
					}
				}
			}
		}

		// --- 3. 将聚合后的 Map 转换为数组格式以供图表使用 ---
		return Array.from(ingredientCostMap.entries()).map(([name, value]) => ({
			name,
			value,
		}));
	});


	const currentRecipeDetails = computed(() => {
		if (!displayedVersion.value || !selectedProduct.value) return [];
		const currentProduct = selectedProduct.value;

		type IngredientWithCost = DoughIngredient & {
			pricePerKg : string; cost : number; weightInGrams : number;
		};
		type DoughGroup = {
			name : string; ingredients : IngredientWithCost[]; procedure ?: string[]; totalCost : number
		};

		const preDoughGroups : DoughGroup[] = [];
		const mainDoughGroups : DoughGroup[] = [];

		let totalRatioSum = 0;
		for (const dough of displayedVersion.value.doughs) {
			totalRatioSum += dough.ingredients.reduce((sum, i) => sum + i.ratio, 0);
		}
		if (totalRatioSum === 0) totalRatioSum = 1;
		const weightPerRatioPoint = currentProduct.baseDoughWeight / totalRatioSum;


		for (const dough of displayedVersion.value.doughs) {
			const mainDoughGroup : DoughGroup = {
				name: dough.name,
				ingredients: [],
				procedure: dough.procedure,
				totalCost: 0
			};

			for (const ingredient of dough.ingredients) {
				// @ts-ignore
				const linkedPreDough = ingredient.linkedPreDough;

				if (linkedPreDough && linkedPreDough.versions && linkedPreDough.versions.length > 0) {
					const preDoughActiveVersion = linkedPreDough.versions.find((v : RecipeVersion) => v.isActive) ||
						linkedPreDough.versions[0];
					const preDough = preDoughActiveVersion.doughs[0];

					if (preDough && preDough.ingredients) {
						const totalPreDoughWeight = weightPerRatioPoint * ingredient.ratio;
						const preDoughTotalRatio = preDough.ingredients.reduce((sum : number, ing : DoughIngredient) => sum + ing
							.ratio, 0);

						if (preDoughTotalRatio > 0) {
							const preDoughGroupForDisplay : DoughGroup = {
								name: `${linkedPreDough.name} (用量: ${formatNumber(totalPreDoughWeight)}g)`,
								ingredients: [],
								procedure: preDough.procedure,
								totalCost: 0
							};

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
									weightInGrams
								});
								preDoughGroupForDisplay.totalCost += cost;
							}
							preDoughGroups.push(preDoughGroupForDisplay);
						}
					}
				} else {
					const ingredientInfo = dataStore.ingredients.find(i => i.name === ingredient.name);
					const pricePerKg = getPricePerKg(ingredientInfo);
					const weightInGrams = weightPerRatioPoint * ingredient.ratio;
					const cost = (parseFloat(pricePerKg) / 1000) * weightInGrams;

					mainDoughGroup.ingredients.push({
						...ingredient,
						pricePerKg,
						cost,
						weightInGrams
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

	const productCostDetails = computed(() => {
		if (!selectedProduct.value || !displayedVersion.value) {
			return {
				totalCost: 0,
				extraIngredients: [],
				groupedExtraIngredients: {}
			};
		}
		const product = selectedProduct.value;

		// 递归函数，用于解析面团并返回其基础原料列表和总成本
		const parseDough = (doughIngredients : DoughIngredient[], totalDoughWeight : number) => {
			let totalCost = 0;
			let totalFlourWeight = 0;
			let baseIngredients : any[] = [];

			const totalRatio = doughIngredients.reduce((sum, i) => sum + i.ratio, 0);
			if (totalRatio === 0) return {
				totalCost,
				totalFlourWeight,
				baseIngredients
			};

			const weightPerRatioPoint = totalDoughWeight / totalRatio;

			for (const ingredient of doughIngredients) {
				const weight = weightPerRatioPoint * ingredient.ratio;
				// @ts-ignore
				const linkedPreDough = ingredient.linkedPreDough;

				if (linkedPreDough && linkedPreDough.versions?.length > 0) {
					const preDoughVersion = linkedPreDough.versions.find((v : any) => v.isActive) || linkedPreDough.versions[0];
					const preDough = preDoughVersion.doughs[0];
					if (preDough?.ingredients) {
						// 递归解析预制面团
						const nestedResult = parseDough(preDough.ingredients, weight);
						totalCost += nestedResult.totalCost;
						totalFlourWeight += nestedResult.totalFlourWeight;
						baseIngredients = baseIngredients.concat(nestedResult.baseIngredients);
					}
				} else {
					// 基础原料
					const ingredientInfo = dataStore.ingredients.find(i => i.name === ingredient.name);
					const pricePerKg = getPricePerKg(ingredientInfo);
					const cost = (parseFloat(pricePerKg) / 1000) * weight;

					totalCost += cost;
					if (ingredientInfo?.isFlour) {
						totalFlourWeight += weight;
					}
					baseIngredients.push({
						name: ingredient.name,
						weightInGrams: weight,
						cost: cost
					});
				}
			}
			return {
				totalCost,
				totalFlourWeight,
				baseIngredients
			};
		};

		// --- 1. 计算主面团的总成本和总面粉量 ---
		const mainDoughResult = parseDough(displayedVersion.value.doughs.flatMap(d => d.ingredients), product.baseDoughWeight);

		// --- 2. 计算附加原料的成本 ---
		let totalExtraCost = 0;
		const extraIngredients = (product.ingredients || []).map((ing : any) => {
			const ingredientInfo = dataStore.ingredients.find(i => i.name === ing.name);
			const pricePerKg = getPricePerKg(ingredientInfo);
			let finalWeightInGrams = 0;
			if (ing.type === 'MIX_IN') {
				finalWeightInGrams = (ing.ratio / 100) * mainDoughResult.totalFlourWeight;
			} else {
				finalWeightInGrams = ing.weightInGrams;
			}
			const cost = (parseFloat(pricePerKg) / 1000) * finalWeightInGrams;
			totalExtraCost += cost;

			return {
				...ing,
				type: getProductIngredientTypeName(ing.type),
				cost: cost || 0,
				weightInGrams: finalWeightInGrams
			};
		});

		// --- 3. 组合最终结果 ---
		const allIngredients = [{
			id: 'dough-summary',
			name: '基础面团',
			type: '面团',
			cost: mainDoughResult.totalCost,
			weightInGrams: product.baseDoughWeight // 面团总重就是产品设定的基础面团重
		}, ...extraIngredients,];

		const groupedExtraIngredients = allIngredients.reduce((acc, ing) => {
			const typeKey = ing.type || '其他';
			if (!acc[typeKey]) {
				acc[typeKey] = [];
			}
			acc[typeKey].push(ing);
			return acc;
		}, {} as Record<string, any[]>);

		return {
			totalCost: mainDoughResult.totalCost + totalExtraCost,
			extraIngredients: allIngredients,
			groupedExtraIngredients
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
		if (!ingredient || !ingredient.activeSku || !ingredient.currentPricePerPackage) return '0';
		const sku = ingredient.activeSku;
		if (!sku.specWeightInGrams || sku.specWeightInGrams === 0) return '0';
		const price = ((Number(ingredient.currentPricePerPackage) / sku.specWeightInGrams) * 1000);
		return formatNumber(price);
	};

	const getProductIngredientTypeName = (type : ProductIngredient['type']) => {
		const map = {
			MIX_IN: '搅拌原料',
			FILLING: '馅料',
			TOPPING: '表面装饰'
		};
		return map[type] || '附加原料';
	}

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
		// @ts-ignore
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
		// [需求 1] 左对齐：移除左右内边距
		padding: 0;
		// [需求 2] 增加与下方卡片的间距
		margin-bottom: 20px;

		:deep(.filter-tabs) {
			flex-wrap: wrap;
			margin-bottom: 0;
		}
	}

	.data-analysis-section {
		margin-bottom: 20px;
	}

	/* [核心删除] 移除旧的 chart-tabs 样式 */

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