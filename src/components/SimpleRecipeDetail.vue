<template>
	<view class="card">
		<view class="card-title">原料列表</view>
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
		<view v-if="procedure && procedure.length > 0" class="procedure-notes">
			<text class="notes-title">制作要点:</text>
			<text v-for="(step, stepIndex) in procedure" :key="stepIndex" class="note-item">{{ stepIndex + 1 }}. {{ step }}</text>
		</view>
	</view>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance } from 'vue';
import type { PropType } from 'vue';
import type { RecipeVersion, ComponentIngredient } from '@/types/api';
import { toPercentage } from '@/utils/format';

const instance = getCurrentInstance();

const emit = defineEmits(['show-popover']);

const props = defineProps({
	version: {
		type: Object as PropType<RecipeVersion | null>,
		default: null
	}
});

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
	font-size: 11px;
	font-weight: 500;
	padding: 2px 6px;
	border-radius: 6px;
	background-color: #faedcd; /* [G-Code-Note] [核心修改] 更新背景颜色 */
	color: var(--primary-color); /* [G-Code-Note] [核心修改] 更新字体颜色 */
	flex-shrink: 0;
}

.ingredient-with-icon {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	flex-grow: 1; /* [G-Code-Note] [核心修复] 补上 flex-grow */
	justify-content: space-between; /* [G-Code-Note] [核心修复] 补上 justify-content */
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
