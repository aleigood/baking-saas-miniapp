<template>
	<view class="card">
		<view class="card-title">原料列表</view>
		<view class="smart-table">
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
import { formatNumber, toPercentage } from '@/utils/format';

const props = defineProps({
	version: {
		type: Object as PropType<RecipeVersion | null>,
		default: null
	}
});

const dataStore = useDataStore();

const procedure = computed(() => {
	if (!props.version || !props.version.doughs || props.version.doughs.length === 0) {
		return [];
	}
	return props.version.doughs[0].procedure || [];
});

const nonMainRecipeIngredients = computed(() => {
	if (!props.version) {
		return [];
	}
	const dough = props.version.doughs[0];
	if (!dough || !dough.ingredients) {
		return [];
	}
	return dough.ingredients.map((ing) => {
		const ingredientData = dataStore.allIngredients.find((i) => i.id === ing.ingredientId);

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
/* [核心改造] 将 Mixin 应用到本组件 */
@include table-layout;

.card {
	margin-top: 20px;
}

/* [核心改造] .smart-table 会通过 Mixin 获得基础样式，这里只保留组件特有的样式 */
.smart-table {
	font-size: 14px;
	margin-top: 15px;

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
}

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
