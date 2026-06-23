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
				:divider="index < versions.length - 1"
			>
				<view class="main-info">
					<view class="name">{{ version.notes || `版本 ${version.version}` }} (v{{ version.version }})</view>
					<view class="desc version-summary">{{ formatChangeSummary(version) }}</view>
				</view>
				<view class="side-info">
					<view v-if="version.isActive" class="status-tag active">使用中</view>
					<view class="version-date">{{ formatVersionDate(version.createdAt) }}</view>
				</view>
			</ListItem>
		</template>
		<view v-else class="empty-state" style="padding: 20px 0">暂无版本信息</view>
	</view>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { RecipeVersion, RecipeVersionChangeItem } from '@/types/api';
import { formatChineseDate } from '@/utils/format';
import ListItem from '@/components/ListItem.vue';

defineProps({
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

defineEmits(['select-version', 'longpress-version']);

const formatNumber = (value: number) => Number(value.toFixed(4)).toString();

const formatVersionDate = (dateInput: string) => {
	const date = new Date(dateInput);
	if (Number.isNaN(date.getTime())) return '';
	return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
};

const formatValue = (value: number | undefined, unit?: RecipeVersionChangeItem['unit']) => {
	const numericValue = value ?? 0;
	if (unit === 'RATIO') return `${formatNumber(numericValue * 100)}%`;
	if (unit === 'PERCENT') return `${formatNumber(numericValue)}%`;
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

const productIngredientPrefix = (item: RecipeVersionChangeItem) =>
	item.productName ? `${item.productName} · ` : '';

const formatDependencyChange = (item: RecipeVersionChangeItem) => {
	const prefix = productIngredientPrefix(item);
	if (item.beforeVersion !== undefined && item.afterVersion !== undefined) {
		return `${prefix}${item.name || '子配方'} V${item.beforeVersion}→V${item.afterVersion}`;
	}
	return `${prefix}${item.name || '子配方'}版本更新`;
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
			return `新增 ${item.name}${item.basis === 'FLOUR_SHARE' ? '面粉占比' : ''}${item.after !== undefined ? ` ${formatValue(item.after, item.unit)}` : ''}`;
		case 'INGREDIENT_REMOVED':
			return `移除 ${item.name}${item.basis === 'FLOUR_SHARE' ? '面粉占比' : ''}${item.before !== undefined ? ` ${formatValue(item.before, item.unit)}` : ''}`;
		case 'INGREDIENT_RATIO_CHANGED':
			return `${item.name}${item.basis === 'FLOUR_SHARE' ? '面粉占比' : ''} ${formatDelta(item)}`;
		case 'DEPENDENCY_VERSION_CHANGED':
			return formatDependencyChange(item);
		case 'PRODUCT_ADDED':
			return `新增产品 ${item.name}`;
		case 'PRODUCT_REMOVED':
			return `移除产品 ${item.name}`;
		case 'PRODUCT_WEIGHT_CHANGED':
			return `${item.name} ${formatDelta(item)}`;
		case 'PRODUCT_INGREDIENT_ADDED':
			return `${productIngredientPrefix(item)}新增${item.name} ${formatValue(item.after, item.unit)}${item.unit === 'GRAM' ? '/个' : ''}`;
		case 'PRODUCT_INGREDIENT_REMOVED':
			return `${productIngredientPrefix(item)}移除${item.name}`;
		case 'PRODUCT_INGREDIENT_AMOUNT_CHANGED':
			return `${productIngredientPrefix(item)}${item.name} ${formatDelta(item)}${item.unit === 'GRAM' ? '/个' : ''}`;
		case 'PROCEDURE_CHANGED':
			return item.scope === 'PRODUCT' ? `调整${item.name || ''}制作步骤` : '调整配方制作步骤';
		case 'FIELD_CHANGED':
			return `${fieldLabels[item.field || ''] || item.field || '字段'} ${formatDelta(item)}`;
	}
};

const formatChangeSummary = (version: RecipeVersion) => {
	const summary = version.changeSummary;
	if (!summary?.items?.length) return `创建于：${formatChineseDate(version.createdAt)}`;
	return summary.items.map(formatChangeItem).filter(Boolean).join('，');
};
</script>

<style scoped lang="scss">
/* [兼容性修复] 引入 Mixin，将列表项内容的样式应用到当前组件作用域 */
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

.title-with-tag {
	display: flex;
	align-items: center;
	gap: 10px;
}

.title-with-tag .card-title {
	margin-bottom: 0;
}

.status-tag {
	padding: 4px 12px;
	border-radius: 15px;
	font-size: 13px;
	color: white;
	font-weight: 500;

	&.active {
		background-color: #8c5a3b;
	}

	&.discontinued {
		background-color: #fee2e2;
		color: #991b1b;
	}
}

.version-summary {
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.main-info {
	flex: 1;
	min-width: 0;
	overflow: hidden;
}

.main-info .name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.side-info {
	flex: 0 0 auto;
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 5px;
	margin-left: 12px;
}

.side-info .status-tag {
	white-space: nowrap;
}

.version-date {
	font-size: 11px;
	line-height: 1;
	color: var(--text-secondary);
	white-space: nowrap;
}
</style>
