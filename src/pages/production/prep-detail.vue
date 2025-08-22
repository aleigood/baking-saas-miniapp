<template>
	<DetailPageLayout>
		<template v-if="task">
			<view v-for="item in task.items" :key="item.id" class="card recipe-card">
				<view class="card-title-wrapper">
					<span class="card-title">{{ item.name }}</span>
					<span class="total-weight">总重: {{ (item.totalWeight / 1000).toFixed(2) }} kg</span>
				</view>

				<view class="content-section">
					<view class="section-title">原料清单</view>
					<view class="ingredient-list">
						<view v-for="(ing, index) in item.ingredients" :key="index" class="ingredient-item">
							<text class="name">{{ ing.name }}</text>
							<text class="weight">{{ ing.weightInGrams.toFixed(1) }} g</text>
						</view>
					</view>
				</view>

				<view v-if="item.procedure && item.procedure.length > 0" class="content-section">
					<view class="section-title">制作要点</view>
					<view class="procedure-list">
						<view v-for="(step, index) in item.procedure" :key="index" class="procedure-item">
							<text class="step-number">{{ index + 1 }}.</text>
							<text class="step-text">{{ step }}</text>
						</view>
					</view>
				</view>
			</view>
		</template>
		<view v-else-if="isLoading" class="loading-spinner">
			<text>加载中...</text>
		</view>
	</DetailPageLayout>
</template>

<script setup lang="ts">
	import { ref } from 'vue';
	import { onLoad } from '@dcloudio/uni-app';
	import { getTaskDetail } from '@/api/tasks';
	import type { PrepTask, ProductionTaskDetailDto } from '@/types/api';
	import DetailPageLayout from '@/components/DetailPageLayout.vue';

	const isLoading = ref(true);
	const task = ref<PrepTask | null>(null);

	// [新增] 一个类型守卫函数，用于判断返回的数据是否为 PrepTask
	// (New) A type guard function to determine if the returned data is of type PrepTask
	function isPrepTask(task : PrepTask | ProductionTaskDetailDto) : task is PrepTask {
		return 'title' in task && task.id === 'prep-task-01';
	}

	onLoad(async () => {
		try {
			// 使用固定的ID来获取前置任务详情
			const response = await getTaskDetail('prep-task-01');
			// [修复] 使用更严谨的类型守卫函数来确保类型正确
			// (Fix) Use a more robust type guard function to ensure type correctness
			if (isPrepTask(response)) {
				task.value = response;
			}
		} catch (error) {
			console.error("Failed to fetch prep task detail:", error);
		} finally {
			isLoading.value = false;
		}
	});
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

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

	.content-section {
		margin-top: 20px;
		padding-top: 20px;
		border-top: 1px solid var(--border-color);
	}

	.section-title {
		font-size: 16px;
		font-weight: 500;
		color: var(--text-primary);
		margin-bottom: 15px;
	}

	.ingredient-list {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 12px 20px;
	}

	.ingredient-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 15px;

		.name {
			color: var(--text-secondary);
		}

		.weight {
			color: var(--text-primary);
			font-weight: 500;
		}
	}

	.procedure-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.procedure-item {
		display: flex;
		align-items: flex-start;
		font-size: 15px;
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