<template>
	<view class="card">
		<view class="card-title">制作记录</view>
		<view class="production-list">
			<view class="list-header">
				<text class="col-date">日期</text>
				<text class="col-details">任务/来源</text>
				<text class="col-quantity">产出量</text>
				<text class="col-operator">操作人</text>
			</view>
			<view v-if="displayedRecords && displayedRecords.length > 0">
				<ListItem v-for="(record, index) in displayedRecords" :key="index" class="production-item" :no-padding="true">
					<view class="production-item-content">
						<text class="col-date">{{ formatDateTime(record.date) }}</text>
						<text class="col-details">{{ record.details }}</text>
						<text class="col-quantity">{{ formatWeight(record.change) }}</text>
						<text class="col-operator">{{ record.operator }}</text>
					</view>
				</ListItem>
			</view>
			<view v-else class="empty-state">暂无制作记录</view>
		</view>
		<AppButton v-if="hasMoreRecords" type="text-link" @click="loadMoreRecords">加载更多</AppButton>
	</view>
</template>

<script setup lang="ts">
import { ref, computed, type PropType } from 'vue';
import type { IngredientLedgerEntry } from '@/types/api';
import { formatDateTime, formatWeight } from '@/utils/format';
import ListItem from '@/components/ListItem.vue';
import AppButton from '@/components/AppButton.vue';

const props = defineProps({
	records: {
		type: Array as PropType<IngredientLedgerEntry[]>,
		default: () => []
	}
});

const displayedCount = ref(10);

const displayedRecords = computed(() => {
	return props.records.slice(0, displayedCount.value);
});

const hasMoreRecords = computed(() => {
	return displayedCount.value < props.records.length;
});

const loadMoreRecords = () => {
	displayedCount.value += 10;
};
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';

.production-list {
	.list-header {
		display: grid;
		grid-template-columns: 1.8fr 2.2fr 1.5fr 1.5fr; /* 调整列宽比例 */
		align-items: center;
		padding: 8px 5px;
		font-size: 13px;
		font-weight: 600;
		color: var(--primary-color);
		border-bottom: 1px solid var(--border-color);
		margin-bottom: 5px;
	}

	.production-item-content {
		display: grid;
		grid-template-columns: 1.8fr 2.2fr 1.5fr 1.5fr;
		align-items: center;
		width: 100%;
		padding: 8px 5px;
		font-size: 13px;
		color: var(--text-secondary);
	}

	.col-details {
		word-break: break-all;
		padding-right: 5px;
	}

	.col-quantity,
	.col-operator {
		text-align: right;
	}
}

.empty-state {
	text-align: center;
	color: #b0a8a2;
	padding: 20px 0;
	font-size: 13px;
}
</style>
