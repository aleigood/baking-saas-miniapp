<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader :title="pageTitle" />
		<DetailPageLayout @scrolltolower="handleLoadMore">
			<view class="page-content">
				<view v-if="isLoading && records.length === 0" class="loading-spinner">
					<text>加载中...</text>
				</view>

				<template v-else>
					<view v-if="records.length > 0" class="ledger-list">
						<ListItem v-for="record in records" :key="record.id" card-mode>
							<view class="ledger-item">
								<view class="main-info">
									<view class="name">{{ formatWeight(record.quantityInGrams) }}</view>
									<view class="desc">{{ getTaskProductsText(record) }}</view>
									<view class="desc">{{ formatDateTime(record.date) }} · 任务 #{{ record.taskId.slice(0, 8) }}</view>
								</view>
								<view class="side-info">
									<view class="value">{{ getSkuText(record) }}</view>
								</view>
							</view>
						</ListItem>
					</view>

					<EmptyState v-else icon="/static/icons/empty-list.svg" title="暂无消耗记录" subtitle="完成生产任务后会在这里记录原料消耗" />

					<view class="load-more-container">
						<view v-if="isLoadingMore" class="loading-spinner">加载中...</view>
						<view v-else-if="!hasMore && records.length > 0" class="no-more">没有更多了</view>
					</view>
				</template>
			</view>
		</DetailPageLayout>
	</view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getIngredientConsumptionLedger } from '@/api/ingredients';
import type { IngredientConsumptionLedgerEntry } from '@/types/api';
import DetailHeader from '@/components/DetailHeader.vue';
import DetailPageLayout from '@/components/DetailPageLayout.vue';
import ListItem from '@/components/ListItem.vue';
import EmptyState from '@/components/EmptyState.vue';
import { formatDateTime, formatWeight } from '@/utils/format';

defineOptions({
	inheritAttrs: false
});

const ingredientId = ref('');
const ingredientName = ref('');
const records = ref<IngredientConsumptionLedgerEntry[]>([]);
const isLoading = ref(false);
const isLoadingMore = ref(false);
const page = ref(1);
const limit = 20;
const hasMore = ref(true);

const pageTitle = computed(() => (ingredientName.value ? `${ingredientName.value}消耗流水` : '消耗流水'));

const loadRecords = async (append = false) => {
	if (!ingredientId.value) return;
	if (append) {
		if (!hasMore.value || isLoadingMore.value) return;
		isLoadingMore.value = true;
	} else {
		isLoading.value = true;
		page.value = 1;
		hasMore.value = true;
	}

	try {
		const response = await getIngredientConsumptionLedger(ingredientId.value, {
			page: page.value,
			limit
		});
		records.value = append ? [...records.value, ...response.data] : response.data;
		hasMore.value = response.meta.hasMore;
		if (response.meta.hasMore) {
			page.value += 1;
		}
	} catch (error) {
		console.error('Failed to load ingredient consumption ledger:', error);
	} finally {
		isLoading.value = false;
		isLoadingMore.value = false;
	}
};

const handleLoadMore = () => {
	loadRecords(true);
};

const getTaskProductsText = (record: IngredientConsumptionLedgerEntry) => {
	if (!record.taskProducts.length) return '未知任务';
	return record.taskProducts.map((item) => `${item.name} x${item.quantity}`).join('、');
};

const getSkuText = (record: IngredientConsumptionLedgerEntry) => {
	if (!record.sku) return '无规格';
	return record.sku.brand ? `${record.sku.brand} ${record.sku.specName}` : record.sku.specName;
};

onLoad((options) => {
	ingredientId.value = options?.ingredientId || '';
	ingredientName.value = options?.name ? decodeURIComponent(options.name) : '';
	loadRecords(false);
});
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
@include list-item-content-style;

.page-wrapper {
	display: flex;
	flex-direction: column;
	height: 100vh;
}

.ledger-list {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.ledger-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	gap: 12px;
}

.main-info {
	min-width: 0;
}

.side-info {
	max-width: 96px;
	text-align: right;
}

.side-info .value {
	font-size: 13px;
	color: var(--text-secondary);
	white-space: normal;
	word-break: break-word;
}

.load-more-container {
	padding: 14px 0 4px;
	text-align: center;
}

.no-more {
	font-size: 13px;
	color: var(--text-secondary);
}
</style>
