<template>
	<page-meta :page-style="pageStyle"></page-meta>
	<view class="page-wrapper" @click="hidePopover">
		<DetailHeader title="任务详情" />
		<DetailPageLayout @scroll="handleScroll">
			<view class="page-content" v-if="!isLoading && task">
				<view class="detail-page">
					<view v-if="task.stockWarning && !isReadOnly" class="warning-card card">
						<view class="warning-content">
							<text class="warning-text">{{ task.stockWarning }}</text>
						</view>
					</view>

					<view :class="{ 'disabled-list': !isStarted && !isReadOnly }">
						<view class="card-full-bleed-list">
							<view class="card-title-wrapper">
								<span class="card-title">配方列表</span>
							</view>
							<ListItem
								v-for="(component, index) in task.componentGroups"
								:key="component.familyId"
								class="product-list-item"
								:selected="selectedComponentFamilyId === component.familyId"
								@click="selectComponent(component.familyId)"
								:bleed="true"
								:divider="index < task.componentGroups.length - 1"
							>
								<view class="main-info">
									<view class="name">{{ component.familyName }}{{ component.note ? ` (${component.note})` : '' }}</view>
									<view class="desc">{{ component.productsDescription }}</view>
								</view>
							</ListItem>
						</view>
					</view>

					<view v-if="!isStarted && !isReadOnly" class="bottom-actions-container">
						<AppButton type="primary" full-width @click="handleStartTask">开始制作</AppButton>
					</view>

					<template v-if="isStarted && selectedComponentDetails">
						<view class="card">
							<view class="group-title" @click="toggleCollapse(selectedComponentDetails.familyId)">
								<span>{{ selectedComponentDetails.familyName }}</span>
								<span class="arrow" :class="{ collapsed: collapsedSections.has(selectedComponentDetails.familyId) }">&#10095;</span>
							</view>
							<view class="collapsible-content" :class="{ 'is-collapsed': collapsedSections.has(selectedComponentDetails.familyId) }">
								<view class="smart-table">
									<view class="table-header">
										<text class="col-ingredient">原料</text>
										<text class="col-brand">品牌</text>
										<text class="col-usage">用量</text>
									</view>
									<view
										v-for="(ing, ingIndex) in selectedComponentDetails.baseComponentIngredients"
										:key="ing.id + '-' + ingIndex"
										class="table-row"
										:class="{ 'is-added': addedIngredientsMap.has(`${selectedComponentDetails.familyId}-${ing.id}`) }"
										@click.stop="showExtraInfo(ing.extraInfo, `info-icon-${selectedComponentDetails.familyId}-${ing.id}`)"
										@longpress.prevent="!isReadOnly && toggleIngredientAdded(selectedComponentDetails.familyId, ing.id)"
									>
										<view class="col-ingredient ingredient-name-cell">
											<view v-if="ing.extraInfo" class="ingredient-with-icon" :id="`info-icon-${selectedComponentDetails.familyId}-${ing.id}`">
												<text>{{ ing.name }}</text>
												<image class="info-icon" src="/static/icons/info.svg" mode="aspectFit"></image>
											</view>
											<text v-else>{{ ing.name }}</text>
										</view>
										<text class="col-brand">{{ ing.brand || '-' }}</text>
										<text class="col-usage">{{ formatWeight(ing.weightInGrams) }}</text>
									</view>
								</view>
								<view class="total-weight-summary">
									<text>
										{{ selectedComponentDetails.category === 'BREAD' ? '面团总重' : '原料总重' }}:
										{{ formatWeight(selectedComponentDetails.totalComponentWeight) }}
									</text>
								</view>
								<view v-if="selectedComponentDetails.baseComponentProcedure.length > 0" class="procedure-notes">
									<text class="notes-title">制作要点:</text>
									<text v-for="(step, stepIndex) in selectedComponentDetails.baseComponentProcedure" :key="stepIndex" class="note-item">
										{{ stepIndex + 1 }}. {{ step }}
									</text>
								</view>
							</view>

							<view class="group-title" @click="toggleCollapse('productSummary')">
								<span>{{ selectedComponentDetails.familyName }}产品</span>
								<span class="arrow" :class="{ collapsed: collapsedSections.has('productSummary') }">&#10095;</span>
							</view>
							<view class="collapsible-content" :class="{ 'is-collapsed': collapsedSections.has('productSummary') }">
								<view class="product-tabs-container" v-if="productTabs.length > 0">
									<FilterTabs v-model="selectedProductId" :tabs="productTabs" size="sm" align="center" />
								</view>

								<template v-if="selectedProductDetails">
									<view class="smart-table">
										<view class="table-header">
											<text class="col-product-name">基础原料</text>
											<text class="col-dough-weight">总重</text>
											<text class="col-quantity">产品数量</text>
											<text class="col-division-weight">分割重量</text>
										</view>
										<view class="info-row">
											<text class="col-product-name">{{ selectedProductDetails.baseComponent.name }}</text>
											<text class="col-dough-weight">{{ formatWeight(selectedProductDetails.baseComponent.totalBaseComponentWeight) }}</text>
											<text class="col-quantity">{{ selectedProductDetails.baseComponent.quantity }}</text>
											<text class="col-division-weight">{{ formatWeight(selectedProductDetails.baseComponent.divisionWeight) }}</text>
										</view>
									</view>

									<template
										v-if="
											selectedProductDetails.mixIns.length > 0 ||
											selectedProductDetails.fillings.length > 0 ||
											(selectedProductDetails.toppings && selectedProductDetails.toppings.length > 0)
										"
									>
										<template v-if="selectedProductDetails.mixIns.length > 0">
											<view class="smart-table detail-table">
												<view class="table-header summary-header">
													<text class="col-ingredient">辅料</text>
													<text class="col-brand">品牌</text>
													<text class="col-usage">总用量</text>
												</view>
												<view v-for="ing in selectedProductDetails.mixIns" :key="ing.id" class="table-row">
													<text class="col-ingredient">{{ ing.name }}</text>
													<text class="col-brand">{{ ing.brand || '-' }}</text>
													<text class="col-usage">{{ formatWeight(ing.weightInGrams) }}</text>
												</view>
											</view>
										</template>

										<template v-if="selectedProductDetails.fillings.length > 0">
											<view class="smart-table detail-table">
												<view class="table-header summary-header">
													<text class="col-ingredient">馅料</text>
													<text class="col-brand">品牌</text>
													<text class="col-per-unit">单个用量</text>
													<text class="col-usage">总用量</text>
												</view>
												<view v-for="ing in selectedProductDetails.fillings" :key="ing.id" class="table-row">
													<text class="col-ingredient">{{ ing.name }}</text>
													<text class="col-brand">{{ ing.brand || '-' }}</text>
													<text class="col-per-unit">{{ formatWeight(ing.weightPerUnit) }}</text>
													<text class="col-usage">{{ formatWeight(ing.weightInGrams) }}</text>
												</view>
											</view>
										</template>

										<template v-if="selectedProductDetails.toppings && selectedProductDetails.toppings.length > 0">
											<view class="smart-table detail-table">
												<view class="table-header summary-header">
													<text class="col-ingredient">表面装饰</text>
													<text class="col-brand">品牌</text>
													<text class="col-per-unit">单个用量</text>
													<text class="col-usage">总用量</text>
												</view>
												<view v-for="ing in selectedProductDetails.toppings" :key="ing.id" class="table-row">
													<text class="col-ingredient">{{ ing.name }}</text>
													<text class="col-brand">{{ ing.brand || '-' }}</text>
													<text class="col-per-unit">{{ formatWeight(ing.weightPerUnit) }}</text>
													<text class="col-usage">{{ formatWeight(ing.weightInGrams) }}</text>
												</view>
											</view>
										</template>
									</template>

									<view v-if="selectedProductDetails.procedure.length > 0" class="procedure-notes">
										<text class="notes-title">制作要点:</text>
										<text v-for="(step, stepIndex) in selectedProductDetails.procedure" :key="stepIndex" class="note-item">
											{{ stepIndex + 1 }}. {{ step }}
										</text>
									</view>
								</template>
							</view>
						</view>
					</template>

					<view class="bottom-actions-container">
						<AppButton v-if="isStarted && !isReadOnly" type="primary" full-width @click="openCompleteTaskModal">完成任务</AppButton>
					</view>
				</view>
			</view>
			<view class="loading-spinner" v-else>
				<text>加载中...</text>
			</view>
		</DetailPageLayout>

		<AppModal v-model:visible="showCompleteTaskModal" :title="completionStep === 1 ? '提报完成数量' : '提报产品损耗'">
			<view class="modal-slider-container" :style="{ height: modalContentHeight ? `${modalContentHeight}px` : 'auto' }">
				<view class="modal-slider-track" :class="{ 'go-to-step2': completionStep === 2 }">
					<view class="modal-step-content" id="step1-content">
						<view class="loss-product-list">
							<view v-for="product in allProductsInTask" :key="product.id" class="loss-product-item">
								<text class="loss-product-name">{{ product.name }} (计划 {{ product.plannedQuantity }})</text>
								<input
									v-if="completionForm[product.id]"
									class="loss-quantity-input"
									type="number"
									placeholder="实际数量"
									v-model.number="completionForm[product.id].completedQuantity"
									@input="onCompletedQuantityInput(product.id, $event)"
								/>
							</view>
						</view>
					</view>
					<view class="modal-step-content" id="step2-content">
						<view class="spoilagestages-tabs-container" v-if="spoilageStages.length > 0">
							<AnimatedTabs v-model="activeLossTab" :tabs="spoilageStages" />
						</view>
						<view class="loss-product-list">
							<view v-for="product in productsWithSpoilage" :key="product.id" class="loss-product-item spoilage-item">
								<text class="loss-product-name">{{ product.name }} (剩余 {{ remainingSpoilageQuantity(product.id) }})</text>
								<input
									v-if="completionForm[product.id]"
									class="loss-quantity-input"
									type="number"
									placeholder="数量"
									:value="completionForm[product.id].spoilageDetails[activeLossTab]"
									@input="onSpoilageQuantityInput(product.id, activeLossTab, $event)"
								/>
							</view>
						</view>
						<textarea class="spoilage-notes-input" v-model="completionNotes" placeholder="关于损耗情况的附加说明（可选）"></textarea>
					</view>
				</view>
			</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="handleCompletionModalBack">
					{{ completionStep === 1 ? '取消' : '上一步' }}
				</AppButton>
				<AppButton type="primary" @click="handleCompletionModalNext" :loading="isSubmitting" :disabled="!isStep1Valid">
					{{ completionStep === 1 ? (hasSpoilage ? '下一步' : '确认完成') : '确认完成' }}
				</AppButton>
			</view>
		</AppModal>

		<AppPopover :visible="popover.visible" :content="popover.content" :targetRect="popover.targetRect" placement="right" :offsetY="0" />
	</view>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch, nextTick, getCurrentInstance } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useDataStore } from '@/store/data';
import { useToastStore } from '@/store/toast';
import { useUiStore } from '@/store/ui';
import { useTemperatureStore } from '@/store/temperature';
// [G-Code-Note] [需求修改] 引入新的类型
import type { ProductionTaskDetailDto } from '@/types/api';
import { getTaskDetail, updateTaskStatus, completeTask, getSpoilageStages } from '@/api/tasks';
import AppModal from '@/components/AppModal.vue';
import AppButton from '@/components/AppButton.vue';
import DetailHeader from '@/components/DetailHeader.vue';
import DetailPageLayout from '@/components/DetailPageLayout.vue';
import ListItem from '@/components/ListItem.vue';
import AnimatedTabs from '@/components/CssAnimatedTabs.vue';
import FilterTabs from '@/components/FilterTabs.vue';
import AppPopover from '@/components/AppPopover.vue';
import { formatWeight } from '@/utils/format';

defineOptions({
	inheritAttrs: false
});

const dataStore = useDataStore();
const toastStore = useToastStore();
const uiStore = useUiStore();
const temperatureStore = useTemperatureStore();
const instance = getCurrentInstance();

const isLoading = ref(true);
const isSubmitting = ref(false);
const task = ref<ProductionTaskDetailDto | null>(null);
const taskId = ref<string | null>(null);
const showCompleteTaskModal = ref(false);
const isStarted = ref(false);
const isReadOnly = ref(false);
const selectedComponentFamilyId = ref<string | null>(null);
const addedIngredientsMap = reactive(new Set<string>());
const collapsedSections = ref(new Set<string>());
const selectedProductId = ref<string>('');

const completionStep = ref(1);
const completionForm = reactive<
	Record<
		string,
		{
			plannedQuantity: number;
			completedQuantity: number | null;
			spoilageDetails: Record<string, number | null>;
		}
	>
>({});
const completionNotes = ref('');
const spoilageStages = ref<
	{
		key: string;
		label: string;
	}[]
>([]);
const activeLossTab = ref('');
const modalContentHeight = ref<number | string>('auto');

const fromPage = ref('');

const popover = reactive<{
	visible: boolean;
	content: string;
	targetRect: {
		left: number;
		top: number;
		width: number;
		height: number;
	} | null;
}>({
	visible: false,
	content: '',
	targetRect: null
});

const pageStyle = computed(() => {
	let style = 'background-color: #fdf8f2;';
	if (popover.visible) {
		style += 'overflow: hidden;';
	}
	return style;
});

const updateModalContentHeight = () => {
	nextTick(() => {
		const stepId = `#step${completionStep.value}-content`;
		const query = uni.createSelectorQuery().in(instance);
		query
			.select(stepId)
			.boundingClientRect((rect) => {
				if (rect && rect.height) {
					modalContentHeight.value = rect.height;
				}
			})
			.exec();
	});
};

watch(showCompleteTaskModal, (visible) => {
	if (visible) {
		completionStep.value = 1;
		setTimeout(() => {
			updateModalContentHeight();
		}, 50);
	} else {
		setTimeout(() => {
			modalContentHeight.value = 'auto';
		}, 300);
	}
});

watch(completionStep, () => {
	if (showCompleteTaskModal.value) {
		updateModalContentHeight();
	}
});

const resetCompletionForm = () => {
	completionStep.value = 1;
	completionNotes.value = '';
	Object.keys(completionForm).forEach((key) => delete completionForm[key]);
	if (task.value) {
		task.value.items.forEach((item) => {
			completionForm[item.id] = {
				plannedQuantity: item.plannedQuantity,
				completedQuantity: null,
				spoilageDetails: {}
			};
			spoilageStages.value.forEach((stage) => {
				completionForm[item.id].spoilageDetails[stage.key] = null;
			});
		});
	}
};

const openCompleteTaskModal = async () => {
	resetCompletionForm();
	if (spoilageStages.value.length === 0) {
		spoilageStages.value = await getSpoilageStages();
		if (spoilageStages.value.length > 0) {
			activeLossTab.value = spoilageStages.value[0].key;
		}
	}
	showCompleteTaskModal.value = true;
};

const allProductsInTask = computed(() => {
	return task.value?.items || [];
});

onLoad(async (options) => {
	taskId.value = options?.taskId || null;
	fromPage.value = options?.from || '';
	if (fromPage.value === 'history') {
		isReadOnly.value = true;
	}

	if (!taskId.value) {
		return;
	}

	await loadTaskData(taskId.value);
});

const handleScroll = () => {
	if (popover.visible) {
		popover.visible = false;
	}
};

const loadTaskData = async (id: string) => {
	isLoading.value = true;
	try {
		temperatureStore.initTemperatureSettings();
		const response = await getTaskDetail(id, temperatureStore.settings);
		task.value = response;

		// [中文注释] 核心重构：调用 dataStore 的方法来加载任务进度
		addedIngredientsMap.clear();
		if (task.value.status === 'IN_PROGRESS') {
			const savedProgress = dataStore.loadTaskProgress(id);
			savedProgress.forEach((key) => addedIngredientsMap.add(key));
		}

		if (task.value.status === 'IN_PROGRESS' || task.value.status === 'COMPLETED' || task.value.status === 'CANCELLED') {
			isStarted.value = true;
			if (task.value.componentGroups.length > 0) {
				const firstComponent = task.value.componentGroups[0];
				selectedComponentFamilyId.value = firstComponent.familyId;
				if (firstComponent.productDetails.length > 0) {
					selectedProductId.value = firstComponent.productDetails[0].id;
				}
			}
		}
	} catch (error) {
		console.error('Failed to load task details:', error);
	} finally {
		isLoading.value = false;
	}
};

const productsWithSpoilage = computed(() => {
	return allProductsInTask.value
		.map((p) => ({
			...p,
			spoilageQuantity: p.plannedQuantity - (completionForm[p.id]?.completedQuantity ?? p.plannedQuantity)
		}))
		.filter((p) => p.spoilageQuantity > 0);
});

const hasSpoilage = computed(() => {
	return Object.values(completionForm).some((item) => item.completedQuantity !== null && item.completedQuantity < item.plannedQuantity);
});

const isStep1Valid = computed(() => {
	return Object.values(completionForm).every((item) => item.completedQuantity !== null);
});

const remainingSpoilageQuantity = (productId: string) => {
	const productData = completionForm[productId];
	if (!productData) return 0;

	const totalSpoilage = productData.plannedQuantity - (productData.completedQuantity || 0);
	const reportedSpoilage = Object.values(productData.spoilageDetails).reduce((sum, current) => sum + (current || 0), 0);

	return totalSpoilage - reportedSpoilage;
};

const onCompletedQuantityInput = (productId: string, event: any) => {
	const value = event.target?.value ?? event.detail.value;
	const numValue = value === '' ? null : Number(value);
	if (numValue !== null && numValue < 0) {
		completionForm[productId].completedQuantity = 0;
	} else {
		completionForm[productId].completedQuantity = numValue;
	}
};

const onSpoilageQuantityInput = (productId: string, stage: string, event: any) => {
	const value = event.target?.value ?? event.detail.value;
	const currentSpoilage = value === '' ? null : Number(value);

	const product = completionForm[productId];
	if (!product) return;

	let otherStagesSpoilage = 0;
	for (const key in product.spoilageDetails) {
		if (key !== stage) {
			otherStagesSpoilage += product.spoilageDetails[key] || 0;
		}
	}

	const totalSpoilage = otherStagesSpoilage + (currentSpoilage || 0);
	const maxSpoilage = product.plannedQuantity - (product.completedQuantity || 0);

	if (totalSpoilage > maxSpoilage) {
		toastStore.show({
			message: `总损耗不能超过 ${maxSpoilage}`,
			type: 'error'
		});
		nextTick(() => {
			product.spoilageDetails[stage] = maxSpoilage - otherStagesSpoilage > 0 ? maxSpoilage - otherStagesSpoilage : null;
		});
	} else {
		product.spoilageDetails[stage] = currentSpoilage;
	}
};

const handleCompletionModalBack = () => {
	if (completionStep.value === 1) {
		showCompleteTaskModal.value = false;
	} else {
		completionStep.value = 1;
	}
};

const handleCompletionModalNext = () => {
	if (completionStep.value === 1) {
		if (hasSpoilage.value) {
			completionStep.value = 2;
		} else {
			handleConfirmComplete();
		}
	} else {
		handleConfirmComplete();
	}
};

const handleConfirmComplete = async () => {
	if (!task.value) return;

	const completedItems = Object.entries(completionForm).map(([productId, data]) => {
		const item: {
			productId: string;
			completedQuantity: number;
			spoilageDetails?: {
				stage: string;
				quantity: number;
				notes?: string;
			}[];
		} = {
			productId,
			completedQuantity: data.completedQuantity!
		};

		if (data.completedQuantity! < data.plannedQuantity) {
			item.spoilageDetails = Object.entries(data.spoilageDetails)
				.filter(([, quantity]) => quantity !== null && quantity > 0)
				.map(([stage, quantity]) => ({
					stage,
					quantity: quantity!,
					notes: completionNotes.value || undefined
				}));

			const totalReportedSpoilage = item.spoilageDetails.reduce((sum, s) => sum + s.quantity, 0);
			const calculatedSpoilage = data.plannedQuantity - data.completedQuantity!;
			if (totalReportedSpoilage !== calculatedSpoilage) {
				toastStore.show({
					message: `产品损耗总数 ${totalReportedSpoilage} 与计算损耗 ${calculatedSpoilage} 不符`,
					type: 'error'
				});
				throw new Error('损耗数量不一致');
			}
		}
		return item;
	});

	isSubmitting.value = true;
	try {
		await completeTask(task.value.id, {
			notes: completionNotes.value,
			completedItems
		});

		// [中文注释] 核心重构：调用 dataStore 的方法来清理缓存
		dataStore.clearTaskProgress(task.value.id);

		const target = fromPage.value === 'history' ? '/pages/production/history' : '/pages/main/main';
		uiStore.setNextPageToast(
			{
				message: '任务已完成',
				type: 'success'
			},
			target
		);

		dataStore.markProductionAsStale();
		dataStore.markHistoricalTasksAsStale();
		dataStore.markIngredientsAsStale();

		uni.navigateBack();
	} catch (error) {
		console.error('Failed to complete task:', error);
	} finally {
		isSubmitting.value = false;
		showCompleteTaskModal.value = false;
	}
};

const toggleCollapse = (sectionName: string) => {
	const newSet = new Set(collapsedSections.value);
	if (newSet.has(sectionName)) {
		newSet.delete(sectionName);
	} else {
		newSet.add(sectionName);
	}
	collapsedSections.value = newSet;
};

// [中文注释] 核心重构：调用 dataStore 的方法来保存任务进度
const toggleIngredientAdded = (componentFamilyId: string, ingredientId: string) => {
	if (isReadOnly.value || !taskId.value) return;
	uni.vibrateShort({});

	const compositeKey = `${componentFamilyId}-${ingredientId}`;

	// 步骤 1: 更新UI
	if (addedIngredientsMap.has(compositeKey)) {
		addedIngredientsMap.delete(compositeKey);
	} else {
		addedIngredientsMap.add(compositeKey);
	}

	// 步骤 2: 调用 dataStore 保存状态
	dataStore.saveTaskProgress(taskId.value, addedIngredientsMap);
};

const handleStartTask = async () => {
	if (!task.value || !taskId.value) return;
	try {
		await updateTaskStatus(task.value.id, 'IN_PROGRESS');
		isStarted.value = true;
		await loadTaskData(taskId.value);
		toastStore.show({
			message: '任务已开始',
			type: 'success'
		});
		dataStore.markProductionAsStale();
	} catch (error) {
		console.error('Failed to start task:', error);
	}
};

const selectComponent = (familyId: string) => {
	if (!isStarted.value && !isReadOnly.value) return;
	selectedComponentFamilyId.value = familyId;
	const componentDetails = selectedComponentDetails.value;
	if (componentDetails && componentDetails.productDetails.length > 0) {
		selectedProductId.value = componentDetails.productDetails[0].id;
	} else {
		selectedProductId.value = '';
	}
};

const showExtraInfo = (info: string | null | undefined, elementId: string) => {
	if (!info) {
		hidePopover();
		return;
	}

	if (popover.visible && popover.content === info) {
		hidePopover();
		return;
	}

	const query = uni.createSelectorQuery().in(instance);
	query
		.select('#' + elementId)
		.boundingClientRect((rect: UniApp.NodeInfo) => {
			if (rect) {
				popover.content = info;
				popover.targetRect = {
					left: rect.left,
					top: rect.top,
					width: rect.width,
					height: rect.height
				};
				popover.visible = true;
			} else {
				hidePopover();
			}
		})
		.exec();
};

const hidePopover = () => {
	popover.visible = false;
};

const selectedComponentDetails = computed(() => {
	if (!task.value || !selectedComponentFamilyId.value) return null;
	return task.value.componentGroups.find((d) => d.familyId === selectedComponentFamilyId.value) || null;
});

const selectedProductDetails = computed(() => {
	if (!selectedComponentDetails.value || !selectedProductId.value) return null;
	return selectedComponentDetails.value.productDetails.find((p) => p.id === selectedProductId.value);
});

const productTabs = computed(() => {
	if (!selectedComponentDetails.value) return [];
	return selectedComponentDetails.value.productDetails.map((p) => ({
		key: p.id,
		label: p.name
	}));
});
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
@include list-item-content-style;
/* [核心改造] 引入新的表格布局 Mixin */
@include table-layout;

.collapsible-content {
	max-height: 1000px;
	overflow: hidden;
	transition: max-height 0.3s ease;
	box-sizing: border-box;

	&:last-child {
		padding-bottom: 10px;
	}
}

.collapsible-content.is-collapsed {
	max-height: 0;
}

.font-size-14 {
	font-size: 14px;
}

.modal-slider-container {
	overflow: hidden;
	transition: height 0.3s ease-in-out;
}

.modal-slider-track {
	display: flex;
	width: 200%;
	transition: transform 0.3s ease-in-out;
	align-items: flex-start;
}

.modal-slider-track.go-to-step2 {
	transform: translateX(-50%);
}

.modal-step-content {
	width: 50%;
	flex-shrink: 0;
	box-sizing: border-box;
}

.loss-product-list {
	display: flex;
	flex-direction: column;
	gap: 12px;
	margin-top: 10px;
	padding: 5px;
}

.loss-product-item {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}

.spoilage-item {
	flex-wrap: wrap;
}

.loss-product-name {
	font-size: 14px;
	color: var(--text-primary);
	line-height: 1.4;
	flex: 1;
	min-width: 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.loss-quantity-input {
	background-color: var(--bg-color);
	border-radius: 8px;
	padding: 0 10px;
	text-align: center;
	font-size: 15px;
	width: 95px;
	box-sizing: border-box;
	border: 1px solid var(--border-color);
	height: 36px;
	flex-shrink: 0;
}

.spoilage-notes-input {
	width: 100%;
	height: 80px;
	border: 1px solid var(--border-color);
	border-radius: 8px;
	padding: 8px 12px;
	font-size: 14px;
	margin-top: 20px;
	box-sizing: border-box;
	background-color: var(--bg-color);
}

.page-wrapper {
	display: flex;
	flex-direction: column;
	height: 100vh;
}

.detail-page .tag-group {
	margin-bottom: 20px;
	display: flex;
	flex-wrap: wrap;
	gap: 5px;
}

.tag {
	white-space: normal;
}

.warning-card {
	background-color: #faedcd;
	border: none;
	padding: 15px;
	margin-bottom: 20px;
	color: var(--primary-color);
	border-radius: 20px;
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
	padding: 20px 0px;
}

.disabled-list {
	pointer-events: none;
}

.card-full-bleed-list .card-title-wrapper {
	padding-left: 20px;
	padding-right: 20px;
	margin-bottom: 10px;
}

.product-list-item .main-info .name {
	font-weight: 500;
}

.product-list-item .main-info .desc {
	margin-top: 4px;
}

.group-title {
	display: flex;
	justify-content: space-between;
	align-items: center;
	font-size: 16px;
	font-weight: bold;
	color: var(--text-primary);
	border: none;
	margin-top: 30px;
	position: relative;
	background-color: #faf8f5;
	padding: 10px 15px;
	border-radius: 12px;
}

.card > .group-title:first-child {
	margin-top: 10px;
}

.arrow {
	font-size: 14px;
	color: var(--text-secondary);
	transform: rotate(90deg);
	transition: transform 0.3s ease;
}

.arrow.collapsed {
	transform: rotate(0deg);
}

.sub-group-title {
	font-size: 14px;
	font-weight: 600;
	color: var(--text-primary);
	margin-bottom: 10px;
	margin-top: 20px;
	padding: 0 5px;
}

.smart-table {
	font-size: 14px;
	color: var(--text-primary);

	.table-header {
		color: var(--text-secondary);
		font-weight: 500;
		border-bottom: 1px solid var(--border-color);
	}

	.table-row {
		color: var(--text-primary);
		transition: background-color 0.3s ease;

		border-bottom: 1px solid var(--border-color);

		&:last-child {
			border-bottom: none;
		}
	}

	.table-row.is-added {
		background-color: #f0ebe5;
	}

	.ingredient-with-icon {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}

	.info-icon {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
	}
}

.total-weight-summary {
	display: flex;
	justify-content: flex-end;
	padding: 10px 4px;
	font-size: 13px;
	color: var(--text-secondary);
	border-top: 1px solid var(--border-color);
}

.procedure-notes {
	@include procedure-notes-style;
	margin-top: 25px;
}

/* [中文注释] 为有4列的详情表格重新分配列宽，以适应新增的“单个用量”列 */
.detail-table .table-header,
.detail-table .table-row {
	.col-ingredient {
		flex: 2.5;
	}
	.col-brand {
		flex: 2;
	}
	.col-per-unit,
	.col-usage {
		flex: 1.5;
	}
}

.detail-table {
	margin-top: 25px;
}

.product-tabs-container {
	margin-top: 30px;
	margin-bottom: 30px;
	--tabs-container-bg-rgb: 255, 255, 255;
}

.spoilagestages-tabs-container {
	margin-top: 0px;
}
</style>
