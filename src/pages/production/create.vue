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
import { getLocalDate } from '@/utils/format';
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

const selectedCategory = ref<RecipeCategory | null>(null);

const categoryMap = {
	BREAD: '面包',
	PASTRY: '西点',
	DESSERT: '甜品',
	DRINK: '饮品'
};

const pageTitle = computed(() => {
	if (isEditMode.value) return '修改任务';
	if (selectedCategory.value) {
		return `新建${categoryMap[selectedCategory.value] || ''}任务`;
	}
	return '新建任务';
});

const today = getLocalDate();
const taskForm = reactive({
	startDate: today,
	endDate: today
});

const taskQuantities = reactive<Record<string, number | null>>({});
const summaryGroups = ref<{ name: string; items: string[] }[]>([]);
const activeTab = ref('');

const productTabs = computed(() => {
	if (!selectedCategory.value) return [];
	const productsInCategory = dataStore.productsForTaskCreation[selectedCategory.value];
	return productsInCategory ? Object.keys(productsInCategory).map((name) => ({ key: name, label: name })) : [];
});

const productsInCurrentTab = computed(() => {
	if (!selectedCategory.value || !activeTab.value) return [];
	const productsInCategory = dataStore.productsForTaskCreation[selectedCategory.value];
	return productsInCategory ? productsInCategory[activeTab.value] || [] : [];
});

onLoad(async (options) => {
	isLoading.value = true;

	// 1. 确保 productsForTaskCreation 已加载 (这是按分类组织的产品列表，是我们反查分类的关键)
	if (dataStore.dataStale.productsForTaskCreation || !dataStore.dataLoaded.productsForTaskCreation) {
		await dataStore.fetchProductsForTaskCreation();
	}

	// [优化] 不需要强制加载 recipes 了，因为我们现在改用 productsForTaskCreation 来反查分类
	// 只有当 productsForTaskCreation 为空时才可能需要兜底，但理论上 productsForTaskCreation 更适合这个场景

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

				if (taskToEdit.items.length > 0) {
					const firstProductId = taskToEdit.items[0].product.id;

					// 🟢 [核心修复]：改用 productsForTaskCreation 进行反查
					// 它的结构是: { BREAD: { "配方名": [产品1, 产品2] }, CAKE: ... }
					let foundCategory: RecipeCategory | null = null;

					// 获取所有分类键
					const allCategories = Object.keys(dataStore.productsForTaskCreation) as RecipeCategory[];

					// 遍历所有分类
					for (const category of allCategories) {
						const familiesInCat = dataStore.productsForTaskCreation[category];
						if (!familiesInCat) continue;

						// 遍历该分类下的所有配方族
						for (const familyName of Object.keys(familiesInCat)) {
							const products = familiesInCat[familyName];
							// 检查产品ID是否存在于该列表中
							if (products.some((p) => p.id === firstProductId)) {
								foundCategory = category;
								break;
							}
						}
						if (foundCategory) break;
					}

					if (foundCategory) {
						selectedCategory.value = foundCategory;
					}
				}

				// 使用 getLocalDate 函数来格式化日期，避免时区问题
				taskForm.startDate = getLocalDate(new Date(taskToEdit.startDate));
				taskForm.endDate = taskToEdit.endDate ? getLocalDate(new Date(taskToEdit.endDate)) : taskForm.startDate;

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
		selectedCategory.value = options.category as RecipeCategory;
	} else {
		toastStore.show({ message: '未指定任务品类', type: 'error' });
		uni.navigateBack();
	}

	// 如果不是编辑模式，则根据 URL 传入的 date 参数或当天日期来设置默认生产日期
	if (!isEditMode.value) {
		const initialDate = options?.date || getLocalDate();
		taskForm.startDate = initialDate;
		taskForm.endDate = initialDate;
	}

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
