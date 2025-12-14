<template>
	<view class="card">
		<view class="meta-grid-container">
			<view class="meta-item">
				<view class="label">含水量</view>
				<view class="value">{{ calculatedWaterContent }}%</view>
			</view>
			<view class="meta-divider"></view>
			<view class="meta-item">
				<view class="label">工艺损耗</view>
				<view class="value">{{ lossRatioDisplay }}</view>
			</view>
			<view class="meta-divider"></view>
			<view class="meta-item">
				<view class="label">保质期</view>
				<view class="value">{{ shelfLifeDisplay }}</view>
			</view>
		</view>

		<view class="group-title" @click="toggleCollapse">
			<span>原料列表</span>
			<span class="arrow" :class="{ collapsed: isCollapsed }">&#10095;</span>
		</view>

		<view class="collapsible-content" :class="{ 'is-collapsed': isCollapsed }">
			<view class="smart-table">
				<view class="table-header">
					<text class="col-ingredient">原料名称</text>
					<text class="col-ratio">比例</text>
					<text class="col-price"></text>
				</view>
				<view
					v-for="(ing, ingIndex) in nonMainRecipeIngredients"
					:key="ingIndex"
					class="table-row"
					@click.stop="handleIconClick(ing.ingredient.extraInfo, 'simple-ing-icon-' + ingIndex)"
				>
					<view class="col-ingredient ingredient-name-cell">
						<view v-if="ing.ingredient.extraInfo" class="ingredient-with-icon" :id="'simple-ing-icon-' + ingIndex">
							<view class="ingredient-name-wrapper">
								<text>{{ ing.ingredient.name }}</text>
								<text class="recipe-tag" v-if="ing.ingredient.type === 'PRE_DOUGH' || ing.ingredient.type === 'EXTRA'">自制</text>
							</view>
							<image class="info-icon" src="/static/icons/info.svg" mode="aspectFit"></image>
						</view>
						<view v-else class="ingredient-name-wrapper">
							<text>{{ ing.ingredient.name }}</text>
							<text class="recipe-tag" v-if="ing.ingredient.type === 'PRE_DOUGH' || ing.ingredient.type === 'EXTRA'">自制</text>
						</view>
					</view>
					<text class="col-ratio">{{ toPercentage(ing.flourRatio ?? ing.ratio) }}%</text>
					<text class="col-price"></text>
				</view>
			</view>
		</view>

		<view v-if="procedure && procedure.length > 0" class="procedure-notes">
			<text class="notes-title">制作要点:</text>
			<text v-for="(step, stepIndex) in procedure" :key="stepIndex" class="note-item">{{ stepIndex + 1 }}. {{ step }}</text>
		</view>
	</view>
</template>

<script setup lang="ts">
import { ref, computed, getCurrentInstance } from 'vue';
import type { PropType } from 'vue';
import type { RecipeVersion, ComponentIngredient } from '@/types/api';
import { toPercentage } from '@/utils/format';

const instance = getCurrentInstance();

const emit = defineEmits(['show-popover']);

const props = defineProps({
	version: {
		type: Object as PropType<RecipeVersion | null>,
		default: null
	},
	shelfLife: {
		type: Number,
		default: 0
	}
});

// [核心新增] 控制折叠状态
const isCollapsed = ref(false);

const toggleCollapse = () => {
	isCollapsed.value = !isCollapsed.value;
};

const procedure = computed(() => {
	if (!props.version || !props.version.components || props.version.components.length === 0) {
		return [];
	}
	return props.version.components[0].procedure || [];
});

const nonMainRecipeIngredients = computed(() => {
	if (!props.version) {
		return [];
	}
	const component = props.version.components[0];
	if (!component || !component.ingredients) {
		return [];
	}
	return component.ingredients.filter((ing): ing is ComponentIngredient & { ingredient: NonNullable<ComponentIngredient['ingredient']> } => !!ing.ingredient);
});

const lossRatioDisplay = computed(() => {
	if (!props.version || !props.version.components[0]) return '0%';
	const loss = props.version.components[0].lossRatio || 0;
	return toPercentage(loss) + '%';
});

const shelfLifeDisplay = computed(() => {
	if (!props.shelfLife || props.shelfLife <= 0) return '未设置';
	if (props.shelfLife < 24) return `${props.shelfLife}小时`;
	const days = Math.floor(props.shelfLife / 24);
	const hours = props.shelfLife % 24;
	if (hours > 0) return `${days}天${hours}小时`;
	return `${days}天`;
});

const calculatedWaterContent = computed(() => {
	if (!props.version || !props.version.components[0]) return '0';

	const component = props.version.components[0];

	if (component.customWaterContent !== null && component.customWaterContent !== undefined) {
		return component.customWaterContent;
	}

	if (!component.ingredients || component.ingredients.length === 0) return '0';

	let totalWaterUnits = 0;
	let totalUnits = 0;

	component.ingredients.forEach((ing) => {
		const rawRatio = ing.flourRatio ?? ing.ratio ?? 0;
		const ratio = Number(rawRatio);

		if (ratio <= 0) return;

		let waterContent = 0;
		if (ing.ingredient) {
			if (ing.ingredient.name === '水') {
				waterContent = 1;
			} else {
				waterContent = ing.ingredient.waterContent || 0;
			}
		}

		totalWaterUnits += ratio * waterContent;
		totalUnits += ratio;
	});

	if (totalUnits === 0) return '0';
	return ((totalWaterUnits / totalUnits) * 100).toFixed(1);
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
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
@include table-layout;

.meta-grid-container {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 18px 10px;
	background-color: #faf8f5;
	border-radius: 12px;
	margin-bottom: 25px;
	border: none;
}

.meta-item {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6px;
}

.meta-divider {
	width: 1px;
	height: 24px;
	background-color: #e6dccd;
	opacity: 0.6;
}

.meta-item .label {
	font-size: 13px;
	color: var(--text-secondary);
	font-weight: 400;
}

/* [UI优化] 数值文字大小调整为 16px */
.meta-item .value {
	font-size: 16px; /* [修改] 18px -> 16px */
	font-weight: 600;
	color: var(--primary-color);
	font-family: -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif;
	letter-spacing: -0.5px;
}

/* [UI优化] 组标题样式 (复用自 detail.vue) */
.group-title {
	display: flex;
	justify-content: space-between;
	align-items: center;
	font-size: 16px;
	font-weight: 600;
	color: var(--text-primary);
	border: none;
	margin-top: 10px;
	position: relative;
	background-color: #faf8f5;
	padding: 10px 15px;
	border-radius: 12px;
	/* 添加点击反馈 */
	transition: background-color 0.2s;
}

.group-title:active {
	background-color: #f0ebe5;
}

/* [UI优化] 折叠箭头样式 */
.arrow {
	font-size: 14px;
	color: var(--text-secondary);
	transform: rotate(90deg);
	transition: transform 0.3s ease;
	padding: 5px; /* 增加点击区域 */
}

.arrow.collapsed {
	transform: rotate(0deg);
}

/* [UI优化] 折叠容器样式 */
.collapsible-content {
	max-height: 1000px; /* 足够大的高度以容纳内容 */
	overflow: hidden;
	transition: max-height 0.3s ease-in-out;
	box-sizing: border-box;
}

.collapsible-content.is-collapsed {
	max-height: 0;
}

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

.recipe-tag {
	font-size: 11px;
	font-weight: 500;
	padding: 2px 6px;
	border-radius: 6px;
	background-color: #faedcd;
	color: var(--primary-color);
	flex-shrink: 0;
}

.ingredient-with-icon {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	flex-grow: 1;
	justify-content: space-between;
}

.info-icon {
	width: 16px;
	height: 16px;
	flex-shrink: 0;
}

.card {
	margin-top: 20px;
}

.smart-table {
	font-size: 14px;
	margin-top: 10px; /* 调整与标题的间距 */

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

	.col-price {
		flex: 0;
		width: 0px;
	}
}

.procedure-notes {
	@include procedure-notes-style;
	margin-top: 25px;
	margin-bottom: 10px;
}
</style>
