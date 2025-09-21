<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader :title="pageTitle" />
		<DetailPageLayout>
			<view class="page-content">
				<view class="card">
					<view class="card-title">生产日期</view>
					<view class="date-picker-row">
						<view class="date-picker-item">
							<label class="date-label">开始日期</label>
							<picker mode="date" :value="taskForm.startDate" @change="onDateChange($event, 'start')">
								<view class="picker">
									{{ taskForm.startDate }}
									<view class="arrow-down"></view>
								</view>
							</picker>
						</view>
						<view class="date-picker-item">
							<label class="date-label">结束日期</label>
							<picker mode="date" :value="taskForm.endDate" :start="taskForm.startDate" @change="onDateChange($event, 'end')">
								<view class="picker">
									{{ taskForm.endDate }}
									<view class="arrow-down"></view>
								</view>
							</picker>
						</view>
					</view>
				</view>

				<view class="card">
					<view class="card-title">产品数量</view>
					<view class="summary-card">
						<view v-if="summaryGroups.length > 0" class="summary-content">
							<view v-for="(group, groupIndex) in summaryGroups" :key="groupIndex" class="summary-group">
								<text class="summary-group-title">{{ group.name }}:</text>
								<view class="summary-items-wrapper">
									<view v-for="(item, itemIndex) in group.items" :key="itemIndex" class="summary-item">
										{{ item }}
										<span v-if="itemIndex < group.items.length - 1">、</span>
									</view>
								</view>
							</view>
						</view>
						<view v-else class="summary-placeholder">产品数量汇总</view>
					</view>
					<view class="product-tabs-container" v-if="productTabs.length > 0">
						<CssAnimatedTabs v-model="activeTab" :tabs="productTabs" />
					</view>
					<view class="product-grid">
						<view v-for="product in productsInCurrentTab" :key="product.id" class="product-item">
							<text class="product-name">{{ product.name }}</text>
							<input
								class="input-field quantity-input"
								type="number"
								placeholder="数量"
								:value="taskQuantities[product.id]"
								@input="onQuantityInput(product.id, $event)"
							/>
						</view>
					</view>
				</view>
				<view class="bottom-actions-container">
					<AppButton type="primary" full-width :disabled="!isCreatable" @click="handleSubmit" :loading="isCreating">
						{{ isCreating ? '' : isEditMode ? '确认修改' : '创建任务' }}
					</AppButton>
				</view>
			</view>
		</DetailPageLayout>
	</view>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import { onLoad, onUnload } from '@dcloudio/uni-app';
import { useDataStore } from '@/store/data';
import { useToastStore } from '@/store/toast';
import { useUiStore } from '@/store/ui';
import { useUserStore } from '@/store/user';
import { createTask, updateTask } from '@/api/tasks';
import AppButton from '@/components/AppButton.vue';
import DetailHeader from '@/components/DetailHeader.vue';
import DetailPageLayout from '@/components/DetailPageLayout.vue';
import CssAnimatedTabs from '@/components/CssAnimatedTabs.vue';
import type { ProductionTaskDto, RecipeCategory } from '@/types/api';

defineOptions({
	inheritAttrs: false
});

const dataStore = useDataStore();
const toastStore = useToastStore();
const uiStore = useUiStore();
const userStore = useUserStore();

const isLoading = ref(false);
const isCreating = ref(false);
const isEditMode = ref(false);
const editingTaskId = ref<string | null>(null);

// [核心改造] selectedCategory 不再是用户手动选择，而是从页面加载参数中获取
const selectedCategory = ref<RecipeCategory | null>(null);

// [核心新增] 定义品类 key 到中文显示名的映射
const categoryMap = {
	BREAD: '面包',
	PASTRY: '西点',
	DESSERT: '甜品',
	DRINK: '饮品'
};

// [核心改造] 页面标题根据 selectedCategory 动态生成
const pageTitle = computed(() => {
	if (isEditMode.value) return '修改任务';
	if (selectedCategory.value) {
		return `新建${categoryMap[selectedCategory.value] || ''}任务`;
	}
	return '新建任务';
});

const today = new Date().toISOString().split('T')[0];
const taskForm = reactive({
	startDate: today,
	endDate: today
});

const taskQuantities = reactive<Record<string, number | null>>({});
const summaryGroups = ref<{ name: string; items: string[] }[]>([]);
const activeTab = ref('');

// [核心改造] 产品 tab（即配方族）现在根据 selectedCategory 从 store 中获取
const productTabs = computed(() => {
	if (!selectedCategory.value) return [];
	const productsInCategory = dataStore.productsForTaskCreation[selectedCategory.value];
	return productsInCategory ? Object.keys(productsInCategory).map((name) => ({ key: name, label: name })) : [];
});

// [核心改造] 根据当前激活的 tab，获取该 tab 下的产品列表
const productsInCurrentTab = computed(() => {
	if (!selectedCategory.value || !activeTab.value) return [];
	const productsInCategory = dataStore.productsForTaskCreation[selectedCategory.value];
	return productsInCategory ? productsInCategory[activeTab.value] || [] : [];
});

onLoad(async (options) => {
	isLoading.value = true;
	// [核心改造] 确保在初始化本页面前，可生产产品列表已加载
	if (dataStore.dataStale.productsForTaskCreation || !dataStore.dataLoaded.productsForTaskCreation) {
		await dataStore.fetchProductsForTaskCreation();
	}

	Object.values(dataStore.productsForTaskCreation)
		.flatMap((group) => Object.values(group))
		.flat()
		.forEach((p) => {
			taskQuantities[p.id] = null;
		});

	if (options && options.taskId) {
		isEditMode.value = true;
		editingTaskId.value = options.taskId;
		const taskJson = uni.getStorageSync('task_to_edit');
		if (taskJson) {
			try {
				const taskToEdit: ProductionTaskDto = JSON.parse(taskJson);
				// [核心改造] 修改任务时，需要找到第一个产品的品类来初始化 selectedCategory
				if (taskToEdit.items.length > 0 && dataStore.allRecipes.length > 0) {
					const firstProductId = taskToEdit.items[0].product.id;
					// 在所有配方中查找这个产品属于哪个品类
					for (const recipeFamily of dataStore.allRecipes) {
						const hasProduct = recipeFamily.versions.some((v) => v.products.some((p) => p.id === firstProductId));
						if (hasProduct) {
							selectedCategory.value = recipeFamily.category;
							break;
						}
					}
				}

				taskForm.startDate = new Date(taskToEdit.startDate).toISOString().split('T')[0];
				taskForm.endDate = taskToEdit.endDate ? new Date(taskToEdit.endDate).toISOString().split('T')[0] : taskForm.startDate;

				taskToEdit.items.forEach((item) => {
					taskQuantities[item.product.id] = item.quantity;
				});
				updateSummary();
			} catch (e) {
				console.error('Failed to parse task data from storage:', e);
				toastStore.show({ message: '加载任务信息失败', type: 'error' });
				uni.navigateBack();
			}
		} else {
			toastStore.show({ message: '找不到要编辑的任务信息', type: 'error' });
			uni.navigateBack();
		}
	} else if (options && options.category) {
		// [核心改造] 如果是新建任务，从 options 中获取品类
		selectedCategory.value = options.category as RecipeCategory;
	} else {
		toastStore.show({ message: '未指定任务品类', type: 'error' });
		uni.navigateBack();
	}

	// [核心改造] 初始化 activeTab
	if (productTabs.value.length > 0) {
		activeTab.value = productTabs.value[0].key;
	}

	isLoading.value = false;
});

onUnload(() => {
	uni.removeStorageSync('task_to_edit');
});

const onQuantityInput = (productId: string, event: any) => {
	const value = event.target?.value ?? event.detail.value;
	taskQuantities[productId] = value === '' ? null : Number(value);
	updateSummary();
};

const isCreatable = computed(() => {
	return Object.values(taskQuantities).some((qty) => qty && qty > 0);
});

const onDateChange = (e: any, type: 'start' | 'end') => {
	const newDate = e.detail.value;
	if (type === 'start') {
		taskForm.startDate = newDate;
		if (new Date(taskForm.endDate) < new Date(newDate)) {
			taskForm.endDate = newDate;
		}
	} else {
		taskForm.endDate = newDate;
	}
};

const updateSummary = () => {
	if (!selectedCategory.value) {
		summaryGroups.value = [];
		return;
	}
	const groups: { name: string; items: string[] }[] = [];
	const productsInCategory = dataStore.productsForTaskCreation[selectedCategory.value] || {};

	for (const groupName in productsInCategory) {
		const productsInGroup = productsInCategory[groupName];
		const quantifiedProducts = productsInGroup.map((p) => ({ name: p.name, quantity: taskQuantities[p.id] || 0 })).filter((p) => p.quantity > 0);

		if (quantifiedProducts.length > 0) {
			groups.push({
				name: groupName,
				items: quantifiedProducts.map((p) => `${p.name} x${p.quantity}`)
			});
		}
	}
	summaryGroups.value = groups;
};

const handleSubmit = async () => {
	const productsToSubmit = Object.entries(taskQuantities)
		.filter(([, quantity]) => quantity && quantity > 0)
		.map(([productId, quantity]) => ({
			productId,
			quantity: Number(quantity)
		}));

	if (productsToSubmit.length === 0) {
		toastStore.show({ message: '请输入要生产的数量', type: 'error' });
		return;
	}

	isCreating.value = true;
	try {
		const payload = {
			startDate: new Date(taskForm.startDate).toISOString(),
			endDate: new Date(taskForm.endDate).toISOString(),
			products: productsToSubmit
		};

		const currentUserRole = userStore.userInfo?.tenants.find((t) => t.tenant.id === dataStore.currentTenantId)?.role;
		const target = currentUserRole === 'MEMBER' ? '/pages/baker/main' : '/pages/main/main';

		if (isEditMode.value && editingTaskId.value) {
			await updateTask(editingTaskId.value, payload);
			uiStore.setNextPageToast({ message: '任务修改成功', type: 'success' }, target);
		} else {
			const res = await createTask(payload);
			if (res.warning) {
				uiStore.setNextPageToast({ message: res.warning, type: 'error', duration: 3000 }, target);
			} else {
				uiStore.setNextPageToast({ message: '任务已创建', type: 'success' }, target);
			}
		}

		dataStore.markProductionAsStale();
		dataStore.markHistoricalTasksAsStale();
		uni.navigateBack();
	} catch (error) {
		console.error('Failed to submit task:', error);
	} finally {
		isCreating.value = false;
	}
};
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
@include form-control-styles;

.page-wrapper {
	display: flex;
	flex-direction: column;
	height: 100vh;
}

.date-picker-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 15px;
	margin-bottom: 20px;
}

.date-picker-item {
	flex: 1;
}

.date-label {
	font-size: 13px;
	color: var(--text-secondary);
	margin-bottom: 8px;
	display: block;
}

.summary-card {
	background-color: #faf8f5;
	border-radius: 12px;
	padding: 15px;
	min-height: 100px;
	margin-bottom: 20px;
}

.summary-content {
	color: var(--text-primary);
	font-size: 13px;
	line-height: 1.8;
}

.summary-group {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
}

.summary-group-title {
	font-weight: 600;
	color: var(--primary-color);
	margin-right: 5px;
	flex-shrink: 0;
}

.summary-items-wrapper {
	display: inline;
}

.summary-item {
	display: inline-block;
}

.summary-placeholder {
	font-size: 13px;
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	min-height: 100px;
	color: #ced4da;
}

.product-grid {
	display: grid;
	grid-template-columns: 1fr;
	gap: 12px;
	margin-top: 20px;
	margin-bottom: 15px;
}

.product-item {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 0 5%;
}

.product-tabs-container {
	margin-top: 25px;
}

.product-name {
	width: calc(50% - 6px);
	font-size: 15px;
	min-width: 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	text-align: right;
}

.quantity-input {
	width: calc(50% - 6px);
	max-width: 120px;
	flex-shrink: 0;
	text-align: center;
}

// [核心新增] 品类选择样式
.category-selection-wrapper {
	padding: 20px 0;
}

.category-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 15px;
	margin-top: 20px;
}

.category-item {
	padding: 30px 15px;
	text-align: center;
	font-size: 16px;
	font-weight: 500;
	color: var(--text-primary);
	transition: all 0.2s ease-in-out;

	&:active {
		transform: scale(0.95);
		background-color: #f3e9e3;
	}
}
</style>
