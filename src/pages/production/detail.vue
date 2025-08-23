<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader title="任务详情" />
		<DetailPageLayout>
			<view class="page-content" v-if="!isLoading && task">
				<view class="detail-page">
					<view class="tag-group">
						<span class="tag">日期: {{ formattedDate }}</span>
						<span class="tag">创建人: {{ creatorName }}</span>
						<span class="tag">计划总数: {{ totalQuantity }}</span>
					</view>

					<view v-if="task.stockWarning" class="card warning-card">
						<view class="warning-content">
							<text class="warning-text">{{ task.stockWarning }}</text>
						</view>
					</view>

					<view class="task-summary-card">
						<view class="product-grid-title">产品列表</view>
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

					<view v-if="task.prepTask" class="prep-task-button-container">
						<AppButton type="secondary" full-width @click="showPrepTaskModal = true">
							查看备料清单
						</AppButton>
					</view>

					<AppButton type="primary" full-width @click="openCompleteTaskModal">
						完成任务
					</AppButton>
				</view>
			</view>
			<view class="loading-spinner" v-else>
				<text>加载中...</text>
			</view>
		</DetailPageLayout>

		<AppModal v-model:visible="showCompleteTaskModal" title="确认完成任务">
			<view class="modal-prompt-text">
				您确定要完成这个任务吗？
			</view>
			<view class="modal-warning-text">
				完成后，将根据配方用量自动扣减原料库存。
			</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showCompleteTaskModal = false">取消</AppButton>
				<AppButton type="primary" @click="handleConfirmCompleteTask" :loading="isSubmitting">
					{{ isSubmitting ? '完成中...' : '确认完成' }}
				</AppButton>
			</view>
		</AppModal>

		<AppModal v-model:visible="showPrepTaskModal" title="备料清单" size="large">
			<scroll-view scroll-y class="prep-task-modal-content">
				<view v-if="task && task.prepTask">
					<view v-for="item in task.prepTask.items" :key="item.id" class="card recipe-card">
						<view class="card-title-wrapper">
							<span class="card-title">{{ item.name }}</span>
							<span class="total-weight">总重: {{ (item.totalWeight / 1000).toFixed(2) }} kg</span>
						</view>

						<view class="content-section">
							<view class="section-title">原料清单</view>
							<view class="ingredient-list">
								<view v-for="(ing, index) in item.ingredients" :key="index"
									class="ingredient-item-modal">
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
				</view>
			</scroll-view>
		</AppModal>
	</view>
</template>

<script setup lang="ts">
	import { ref, computed } from 'vue';
	import { onLoad } from '@dcloudio/uni-app';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import { useToastStore } from '@/store/toast';
	import type { ProductionTaskDetailDto } from '@/types/api';
	import { getTaskDetail, updateTaskStatus, completeTask } from '@/api/tasks';
	import AppModal from '@/components/AppModal.vue';
	import AppButton from '@/components/AppButton.vue';
	import DetailHeader from '@/components/DetailHeader.vue';
	import DetailPageLayout from '@/components/DetailPageLayout.vue';

	defineOptions({
		inheritAttrs: false
	});

	const userStore = useUserStore();
	const dataStore = useDataStore();
	const toastStore = useToastStore();

	const isLoading = ref(true);
	const isSubmitting = ref(false);
	const task = ref<ProductionTaskDetailDto | null>(null);
	const openCardName = ref('');
	const showCompleteTaskModal = ref(false);
	const showPrepTaskModal = ref(false);

	onLoad(async (options) => {
		const taskId = options?.taskId;
		if (!taskId) {
			toastStore.show({ message: '无效的任务ID', type: 'error' });
			uni.navigateBack();
			return;
		}

		try {
			const response = await getTaskDetail(taskId);
			if ('items' in response) {
				task.value = response as ProductionTaskDetailDto;
			}


			if (task.value?.status === 'PENDING') {
				await dataStore.fetchProductionData();
			}

			if (recipeCards.value.length > 0) {
				openCardName.value = recipeCards.value[0].recipeName;
			}

		} catch (error) {
			console.error('Failed to load task details:', error);
		} finally {
			isLoading.value = false;
		}
	});

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

	const recipeCards = computed(() => {
		if (!task.value) return [];

		const recipeConsumptions = new Map<string, Map<string, number>>();

		task.value.items.forEach(item => {
			const product = item.product;
			if (!product || !product.recipeVersion || !product.recipeVersion.doughs) return;

			const recipeName = product.recipeVersion.family.name;
			if (!recipeConsumptions.has(recipeName)) {
				recipeConsumptions.set(recipeName, new Map<string, number>());
			}
			const ingredientsMap = recipeConsumptions.get(recipeName)!;

			product.recipeVersion.doughs.forEach(dough => {
				let totalFlourRatio = 0;
				dough.ingredients.forEach(ing => {
					if (ing.ingredient.isFlour) {
						totalFlourRatio += ing.ratio;
					}
				});
				if (totalFlourRatio === 0) totalFlourRatio = 100;

				const weightPerRatioPoint = product.baseDoughWeight / totalFlourRatio;

				dough.ingredients.forEach(ingredient => {
					const weight = weightPerRatioPoint * ingredient.ratio * item.quantity;
					const ingredientName = ingredient.ingredient.name;
					const currentWeight = ingredientsMap.get(ingredientName) || 0;
					ingredientsMap.set(ingredientName, currentWeight + weight);
				});
			});
		});

		return Array.from(recipeConsumptions.entries()).map(([recipeName, ingredientsMap]) => ({
			recipeName,
			ingredients: Array.from(ingredientsMap.entries()).map(([name, amount]) => ({
				name,
				amount,
			})),
		}));
	});

	const toggleCard = (recipeName : string) => {
		if (openCardName.value === recipeName) {
			openCardName.value = '';
		} else {
			openCardName.value = recipeName;
		}
	};

	const openCompleteTaskModal = () => {
		showCompleteTaskModal.value = true;
	};

	const handleConfirmCompleteTask = async () => {
		if (!task.value) return;
		isSubmitting.value = true;
		try {
			await completeTask(task.value.id, { notes: '' });
			toastStore.show({ message: '任务已完成', type: 'success' });
			await dataStore.fetchProductionData();
			uni.navigateBack();
		} catch (error) {
			console.error('Failed to complete task:', error);
		} finally {
			isSubmitting.value = false;
			showCompleteTaskModal.value = false;
		}
	};

	const getTotalQuantity = (task : ProductionTaskDetailDto) => {
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
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	.page-wrapper {
		display: flex;
		flex-direction: column;
		height: 100vh;
	}

	.detail-page .tag-group {
		margin-bottom: 20px;
		padding: 0px;
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
	}

	.tag {
		white-space: normal;
		text-align: left;
		line-height: 1.5;
	}

	/* [核心修改] 更新警告卡片的样式 */
	.warning-card {
		background-color: #faedcd; // 设置背景色
		border: none; // 移除边框
		padding: 15px;
		margin-bottom: 20px;
		color: var(--primary-color); // 设置文字颜色
	}

	.warning-content {
		display: flex;
		align-items: center;
	}

	.warning-text {
		font-size: 14px;
		line-height: 1.6;
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
		grid-template-columns: 1fr 1fr 1fr;
		gap: 8px 12px;
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

	.modal-prompt-text {
		font-size: 16px;
		color: var(--text-primary);
		text-align: center;
		margin-bottom: 10px;
	}

	.modal-warning-text {
		font-size: 13px;
		color: var(--text-secondary);
		text-align: center;
		margin-bottom: 20px;
		line-height: 1.5;
	}

	.prep-task-button-container {
		margin-bottom: 15px;
	}

	.prep-task-modal-content {
		max-height: 70vh;
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

	.ingredient-item-modal {
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