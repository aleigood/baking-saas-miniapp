<template>
	<view>
		<view class="product-tabs-wrapper">
			<FilterTabs v-if="version && version.products.length > 0" :tabs="productTabsForFilter" v-model="selectedProductId" align="center" />
		</view>

		<view class="card" v-if="selectedProduct && recipeDetails">
			<view class="data-analysis-section">
				<AnimatedTabs v-model="detailChartTab" :tabs="chartTabs" />
				<LineChart v-if="detailChartTab === 'trend'" :chart-data="costHistory" />
				<PieChart v-if="detailChartTab === 'breakdown'" :chart-data="costBreakdown" />
			</view>

			<view v-if="recipeDetails.doughGroups.length > 0">
				<view v-for="(dough, index) in recipeDetails.doughGroups" :key="dough.name + index" class="dough-section">
					<view class="group-title" @click="toggleCollapse(dough.name)">
						<span>{{ dough.name }}</span>
						<span class="arrow" :class="{ collapsed: collapsedSections.has(dough.name) }">&#10095;</span>
					</view>
					<view class="collapsible-content" :class="{ 'is-collapsed': collapsedSections.has(dough.name) }">
						<view class="smart-table">
							<view class="table-header">
								<text class="col-ingredient">原料</text>
								<text class="col-ratio">比例</text>
								<text class="col-usage">用量</text>
								<text class="col-price">单价</text>
								<text class="col-total">成本</text>
							</view>
							<view
								v-for="(ing, ingIndex) in dough.ingredients"
								:key="ingIndex"
								class="table-row"
								@click.stop="handleIconClick(ing.extraInfo, 'main-ing-icon-' + ing.id + ingIndex)"
							>
								<view class="col-ingredient ingredient-name-cell">
									<view v-if="ing.extraInfo" class="ingredient-with-icon" :id="'main-ing-icon-' + ing.id + ingIndex">
										<text>{{ ing.name }}</text>
										<image class="info-icon" src="/static/icons/info.svg" mode="aspectFit"></image>
									</view>
									<text v-else>{{ ing.name }}</text>
								</view>
								<text class="col-ratio">{{ toPercentage(ing.ratio) }}%</text>
								<text class="col-usage">{{ formatWeight(ing.weightInGrams) }}</text>
								<text class="col-price">¥{{ formatNumber(ing.pricePerKg) }}/kg</text>
								<text class="col-total">¥{{ formatNumber(ing.cost) }}</text>
							</view>
						</view>
						<view v-if="dough.procedure && dough.procedure.length > 0" class="procedure-notes">
							<text class="notes-title">制作要点:</text>
							<text v-for="(step, stepIndex) in dough.procedure" :key="stepIndex" class="note-item">{{ stepIndex + 1 }}. {{ step }}</text>
						</view>
					</view>
				</view>
			</view>
			<view v-else class="empty-state" style="padding: 20px 0">暂无面团原料信息</view>

			<view v-if="hasOtherIngredients" class="other-ingredients-section">
				<view class="group-title" @click="toggleCollapse('otherIngredients')">
					<span>{{ selectedProduct.name }}</span>
					<span class="arrow" :class="{ collapsed: collapsedSections.has('otherIngredients') }">&#10095;</span>
				</view>
				<view class="collapsible-content" :class="{ 'is-collapsed': collapsedSections.has('otherIngredients') }">
					<template v-if="doughSummary">
						<view class="summary-table-wrapper">
							<view class="smart-table detail-table">
								<view class="table-header summary-header">
									<text class="col-ingredient">面团</text>
									<text class="col-usage">总用量</text>
									<text class="col-total">成本</text>
								</view>
								<view class="table-row">
									<text class="col-ingredient">{{ doughSummary.name }}</text>
									<text class="col-usage">{{ formatWeight(doughSummary.weightInGrams) }}</text>
									<text class="col-total">¥{{ formatNumber(doughSummary.cost) }}</text>
								</view>
							</view>
						</view>
					</template>
					<template v-if="recipeDetails.groupedExtraIngredients['搅拌原料'] && recipeDetails.groupedExtraIngredients['搅拌原料'].length > 0">
						<view class="summary-table-wrapper">
							<view class="smart-table detail-table">
								<view class="table-header summary-header">
									<text class="col-ingredient">辅料</text>
									<text class="col-usage">总用量</text>
									<text class="col-total">成本</text>
								</view>
								<view v-for="ing in recipeDetails.groupedExtraIngredients['搅拌原料']" :key="ing.id" class="table-row">
									<text class="col-ingredient">{{ ing.name }}</text>
									<text class="col-usage">{{ formatWeight(ing.weightInGrams) }} ({{ toPercentage(ing.ratio) }}%)</text>
									<text class="col-total">¥{{ formatNumber(ing.cost) }}</text>
								</view>
							</view>
						</view>
					</template>

					<template v-if="recipeDetails.groupedExtraIngredients['馅料'] && recipeDetails.groupedExtraIngredients['馅料'].length > 0">
						<view class="summary-table-wrapper">
							<view class="smart-table detail-table">
								<view class="table-header summary-header">
									<text class="col-ingredient">馅料</text>
									<text class="col-usage">用量/个</text>
									<text class="col-total">成本</text>
								</view>
								<view v-for="ing in recipeDetails.groupedExtraIngredients['馅料']" :key="ing.id" class="table-row">
									<text class="col-ingredient">{{ ing.name }}</text>
									<text class="col-usage">{{ formatWeight(ing.weightInGrams) }}</text>
									<text class="col-total">¥{{ formatNumber(ing.cost) }}</text>
								</view>
							</view>
						</view>
					</template>

					<template v-if="recipeDetails.groupedExtraIngredients['表面装饰'] && recipeDetails.groupedExtraIngredients['表面装饰'].length > 0">
						<view class="summary-table-wrapper">
							<view class="smart-table detail-table">
								<view class="table-header summary-header">
									<text class="col-ingredient">表面装饰</text>
									<text class="col-usage">用量/个</text>
									<text class="col-total">成本</text>
								</view>
								<view v-for="ing in recipeDetails.groupedExtraIngredients['表面装饰']" :key="ing.id" class="table-row">
									<text class="col-ingredient">{{ ing.name }}</text>
									<text class="col-usage">{{ formatWeight(ing.weightInGrams) }}</text>
									<text class="col-total">¥{{ formatNumber(ing.cost) }}</text>
								</view>
							</view>
						</view>
					</template>
					<view class="total-cost-summary">
						<view class="summary-divider"></view>
						<view class="summary-text">成本总计: ¥{{ formatNumber(recipeDetails.totalCost) }}</view>
					</view>
					<view v-if="recipeDetails.productProcedure && recipeDetails.productProcedure.length > 0" class="procedure-notes">
						<text class="notes-title">制作要点:</text>
						<text v-for="(step, stepIndex) in recipeDetails.productProcedure" :key="stepIndex" class="note-item">{{ stepIndex + 1 }}. {{ step }}</text>
					</view>
				</view>
			</view>
		</view>
		<view v-else-if="version && version.products.length === 0" class="empty-state">当前版本暂无产品</view>
	</view>
</template>

<script setup lang="ts">
import { ref, computed, watch, getCurrentInstance } from 'vue';
import type { PropType } from 'vue';
import type { RecipeVersion, RecipeDetails } from '@/types/api';
import { getProductCostHistory, getProductCostBreakdown, getRecipeDetails } from '@/api/costing';
import { useDataStore } from '@/store/data';
import LineChart from '@/components/LineChart.vue';
import PieChart from '@/components/PieChart.vue';
import FilterTabs from '@/components/FilterTabs.vue';
import AnimatedTabs from '@/components/AnimatedTabs.vue';
import { formatNumber, formatWeight, toPercentage } from '@/utils/format';

const instance = getCurrentInstance();

const emit = defineEmits(['show-popover']);

const props = defineProps({
	version: {
		type: Object as PropType<RecipeVersion | null>,
		default: null
	}
});

const dataStore = useDataStore();

const selectedProductId = ref<string | null>(null);
const recipeDetails = ref<RecipeDetails | null>(null);
const costHistory = ref<
	{
		cost: number;
	}[]
>([]);
const costBreakdown = ref<
	{
		name: string;
		value: number;
	}[]
>([]);
const detailChartTab = ref<'trend' | 'breakdown'>('trend');
const collapsedSections = ref(new Set<string>());

const chartTabs = ref([
	{
		key: 'trend',
		label: '成本走势'
	},
	{
		key: 'breakdown',
		label: '原料成本'
	}
]);

const productTabsForFilter = computed(() => {
	if (!props.version) return [];
	// @ts-ignore
	return props.version.products.map((p) => ({
		key: p.id,
		label: p.name
	}));
});

const selectedProduct = computed(() => {
	if (!props.version || !selectedProductId.value) return null;
	// @ts-ignore
	return props.version.products.find((p) => p.id === selectedProductId.value);
});

const doughSummary = computed(() => {
	return recipeDetails.value?.extraIngredients.find((item) => item.id === 'dough-summary');
});

const hasOtherIngredients = computed(() => {
	if (!recipeDetails.value) return false;
	const grouped = recipeDetails.value.groupedExtraIngredients;
	return (
		!!doughSummary.value ||
		(grouped['搅拌原料'] && grouped['搅拌原料'].length > 0) ||
		(grouped['馅料'] && grouped['馅料'].length > 0) ||
		(grouped['表面装饰'] && grouped['表面装饰'].length > 0)
	);
});

const handleIconClick = (info: string | null | undefined, elementId: string) => {
	if (!info) {
		emit('show-popover', { info: null, rect: null });
		return;
	}
	const query = uni.createSelectorQuery().in(instance);
	query
		.select('#' + elementId)
		.boundingClientRect((rect: UniApp.NodeInfo) => {
			if (rect) {
				emit('show-popover', {
					info,
					rect
				});
			}
		})
		.exec();
};

const fetchCostData = async (productId: string | null) => {
	if (!productId) {
		costHistory.value = [];
		costBreakdown.value = [];
		recipeDetails.value = null;
		return;
	}
	try {
		const [historyData, breakdownData, detailsData] = await Promise.all([getProductCostHistory(productId), getProductCostBreakdown(productId), getRecipeDetails(productId)]);
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

const toggleCollapse = (sectionName: string) => {
	const newSet = new Set(collapsedSections.value);
	if (newSet.has(sectionName)) {
		newSet.delete(sectionName);
	} else {
		newSet.add(sectionName);
	}
	collapsedSections.value = newSet;
};

watch(selectedProductId, (newProductId) => {
	fetchCostData(newProductId);
});

watch(
	() => props.version,
	(newVersion) => {
		if (newVersion && newVersion.products.length > 0) {
			// @ts-ignore
			selectedProductId.value = newVersion.products[0].id;
		} else {
			selectedProductId.value = null;
		}
	},
	{
		immediate: true
	}
);
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
/* [核心改造] 将 Mixin 应用到本组件 */
@include table-layout;

.collapsible-content {
	max-height: 1000px;
	overflow: hidden;
	transition: max-height 0.3s ease-in-out;
	box-sizing: border-box;
}

.collapsible-content.is-collapsed {
	max-height: 0;
}

.ingredient-with-icon {
	display: inline-flex;
	align-items: center;
	gap: 5px;
}

.info-icon {
	width: 16px;
	height: 16px;
	flex-shrink: 0;
}

.group-title {
	display: flex;
	justify-content: space-between;
	align-items: center;
	font-size: 16px;
	font-weight: 600;
	color: var(--text-primary);
	border: none;
	margin-top: 30px;
	position: relative;
	background-color: #faf8f5;
	padding: 10px 15px;
	border-radius: 12px;
}

.arrow {
	font-size: 14px;
	color: var(--text-secondary);
	transform: rotate(90deg);
	transition: transform 0.3s ease;
}

.arrow.collapsed {
	transform: rotate(0deg);
}

/* [核心改造] .smart-table 会通过 Mixin 获得基础样式，这里只保留组件特有的样式 */
.smart-table {
	font-size: 14px;
	margin-top: 25px;

	.table-header {
		color: var(--text-secondary);
		font-weight: 500;
		background-color: transparent;
		border-bottom: 1px solid var(--border-color);
	}

	.table-row {
		color: var(--text-primary);
		border-bottom: 1px solid var(--border-color);

		&:last-child {
			border-bottom: none;
		}
	}

	.col-total {
		font-weight: 400;
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
	padding: 25px 0px;
}

.data-analysis-section {
	margin-bottom: 20px;
}

.detail-table {
	margin-top: 15px;
}

.summary-header {
	background-color: transparent;
	border-bottom: 1px solid var(--border-color);
}

.summary-table-wrapper {
	margin-top: 15px;
}

.total-cost-summary {
	margin-top: 15px;
	text-align: right;
	font-size: 14px;
	font-weight: 600;
	color: var(--text-primary);
	margin-bottom: 15px;
}

.summary-divider {
	height: 1px;
	background-color: var(--border-color);
	margin-bottom: 10px;
}

.summary-text {
	padding: 0px 4px;
}
</style>
