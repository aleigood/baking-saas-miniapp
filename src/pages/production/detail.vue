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

					<view class="card-full-bleed-list">
						<view class="card-title-wrapper">
							<span class="card-title">产品列表</span>
						</view>
						<ListItem v-for="(dough, index) in groupedDoughs" :key="dough.familyId"
							class="product-list-item" :selected="selectedDoughFamilyId === dough.familyId"
							@click="selectDough(dough.familyId)" :bleed="true"
							:divider="index < groupedDoughs.length - 1">
							<view class="main-info">
								<view class="name">{{ dough.familyName }}</view>
								<view class="desc">{{ dough.productsDescription }}</view>
							</view>
						</ListItem>
					</view>

					<view v-if="!isStarted" class="start-task-button-container">
						<AppButton type="primary" full-width @click="handleStartTask">
							开始制作
						</AppButton>
					</view>

					<view v-if="isStarted && selectedDoughIngredients" class="card">
						<view class="card-title">{{ selectedDough?.familyName }} 原料清单</view>
						<view class="product-list">
							<view v-for="ingredient in selectedDoughIngredients" :key="ingredient.name"
								class="ingredient-item">
								<view class="product-name">{{ ingredient.name }}</view>
								<view class="quantity">{{ ingredient.amount.toFixed(1) }} g</view>
							</view>
						</view>
					</view>

					<view class="bottom-actions-container">
						<AppButton v-if="isStarted" type="primary" full-width @click="openCompleteTaskModal">
							完成任务
						</AppButton>
					</view>
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
	import ListItem from '@/components/ListItem.vue';

	defineOptions({
		inheritAttrs: false
	});

	const userStore = useUserStore();
	const dataStore = useDataStore();
	const toastStore = useToastStore();

	const isLoading = ref(true);
	const isSubmitting = ref(false);
	const task = ref<ProductionTaskDetailDto | null>(null);
	const showCompleteTaskModal = ref(false);

	const isStarted = ref(false);
	// [核心改造] 状态名变更为 selectedDoughFamilyId
	const selectedDoughFamilyId = ref<string | null>(null);

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
				if (task.value.status === 'IN_PROGRESS' || task.value.status === 'COMPLETED') {
					isStarted.value = true;
					// [核心新增] 如果任务已在进行中，默认选中第一个面团
					if (groupedDoughs.value.length > 0) {
						selectedDoughFamilyId.value = groupedDoughs.value[0].familyId;
					}
				}
			}
		} catch (error) {
			console.error('Failed to load task details:', error);
		} finally {
			isLoading.value = false;
		}
	});

	const handleStartTask = async () => {
		if (!task.value) return;
		try {
			await updateTaskStatus(task.value.id, 'IN_PROGRESS');
			isStarted.value = true;
			task.value.status = 'IN_PROGRESS';
			toastStore.show({ message: '任务已开始', type: 'success' });
			await dataStore.fetchProductionData();

			// [核心新增] 开始任务后，默认选中第一个面团
			if (groupedDoughs.value.length > 0) {
				selectedDoughFamilyId.value = groupedDoughs.value[0].familyId;
			}
		} catch (error) {
			console.error('Failed to start task:', error);
		}
	};

	// [核心改造] 方法名和逻辑更新为处理面团（配方族）的选择
	const selectDough = (familyId : string) => {
		if (selectedDoughFamilyId.value === familyId) {
			selectedDoughFamilyId.value = null;
		} else {
			selectedDoughFamilyId.value = familyId;
		}
	};

	// [核心改造] 新的计算属性，用于将任务项按面团（配方族）分组
	const groupedDoughs = computed(() => {
		if (!task.value || !task.value.items) return [];

		const doughsMap = new Map<string, { familyName : string; products : any[] }>();

		task.value.items.forEach(item => {
			const familyId = item.product.recipeVersion.family.id;
			const familyName = item.product.recipeVersion.family.name;

			if (!doughsMap.has(familyId)) {
				doughsMap.set(familyId, { familyName, products: [] });
			}
			doughsMap.get(familyId)!.products.push({
				...item.product,
				quantity: item.quantity,
			});
		});

		return Array.from(doughsMap.entries()).map(([familyId, data]) => ({
			familyId,
			familyName: data.familyName,
			// 生成产品描述字符串，例如："熊掌卡仕达 x30, 小吐司 x12"
			productsDescription: data.products.map(p => `${p.name} x${p.quantity}`).join(', '),
		}));
	});

	// [核心改造] 新的计算属性，用于获取当前选中的面团对象
	const selectedDough = computed(() => {
		if (!selectedDoughFamilyId.value) return null;
		return groupedDoughs.value.find(d => d.familyId === selectedDoughFamilyId.value);
	});

	// [核心改造] 计算属性现在基于选中的面团（配方族）来计算总原料
	const selectedDoughIngredients = computed(() => {
		if (!task.value || !selectedDoughFamilyId.value) return null;

		// 找到属于当前选中面团的所有任务项
		const itemsForSelectedDough = task.value.items.filter(
			item => item.product.recipeVersion.family.id === selectedDoughFamilyId.value
		);

		if (itemsForSelectedDough.length === 0) return [];

		const ingredientsMap = new Map<string, number>();

		itemsForSelectedDough.forEach(item => {
			const product = item.product;
			if (!product || !product.recipeVersion || !product.recipeVersion.doughs) return;

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

		return Array.from(ingredientsMap.entries()).map(([name, amount]) => ({
			name,
			amount,
		}));
	});

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
	@include list-item-content-style;

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

	.warning-card {
		background-color: #faedcd;
		border: none;
		padding: 15px;
		margin-bottom: 20px;
		color: var(--primary-color);
	}

	.warning-content {
		display: flex;
		align-items: center;
	}

	.warning-text {
		font-size: 14px;
		line-height: 1.6;
	}

	.card-full-bleed-list {
		background: var(--card-bg);
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
		border-radius: 20px;
		margin-bottom: 20px;
		padding-top: 20px;
		padding-bottom: 10px;
	}

	.card-full-bleed-list .card-title-wrapper {
		padding-left: 20px;
		padding-right: 20px;
		margin-bottom: 10px;
	}

	/* [核心改造] 移除 group 相关样式，直接对 ListItem 进行样式调整 */
	.product-list-item .main-info .name {
		font-weight: 500;
	}

	.product-list-item .main-info .desc {
		margin-top: 4px;
		/* 增加描述和名称的间距 */
	}

	.start-task-button-container {
		margin-top: 10px;
		margin-bottom: 20px;
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

	.bottom-actions-container {
		margin-top: 20px;
	}
</style>