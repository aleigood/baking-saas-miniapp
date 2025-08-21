<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<!-- 页面头部，显示原料名称和“库存流水”标题 -->
		<DetailHeader :title="`${ingredientName} - 库存流水`" />
		<DetailPageLayout>
			<view class="page-content no-horizontal-padding">
				<!-- 加载中的提示 -->
				<view v-if="isLoading" class="loading-spinner">
					<text>加载中...</text>
				</view>
				<!-- 流水列表 -->
				<template v-else-if="ledgerEntries.length > 0">
					<!-- [核心修复] 修正 class.bind 为 class -->
					<view class="procurement-list card">
						<!-- 列表头部 -->
						<view class="list-header ledger-header">
							<text class="col-date">日期</text>
							<text class="col-type">类型</text>
							<text class="col-change">变动</text>
							<text class="col-details">详情 / 操作人</text>
						</view>
						<!-- 列表项 -->
						<ListItem v-for="(entry, index) in ledgerEntries" :key="index" class="procurement-item"
							:no-padding="true" :divider="index < ledgerEntries.length - 1">
							<view class="procurement-item-content ledger-item-content">
								<text class="col-date">{{ formatDateTime(entry.date, 'MM-DD HH:mm') }}</text>
								<text class="col-type">{{ entry.type }}</text>
								<text class="col-change"
									:class="{ 'positive': entry.change > 0, 'negative': entry.change < 0 }">
									{{ (entry.change / 1000).toFixed(3) }} kg
								</text>
								<view class="col-details">
									<view class="details-main">{{ entry.details }}</view>
									<view class="details-sub">操作人: {{ entry.operator }}</view>
								</view>
							</view>
						</ListItem>
					</view>
				</template>
				<!-- 空状态提示 -->
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
	import { formatDateTime } from '@/utils/format';
	import DetailHeader from '@/components/DetailHeader.vue';
	import DetailPageLayout from '@/components/DetailPageLayout.vue';
	import ListItem from '@/components/ListItem.vue';

	// 页面状态变量
	const isLoading = ref(true);
	const ingredientName = ref('');
	const ledgerEntries = ref<IngredientLedgerEntry[]>([]);
	const toastStore = useToastStore();

	// 页面加载时触发
	onLoad(async (options) => {
		const ingredientId = options?.ingredientId;
		// 从页面参数中获取原料名称，用于标题显示
		ingredientName.value = options?.ingredientName || '原料';

		if (!ingredientId) {
			toastStore.show({ message: '无效的原料ID', type: 'error' });
			uni.navigateBack();
			return;
		}

		// 调用API获取库存流水数据
		try {
			ledgerEntries.value = await getIngredientLedger(ingredientId);
		} catch (error) {
			console.error('Failed to fetch ingredient ledger:', error);
			toastStore.show({ message: '获取库存流水失败', type: 'error' });
		} finally {
			isLoading.value = false;
		}
	});
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	.page-wrapper {
		display: flex;
		flex-direction: column;
		height: 100vh;
	}

	.card {
		margin-left: 15px;
		margin-right: 15px;
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
			grid-template-columns: 1.8fr 2fr 1.5fr 3fr;
		}

		.procurement-item-content {
			display: grid;
			align-items: center;
			width: 100%;
			padding: 8px 5px;
			font-size: 13px;
			color: var(--text-secondary);
		}

		.ledger-item-content {
			grid-template-columns: 1.8fr 2fr 1.5fr 3fr;
		}

		.col-change,
		.col-type {
			text-align: center;
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
</style>