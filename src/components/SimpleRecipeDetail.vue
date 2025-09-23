<template>
	<view class="card">
		<view class="card-title">原料列表</view>
		<view class="smart-table">
			<view class="table-header">
				<text class="col-ingredient">原料名称</text>
				<text class="col-ratio">比例</text>
				<text class="col-price">单价</text>
			</view>
			<!-- [核心修改] 增加点击事件，用于弹出附加信息 -->
			<view
				v-for="(ing, ingIndex) in nonMainRecipeIngredients"
				:key="ingIndex"
				class="table-row"
				@click.stop="handleIconClick(ing.ingredient.extraInfo, 'simple-ing-icon-' + ingIndex)"
			>
				<!-- [核心修改] 将 text 改为 view，并增加 icon 显示逻辑 -->
				<view class="col-ingredient ingredient-name-cell">
					<view v-if="ing.ingredient.extraInfo" class="ingredient-with-icon" :id="'simple-ing-icon-' + ingIndex">
						<text>{{ ing.ingredient.name }}</text>
						<image class="info-icon" src="/static/icons/info.svg" mode="aspectFit"></image>
					</view>
					<text v-else>{{ ing.ingredient.name }}</text>
				</view>
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
import { computed, getCurrentInstance } from 'vue'; // [核心新增] 导入 getCurrentInstance
import type { PropType } from 'vue';
import { useDataStore } from '@/store/data';
import type { RecipeVersion } from '@/types/api';
import { formatNumber, toPercentage } from '@/utils/format';

// [核心新增] 获取当前组件实例，用于后续的 DOM 查询
const instance = getCurrentInstance();

// [核心新增] 定义组件可以向父组件发送的事件
const emit = defineEmits(['show-popover']);

const props = defineProps({
	version: {
		type: Object as PropType<RecipeVersion | null>,
		default: null
	}
});

const dataStore = useDataStore();

const procedure = computed(() => {
	// [核心重命名] doughs -> components
	if (!props.version || !props.version.components || props.version.components.length === 0) {
		return [];
	}
	return props.version.components[0].procedure || [];
});

const nonMainRecipeIngredients = computed(() => {
	if (!props.version) {
		return [];
	}
	// [核心重命名] doughs -> components
	const component = props.version.components[0];
	if (!component || !component.ingredients) {
		return [];
	}
	return component.ingredients.map((ing) => {
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

// [核心新增] 处理原料行点击事件的方法
const handleIconClick = (info: string | null | undefined, elementId: string) => {
	// 如果没有附加信息，则不执行任何操作
	if (!info) {
		emit('show-popover', { info: null, rect: null });
		return;
	}
	// 查询被点击元素的位置信息
	const query = uni.createSelectorQuery().in(instance);
	query
		.select('#' + elementId)
		.boundingClientRect((rect: UniApp.NodeInfo) => {
			if (rect) {
				// 将附加信息和元素位置发送给父组件，让父组件显示弹窗
				emit('show-popover', {
					info,
					rect
				});
			}
		})
		.exec();
};
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
/* [核心改造] 将 Mixin 应用到本组件 */
@include table-layout;

/* [核心新增] 附加信息图标的样式 */
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
