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
			</view>
		</DetailPageLayout>
	</view>
</template>

<script setup lang="ts">
	import { ref } from 'vue';
	import { onLoad } from '@dcloudio/uni-app';
	// [移除] 不再需要调用 API
	// import { getTaskDetail } from '@/api/tasks';
	import type { PrepTask } from '@/types/api';
	import DetailPageLayout from '@/components/DetailPageLayout.vue';
	import DetailHeader from '@/components/DetailHeader.vue';

	defineOptions({
		inheritAttrs: false
	});

	const isLoading = ref(true);
	const task = ref<PrepTask | null>(null);

	// [修改] 优化数据加载逻辑，直接从页面参数获取
	onLoad(async (options) => {
		if (options && options.taskData) {
			try {
				// 从 URL 参数中解析出 task 对象
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

	/* [核心新增] 6. 增加页面布局所需的核心样式 */
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