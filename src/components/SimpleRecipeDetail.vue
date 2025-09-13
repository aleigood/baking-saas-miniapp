<template>
	<view class="card">
		<view class="card-title">原料列表</view>
		<view class="recipe-table">
			<view class="table-header">
				<text class="col-ingredient">原料名称</text>
				<text class="col-ratio">比例</text>
				<text class="col-price">单价</text>
			</view>
			<view v-for="(ing, ingIndex) in nonMainRecipeIngredients" :key="ingIndex" class="table-row">
				<text class="col-ingredient">{{ ing.ingredient.name }}</text>
				<text class="col-ratio">{{ toPercentage(ing.ratio) }}%</text>
				<text class="col-price">{{ ing.pricePerKg }}</text>
			</view>
		</view>
		<view v-if="procedure && procedure.length > 0" class="procedure-notes">
			<text class="notes-title">制作要点:</text>
			<text v-for="(step, stepIndex) in procedure" :key="stepIndex" class="note-item">{{ stepIndex + 1 }}. {{ step }}</text>
		</view>
	</view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PropType } from 'vue';
import { useDataStore } from '@/store/data';
import type { RecipeVersion, Ingredient } from '@/types/api';
// [核心重构] 导入新的工具函数
import { formatNumber, toPercentage } from '@/utils/format';

const props = defineProps({
	version: {
		type: Object as PropType<RecipeVersion | null>,
		default: null
	}
});

const dataStore = useDataStore();

// [核心新增] 提取制作要点
const procedure = computed(() => {
	if (!props.version || !props.version.doughs || props.version.doughs.length === 0) {
		return [];
	}
	return props.version.doughs[0].procedure || [];
});

// 计算属性，用于处理并格式化非主面团配方的原料列表
const nonMainRecipeIngredients = computed(() => {
	if (!props.version) {
		return [];
	}
	// 非主面团配方通常只有一个 dough 定义
	const dough = props.version.doughs[0];
	if (!dough || !dough.ingredients) {
		return [];
	}
	return dough.ingredients.map((ing) => {
		// [核心修复] 从 dataStore.allIngredients (扁平化数组) 中查找完整的原料信息
		const ingredientData = dataStore.allIngredients.find((i) => i.id === ing.ingredientId);

		// [核心修改] 在组件内部进行单价计算和格式化
		let pricePerKg = '¥0/kg';
		if (ingredientData && ingredientData.activeSku && ingredientData.currentPricePerPackage && ingredientData.activeSku.specWeightInGrams) {
			const price = (Number(ingredientData.currentPricePerPackage) / ingredientData.activeSku.specWeightInGrams) * 1000;
			pricePerKg = `¥${formatNumber(price)}/kg`;
		}

		return {
			...ing,
			pricePerKg
		};
	});
});
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';

/* [核心修改] 为卡片增加一个上边距，以在视觉上与主配方详情页的布局对齐 */
.card {
	margin-top: 20px;
}

/* [核心修改] 样式现在与 MainRecipeDetail.vue 中的样式保持一致 */
.recipe-table {
	display: table;
	width: 100%;
	font-size: 14px;
	border-collapse: collapse;
	margin-top: 15px;

	.table-header,
	.table-row {
		display: table-row;
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

	.col-ingredient,
	.col-ratio,
	.col-price {
		display: table-cell;
		padding: 8px 4px;
		vertical-align: middle;
	}

	.col-ratio,
	.col-price {
		text-align: right;
		white-space: nowrap;
	}

	.col-ingredient {
		min-width: 80px;
		word-break: break-word;
	}
}

/* [核心新增] 增加制作要点样式 */
.procedure-notes {
	margin-top: 10px;
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
</style>
