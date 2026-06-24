<template>
	<view class="card-full-bleed-list">
		<view class="card-title-wrapper">
			<view class="title-with-tag">
				<span class="card-title">配方版本</span>
				<span v-if="isDiscontinued" class="status-tag discontinued">已停用</span>
			</view>
		</view>
		<template v-if="versions.length > 0">
			<ListItem
				v-for="(version, index) in versions"
				:key="version.id"
				:selected="selectedVersionId === version.id"
				@click="$emit('select-version', version)"
				@longpress="$emit('longpress-version', version)"
				:vibrate-on-long-press="canEdit"
				:bleed="true"
				:divider="true"
			>
				<view class="version-item-content">
					<view class="version-item-wrapper">
						<!-- 第一行：配方名称、版本说明 -->
						<view class="version-item-header">
							<view class="header-left">
								<text class="recipe-name">{{ recipeName }}</text>
								<text class="version-tag">V{{ version.version }}{{ version.notes ? ` ${version.notes}` : '' }}</text>
							</view>
						</view>

						<!-- 第二行：修改项摘要 -->
						<view v-if="parseChangeSummary(version.changeSummary).length > 0" class="version-item-body">
							<view class="change-tags-list">
								<view v-for="(item, idx) in parseChangeSummary(version.changeSummary)" :key="idx" class="change-tag-item" :class="item.direction">
									<text class="change-name">{{ item.name }}</text>
								</view>
							</view>
						</view>
					</view>
					<text v-if="version.isActive" class="status-tag active">使用中</text>
				</view>
			</ListItem>
		</template>
		<view v-else class="empty-state" style="padding: 20px 0">暂无版本信息</view>
		<AppButton v-if="canEdit" type="text-link" @click="$emit('create-version')">+ 创建新版本</AppButton>
	</view>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { RecipeVersion, RecipeVersionChangeItem } from '@/types/api';
import ListItem from '@/components/ListItem.vue';
import AppButton from '@/components/AppButton.vue';

defineProps({
	recipeName: {
		type: String,
		default: ''
	},
	versions: {
		type: Array as PropType<RecipeVersion[]>,
		default: () => []
	},
	selectedVersionId: {
		type: String as PropType<string | null>,
		default: null
	},
	canEdit: {
		type: Boolean,
		default: false
	},
	isDiscontinued: {
		type: Boolean,
		default: false
	}
});

defineEmits(['select-version', 'longpress-version', 'create-version']);

const formatNumber = (value: number) => Number(value.toFixed(4)).toString();

// formatVersionDate 已被移除

const formatValue = (value: number | undefined, unit?: RecipeVersionChangeItem['unit']) => {
	const numericValue = value ?? 0;
	if (unit === 'RATIO') return `${formatNumber(numericValue * 100)}%`;
	if (unit === 'PERCENT') return `${Number(numericValue.toFixed(1))}%`;
	if (unit === 'GRAM') return `${formatNumber(numericValue)}g`;
	if (unit === 'CELSIUS') return `${formatNumber(numericValue)}℃`;
	return formatNumber(numericValue);
};

const formatDelta = (item: RecipeVersionChangeItem) => {
	const delta = (item.after ?? 0) - (item.before ?? 0);
	const arrow = delta >= 0 ? '↑' : '↓';
	return `${arrow}${formatValue(Math.abs(delta), item.unit)}`;
};

const fieldLabels: Record<string, string> = {
	targetTemp: '目标温度',
	lossRatio: '损耗率',
	divisionLoss: '分割损耗',
	customWaterContent: '含水量'
};

const productIngredientPrefix = (item: RecipeVersionChangeItem) => (item.productName ? `${item.productName} · ` : '');

const formatDependencyChange = (item: RecipeVersionChangeItem) => {
	const prefix = productIngredientPrefix(item);
	const name = item.name || '子配方';
	return `${prefix}更新${name}${name.endsWith('配方') ? '' : '配方'}`;
};

const formatChangeItem = (item: RecipeVersionChangeItem) => {
	switch (item.kind) {
		case 'INITIAL_VERSION':
			return '初始版本';
		case 'NO_CHANGES':
			return '内容未发生变化';
		case 'LEGACY_TEXT':
			return item.text || '历史修改记录';
		case 'INGREDIENT_ADDED':
			return `+ ${item.name}${item.basis === 'FLOUR_SHARE' ? '面粉占比' : ''}${item.after !== undefined ? ` ${formatValue(item.after, item.unit)}` : ''}`;
		case 'INGREDIENT_REMOVED':
			return `- ${item.name}`;
		case 'INGREDIENT_RATIO_CHANGED':
			return `${item.name}${item.basis === 'FLOUR_SHARE' ? '面粉占比' : ''} ${formatDelta(item)}`;
		case 'DEPENDENCY_VERSION_CHANGED':
			return formatDependencyChange(item);
		case 'PRODUCT_ADDED':
			return `+ 产品 ${item.name}`;
		case 'PRODUCT_REMOVED':
			return `- 产品 ${item.name}`;
		case 'PRODUCT_WEIGHT_CHANGED':
			return `${item.name} ${formatDelta(item)}`;
		case 'PRODUCT_INGREDIENT_ADDED':
			return `${productIngredientPrefix(item)}+ ${item.name} ${formatValue(item.after, item.unit)}${item.unit === 'GRAM' ? '/个' : ''}`;
		case 'PRODUCT_INGREDIENT_REMOVED':
			return `${productIngredientPrefix(item)}- ${item.name}`;
		case 'PRODUCT_INGREDIENT_AMOUNT_CHANGED':
			return `${productIngredientPrefix(item)}${item.name} ${formatDelta(item)}${item.unit === 'GRAM' ? '/个' : ''}`;
		case 'PROCEDURE_CHANGED':
			return item.scope === 'PRODUCT' ? `调整${item.name || ''}制作步骤` : '调整配方制作步骤';
		case 'FIELD_CHANGED':
			return `${fieldLabels[item.field || ''] || item.field || '字段'} ${formatDelta(item)}`;
	}
};

const parseChangeSummary = (summary: RecipeVersion['changeSummary']) => {
	if (!summary?.items?.length) return [];
	return summary.items
		.map((item) => {
			const text = formatChangeItem(item);
			if (!text) return null;

			let direction: 'up' | 'down' | 'neutral' = 'neutral';
			if (text.includes('↑') || text.includes('+')) {
				direction = 'up';
			} else if (text.includes('↓') || text.includes('-')) {
				direction = 'down';
			}

			return {
				name: text,
				direction
			};
		})
		.filter(Boolean) as Array<{ name: string; direction: 'up' | 'down' | 'neutral' }>;
};
</script>

<style scoped lang="scss">
@include list-item-content-style;

.card-full-bleed-list {
	background: var(--card-bg);
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
	border-radius: 20px;
	padding-top: 20px;
	padding-bottom: 20px;
	padding-left: 0;
	padding-right: 0;
}

.card-full-bleed-list .card-title-wrapper {
	padding-left: 20px;
	padding-right: 20px;
}

.create-version-action {
	padding: 0 20px;
}

.create-version-divider {
	height: 1px;
	background: var(--border-color);
}

.title-with-tag {
	display: flex;
	align-items: center;
	gap: 10px;
}

.title-with-tag .card-title {
	margin-bottom: 0;
}

.version-item-content {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	flex: 1;
}

.version-item-wrapper {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.version-item-header {
	display: flex;
	align-items: center;
	width: 100%;
}

.header-left {
	display: flex;
	align-items: center;
	gap: 8px;
	flex: 1;
	min-width: 0;
}

.recipe-name {
	font-size: 14px;
	font-weight: 700;
	color: var(--text-primary);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 150px;
}

/* 双色版本胶囊，与配方列表页样式一致，不设说明背景色以显示卡片底色 */
.version-tag {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	height: 20px;
	padding: 0 8px;
	border-radius: 6px;
	font-size: 10px;
	font-weight: 600;
	background-color: #f4ede2; /* 精致淡燕麦色背景 */
	color: #8d6e63; /* 优雅暖焦糖字色 */
	line-height: 1;
	box-sizing: border-box;
	max-width: 120px; /* 限制最大宽度，防止挤占使用中标签 */
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.status-tag {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 4px 8px;
	border-radius: 15px;
	font-size: 11px;
	color: white;
	font-weight: 500;
	line-height: 1;
	box-sizing: border-box;
	flex-shrink: 0; /* 强制防止被左侧过长文字挤压变形 */
	margin-left: 12px;

	&.active {
		background-color: #8c5a3b;
	}

	&.discontinued {
		background-color: #fee2e2;
		color: #991b1b;
	}
}

.version-item-body {
	width: 100%;
}

.change-tags-list {
	display: flex;
	flex-wrap: wrap; /* 允许换行，使放不下的标签折行 */
	gap: 6px;
	width: 100%;
	height: 20px; /* 限制高度为单行高度 */
	overflow: hidden; /* 超出单行的部分直接隐藏，防止显示半个标签 */
}

.change-tag-item {
	display: inline-flex;
	align-items: center;
	padding: 2px 6px;
	border-radius: 4px;
	font-size: 11px;
	font-weight: 500;
	line-height: 1.2;

	&.up {
		background-color: #e6f4ea;
		color: #137333;
	}

	&.down {
		background-color: #fce8e6;
		color: #c5221f;
	}

	&.neutral {
		background-color: #fcf6ec;
		color: #b06000;
	}
}

/* no-change-tag 已移除 */

.change-name {
	margin-right: 2px;
}

.change-icon {
	font-size: 10px;
	margin-right: 1px;
	font-weight: 700;
}

.change-val {
	font-weight: 600;
}
</style>
