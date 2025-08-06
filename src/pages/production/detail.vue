<template>
	<view class="page-container">
		<view class="page-header">
			<view class="detail-header">
				<view class="back-btn" @click="navigateBack">&#10094;</view>
				<h2 class="detail-title">任务详情</h2>
			</view>
		</view>
		<view class="page-content" v-if="!isLoading && task">
			<view class="task-summary-card">
				<view class="title">{{ getTaskTitle(task) }}</view>
				<view class="details">{{ getTaskDetails(task) }}</view>
			</view>

			<!-- [新增] 原料用量清单 -->
			<!-- (New) Ingredient usage list -->
			<view v-for="(dough, index) in ingredientList" :key="dough.doughName" class="card">
				<view class="group-title" @click="toggleDough(dough.doughName)">
					<span>{{ dough.doughName }}</span>
					<span class="arrow" :class="{ collapsed: openDoughName !== dough.doughName }">&#10094;</span>
				</view>
				<view v-show="openDoughName === dough.doughName" class="product-list">
					<view v-for="ingredient in dough.ingredients" :key="ingredient.name" class="ingredient-item">
						<view class="product-name">{{ ingredient.name }}</view>
						<view class="quantity">{{ ingredient.amount.toFixed(1) }} g</view>
					</view>
				</view>
			</view>

			<button class="btn btn-primary btn-full-width" @click="completeTask">
				完成任务
			</button>
		</view>
		<view class="loading-spinner" v-else>
			<text>加载中...</text>
		</view>
	</view>
</template>

<script setup lang="ts">
	import { ref, computed } from 'vue';
	import { onLoad } from '@dcloudio/uni-app';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import type { ProductionTaskDto } from '@/types/api';
	import { getTask, updateTaskStatus } from '@/api/tasks';

	const userStore = useUserStore();
	const dataStore = useDataStore();

	const isLoading = ref(true);
	const task = ref<ProductionTaskDto | null>(null);
	const openDoughName = ref('');

	onLoad(async (options) => {
		const taskId = options?.taskId;
		if (!taskId) {
			uni.showToast({ title: '无效的任务ID', icon: 'none' });
			uni.navigateBack();
			return;
		}

		try {
			// 获取任务详情
			task.value = await getTask(taskId);

			// 如果任务是待开始，则更新为进行中
			if (task.value?.status === 'PENDING') {
				await updateTaskStatus(taskId, 'IN_PROGRESS');
				// 刷新列表页数据
				dataStore.fetchProductionData();
			}

			// 默认展开第一个面团
			if (ingredientList.value.length > 0) {
				openDoughName.value = ingredientList.value[0].doughName;
			}

		} catch (error) {
			console.error('Failed to load task details:', error);
			uni.showToast({ title: '加载失败', icon: 'none' });
		} finally {
			isLoading.value = false;
		}
	});

	// [新增] 计算原料用量清单
	// (New) Compute ingredient usage list
	const ingredientList = computed(() => {
		if (!task.value) return [];

		const doughConsumptions = new Map<string, { name : string, amount : number }[]>();

		task.value.items.forEach(item => {
			const product = item.product;
			if (!product || !product.recipeVersion || !product.recipeVersion.doughs) return;

			product.recipeVersion.doughs.forEach(dough => {
				if (!doughConsumptions.has(dough.name)) {
					doughConsumptions.set(dough.name, []);
				}
				const ingredientsInDough = doughConsumptions.get(dough.name)!;

				const totalRatio = dough.ingredients.reduce((sum, ing) => sum + ing.ratio, 0);
				if (totalRatio === 0) return;

				const weightPerRatioPoint = product.baseDoughWeight / totalRatio;

				dough.ingredients.forEach(ingredient => {
					const weight = weightPerRatioPoint * ingredient.ratio * item.quantity;

					const existingIngredient = ingredientsInDough.find(i => i.name === ingredient.name);
					if (existingIngredient) {
						existingIngredient.amount += weight;
					} else {
						ingredientsInDough.push({ name: ingredient.name, amount: weight });
					}
				});
			});
		});

		return Array.from(doughConsumptions.entries()).map(([doughName, ingredients]) => ({
			doughName,
			ingredients,
		}));
	});

	const toggleDough = (doughName : string) => {
		if (openDoughName.value === doughName) {
			openDoughName.value = ''; // 如果已打开，则关闭
		} else {
			openDoughName.value = doughName; // 否则，打开这个并关闭其他
		}
	};

	const completeTask = async () => {
		if (!task.value) return;
		uni.showLoading({ title: '正在完成...' });
		try {
			await updateTaskStatus(task.value.id, 'COMPLETED');
			uni.hideLoading();
			uni.showToast({ title: '任务已完成', icon: 'success' });
			await dataStore.fetchProductionData();
			uni.navigateBack();
		} catch (error) {
			uni.hideLoading();
			console.error('Failed to complete task:', error);
		}
	};

	const getTaskTitle = (task : ProductionTaskDto) => {
		if (!task.items || task.items.length === 0) return '未知任务';
		return task.items.map(item => `${item.product.name} x${item.quantity}`).join('、');
	};

	const getTotalQuantity = (task : ProductionTaskDto) => {
		if (!task.items) return 0;
		return task.items.reduce((sum, item) => sum + item.quantity, 0);
	};

	const getTaskDetails = (task : ProductionTaskDto) => {
		const date = new Date(task.plannedDate);
		const formattedDate = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
		const creator = userStore.userInfo?.name || userStore.userInfo?.phone || '创建人';
		const totalQuantity = getTotalQuantity(task);
		return `${formattedDate} - by ${creator} | 计划总数: ${totalQuantity}`;
	};

	const navigateBack = () => {
		uni.navigateBack();
	};
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	.task-summary-card {
		background: var(--card-bg);
		padding: 20px;
		border-radius: 20px;
		margin-bottom: 20px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
	}

	.title {
		font-size: 20px;
		font-weight: 600;
		margin-bottom: 8px;
	}

	.details {
		color: var(--text-secondary);
		font-size: 14px;
	}

	.group-title {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary);
		padding: 0 5px 15px 5px;
		border-bottom: 1px solid var(--border-color);
	}

	.arrow {
		font-size: 14px;
		color: var(--text-secondary);
		transform: rotate(90deg);
		transition: transform 0.3s ease;
	}

	.arrow.collapsed {
		transform: rotate(-90deg);
	}

	.product-list {
		padding-top: 10px;
	}

	.ingredient-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 5px;
		font-size: 15px;
	}

	.quantity {
		color: var(--text-primary);
		font-weight: 500;
	}
</style>