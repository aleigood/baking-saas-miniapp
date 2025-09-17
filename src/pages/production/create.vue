<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader :title="isEditMode ? '修改任务' : '新建任务'" />
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
// [核心修改] 导入 onUnload
import { onLoad, onUnload } from '@dcloudio/uni-app';
import { useDataStore } from '@/store/data';
import { useToastStore } from '@/store/toast';
import { useUiStore } from '@/store/ui';
import { useUserStore } from '@/store/user';
// [核心修改] 移除 getTaskDetail
import { createTask, updateTask } from '@/api/tasks';
import AppButton from '@/components/AppButton.vue';
import DetailHeader from '@/components/DetailHeader.vue';
import DetailPageLayout from '@/components/DetailPageLayout.vue';
import CssAnimatedTabs from '@/components/CssAnimatedTabs.vue';
import type { ProductListItem, ProductionTaskDto } from '@/types/api'; // [核心新增] 导入 ProductionTaskDto

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

const today = new Date().toISOString().split('T')[0];
const taskForm = reactive({
	startDate: today,
	endDate: today
});

const taskQuantities = reactive<Record<string, number | null>>({});
const summaryGroups = ref<{ name: string; items: string[] }[]>([]);
const activeTab = ref('');

onLoad(async (options) => {
	isLoading.value = true;
	await dataStore.fetchProductsForTaskCreation();

	if (productTabs.value.length > 0) {
		activeTab.value = productTabs.value[0].key;
	}
	Object.values(dataStore.productsForTaskCreation)
		.flat()
		.forEach((p) => {
			taskQuantities[p.id] = null;
		});

	if (options && options.taskId) {
		isEditMode.value = true;
		editingTaskId.value = options.taskId;
		// [核心改造] 从缓存中读取任务数据，而不是调用API
		const taskJson = uni.getStorageSync('task_to_edit');
		if (taskJson) {
			try {
				const taskToEdit: ProductionTaskDto = JSON.parse(taskJson);
				taskForm.startDate = new Date(taskToEdit.startDate).toISOString().split('T')[0];
				taskForm.endDate = taskToEdit.endDate ? new Date(taskToEdit.endDate).toISOString().split('T')[0] : taskForm.startDate;

				// [核心修复] 根据正确的 item 结构填充数量
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
	}
	isLoading.value = false;
});

// [核心新增] 页面卸载时清理缓存
onUnload(() => {
	uni.removeStorageSync('task_to_edit');
});

const onQuantityInput = (productId: string, event: any) => {
	const value = event.target?.value ?? event.detail.value;
	taskQuantities[productId] = value === '' ? null : Number(value);
	updateSummary();
};

const productTabs = computed(() => {
	return Object.keys(dataStore.productsForTaskCreation).map((name) => ({ key: name, label: name }));
});

const productsInCurrentTab = computed(() => {
	return dataStore.productsForTaskCreation[activeTab.value] || [];
});

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
	const groups: { name: string; items: string[] }[] = [];
	for (const groupName in dataStore.productsForTaskCreation) {
		const productsInGroup = dataStore.productsForTaskCreation[groupName];
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
</style>
