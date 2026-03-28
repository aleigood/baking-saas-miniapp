<template>
	<view class="skeleton-detail">
		<view class="card" v-if="metaCount > 0 || showChart || showTabs">
			<view v-if="showTabs" class="skeleton-block shimmer tabs-block"></view>

			<view v-if="metaCount > 0" class="meta-grid-skeleton">
				<view class="meta-item" v-for="i in metaCount" :key="i">
					<view class="skeleton-block shimmer label"></view>
					<view class="skeleton-block shimmer value"></view>
				</view>
			</view>

			<view v-if="showChart" class="skeleton-block shimmer inner-tabs-block"></view>
			<view v-if="showChart" class="skeleton-block shimmer chart-block"></view>
		</view>

		<view class="card no-padding" v-if="listCount > 0">
			<SkeletonListItem v-for="i in listCount" :key="i" :bleed="true" :divider="i < listCount" />
		</view>

		<view class="card" v-for="group in tableGroups" :key="'table-' + group">
			<view class="group-title-skeleton">
				<view class="skeleton-block shimmer title-text"></view>
				<view class="skeleton-block shimmer arrow"></view>
			</view>

			<view class="table-skeleton">
				<view class="table-header">
					<view class="skeleton-block shimmer" style="width: 30%; height: 14px"></view>
					<view class="skeleton-block shimmer" style="width: 20%; height: 14px"></view>
					<view class="skeleton-block shimmer" style="width: 20%; height: 14px"></view>
				</view>
				<view class="table-row" v-for="j in 3" :key="j">
					<view class="skeleton-block shimmer" style="width: 40%; height: 16px"></view>
					<view class="skeleton-block shimmer" style="width: 15%; height: 16px"></view>
					<view class="skeleton-block shimmer" style="width: 20%; height: 16px"></view>
				</view>
			</view>

			<view v-if="showNotes" class="notes-skeleton">
				<view class="skeleton-block shimmer" style="width: 60px; height: 14px; margin-bottom: 10px;"></view>
				<view class="skeleton-block shimmer" style="width: 100%; height: 12px; margin-bottom: 8px;"></view>
				<view class="skeleton-block shimmer" style="width: 80%; height: 12px;"></view>
			</view>
		</view>
	</view>
</template>

<script setup lang="ts">
import SkeletonListItem from '@/components/SkeletonListItem.vue';

defineProps({
	// Meta网格的数量，0代表不显示
	metaCount: { type: Number, default: 3 },
	// 是否显示顶部 Tabs
	showTabs: { type: Boolean, default: false },
	// 是否显示图表块
	showChart: { type: Boolean, default: false },
	// 中间 ListItem 列表的数量，0代表不显示
	listCount: { type: Number, default: 0 },
	// 下方智能表格组的数量，0代表不显示
	tableGroups: { type: Number, default: 1 },
	// 表格下方是否显示说明文字占位
	showNotes: { type: Boolean, default: false }
});
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';

.skeleton-detail {
	width: 100%;
}

.skeleton-block {
	background-color: #f0f2f5;
	border-radius: 4px;
}

.shimmer {
	position: relative;
	overflow: hidden;
}

.shimmer::after {
	content: '';
	position: absolute;
	top: 0;
	left: -100%;
	width: 200%;
	height: 100%;
	background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0, rgba(255, 255, 255, 0.6) 50%, rgba(255, 255, 255, 0) 100%);
	animation: shimmer-sweep 1.5s infinite linear;
}

@keyframes shimmer-sweep {
	100% { transform: translateX(100%); }
}

.card {
	background: var(--card-bg, #ffffff);
	padding: 20px;
	border-radius: 20px;
	margin-bottom: 20px;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.card.no-padding {
	padding: 0;
	overflow: hidden;
}

/* Tabs 占位 */
.tabs-block {
	width: 100%;
	height: 36px;
	border-radius: 18px;
	margin-bottom: 20px;
}

.inner-tabs-block {
	width: 60%;
	height: 32px;
	border-radius: 16px;
	margin-bottom: 15px;
	margin-left: auto;
	margin-right: auto;
}

/* Meta Grid 占位 */
.meta-grid-skeleton {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 18px 10px;
	border-radius: 12px;
	background-color: #fdf8f2;
	margin-bottom: 20px;
}

.meta-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	flex: 1;
}

.meta-item .label { width: 40px; height: 12px; }
.meta-item .value { width: 60px; height: 18px; border-radius: 6px; }

/* 图表占位 */
.chart-block {
	width: 100%;
	height: 160px;
	border-radius: 12px;
}

/* 组标题占位 */
.group-title-skeleton {
	display: flex;
	justify-content: space-between;
	align-items: center;
	background-color: #faf8f5;
	padding: 12px 15px;
	border-radius: 12px;
	margin-top: 10px;
	margin-bottom: 15px;
}

.group-title-skeleton .title-text { width: 80px; height: 16px; }
.group-title-skeleton .arrow { width: 12px; height: 12px; border-radius: 50%; }

/* 表格列占位 */
.table-skeleton { width: 100%; margin-bottom: 20px; }

.table-header {
	display: flex;
	justify-content: space-between;
	padding: 10px 0;
	border-bottom: 1px solid var(--border-color-light, #f5f5f5);
}

.table-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 15px 0;
	border-bottom: 1px solid var(--border-color-light, #f5f5f5);
}

.table-row:last-child { border-bottom: none; }

/* 说明要点占位 */
.notes-skeleton {
	background-color: #fbfbf9;
	border-radius: 12px;
	padding: 15px;
	margin-top: 10px;
}
</style>