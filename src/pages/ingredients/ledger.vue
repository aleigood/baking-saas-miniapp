<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader title="库存流水" />
		<DetailPageLayout @scrolltolower="handleLoadMore">
			<view class="page-content">
				<view class="ingredient-selector-btn" @click="isSelectorVisible = true">
					<text class="selected-name">{{ selectedIngredient?.name || '请选择原料' }}</text>
					<image class="dropdown-icon" src="/static/icons/dropdown.svg" />
				</view>

				<view v-if="isLoading" class="loading-spinner">
					<text>加载中...</text>
				</view>
				<template v-else-if="selectedIngredient && ledgerEntries.length > 0">
					<view class="procurement-list">
						<view class="list-header ledger-header">
							<text class="col-date-operator">日期/操作人</text>
							<text class="col-type">类型</text>
							<text class="col-change">变动</text>
							<text class="col-details">详情</text>
						</view>
						<ListItem v-for="(entry, index) in ledgerEntries" :key="index" class="procurement-item"
							:no-padding="true" :divider="index < ledgerEntries.length - 1">
							<view class="procurement-item-content ledger-item-content">
								<view class="col-date-operator">
									<view class="details-main">{{ formatDateTime(entry.date, 'MM-DD HH:mm') }}</view>
									<view class="details-sub">{{ entry.operator }}</view>
								</view>
								<text class="col-type" :class="getTypeClass(entry.type)">{{ entry.type }}</text>
								<text class="col-change"
									:class="{ 'positive': entry.change > 0, 'negative': entry.change < 0 }">
									{{ formatWeight(entry.change) }}
								</text>
								<view class="col-details">
									<view class="details-main">{{ entry.details }}</view>
								</view>
							</view>
						</ListItem>
					</view>
					<view class="load-more-container">
						<view v-if="isLoadingMore" class="loading-spinner">加载中...</view>
						<view v-if="!hasMore && !isLoading && ledgerEntries.length > 0" class="no-more-tasks">没有更多了
						</view>
					</view>
				</template>
				<view v-else-if="selectedIngredient" class="empty-state">
					<text>暂无库存流水记录</text>
				</view>
			</view>
		</DetailPageLayout>

		<AppModal :visible="isSelectorVisible" @update:visible="isSelectorVisible = false" title="选择原料"
			:no-header-line="true">
			<view class="options-list">
				<ListItem v-for="ing in allIngredients" :key="ing.id" @click="handleIngredientSelect(ing)"
					class="option-item" :bleed="true">
					<view class="main-info">
						<view class="name">{{ ing.name }}</view>
					</view>
					<view class="side-info" v-if="selectedIngredient?.id === ing.id">
						<view class="value checkmark-icon">✓</view>
					</view>
				</ListItem>
			</view>
		</AppModal>
	</view>
</template>

<script setup lang="ts">
	import { ref, computed } from 'vue';
	import { onLoad } from '@dcloudio/uni-app';
	import { useToastStore } from '@/store/toast';
	import { useDataStore } from '@/store/data';
	import type { IngredientLedgerEntry, Ingredient } from '@/types/api';
	import { getIngredientLedger } from '@/api/ingredients';
	import { formatDateTime, formatWeight } from '@/utils/format';
	import DetailHeader from '@/components/DetailHeader.vue';
	import DetailPageLayout from '@/components/DetailPageLayout.vue';
	import ListItem from '@/components/ListItem.vue';
	import AppModal from '@/components/AppModal.vue';

	defineOptions({
		inheritAttrs: false
	});

	const isLoading = ref(false);
	const toastStore = useToastStore();
	const dataStore = useDataStore();

	const selectedIngredient = ref<Ingredient | null>(null);
	const ledgerEntries = ref<IngredientLedgerEntry[]>([]);
	const isSelectorVisible = ref(false);

	const allIngredients = computed(() => {
		if (!dataStore.ingredients) return [];
		return [...dataStore.ingredients].sort((a, b) => b.totalConsumptionInGrams - a.totalConsumptionInGrams);
	});

	const page = ref(1);
	const limit = ref(20);
	const hasMore = ref(true);
	const isLoadingMore = ref(false);

	onLoad(async () => {
		if (!dataStore.dataLoaded.ingredients) {
			await dataStore.fetchIngredientsData();
		}
		if (allIngredients.value.length > 0) {
			selectedIngredient.value = allIngredients.value[0];
			await fetchLedgerData(false);
		}
	});

	const handleIngredientSelect = (ingredient : Ingredient) => {
		if (selectedIngredient.value?.id !== ingredient.id) {
			selectedIngredient.value = ingredient;
			fetchLedgerData(false);
		}
		isSelectorVisible.value = false;
	};

	const fetchLedgerData = async (loadMore = false) => {
		if (!selectedIngredient.value) return;

		if (loadMore) {
			isLoadingMore.value = true;
		} else {
			isLoading.value = true;
			page.value = 1;
			ledgerEntries.value = [];
		}

		try {
			const response = await getIngredientLedger(selectedIngredient.value.id, page.value, limit.value);
			ledgerEntries.value.push(...response.data);
			hasMore.value = response.meta.hasMore;
		} catch (error) {
			console.error('Failed to fetch ingredient ledger:', error);
			toastStore.show({ message: '获取库存流水失败', type: 'error' });
		} finally {
			isLoading.value = false;
			isLoadingMore.value = false;
		}
	};

	const handleLoadMore = async () => {
		if (hasMore.value && !isLoadingMore.value) {
			page.value++;
			await fetchLedgerData(true);
		}
	};

	const getTypeClass = (type : IngredientLedgerEntry['type']) => {
		switch (type) {
			case '采购入库': return 'type-procurement';
			case '生产消耗': return 'type-consumption';
			case '生产损耗': return 'type-spoilage';
			case '库存调整': return 'type-adjustment';
			default: return '';
		}
	};
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';
	@include list-item-option-style;

	.page-wrapper {
		display: flex;
		flex-direction: column;
		height: 100vh;
	}

	/* [核心重构] 新的选择器按钮样式 */
	.ingredient-selector-btn {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background-color: var(--card-bg);
		padding: 0 20px;
		height: 50px;
		border-radius: 12px;
		margin-bottom: 20px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);

		.selected-name {
			font-size: 16px;
			color: var(--text-primary);
			font-weight: 500;
		}

		.dropdown-icon {
			width: 18px;
			height: 18px;
			opacity: 0.6;
		}
	}

	.procurement-list {
		.list-header {
			display: grid;
			align-items: center;
			padding: 8px 5px;
			font-size: 13px;
			font-weight: 600;
			color: var(--primary-color);
			border-bottom: 1px solid var(--border-color);
			margin-bottom: 5px;
		}

		.ledger-header {
			grid-template-columns: 2.5fr 1.8fr 1.8fr 2.5fr;
		}

		.procurement-item-content {
			display: grid;
			align-items: center;
			width: 100%;
			padding: 12px 5px;
			font-size: 13px;
			color: var(--text-secondary);
		}

		.ledger-item-content {
			grid-template-columns: 2.5fr 1.8fr 1.8fr 2.5fr;
		}

		.col-change,
		.col-type {
			text-align: center;
		}

		.col-date-operator {
			padding-left: 5px;

			.details-main {
				color: var(--text-primary);
				font-weight: 500;
			}

			.details-sub {
				font-size: 12px;
				margin-top: 2px;
			}
		}

		.col-type {
			padding: 2px 4px;
			border-radius: 4px;
			background-color: #f3f4f6;
			color: #6b7280;
			font-weight: 500;
		}

		.type-procurement {
			background-color: #e0f2f1;
			color: #00796b;
		}

		.type-consumption {
			background-color: #fff3e0;
			color: #fb8c00;
		}

		.type-spoilage {
			background-color: #ffebee;
			color: #c62828;
		}

		.type-adjustment {
			background-color: #e3f2fd;
			color: #1565c0;
		}

		.col-details {
			text-align: right;
			word-break: break-all;
			padding-right: 5px;

			.details-main {
				color: var(--text-primary);
			}
		}

		.positive {
			color: #27ae60;
			font-weight: 500;
		}

		.negative {
			color: #e74c3c;
			font-weight: 500;
		}
	}

	.load-more-container {
		padding: 15px;
		text-align: center;
		color: #999;
		font-size: 14px;
	}

	.checkmark-icon {
		color: var(--primary-color);
		font-weight: bold;
		font-size: 18px;
	}
</style>