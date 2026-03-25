<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader title="原料制作" />
		<DetailPageLayout>
			<view class="page-content">
				<view class="card">
					<view class="card-title">生产日期</view>
					<view class="date-picker-row">
						<view class="date-picker-item">
							<label class="date-label">开始日期</label>
							<picker mode="date" :value="taskForm.startDate" @change="onDateChange($event, 'start')">
								<view class="picker">
									{{ taskForm.startDate }}
									<view class="arrow-down"></view>
								</view>
							</picker>
						</view>
						<view class="date-picker-item">
							<label class="date-label">结束日期</label>
							<picker mode="date" :value="taskForm.endDate" :start="taskForm.startDate" @change="onDateChange($event, 'end')">
								<view class="picker">
									{{ taskForm.endDate }}
									<view class="arrow-down"></view>
								</view>
							</picker>
						</view>
					</view>
				</view>

				<view class="card">
					<view class="card-title">原料列表</view>

					<view class="summary-card no-frame">
						<view v-if="summaryItems.length > 0" class="summary-tags-container">
							<view v-for="(item, index) in summaryItems" :key="index" class="summary-tag">
								<text class="tag-name">{{ item.name }}</text>
								<view class="tag-value-box">
									<text class="tag-value">{{ item.weight }}</text>
									<text class="tag-unit">g</text>
								</view>
								<view class="clear-tag-btn" @click.stop="clearRecipe(item.name)">
									<image class="clear-icon-img" src="/static/icons/close-x.svg" mode="aspectFit" />
								</view>
							</view>
						</view>
						<view v-else class="summary-placeholder">
							<view class="summary-group-item is-placeholder">
								<text class="placeholder-text">请选择配方并输入重量</text>
							</view>
						</view>
					</view>

					<view class="tabs-container" v-if="recipeTabs.length > 0">
						<CssAnimatedTabs v-model="activeTabKey" :tabs="recipeTabs" />
					</view>

					<view class="calculator-container" v-if="activeRecipeState">
						<view v-if="isLoadingDetails" class="loading-block">
							<text>加载配方详情...</text>
						</view>

						<view class="ingredient-grid" v-else>
							<view v-for="(ing, index) in activeRecipeState.ingredients" :key="ing.id || index" class="ingredient-item">
								<view class="ingredient-info">
									<text class="ingredient-name">{{ ing.name }}</text>
									<view class="tags">
										<text v-if="ing.isFlour" class="type-tag flour">面粉</text>
										<text v-if="ing.isRecipe" class="type-tag recipe">自制</text>
									</view>
								</view>
								<input class="input-field weight-input" type="number" :value="ing.weightDisplay" @input="onIngredientWeightInput(index, $event)" placeholder="0" />
							</view>

							<view class="ingredient-item total-weight-row">
								<view class="ingredient-info">
									<text class="ingredient-name total-label">总投入量</text>
								</view>
								<input
									class="input-field weight-input total-input-small"
									type="number"
									:value="activeRecipeState.totalDisplay"
									@input="onTotalWeightInput"
									placeholder="0"
								/>
							</view>
						</view>
					</view>
				</view>

				<view class="bottom-actions-container">
					<AppButton type="primary" full-width :disabled="!canSubmit" @click="handleSubmit" :loading="isCreating">
						创建 {{ summaryItems.length > 0 ? summaryItems.length : '' }} 个任务
					</AppButton>
				</view>
			</view>
		</DetailPageLayout>
	</view>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useDataStore } from '@/store/data';
import { useToastStore } from '@/store/toast';
import { useUiStore } from '@/store/ui';
import { useUserStore } from '@/store/user';
import { createTask } from '@/api/tasks';
import { getRecipeFamily } from '@/api/recipes';
import { getLocalDate } from '@/utils/format';
import AppButton from '@/components/AppButton.vue';
import DetailHeader from '@/components/DetailHeader.vue';
import DetailPageLayout from '@/components/DetailPageLayout.vue';
import CssAnimatedTabs from '@/components/CssAnimatedTabs.vue';
import type { RecipeFamily } from '@/types/api';

defineOptions({
	inheritAttrs: false
});

const props = defineProps<{
	date?: string;
}>();

const dataStore = useDataStore();
const toastStore = useToastStore();
const uiStore = useUiStore();
const userStore = useUserStore();

const isCreating = ref(false);
const isLoadingDetails = ref(false);
const today = getLocalDate();
const taskForm = reactive({
	startDate: today,
	endDate: today
});

// --- 多任务状态管理 ---

// 标签页状态
const activeTabKey = ref('');

// 单个原料的计算状态接口
interface CalculationItem {
	id: string | null;
	name: string;
	ratio: number;
	weight: number | null;
	weightDisplay: string;
	isFlour: boolean;
	isRecipe: boolean;
}

interface RecipeState {
	productId: string;
	recipeFamilyId: string;
	totalWeight: number | null;
	totalDisplay: string;
	ingredients: CalculationItem[];
	detailsLoaded: boolean;
	// 新增：保存配方的损耗属性，以便精准反推提交给后端的数量
	lossRatio: number;
	divisionLoss: number;
	baseDoughWeight: number;
}

// 核心状态：存储所有配方的输入数据
const recipeStates = reactive<Record<string, RecipeState>>({});

// 生成标签页配置
const recipeTabs = computed(() => {
	const otherProducts = dataStore.productsForTaskCreation['OTHER'] || {};
	return Object.keys(otherProducts).map((name) => ({
		key: name,
		label: name
	}));
});

// 初始化配方基础信息
const initRecipeStates = () => {
	const otherProducts = dataStore.productsForTaskCreation['OTHER'] || {};
	const allRecipes = [...dataStore.recipes.preDoughs, ...dataStore.recipes.extras];

	Object.keys(otherProducts).forEach((name) => {
		if (recipeStates[name]) return;

		const products = otherProducts[name];
		if (!products || products.length === 0) return;

		const family = allRecipes.find((f) => f.name === name);

		if (family) {
			// 安全获取产品基础重量，默认为 1
			const baseWeight = (products[0] as any).baseDoughWeight ? Number((products[0] as any).baseDoughWeight) : 1;

			recipeStates[name] = {
				productId: products[0].id,
				recipeFamilyId: family.id,
				totalWeight: null,
				totalDisplay: '',
				ingredients: [],
				detailsLoaded: false,
				lossRatio: 0,
				divisionLoss: 0,
				baseDoughWeight: baseWeight
			};
		}
	});

	if (!activeTabKey.value && recipeTabs.value.length > 0) {
		activeTabKey.value = recipeTabs.value[0].key;
	}
};

const activeRecipeState = computed(() => {
	return recipeStates[activeTabKey.value];
});

watch(
	activeTabKey,
	async (newKey) => {
		if (!newKey) return;
		const state = recipeStates[newKey];
		if (state && !state.detailsLoaded) {
			await loadRecipeDetails(state);
		}
	},
	{ immediate: true }
);

// 加载配方详细比例
const loadRecipeDetails = async (state: RecipeState) => {
	if (isLoadingDetails.value) return;
	isLoadingDetails.value = true;
	try {
		const fullFamily = await getRecipeFamily(state.recipeFamilyId);
		const version = fullFamily.versions.find((v) => (v as any).isActive) || fullFamily.versions[0];

		if (version && version.components && version.components.length > 0) {
			const component = version.components[0];

			// 记录配方的损耗系数，用于反推计算后端需要的 Quantity（成品目标重量）
			state.lossRatio = Number(component.lossRatio || 0);
			state.divisionLoss = Number(component.divisionLoss || 0);

			state.ingredients = (component.ingredients || []).map((ing) => ({
				id: ing.ingredient?.id || ing.linkedPreDough?.id || ing.linkedExtra?.id || null,
				name: ing.ingredient?.name || ing.linkedPreDough?.name || ing.linkedExtra?.name || '未知原料',
				ratio: Number(ing.ratio || ing.flourRatio || 0),
				weight: null,
				weightDisplay: '',
				isFlour: ing.ingredient?.isFlour || false,
				isRecipe: !!(ing.linkedPreDough || ing.linkedExtra)
			}));
			state.detailsLoaded = true;
		}
	} catch (error) {
		console.error('Failed to load recipe details:', error);
		toastStore.show({ message: '加载配方详情失败', type: 'error' });
	} finally {
		isLoadingDetails.value = false;
	}
};

const clearRecipe = (recipeName: string) => {
	const state = recipeStates[recipeName];
	if (state) {
		state.totalWeight = null;
		state.totalDisplay = '';
		state.ingredients.forEach((item) => {
			item.weight = null;
			item.weightDisplay = '';
		});
	}
};

const getTotalRatio = (ingredients: CalculationItem[]) => {
	return ingredients.reduce((sum, item) => sum + item.ratio, 0);
};

const onTotalWeightInput = (e: any) => {
	if (!activeRecipeState.value) return;
	const state = activeRecipeState.value;
	const val = e.detail.value;

	state.totalDisplay = val;
	const num = parseFloat(val);

	if (!isNaN(num) && num >= 0) {
		state.totalWeight = num;
		const totalRatio = getTotalRatio(state.ingredients);
		if (totalRatio > 0) {
			state.ingredients.forEach((item) => {
				const weight = (num * item.ratio) / totalRatio;
				item.weight = weight;
				item.weightDisplay = weight > 0 ? parseFloat(weight.toFixed(2)).toString() : '';
			});
		}
	} else {
		state.totalWeight = null;
		state.ingredients.forEach((item) => {
			item.weight = null;
			item.weightDisplay = '';
		});
	}
};

const onIngredientWeightInput = (index: number, e: any) => {
	if (!activeRecipeState.value) return;
	const state = activeRecipeState.value;
	const item = state.ingredients[index];
	const val = e.detail.value;

	item.weightDisplay = val;
	const num = parseFloat(val);

	if (!isNaN(num) && num >= 0 && item.ratio > 0) {
		const totalRatio = getTotalRatio(state.ingredients);
		const newTotal = (num / item.ratio) * totalRatio;

		state.totalWeight = newTotal;
		state.totalDisplay = parseFloat(newTotal.toFixed(2)).toString();

		state.ingredients.forEach((other, idx) => {
			if (idx === index) {
				other.weight = num;
			} else {
				const w = (newTotal * other.ratio) / totalRatio;
				other.weight = w;
				other.weightDisplay = w > 0 ? parseFloat(w.toFixed(2)).toString() : '';
			}
		});
	}
};

const summaryItems = computed(() => {
	const items: { name: string; weight: number }[] = [];
	Object.keys(recipeStates).forEach((key) => {
		const state = recipeStates[key];
		if (state.totalWeight && state.totalWeight > 0) {
			const formattedWeight = parseFloat(state.totalWeight.toFixed(2));
			items.push({ name: key, weight: formattedWeight });
		}
	});
	return items;
});

const canSubmit = computed(() => {
	return summaryItems.value.length > 0;
});

onLoad(async (options) => {
	const dateStr = props.date || options?.date;
	if (dateStr) {
		taskForm.startDate = dateStr;
		taskForm.endDate = dateStr;
	}

	if (dataStore.dataStale.recipes || !dataStore.dataLoaded.recipes) {
		await dataStore.fetchRecipesData();
	}
	if (dataStore.dataStale.productsForTaskCreation || !dataStore.dataLoaded.productsForTaskCreation) {
		await dataStore.fetchProductsForTaskCreation();
	}

	initRecipeStates();
});

const handleSubmit = async () => {
	if (!canSubmit.value) return;

	// 收集所有有效任务
	const productsToSubmit = Object.values(recipeStates)
		.filter((state) => state.totalWeight && state.totalWeight > 0)
		.map((state) => {
			// [核心修复] 将前端的“总投入重量”反推计算出后端的“目标产出数量”
			// 后端的 BOM 算法是根据产出求投入：InputWeight = Quantity * (baseDoughWeight + divisionLoss) / (1 - lossRatio)
			// 所以前端提交的数量应该是：Quantity = InputWeight * (1 - lossRatio) / (baseDoughWeight + divisionLoss)
			const lossRatio = state.lossRatio || 0;
			const divLoss = state.divisionLoss || 0;
			const baseWeight = state.baseDoughWeight || 1;

			// 避免除以0的安全防护
			const denominator = baseWeight + divLoss > 0 ? baseWeight + divLoss : 1;
			const targetQuantity = (state.totalWeight! * (1 - lossRatio)) / denominator;

			return {
				productId: state.productId,
				quantity: Number(targetQuantity.toFixed(4)) // 提交带有精度的目标产出值
			};
		});

	if (productsToSubmit.length === 0) return;

	isCreating.value = true;
	try {
		const payload = {
			startDate: new Date(taskForm.startDate).toISOString(),
			endDate: new Date(taskForm.endDate).toISOString(),
			products: productsToSubmit
		};

		const currentUserRole = userStore.userInfo?.tenants.find((t) => t.tenant.id === dataStore.currentTenantId)?.role;
		const target = currentUserRole === 'MEMBER' ? '/pages/baker/main' : '/pages/main/main';

		const res = await createTask(payload);

		if (res.warning) {
			uiStore.setNextPageToast({ message: res.warning, type: 'error', duration: 3000 }, target);
		} else {
			uiStore.setNextPageToast({ message: `成功创建 ${productsToSubmit.length} 个原料制作任务`, type: 'success' }, target);
		}

		dataStore.markProductionAsStale();
		dataStore.markHistoricalTasksAsStale();
		dataStore.markIngredientsAsStale();
		uni.navigateBack();
	} catch (error) {
		console.error('Failed to create ingredient tasks:', error);
		toastStore.show({ message: '创建失败', type: 'error' });
	} finally {
		isCreating.value = false;
	}
};

const onDateChange = (e: any, type: 'start' | 'end') => {
	const newDate = e.detail.value;
	if (type === 'start') {
		taskForm.startDate = newDate;
		if (new Date(taskForm.endDate) < new Date(newDate)) {
			taskForm.endDate = newDate;
		}
	} else {
		taskForm.endDate = newDate;
	}
};
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
@include form-control-styles;

.page-wrapper {
	display: flex;
	flex-direction: column;
	height: 100vh;
}

.date-picker-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 15px;
	margin-bottom: 20px;
}

.date-picker-item {
	flex: 1;
}

.date-label {
	font-size: 13px;
	color: var(--text-secondary);
	margin-bottom: 8px;
	display: block;
}

.summary-card.no-frame {
	background-color: transparent;
	padding: 0;
	margin-bottom: 15px;
}

.summary-tags-container {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
}

.summary-tag {
	display: flex;
	align-items: center;
	background-color: #ffffff;
	border: 1px solid #f0e6d2;
	border-radius: 6px;
	padding: 6px 8px 6px 10px;
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.tag-name {
	font-size: 13px;
	color: var(--text-primary);
	font-weight: 500;
	margin-right: 8px;
}

.tag-value-box {
	display: flex;
	align-items: baseline;
	background-color: #fdf8f2;
	padding: 2px 6px;
	border-radius: 4px;
}

.tag-value {
	font-size: 13px;
	font-weight: bold;
	color: var(--primary-color);
}

.tag-unit {
	font-size: 10px;
	color: var(--text-secondary);
	margin-left: 2px;
}

.clear-tag-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 18px;
	height: 18px;
	margin-left: 6px;
	background-color: rgba(140, 90, 59, 0.08);
	border-radius: 50%;
	cursor: pointer;
	transition: background-color 0.2s;

	&:active {
		background-color: rgba(140, 90, 59, 0.15);
	}
}

.clear-icon-img {
	width: 8px;
	height: 8px;
}

.summary-placeholder {
	display: block;
}

.summary-group-item.is-placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 60px;
	background-color: transparent;
	border: 1px dashed #f0e6d2;
	border-radius: 8px;
}

.placeholder-text {
	font-size: 13px;
	color: #ced4da;
}

.tabs-container {
	margin-bottom: 20px;
}

.calculator-container {
	animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
	from {
		opacity: 0;
		transform: translateY(5px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

.reset-text {
	font-size: 11px;
	color: var(--primary-color);
	padding: 2px 8px;
	background: rgba(140, 90, 59, 0.1);
	border-radius: 4px;
	cursor: pointer;
}

.section-subtitle {
	font-size: 14px;
	font-weight: 600;
	color: var(--text-secondary);
	margin-bottom: 15px;
}

.loading-block {
	text-align: center;
	padding: 20px;
	color: var(--text-secondary);
	font-size: 13px;
}

.ingredient-grid {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.ingredient-item {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 0 5px;
}

.ingredient-info {
	width: calc(50% - 6px);
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: flex-end;
	min-width: 0;
}

.ingredient-name {
	font-size: 15px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	color: var(--text-primary);
	text-align: right;
	width: auto;
	flex-shrink: 1;
}

.total-label {
	color: var(--primary-color);
}

.tags {
	display: flex;
	gap: 4px;
	margin-top: 0;
	margin-left: 4px;
	justify-content: flex-end;
	flex-shrink: 0;
}

.type-tag {
	font-size: 10px;
	padding: 1px 4px;
	border-radius: 3px;

	&.flour {
		background: #ebe2d9;
		color: #8d6e63;
	}
	&.recipe {
		background: #faedcd;
		color: var(--primary-color);
	}
}

.weight-input {
	width: calc(50% - 6px);
	max-width: 120px;
	flex-shrink: 0;
	text-align: center;
}
</style>
