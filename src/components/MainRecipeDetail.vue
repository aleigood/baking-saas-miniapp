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

			<view v-if="recipeDetails.componentGroups && recipeDetails.componentGroups.length > 0">
				<view v-for="(component, index) in recipeDetails.componentGroups" :key="component.name + index" class="dough-section">
					<view class="group-title" @click="toggleCollapse(component.name)">
						<span>{{ component.name }}</span>
						<span class="arrow" :class="{ collapsed: collapsedSections.has(component.name) }">&#10095;</span>
					</view>
					<view class="collapsible-content" :class="{ 'is-collapsed': collapsedSections.has(component.name) }">
						<view class="smart-table">
							<view class="table-header">
								<text class="col-ingredient">原料</text>
								<text class="col-ratio">比例</text>
								<text class="col-usage">用量</text>
								<text class="col-price">单价</text>
								<text class="col-total">成本</text>
							</view>
							<view
								v-for="(ing, ingIndex) in component.ingredients"
								:key="ingIndex"
								class="table-row"
								@click.stop="handleIconClick(ing.extraInfo, 'main-ing-icon-' + index + '-' + ingIndex)"
							>
								<view class="col-ingredient ingredient-name-cell">
									<view v-if="ing.extraInfo" class="ingredient-with-icon" :id="'main-ing-icon-' + index + '-' + ingIndex">
										<view class="ingredient-name-wrapper">
											<text>{{ ing.name }}</text>
											<text class="recipe-tag" v-if="ing.isRecipe">自制</text>
										</view>
										<image class="info-icon" src="/static/icons/info.svg" mode="aspectFit"></image>
									</view>
									<view v-else class="ingredient-name-wrapper">
										<text>{{ ing.name }}</text>
										<text class="recipe-tag" v-if="ing.isRecipe">自制</text>
									</view>
								</view>
								<text class="col-ratio">{{ toPercentage(ing.ratio) }}%</text>
								<text class="col-usage">{{ formatWeight(ing.weightInGrams) }}</text>
								<text class="col-price">¥{{ formatNumber(ing.pricePerKg) }}/kg</text>
								<text class="col-total">¥{{ formatNumber(ing.cost) }}</text>
							</view>
						</view>
						<view v-if="component.procedure && component.procedure.length > 0" class="procedure-notes">
							<text class="notes-title">制作要点:</text>
							<text v-for="(step, stepIndex) in component.procedure" :key="stepIndex" class="note-item">{{ stepIndex + 1 }}. {{ step }}</text>
						</view>
					</view>
				</view>
				<view v-if="hasOtherIngredients" class="other-ingredients-section">
					<view class="group-title" @click="toggleCollapse('otherIngredients')">
						<span>{{ selectedProduct.name }}</span>
						<span class="arrow" :class="{ collapsed: collapsedSections.has('otherIngredients') }">&#10095;</span>
					</view>
					<view class="collapsible-content" :class="{ 'is-collapsed': collapsedSections.has('otherIngredients') }">
						<template v-for="(ingredients, groupName) in recipeDetails.groupedExtraIngredients" :key="groupName">
							<view v-if="ingredients.length > 0" class="summary-table-wrapper">
								<view class="smart-table detail-table">
									<view class="table-header summary-header">
										<text class="col-ingredient">{{ groupName === '搅拌原料' ? '辅料' : groupName }}</text>
										<text v-if="groupName === '搅拌原料'" class="col-ratio">配方占比</text>
										<text class="col-usage">{{ getUsageColumnHeader(groupName as string) }}</text>
										<text class="col-total">成本</text>
									</view>
									<view v-for="ing in ingredients" :key="ing.id" class="table-row">
										<view class="col-ingredient ingredient-name-cell">
											<view class="ingredient-name-wrapper">
												<text>{{ ing.name }}</text>
												<text class="recipe-tag" v-if="ing.isRecipe">自制</text>
											</view>
										</view>
										<text v-if="groupName === '搅拌原料'" class="col-ratio">{{ toPercentage(ing.ratio) }}%</text>
										<text class="col-usage">{{ getUsageDisplay(ing) }}</text>
										<text class="col-total">¥{{ formatNumber(ing.cost) }}</text>
									</view>
								</view>
							</view>
						</template>
						<view class="total-cost-summary">
							<view class="summary-divider"></view>
							<view class="summary-text">总成本: ¥{{ formatNumber(recipeDetails.totalCost) }}</view>
						</view>
						<view v-if="recipeDetails.productProcedure && recipeDetails.productProcedure.length > 0" class="procedure-notes">
							<text class="notes-title">制作要点:</text>
							<text v-for="(step, stepIndex) in recipeDetails.productProcedure" :key="stepIndex" class="note-item">{{ stepIndex + 1 }}. {{ step }}</text>
						</view>
					</view>
				</view>
			</view>
			<view v-else class="empty-state" style="padding: 20px 0">暂无基础组件原料信息</view>
		</view>
		<view v-else-if="version && version.products.length === 0" class="empty-state">当前版本暂无产品</view>
	</view>
</template>

<script setup lang="ts">
import { ref, computed, watch, getCurrentInstance } from 'vue';
import type { PropType } from 'vue';
// [核心修改] 导入新的类型
import type { RecipeVersion, RecipeDetails, CalculatedExtraIngredientInfo } from '@/types/api';
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

const hasOtherIngredients = computed(() => {
	if (!recipeDetails.value) return false;
	// [核心改造] 检查 groupedExtraIngredients 是否有任何一个分组包含数据
	return Object.values(recipeDetails.value.groupedExtraIngredients).some((group) => group.length > 0);
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

// [核心新增] 根据分组名决定“用量”列的标题
const getUsageColumnHeader = (groupName: string): string => {
	if (groupName === '馅料' || groupName === '表面装饰') {
		// [中文注释] 修改标题为“单个用量”
		return '单个用量';
	}
	return '总用量';
};

// [核心新增] 根据原料类型动态生成用量显示文本
const getUsageDisplay = (ingredient: CalculatedExtraIngredientInfo): string => {
	// [中文注释] 配方占比已移至单独的列，这里只返回重量
	return formatWeight(ingredient.weightInGrams);
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
@include table-layout;

/* [G-Code-Note] [核心新增] "自制" 标签和名称包装器 */
.ingredient-name-cell {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 5px;
}

.ingredient-name-wrapper {
	display: inline-flex;
	align-items: center;
	gap: 6px;
}

/* [G-Code-Note] [核心修改] 更新样式以匹配 edit.vue */
.recipe-tag {
	font-size: 12px;
	font-weight: 500;
	padding: 2px 8px;
	border-radius: 10px;
	background-color: #faedcd; /* [G-Code-Note] [核心修改] 更新背景颜色 */
	color: var(--primary-color); /* [G-Code-Note] [核心修改] 更新字体颜色 */
	flex-shrink: 0;
}

.collapsible-content {
	max-height: 1000px;
	overflow: hidden;
	transition: max-height 0.3s ease-in-out;
	box-sizing: border-box;
}

.other-ingredients-section {
	padding-bottom: 10px;
}

.collapsible-content.is-collapsed {
	max-height: 0;
}

.ingredient-with-icon {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	/* [G-Code-Note] [核心修改] 确保 wrapper 优先，icon 靠右 */
	flex-grow: 1;
	justify-content: space-between;
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
}

.procedure-notes {
	@include procedure-notes-style;
	margin-top: 25px;
}

.product-tabs-wrapper {
	padding: 30px 0px;
}

.data-analysis-section {
	margin-bottom: 20px;
}

.summary-header {
	background-color: transparent;
	border-bottom: 1px solid var(--border-color);
}

.total-cost-summary {
	margin-top: 25px;
	text-align: right;
	font-size: 14px;
	font-weight: 600;
	color: var(--text-primary);
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
