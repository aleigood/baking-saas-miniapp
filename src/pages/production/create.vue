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
					<view class="summary-card no-frame">
						<view v-if="summaryGroups.length > 0" :key="'summary-groups'" class="summary-content">
							<view v-for="group in summaryGroups" :key="group.name" class="summary-group-item clickable-summary" @click="handleGroupClick(group.name)">
								<view class="summary-group-header">
									<text class="summary-group-name">{{ group.name }}</text>
									<view class="summary-header-right">
										<view class="summary-group-total">
											<text class="total-label">共计</text>
											<text class="total-number">{{ group.totalQuantity }}</text>
										</view>
										<view class="clear-btn" @click.stop="clearGroup(group.name)">
											<image class="clear-icon-img" src="/static/icons/close-x.svg" mode="aspectFit" />
										</view>
									</view>
								</view>
								<view class="summary-group-badges">
									<view v-for="item in group.items" :key="item.name" class="summary-badge">
										<text class="sum-name">{{ item.name }}</text>
										<text class="sum-qty">×{{ item.quantity }}</text>
									</view>
								</view>
							</view>
						</view>
						<view v-else :key="'summary-placeholder'" class="summary-placeholder">
							<view class="summary-group-item is-placeholder">
								<text class="placeholder-text">请选择配方并输入产品数量</text>
							</view>
						</view>
					</view>
					<view class="product-tabs-container" v-if="productTabs.length > 0" :key="'tabs-container'">
						<CssAnimatedTabs v-model="activeTab" :tabs="productTabs" />
					</view>
					<view
						class="product-grid-animated-container"
						v-if="productsInRenderedTab.length > 0"
						:key="'product-grid-' + renderedTab"
						:class="{ 'is-fading-out': isFadingOutGrid }"
					>
						<view class="product-grid">
							<view v-for="product in productsInRenderedTab" :key="product.id" class="product-item">
								<text class="product-name">{{ product.name }}</text>
								<view class="input-with-unit">
									<input
										class="input-field quantity-input"
										type="number"
										placeholder="数量"
										:value="taskQuantities[product.id]"
										@input="onQuantityInput(product.id, $event)"
									/>
									<text class="unit-text">个</text>
								</view>
							</view>
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
import { ref, computed, reactive, watch } from 'vue';
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

const categoryMap: Record<string, string> = {
	BREAD: '面包',
	PASTRY: '西点',
	DESSERT: '甜品',
	DRINK: '饮品'
};

const pageTitle = computed(() => {
	if (isEditMode.value) return '修改任务';
	if (selectedCategory.value) {
		const catName = categoryMap[selectedCategory.value] || '生产';
		return `${catName}制作`;
	}
	return '新建任务';
});

const today = getLocalDate();
const taskForm = reactive({
	startDate: today,
	endDate: today
});

const taskQuantities = reactive<Record<string, number | null>>({});
const summaryGroups = ref<{ name: string; items: { name: string; quantity: number }[]; totalQuantity: number }[]>([]);
const activeTab = ref('');
const renderedTab = ref('');
const isFadingOutGrid = ref(false);

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

const productsInRenderedTab = computed(() => {
	if (!selectedCategory.value || !renderedTab.value) return [];
	const productsInCategory = dataStore.productsForTaskCreation[selectedCategory.value];
	return productsInCategory ? productsInCategory[renderedTab.value] || [] : [];
});

watch(activeTab, (newTab) => {
	if (!newTab) return;
	if (newTab === renderedTab.value) {
		return;
	}
	if (!renderedTab.value || isLoading.value) {
		renderedTab.value = newTab;
		return;
	}
	isFadingOutGrid.value = true;
	setTimeout(() => {
		renderedTab.value = newTab;
		isFadingOutGrid.value = false;
	}, 150);
});

const handleGroupClick = (groupName: string) => {
	activeTab.value = groupName;
};

onLoad(async (options) => {
	isLoading.value = true;

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

				if (taskToEdit.items.length > 0) {
					const firstProductId = taskToEdit.items[0].product.id;

					let foundCategory: RecipeCategory | null = null;
					const allCategories = Object.keys(categoryMap) as RecipeCategory[];

					for (const category of allCategories) {
						const familiesInCat = dataStore.productsForTaskCreation[category];
						if (!familiesInCat) continue;

						for (const familyName of Object.keys(familiesInCat)) {
							const products = familiesInCat[familyName];
							if (products && products.some((p) => p.id === firstProductId)) {
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
		const availableCats = Object.keys(categoryMap) as RecipeCategory[];
		if (availableCats.length > 0) {
			selectedCategory.value = availableCats[0];
		} else {
			toastStore.show({ message: '未指定任务品类', type: 'error' });
			uni.navigateBack();
		}
	}

	if (!isEditMode.value) {
		const initialDate = options?.date || getLocalDate();
		taskForm.startDate = initialDate;
		taskForm.endDate = initialDate;
	}

	if (isEditMode.value && summaryGroups.value.length > 0) {
		activeTab.value = summaryGroups.value[0].name;
	} else if (productTabs.value.length > 0) {
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

const clearGroup = (groupName: string) => {
	if (!selectedCategory.value) return;
	const productsInCategory = dataStore.productsForTaskCreation[selectedCategory.value] || {};
	const productsInGroup = productsInCategory[groupName] || [];

	productsInGroup.forEach((p) => {
		taskQuantities[p.id] = null;
	});

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
	const groups: { name: string; items: { name: string; quantity: number }[]; totalQuantity: number }[] = [];
	const productsInCategory = dataStore.productsForTaskCreation[selectedCategory.value] || {};

	for (const groupName in productsInCategory) {
		const productsInGroup = productsInCategory[groupName];
		const quantifiedProducts = productsInGroup.map((p) => ({ name: p.name, quantity: taskQuantities[p.id] || 0 })).filter((p) => p.quantity > 0);

		if (quantifiedProducts.length > 0) {
			const totalQty = quantifiedProducts.reduce((sum, p) => sum + p.quantity, 0);

			groups.push({
				name: groupName,
				totalQuantity: totalQty,
				items: quantifiedProducts.map((p) => ({
					name: p.name,
					quantity: p.quantity
				}))
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
		toastStore.show({ message: '请选择配方并输入要生产的数量', type: 'error' });
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

		dataStore.markProductionMutationStale();
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
	border-radius: 12px;
	margin-bottom: 20px;
}

.summary-card.no-frame {
	background-color: transparent;
	padding: 0;
}

.summary-content {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.summary-group-item {
	background-color: #faf8f5;
	border-radius: 8px;
	padding: 10px 12px;
	border: 1px solid #f0e6d2;
}

/* 修复：移除系统高亮并增加组件一致的缩放点击动效 */
.clickable-summary {
	cursor: pointer;
	-webkit-tap-highlight-color: transparent;
	outline: none;
	transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.2s;

	&:active {
		background-color: #f5eedf;
		transform: scale(0.98);
	}
}

.summary-group-item.is-placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 40px;
	background-color: transparent;
	border: 1px dashed #f0e6d2;
}

.summary-group-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 6px;
	padding-bottom: 6px;
	border-bottom: 1px dashed #f0e6d2;
}

.summary-group-name {
	font-weight: 600;
	color: var(--text-primary);
	font-size: 14px;
}

.summary-header-right {
	display: flex;
	align-items: center;
	gap: 8px;
}

.summary-group-total {
	display: flex;
	align-items: center;
	background-color: #fdf8f2;
	padding: 2px 8px;
	border-radius: 12px;
}

.total-label {
	font-size: 11px;
	color: var(--text-secondary);
	margin-right: 4px;
}

.total-number {
	font-size: 13px;
	font-weight: bold;
	color: var(--primary-color);
}

.clear-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 20px;
	height: 20px;
	background-color: rgba(140, 90, 59, 0.08);
	border-radius: 10px;
	cursor: pointer;
	transition: background-color 0.2s;

	&:active {
		background-color: rgba(140, 90, 59, 0.15);
	}
}

.clear-icon-img {
	width: 10px;
	height: 10px;
}

.summary-group-badges {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin-top: 8px;
}

.summary-badge {
	display: inline-flex;
	align-items: center;
	background-color: #f4ede2; /* 使用稍深的温暖沙白色底色，无需边框也具备极佳的边界识别度 */
	border: none;
	border-radius: 8px;
	padding: 4px 10px;
	font-size: 12px;
	color: #7d6e63;
	line-height: 1.2;
}

.sum-name {
	font-weight: 500;
}

.sum-qty {
	font-weight: 700;
	color: var(--primary-color);
	margin-left: 6px;
}

.summary-placeholder {
	display: block;
}

.placeholder-text {
	font-size: 13px;
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
	flex: 1;
	width: 0;
	text-align: center;
}

.product-grid-animated-container {
	animation: fadeInClean 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;

	&.is-fading-out {
		animation: fadeOutClean 0.15s ease forwards;
	}
}

.input-with-unit {
	display: flex;
	align-items: center;
	gap: 6px;
	width: calc(50% - 6px);
	max-width: 120px;
	flex-shrink: 0;
}

.unit-text {
	font-size: 14px;
	color: var(--text-secondary);
	flex-shrink: 0;
}
</style>

<style lang="scss">
@keyframes fadeInClean {
	from {
		opacity: 0;
		transform: translateY(5px);
	}
	to {
		opacity: 1;
		transform: none;
	}
}

@keyframes fadeOutClean {
	to {
		opacity: 0;
		transform: translateY(-5px);
	}
}
</style>
