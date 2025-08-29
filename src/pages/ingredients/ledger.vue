<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader :title="`${ingredientName} - 库存流水`" />
		<DetailPageLayout @scrolltolower="handleLoadMore">
			<view class="page-content">
				<view v-if="isLoading" class="loading-spinner">
					<text>加载中...</text>
				</view>
				<template v-else-if="ledgerEntries.length > 0">
					<view class="procurement-list">
						<view class="list-header ledger-header">
							<text class="col-date">日期</text>
							<text class="col-type">类型</text>
							<text class="col-change">变动</text>
							<text class="col-details">详情 / 操作人</text>
						</view>
						<ListItem v-for="(entry, index) in ledgerEntries" :key="index" class="procurement-item"
							:no-padding="true" :divider="index < ledgerEntries.length - 1">
							<view class="procurement-item-content ledger-item-content">
								<text class="col-date">{{ formatDateTime(entry.date, 'MM-DD HH:mm') }}</text>
								<text class="col-type" :class="getTypeClass(entry.type)">{{ entry.type }}</text>
								<text class="col-change"
									:class="{ 'positive': entry.change > 0, 'negative': entry.change < 0 }">
									{{ formatWeight(entry.change) }}
								</text>
								<view class="col-details">
									<view class="details-main">{{ entry.details }}</view>
									<view class="details-sub">操作人: {{ entry.operator }}</view>
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
				<view v-else class="empty-state">
					<text>暂无库存流水记录</text>
				</view>
			</view>
		</DetailPageLayout>
	</view>
</template>

<script setup lang="ts">
	import { ref } from 'vue';
	import { onLoad } from '@dcloudio/uni-app';
	import { useToastStore } from '@/store/toast';
	import type { IngredientLedgerEntry } from '@/types/api';
	import { getIngredientLedger } from '@/api/ingredients';
	// [核心修改] 引入新的格式化函数
	import { formatDateTime, formatWeight } from '@/utils/format';
	import DetailHeader from '@/components/DetailHeader.vue';
	import DetailPageLayout from '@/components/DetailPageLayout.vue';
	import ListItem from '@/components/ListItem.vue';

	// 页面状态变量
	const isLoading = ref(true);
	const ingredientId = ref<string | null>(null);
	const ingredientName = ref('');
	const ledgerEntries = ref<IngredientLedgerEntry[]>([]);
	const toastStore = useToastStore();

	// [核心新增] 分页相关状态
	const page = ref(1);
	const limit = ref(20); // 每页加载20条
	const hasMore = ref(true);
	const isLoadingMore = ref(false);

	// 页面加载时触发
	onLoad(async (options) => {
		ingredientId.value = options?.ingredientId || null;
		// 从页面参数中获取原料名称，用于标题显示
		ingredientName.value = options?.ingredientName || '原料';

		if (!ingredientId.value) {
			toastStore.show({ message: '无效的原料ID', type: 'error' });
			uni.navigateBack();
			return;
		}

		await fetchLedgerData(false);
	});

	// [核心新增] 获取流水数据的函数
	const fetchLedgerData = async (loadMore = false) => {
		if (!ingredientId.value) return;

		if (loadMore) {
			isLoadingMore.value = true;
		} else {
			isLoading.value = true;
			page.value = 1; // 重置页码
			ledgerEntries.value = []; // 清空现有数据
		}

		try {
			const response = await getIngredientLedger(ingredientId.value, page.value, limit.value);
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

	// [核心新增] 处理上拉加载更多的函数
	const handleLoadMore = async () => {
		if (hasMore.value && !isLoadingMore.value) {
			page.value++;
			await fetchLedgerData(true);
		}
	};

	// [核心新增] 根据流水类型返回不同的CSS类
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

	.page-wrapper {
		display: flex;
		flex-direction: column;
		height: 100vh;
	}

	// [核心修改] 移除 .card 背景，使用常规列表样式
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
			grid-template-columns: 2.2fr 1.8fr 2fr 3fr; // [调整] 调整列宽
		}

		.procurement-item-content {
			display: grid;
			align-items: center;
			width: 100%;
			padding: 12px 5px; // [调整] 增加垂直内边距
			font-size: 13px;
			color: var(--text-secondary);
		}

		.ledger-item-content {
			grid-template-columns: 2.2fr 1.8fr 2fr 3fr; // [调整] 调整列宽
		}

		.col-change,
		.col-type {
			text-align: center;
		}

		// [核心新增] 为不同类型添加颜色区分
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

			.details-main {
				color: var(--text-primary);
			}

			.details-sub {
				font-size: 12px;
				margin-top: 2px;
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

	// [核心新增] 加载更多容器样式
	.load-more-container {
		padding: 15px;
		text-align: center;
		color: #999;
		font-size: 14px;
	}
</style>