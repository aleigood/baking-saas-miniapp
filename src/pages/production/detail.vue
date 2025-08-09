<template>
	<view class="page-container">
		<view class="page-header">
			<view class="detail-header">
				<view class="back-btn" @click="navigateBack">&#10094;</view>
				<h2 class="detail-title">任务详情</h2>
			</view>
		</view>
		<view class="page-content" v-if="!isLoading && task">
			<!-- [核心修改] 将详情信息用标签形式展示在页面顶部 -->
			<view class="detail-page">
				<view class="tag-group">
					<span class="tag">日期: {{ formattedDate }}</span>
					<span class="tag">创建人: {{ creatorName }}</span>
					<span class="tag">计划总数: {{ totalQuantity }}</span>
				</view>

				<view class="task-summary-card">
					<view class="product-grid-title">产品列表</view>
					<!-- [核心修改] 按配方大类对产品进行分组展示 -->
					<view v-for="group in groupedProducts" :key="group.familyName" class="product-group">
						<view class="product-group-title">{{ group.familyName }}</view>
						<view class="product-grid">
							<view v-for="product in group.products" :key="product.id" class="product-grid-item">
								{{ product.name }} x{{ product.quantity }}
							</view>
						</view>
					</view>
				</view>

				<view v-for="(recipeCard) in recipeCards" :key="recipeCard.recipeName" class="card">
					<view class="group-title" @click="toggleCard(recipeCard.recipeName)">
						<span>{{ recipeCard.recipeName }}</span>
						<span class="arrow"
							:class="{ collapsed: openCardName !== recipeCard.recipeName }">&#10094;</span>
					</view>
					<view v-show="openCardName === recipeCard.recipeName" class="product-list">
						<view v-for="ingredient in recipeCard.ingredients" :key="ingredient.name"
							class="ingredient-item">
							<view class="product-name">{{ ingredient.name }}</view>
							<view class="quantity">{{ ingredient.amount.toFixed(1) }} g</view>
						</view>
					</view>
				</view>

				<button class="btn btn-primary btn-full-width" @click="handleCompleteTask">
					完成任务
				</button>
			</view>
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
	// [核心修正] 引入 completeTask 并移除 updateTaskStatus
	import { getTask, updateTaskStatus, completeTask } from '@/api/tasks';

	const userStore = useUserStore();
	const dataStore = useDataStore();

	const isLoading = ref(true);
	const task = ref<ProductionTaskDto | null>(null);
	// [修改] 将 openDoughName 修改为 openCardName 以适应新的卡片逻辑
	const openCardName = ref('');

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

			// [修改] 默认展开第一个卡片
			if (recipeCards.value.length > 0) {
				openCardName.value = recipeCards.value[0].recipeName;
			}

		} catch (error) {
			console.error('Failed to load task details:', error);
			uni.showToast({ title: '加载失败', icon: 'none' });
		} finally {
			isLoading.value = false;
		}
	});

	// [核心新增] 新的计算属性，用于按配方大类对产品进行分组
	const groupedProducts = computed(() => {
		if (!task.value || !task.value.items) {
			return [];
		}

		const groups = new Map<string, {
			id : string;
			name : string;
			quantity : number
		}[]>();

		task.value.items.forEach(item => {
			const familyName = item.product.recipeVersion.family.name;
			if (!groups.has(familyName)) {
				groups.set(familyName, []);
			}
			groups.get(familyName)!.push({
				id: item.product.id,
				name: item.product.name,
				quantity: item.quantity
			});
		});

		return Array.from(groups.entries()).map(([familyName, products]) => ({
			familyName,
			products
		}));
	});

	// [核心重构] 计算按配方分组的原料用量清单
	const recipeCards = computed(() => {
		if (!task.value) return [];

		// 使用 Map 存储每个配方的原料用量，Key 为配方名
		const recipeConsumptions = new Map<string, Map<string, number>>();

		// 遍历任务中的每一个产品项
		task.value.items.forEach(item => {
			const product = item.product;
			// 确保产品和其配方版本信息存在
			if (!product || !product.recipeVersion || !product.recipeVersion.doughs) return;

			// 获取配方家族名称作为卡片标题
			const recipeName = product.recipeVersion.family.name;
			if (!recipeConsumptions.has(recipeName)) {
				recipeConsumptions.set(recipeName, new Map<string, number>());
			}
			const ingredientsMap = recipeConsumptions.get(recipeName)!;

			// 遍历配方中的每一个面团定义
			product.recipeVersion.doughs.forEach(dough => {
				// 计算总粉量对应的基础重量
				// 注意：这里假设所有 isFlour=true 的原料比例总和为100%
				let totalFlourRatio = 0;
				dough.ingredients.forEach(ing => {
					if (ing.isFlour) {
						totalFlourRatio += ing.ratio;
					}
				});
				if (totalFlourRatio === 0) totalFlourRatio = 100; // 防止除零错误

				// 计算每1%的比例对应的克重
				const weightPerRatioPoint = product.baseDoughWeight / totalFlourRatio;

				// 遍历面团中的每一种原料
				dough.ingredients.forEach(ingredient => {
					// 计算该原料在单个产品中的重量，并乘以任务数量
					const weight = weightPerRatioPoint * ingredient.ratio * item.quantity;

					// 累加到Map中
					const currentWeight = ingredientsMap.get(ingredient.name) || 0;
					ingredientsMap.set(ingredient.name, currentWeight + weight);
				});
			});
		});

		// 将 Map 结构转换为模板所需的数组结构
		return Array.from(recipeConsumptions.entries()).map(([recipeName, ingredientsMap]) => ({
			recipeName,
			ingredients: Array.from(ingredientsMap.entries()).map(([name, amount]) => ({
				name,
				amount,
			})),
		}));
	});

	// [新增] 卡片折叠/展开的函数
	const toggleCard = (recipeName : string) => {
		if (openCardName.value === recipeName) {
			openCardName.value = ''; // 如果已打开，则关闭
		} else {
			openCardName.value = recipeName; // 否则，打开这个并关闭其他
		}
	};


	const handleCompleteTask = async () => {
		if (!task.value) return;
		uni.showLoading({ title: '正在完成...' });
		try {
			// [核心修正] 调用正确的 completeTask 接口，而不是 updateTaskStatus
			await completeTask(task.value.id, { notes: '' });
			uni.hideLoading();
			uni.showToast({ title: '任务已完成', icon: 'success' });
			await dataStore.fetchProductionData();
			uni.navigateBack();
		} catch (error) {
			uni.hideLoading();
			console.error('Failed to complete task:', error);
		}
	};

	// [核心修改] 将 getTaskDetails 拆分为独立的计算属性
	const getTotalQuantity = (task : ProductionTaskDto) => {
		if (!task.items) return 0;
		return task.items.reduce((sum, item) => sum + item.quantity, 0);
	};

	const formattedDate = computed(() => {
		if (!task.value) return '';
		const date = new Date(task.value.plannedDate);
		return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
	});

	const creatorName = computed(() => {
		if (!task.value) return '';
		return userStore.userInfo?.name || userStore.userInfo?.phone || '创建人';
	});

	const totalQuantity = computed(() => {
		if (!task.value) return 0;
		return getTotalQuantity(task.value);
	});

	const navigateBack = () => {
		uni.navigateBack();
	};
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	/* [核心新增] 与其他详情页一致的样式 */
	.detail-page .tag-group {
		margin-bottom: 20px;
		padding: 0 5px;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.task-summary-card {
		background: var(--card-bg);
		padding: 20px;
		border-radius: 20px;
		margin-bottom: 20px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
	}

	.product-grid-title {
		font-size: 18px;
		font-weight: 600;
		margin-bottom: 12px;
		color: var(--text-primary);
		padding-bottom: 12px;
		border-bottom: 1px solid var(--border-color);
	}

	/* [核心新增] 产品分组样式 */
	.product-group {
		margin-bottom: 15px;

		&:last-child {
			margin-bottom: 0;
		}
	}

	.product-group-title {
		font-size: 15px;
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: 8px;
	}

	.product-grid {
		display: grid;
		/* [核心修改] 将两列布局改为三列布局 */
		grid-template-columns: 1fr 1fr 1fr;
		gap: 8px 12px;
		/* 行间距和列间距 */
	}

	.product-grid-item {
		font-size: 14px;
		color: var(--text-secondary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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