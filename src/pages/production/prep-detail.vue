<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader title="备料详情" />
		<DetailPageLayout>
			<view class="page-content">
				<template v-if="task">
					<view v-for="item in task.items" :key="item.id" class="card recipe-card">
						<view class="card-title-wrapper">
							<span class="card-title">{{ item.name }}</span>
							<span class="total-weight">总重: {{ formatWeight(item.totalWeight) }}</span>
						</view>

						<view class="recipe-table">
							<view class="table-header">
								<text class="col-ingredient">原料</text>
								<text class="col-brand">品牌</text>
								<text class="col-usage">用量</text>
							</view>
							<view v-for="(ing, index) in item.ingredients" :key="index" class="table-row"
								:class="{ 'is-added': addedIngredientsMap[item.id]?.has(ing.name) }"
								@longpress.prevent="toggleIngredientAdded(item.id, ing.name)">
								<text class="col-ingredient">{{ ing.name }}</text>
								<text class="col-brand">{{ ing.isRecipe ? '自制' : (ing.brand || '-') }}</text>
								<text class="col-usage">{{ formatWeight(ing.weightInGrams) }}</text>
							</view>
						</view>

						<view class="section-title">制作要点</view>
						<view class="procedure-list">
							<view v-for="(step, index) in item.procedure" :key="index" class="procedure-item">
								<text class="step-number">{{ index + 1 }}.</text>
								<text class="step-text">{{ step }}</text>
							</view>
						</view>
					</view>
				</template>
				<view v-else-if="isLoading" class="loading-spinner">
					<text>加载中...</text>
				</view>
			</view>
		</DetailPageLayout>
	</view>
</template>

<script setup lang="ts">
	import { ref, reactive } from 'vue';
	import { onLoad } from '@dcloudio/uni-app';
	import type { PrepTask } from '@/types/api';
	import DetailPageLayout from '@/components/DetailPageLayout.vue';
	import DetailHeader from '@/components/DetailHeader.vue';
	import { formatWeight } from '@/utils/format';

	defineOptions({
		inheritAttrs: false
	});

	const isLoading = ref(true);
	const task = ref<PrepTask | null>(null);

	const addedIngredientsMap = reactive<Record<string, Set<string>>>({});

	const toggleIngredientAdded = (itemId : string, ingredientName : string) => {
		if (!addedIngredientsMap[itemId]) {
			addedIngredientsMap[itemId] = new Set<string>();
		}
		const addedSet = addedIngredientsMap[itemId];
		if (addedSet.has(ingredientName)) {
			addedSet.delete(ingredientName);
		} else {
			addedSet.add(ingredientName);
		}
	};

	onLoad(async (options) => {
		if (options && options.taskData) {
			try {
				const taskData = JSON.parse(decodeURIComponent(options.taskData));
				task.value = taskData as PrepTask;
			} catch (error) {
				console.error("解析前置任务数据失败:", error);
			}
		}
		isLoading.value = false;
	});
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	.page-wrapper {
		display: flex;
		flex-direction: column;
		height: 100vh;
	}

	.recipe-card {
		margin-bottom: 20px;
	}

	.card-title-wrapper {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
	}

	.total-weight {
		font-size: 14px;
		color: var(--text-secondary);
		font-weight: 400;
	}

	.recipe-table {
		display: table;
		width: 100%;
		font-size: 14px;
		border-collapse: collapse;
		margin-bottom: 15px;

		.table-header,
		.table-row {
			display: table-row;
		}

		.table-header {
			color: var(--text-secondary);
			font-weight: 500;
		}

		.table-row {
			color: var(--text-primary);
			transition: background-color 0.3s ease;
			border-bottom: 1px solid var(--border-color);
		}

		.table-row:last-child {
			border-bottom: none;
		}

		.table-row.is-added {
			background-color: #dcccc0;
		}

		[class^="col-"] {
			display: table-cell;
			padding: 10px 4px;
			vertical-align: middle;
		}

		.col-ingredient {
			min-width: 60px;
			word-break: break-word;
		}

		.col-brand {
			color: var(--text-secondary);
			min-width: 60px;
			white-space: nowrap;
			text-align: center;
		}

		.col-usage {
			text-align: right;
			white-space: nowrap;
		}

		.col-ingredient {
			width: 40%;
		}

		.col-brand {
			width: 30%;
		}

		.col-usage {
			width: 30%;
		}
	}

	.section-title {
		font-size: 12px;
		font-weight: 600;
		color: var(--primary-color);
		margin-bottom: 5px;
	}

	.procedure-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.procedure-item {
		display: flex;
		align-items: flex-start;
		font-size: 12px;
		line-height: 1.6;

		.step-number {
			color: var(--primary-color);
			font-weight: 500;
			margin-right: 8px;
		}

		.step-text {
			color: var(--text-secondary);
		}
	}
</style>