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
								<span class="card-title">面团列表</span>
							</view>
							<ListItem v-for="(dough, index) in task.doughGroups" :key="dough.familyId"
								class="product-list-item" :selected="selectedDoughFamilyId === dough.familyId"
								@click="selectDough(dough.familyId)" :bleed="true"
								:divider="index < task.doughGroups.length - 1">
								<view class="main-info">
									<view class="name">{{ dough.familyName }}</view>
									<view class="desc">{{ dough.productsDescription }}</view>
								</view>
							</ListItem>
						</view>
					</view>

					<view v-if="!isStarted && !isReadOnly" class="bottom-actions-container">
						<AppButton type="primary" full-width @click="handleStartTask">
							开始制作
						</AppButton>
					</view>

					<template v-if="isStarted && selectedDoughDetails">
						<view class="card">
							<view class="group-title" @click="toggleCollapse(selectedDoughDetails.familyId)">
								<span>{{ selectedDoughDetails.familyName }}</span>
								<span class="arrow"
									:class="{ collapsed: collapsedSections.has(selectedDoughDetails.familyId) }">&#10095;</span>
							</view>
							<view class="collapsible-content"
								:class="{ 'is-collapsed': collapsedSections.has(selectedDoughDetails.familyId) }">
								<view class="recipe-table">
									<view class="table-header">
										<text class="col-ingredient">原料</text>
										<text class="col-brand">品牌</text>
										<text class="col-usage">用量</text>
									</view>
									<view v-for="ing in selectedDoughDetails.mainDoughIngredients" :key="ing.id"
										class="table-row"
										:class="{ 'is-added': addedIngredientsMap[selectedDoughDetails.familyId]?.has(ing.id) }"
										@click.stop="showExtraInfo(ing.extraInfo, ing.id)"
										@longpress.prevent="!isReadOnly && toggleIngredientAdded(selectedDoughDetails.familyId, ing.id)">
										<view class="col-ingredient ingredient-name-cell">
											<text>{{ ing.name }}</text>
											<view v-if="ing.extraInfo" class="info-icon-button"
												:id="'info-icon-' + ing.id">
												<image class="info-icon" src="/static/icons/info.svg" mode="aspectFit">
												</image>
											</view>
										</view>
										<text class="col-brand">{{ ing.isRecipe ? '自制' : (ing.brand || '-') }}</text>
										<text class="col-usage">{{ formatWeight(ing.weightInGrams) }}</text>
									</view>
								</view>
								<view class="total-weight-summary">
									<text>面团总重: {{ formatWeight(selectedDoughDetails.totalDoughWeight) }}</text>
								</view>
								<view v-if="selectedDoughDetails.mainDoughProcedure.length > 0" class="procedure-notes">
									<text class="notes-title">制作要点:</text>
									<text v-for="(step, stepIndex) in selectedDoughDetails.mainDoughProcedure"
										:key="stepIndex" class="note-item">{{ stepIndex + 1 }}. {{ step }}</text>
								</view>
							</view>
							<view class="group-title" @click="toggleCollapse('doughSummary')">
								<span>面团汇总</span>
								<span class="arrow"
									:class="{ collapsed: collapsedSections.has('doughSummary') }">&#10095;</span>
							</view>
							<view class="collapsible-content"
								:class="{ 'is-collapsed': collapsedSections.has('doughSummary') }">
								<view class="info-table summary-table">
									<view class="table-header">
										<text class="col-product-name">面包名称</text>
										<text class="col-quantity">数量</text>
										<text class="col-dough-weight">面团总重</text>
										<text class="col-division-weight">分割重量</text>
									</view>
									<view v-for="product in selectedDoughDetails.products" :key="product.id"
										class="info-row">
										<text class="col-product-name">{{ product.name }}</text>
										<text class="col-quantity">{{ product.quantity }}</text>
										<text
											class="col-dough-weight">{{ formatWeight(product.totalBaseDoughWeight) }}</text>
										<text
											class="col-division-weight">{{ formatWeight(product.divisionWeight) }}</text>
									</view>
								</view>
							</view>
							<view class="group-title" @click="toggleCollapse('productSummary')">
								<span>产品汇总</span>
								<span class="arrow"
									:class="{ collapsed: collapsedSections.has('productSummary') }">&#10095;</span>
							</view>
							<view class="collapsible-content"
								:class="{ 'is-collapsed': collapsedSections.has('productSummary') }">
								<view class="product-tabs-container" v-if="productTabs.length > 0">
									<AnimatedTabs v-model="selectedProductId" :tabs="productTabs" />
								</view>

								<template v-if="selectedProductDetails">
									<template
										v-if="selectedProductDetails.mixIns.length > 0 || selectedProductDetails.fillings.length > 0 || (selectedProductDetails.toppings && selectedProductDetails.toppings.length > 0)">
										<template v-if="selectedProductDetails.mixIns.length > 0">
											<view class="recipe-table detail-table">
												<view class="table-header summary-header">
													<text class="col-ingredient">辅料</text>
													<text class="col-brand">品牌</text>
													<text class="col-usage">总用量</text>
												</view>
												<view v-for="ing in selectedProductDetails.mixIns" :key="ing.id"
													class="table-row">
													<text class="col-ingredient">{{ ing.name }}</text>
													<text
														class="col-brand">{{ ing.isRecipe ? '自制' : (ing.brand || '-') }}</text>
													<text class="col-usage">{{ formatWeight(ing.weightInGrams) }}</text>
												</view>
											</view>
										</template>

										<template v-if="selectedProductDetails.fillings.length > 0">
											<view class="recipe-table detail-table">
												<view class="table-header summary-header">
													<text class="col-ingredient">馅料</text>
													<text class="col-brand">品牌</text>
													<text class="col-usage">用量/个</text>
												</view>
												<view v-for="ing in selectedProductDetails.fillings" :key="ing.id"
													class="table-row">
													<text class="col-ingredient">{{ ing.name }}</text>
													<text
														class="col-brand">{{ ing.isRecipe ? '自制' : (ing.brand || '-') }}</text>
													<text class="col-usage">{{ formatWeight(ing.weightInGrams) }}</text>
												</view>
											</view>
										</template>

										<template
											v-if="selectedProductDetails.toppings && selectedProductDetails.toppings.length > 0">
											<view class="recipe-table detail-table">
												<view class="table-header summary-header">
													<text class="col-ingredient">表面装饰</text>
													<text class="col-brand">品牌</text>
													<text class="col-usage">用量/个</text>
												</view>
												<view v-for="ing in selectedProductDetails.toppings" :key="ing.id"
													class="table-row">
													<text class="col-ingredient">{{ ing.name }}</text>
													<text
														class="col-brand">{{ ing.isRecipe ? '自制' : (ing.brand || '-') }}</text>
													<text class="col-usage">{{ formatWeight(ing.weightInGrams) }}</text>
												</view>
											</view>
										</template>
									</template>
									<template v-else>
										<view class="empty-state font-size-14" style="padding: 20px 0;">无其他原料</view>
									</template>

									<view v-if="selectedProductDetails.procedure.length > 0" class="procedure-notes">
										<text class="notes-title">制作要点:</text>
										<text v-for="(step, stepIndex) in selectedProductDetails.procedure"
											:key="stepIndex" class="note-item">{{ stepIndex + 1 }}.
											{{ step }}</text>
									</view>
								</template>
							</view>
						</view>
					</template>

					<view class="bottom-actions-container">
						<AppButton v-if="isStarted && !isReadOnly" type="primary" full-width
							@click="openCompleteTaskModal">
							完成任务
						</AppButton>
					</view>
				</view>
			</view>
			<view class="loading-spinner" v-else>
				<text>加载中...</text>
			</view>
		</DetailPageLayout>

		<AppModal v-model:visible="showCompleteTaskModal" :title="completionStep === 1 ? '提报完成数量' : '提报产品损耗'">
			<view class="modal-slider-container"
				:style="{ height: modalContentHeight ? `${modalContentHeight}px` : 'auto' }">
				<view class="modal-slider-track" :class="{ 'go-to-step2': completionStep === 2 }">
					<view class="modal-step-content" id="step1-content">
						<view class="loss-product-list">
							<view v-for="product in allProductsInTask" :key="product.id" class="loss-product-item">
								<text class="loss-product-name">{{ product.name }} (计划 {{ product.plannedQuantity
									}})</text>
								<input v-if="completionForm[product.id]" class="loss-quantity-input" type="number"
									placeholder="实际数量" v-model.number="completionForm[product.id].completedQuantity"
									@input="onCompletedQuantityInput(product.id, $event)" />
							</view>
						</view>
					</view>
					<view class="modal-step-content" id="step2-content">
						<view class="spoilagestages-tabs-container" v-if="spoilageStages.length > 0">
							<AnimatedTabs v-model="activeLossTab" :tabs="spoilageStages" />
						</view>
						<view class="loss-product-list">
							<view v-for="product in productsWithSpoilage" :key="product.id"
								class="loss-product-item spoilage-item">
								<text class="loss-product-name">{{ product.name }} (剩余 {{
									remainingSpoilageQuantity(product.id) }})</text>
								<input v-if="completionForm[product.id]" class="loss-quantity-input" type="number"
									placeholder="数量" :value="completionForm[product.id].spoilageDetails[activeLossTab]"
									@input="onSpoilageQuantityInput(product.id, activeLossTab, $event)" />
							</view>
						</view>
						<textarea class="spoilage-notes-input" v-model="completionNotes"
							placeholder="关于损耗情况的附加说明（可选）"></textarea>
					</view>
				</view>
			</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="handleCompletionModalBack">
					{{ completionStep === 1 ? '取消' : '上一步' }}
				</AppButton>
				<AppButton type="primary" @click="handleCompletionModalNext" :loading="isSubmitting"
					:disabled="!isStep1Valid">
					{{ completionStep === 1 ? (hasSpoilage ? '下一步' : '确认完成') : '确认完成' }}
				</AppButton>
			</view>
		</AppModal>

		<AppPopover :visible="popover.visible" :content="popover.content" :targetRect="popover.targetRect"
			placement="right" :offsetY="0" />
	</view>
</template>

<script setup lang="ts">
	import {
		ref,
		computed,
		reactive,
		watch,
		nextTick,
		getCurrentInstance
	} from 'vue';
	import {
		onLoad
	} from '@dcloudio/uni-app';
	import {
		useDataStore
	} from '@/store/data';
	import {
		useToastStore
	} from '@/store/toast';
	import {
		useTemperatureStore
	} from '@/store/temperature';
	import type {
		ProductionTaskDetailDto
	} from '@/types/api';
	import {
		getTaskDetail,
		updateTaskStatus,
		completeTask,
		getSpoilageStages
	} from '@/api/tasks';
	import AppModal from '@/components/AppModal.vue';
	import AppButton from '@/components/AppButton.vue';
	import DetailHeader from '@/components/DetailHeader.vue';
	import DetailPageLayout from '@/components/DetailPageLayout.vue';
	import ListItem from '@/components/ListItem.vue';
	import AnimatedTabs from '@/components/CssAnimatedTabs.vue';
	import AppPopover from '@/components/AppPopover.vue';
	import {
		formatWeight
	} from '@/utils/format';

	defineOptions({
		inheritAttrs: false
	});

	const dataStore = useDataStore();
	const toastStore = useToastStore();
	const temperatureStore = useTemperatureStore();
	const instance = getCurrentInstance();

	const isLoading = ref(true);
	const isSubmitting = ref(false);
	const task = ref<ProductionTaskDetailDto | null>(null);
	const taskId = ref<string | null>(null);
	const showCompleteTaskModal = ref(false);
	const isStarted = ref(false);
	const isReadOnly = ref(false);
	const selectedDoughFamilyId = ref<string | null>(null);
	const addedIngredientsMap = reactive<Record<string, Set<string>>>({});
	const collapsedSections = ref(new Set<string>());
	const selectedProductId = ref<string>('');

	const completionStep = ref(1);
	const completionForm = reactive<Record<string, {
		plannedQuantity : number;
		completedQuantity : number | null;
		spoilageDetails : Record<string, number | null>;
	}>>({});
	const completionNotes = ref('');
	const spoilageStages = ref<{
		key : string,
		label : string
	}[]>([]);
	const activeLossTab = ref('');
	const modalContentHeight = ref<number | string>('auto');


	const popover = reactive<{
		visible : boolean;
		content : string;
		targetRect : {
			left : number;
			top : number;
			width : number;
			height : number;
		} | null;
	}>({
		visible: false,
		content: '',
		targetRect: null,
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
			query.select(stepId).boundingClientRect(rect => {
				if (rect && rect.height) {
					modalContentHeight.value = rect.height;
				}
			}).exec();
		});
	};

	watch(showCompleteTaskModal, (visible) => {
		if (visible) {
			updateModalContentHeight();
		} else {
			modalContentHeight.value = 'auto';
		}
	});

	watch(completionStep, () => {
		updateModalContentHeight();
	});

	const resetCompletionForm = () => {
		completionStep.value = 1;
		completionNotes.value = '';
		Object.keys(completionForm).forEach(key => delete completionForm[key]);
		if (task.value) {
			task.value.items.forEach(item => {
				completionForm[item.id] = {
					plannedQuantity: item.plannedQuantity,
					completedQuantity: null,
					spoilageDetails: {},
				};
				spoilageStages.value.forEach(stage => {
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
		if (options?.from === 'history') {
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

	const loadTaskData = async (id : string) => {
		isLoading.value = true;
		try {
			temperatureStore.initTemperatureSettings();
			const response = await getTaskDetail(id, temperatureStore.settings);
			task.value = response;

			if (task.value.status === 'IN_PROGRESS' || task.value.status === 'COMPLETED' || task.value.status ===
				'CANCELLED') {
				isStarted.value = true;
				if (task.value.doughGroups.length > 0) {
					const firstDough = task.value.doughGroups[0];
					selectedDoughFamilyId.value = firstDough.familyId;
					if (firstDough.productDetails.length > 0) {
						selectedProductId.value = firstDough.productDetails[0].id;
					}
				}
			}
		} catch (error) {
			console.error('Failed to load task details:', error);
		} finally {
			isLoading.value = false;
		}
	}

	const productsWithSpoilage = computed(() => {
		return allProductsInTask.value
			.map(p => ({
				...p,
				spoilageQuantity: p.plannedQuantity - (completionForm[p.id]?.completedQuantity ?? p.plannedQuantity)
			}))
			.filter(p => p.spoilageQuantity > 0);
	});

	const hasSpoilage = computed(() => {
		return Object.values(completionForm).some(item =>
			item.completedQuantity !== null && item.completedQuantity < item.plannedQuantity
		);
	});

	const isStep1Valid = computed(() => {
		return Object.values(completionForm).every(item => item.completedQuantity !== null);
	});

	const remainingSpoilageQuantity = (productId : string) => {
		const productData = completionForm[productId];
		if (!productData) return 0;

		const totalSpoilage = productData.plannedQuantity - (productData.completedQuantity || 0);
		const reportedSpoilage = Object.values(productData.spoilageDetails).reduce((sum, current) => sum + (current ||
			0),
			0);

		return totalSpoilage - reportedSpoilage;
	};

	const onCompletedQuantityInput = (productId : string, event : any) => {
		const value = event.target?.value ?? event.detail.value;
		const numValue = value === '' ? null : Number(value);
		if (numValue !== null && numValue < 0) {
			completionForm[productId].completedQuantity = 0;
		} else {
			completionForm[productId].completedQuantity = numValue;
		}
	};

	const onSpoilageQuantityInput = (productId : string, stage : string, event : any) => {
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
				product.spoilageDetails[stage] = maxSpoilage -
					otherStagesSpoilage > 0 ? maxSpoilage -
				otherStagesSpoilage : null;
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
			const item : {
				productId : string;
				completedQuantity : number;
				spoilageDetails ?: {
					stage : string; quantity : number; notes ?: string
				}[];
			} = {
					productId,
					completedQuantity: data.completedQuantity!,
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
					throw new Error("损耗数量不一致");
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
			toastStore.show({
				message: '任务已完成',
				type: 'success'
			});
			setTimeout(() => uni.navigateBack(), 500);
		} catch (error) {
			console.error('Failed to complete task:', error);
		} finally {
			isSubmitting.value = false;
			showCompleteTaskModal.value = false;
		}
	};

	const toggleCollapse = (sectionName : string) => {
		const newSet = new Set(collapsedSections.value);
		if (newSet.has(sectionName)) {
			newSet.delete(sectionName);
		} else {
			newSet.add(sectionName);
		}
		collapsedSections.value = newSet;
	};

	const toggleIngredientAdded = (doughFamilyId : string, ingredientId : string) => {
		if (isReadOnly.value) return;
		// [核心新增] 增加振动反馈
		uni.vibrateShort({});
		if (!addedIngredientsMap[doughFamilyId]) {
			addedIngredientsMap[doughFamilyId] = new Set<string>();
		}

		const addedSet = addedIngredientsMap[doughFamilyId];
		if (addedSet.has(ingredientId)) {
			addedSet.delete(ingredientId);
		} else {
			addedSet.add(ingredientId);
		}
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
			await dataStore.fetchProductionData();
		} catch (error) {
			console.error('Failed to start task:', error);
		}
	};

	const selectDough = (familyId : string) => {
		if (!isStarted.value && !isReadOnly.value) return;
		selectedDoughFamilyId.value = familyId;
		const doughDetails = selectedDoughDetails.value;
		if (doughDetails && doughDetails.productDetails.length > 0) {
			selectedProductId.value = doughDetails.productDetails[0].id;
		} else {
			selectedProductId.value = '';
		}
	};

	// [核心修改] 修改 showExtraInfo 函数，使其通过点击行来触发
	const showExtraInfo = (info : string | null | undefined, ingredientId : string) => {
		if (!info) return; // 如果没有额外信息，则不显示 popover
		if (popover.visible && popover.content === info) {
			popover.visible = false;
			return;
		}
		// 查询图标元素的位置，让 popover 的箭头指向图标
		const query = uni.createSelectorQuery().in(instance);
		query.select('#info-icon-' + ingredientId).boundingClientRect((rect : UniApp.NodeInfo) => {
			if (rect) {
				popover.content = info;
				popover.targetRect = {
					left: rect.left,
					top: rect.top,
					width: rect.width,
					height: rect.height
				};
				popover.visible = true;
			}
		}).exec();
	};

	const hidePopover = () => {
		popover.visible = false;
	};

	const selectedDoughDetails = computed(() => {
		if (!task.value || !selectedDoughFamilyId.value) return null;
		return task.value.doughGroups.find(d => d.familyId === selectedDoughFamilyId.value) || null;
	});

	const selectedProductDetails = computed(() => {
		if (!selectedDoughDetails.value || !selectedProductId.value) return null;
		return selectedDoughDetails.value.productDetails.find(p => p.id === selectedProductId.value);
	});

	const productTabs = computed(() => {
		if (!selectedDoughDetails.value) return [];
		return selectedDoughDetails.value.productDetails.map(p => ({
			key: p.id,
			label: p.name,
		}));
	});
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';
	@include list-item-content-style;

	/* [新增] 定义折叠内容容器的动画 */
	.collapsible-content {
		max-height: 1000px;
		/* 定义一个足够大的最大高度，用于展开状态 */
		overflow: hidden;
		/* 关键：隐藏超出 max-height 的内容 */
		transition: max-height 0.35s ease-in-out;
		/* 为 max-height 属性添加平滑过渡动画 */
		box-sizing: border-box;
	}

	/* [新增] 定义折叠状态下的样式 */
	.collapsible-content.is-collapsed {
		max-height: 0;
		/* 折叠时，最大高度为0，内容被隐藏 */
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

	.card>.group-title:first-child {
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

	.recipe-table,
	.info-table {
		.table-header {
			border-bottom: 1px solid var(--border-color);
		}
	}

	.recipe-table {
		display: table;
		width: 100%;
		font-size: 14px;
		border-collapse: collapse;
		margin-top: 25px;

		.table-header,
		.table-row {
			display: table-row;
		}

		.table-header {
			color: var(--text-secondary);
			font-weight: 500;
		}

		.table-header.summary-header {
			background-color: transparent;
		}

		.table-row {
			color: var(--text-primary);
			transition: background-color 0.3s ease;
			border-bottom: 1px solid var(--border-color);
		}

		.table-row:last-child {
			border-bottom: none;
		}

		.table-row.is-added {
			background-color: #f0ebe5;
		}

		[class^="col-"] {
			display: table-cell;
			padding: 10px 4px;
			vertical-align: middle;
		}

		view.col-ingredient {
			min-width: 60px;
			word-break: break-word;
		}

		.col-brand {
			color: var(--text-secondary);
			min-width: 60px;
			white-space: nowrap;
			text-align: center;
		}

		.col-usage {
			text-align: right;
			white-space: nowrap;
		}

		.col-ingredient {
			width: 40%;
		}

		.col-brand {
			width: 30%;
		}

		.col-usage {
			width: 30%;
		}
	}

	.ingredient-name-cell {
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.info-icon-button {
		display: inline-flex;
		justify-content: center;
		align-items: center;
		vertical-align: middle;
		margin-left: 4px;
		width: 16px;
		height: 16px;
		padding: 0;
	}

	.info-icon {
		width: 16px;
		height: 16px;
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
		margin-top: 15px;
		font-size: 12px;
		color: var(--text-secondary);
		line-height: 1.6;

		.notes-title {
			font-weight: 600;
			display: block;
			margin-bottom: 5px;
		}

		.note-item {
			display: block;
		}
	}

	.info-table {
		font-size: 14px;
		color: var(--text-primary);
		display: table;
		width: 100%;
		border-collapse: collapse;
		margin-top: 25px;

		.table-header,
		.info-row {
			display: table-row;
		}

		.table-header {
			color: var(--text-secondary);
			font-weight: 500;
		}

		.info-row {
			border-bottom: 1px solid var(--border-color);

			&:last-child {
				border-bottom: none;
			}
		}

		[class^="col-"] {
			display: table-cell;
			padding: 8px 4px;
			vertical-align: middle;
			text-align: right;
			white-space: nowrap;
		}

		.col-product-name {
			text-align: left;
			width: 40%;
		}

		.col-quantity {
			width: 15%;
		}

		.col-dough-weight,
		.col-division-weight {
			width: 22.5%;
		}
	}

	.detail-table {
		margin-top: 15px;
	}

	.product-tabs-container {
		margin-top: 25px;
	}

	.spoilagestages-tabs-container {
		margin-top: 0px;
	}
</style>