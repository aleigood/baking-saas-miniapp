<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader title="任务详情" />
		<DetailPageLayout>
			<view class="page-content" v-if="!isLoading && task">
				<view class="detail-page">
					<view v-if="task.stockWarning" class="warning-card">
						<view class="warning-content">
							<text class="warning-text">{{ task.stockWarning }}</text>
						</view>
					</view>

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

					<view v-if="!isStarted" class="start-task-button-container">
						<AppButton type="primary" full-width @click="handleStartTask">
							开始制作
						</AppButton>
					</view>

					<template v-if="isStarted && selectedDoughDetails">
						<view class="card">
							<view class="group-title" @click="toggleCollapse(selectedDoughDetails.familyId)">
								<span>{{ selectedDoughDetails.familyName }} (总重:
									{{ selectedDoughDetails.totalDoughWeight.toFixed(0) }}g)</span>
								<span class="arrow"
									:class="{ collapsed: collapsedSections.has(selectedDoughDetails.familyId) }">&#10095;</span>
							</view>
							<view v-show="!collapsedSections.has(selectedDoughDetails.familyId)">
								<view class="recipe-table">
									<view class="table-header">
										<text class="col-ingredient">原料</text>
										<text class="col-brand">品牌</text>
										<text class="col-usage">用量</text>
									</view>
									<view v-for="ing in selectedDoughDetails.mainDoughIngredients" :key="ing.id"
										class="table-row" :class="{ 'is-added': addedIngredients.has(ing.id) }"
										@longpress.prevent="toggleIngredientAdded(ing.id)">
										<text class="col-ingredient">{{ ing.name }}</text>
										<text class="col-brand">{{ ing.brand || '-' }}</text>
										<text class="col-usage">{{ ing.weightInGrams.toFixed(1) }}g</text>
									</view>
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
							<view v-show="!collapsedSections.has('doughSummary')">
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
											class="col-dough-weight">{{ product.totalBaseDoughWeight.toFixed(0) }}g</text>
										<text
											class="col-division-weight">{{ product.divisionWeight.toFixed(0) }}g</text>
									</view>
								</view>
							</view>
							<view class="group-title" @click="toggleCollapse('productSummary')">
								<span>产品汇总</span>
								<span class="arrow"
									:class="{ collapsed: collapsedSections.has('productSummary') }">&#10095;</span>
							</view>
							<view v-show="!collapsedSections.has('productSummary')">
								<view class="animated-tabs-container" v-if="productTabs.length > 0">
									<AnimatedTabs v-model="selectedProductId" :tabs="productTabs" />
								</view>

								<template v-if="selectedProductDetails">
									<template
										v-if="selectedProductDetails.mixIns.length > 0 || selectedProductDetails.fillings.length > 0 || selectedProductDetails.procedure.length > 0">
										<template v-if="selectedProductDetails.mixIns.length > 0">
											<view class="recipe-table detail-table">
												<view class="table-header">
													<text class="col-ingredient">辅料</text>
													<text class="col-brand">品牌</text>
													<text class="col-usage">总用量</text>
												</view>
												<view v-for="ing in selectedProductDetails.mixIns" :key="ing.id"
													class="table-row">
													<text class="col-ingredient">{{ ing.name }}</text>
													<text class="col-brand">{{ ing.brand || '-' }}</text>
													<text class="col-usage">{{ ing.weightInGrams.toFixed(1) }}g</text>
												</view>
											</view>
										</template>

										<template v-if="selectedProductDetails.fillings.length > 0">
											<view class="recipe-table detail-table">
												<view class="table-header">
													<text class="col-ingredient">馅料</text>
													<text class="col-brand">品牌</text>
													<text class="col-usage">用量/个</text>
												</view>
												<view v-for="ing in selectedProductDetails.fillings" :key="ing.id"
													class="table-row">
													<text class="col-ingredient">{{ ing.name }}</text>
													<text class="col-brand">{{ ing.brand || '-' }}</text>
													<text class="col-usage">{{ ing.weightInGrams.toFixed(1) }}g</text>
												</view>
											</view>
										</template>

										<view v-if="selectedProductDetails.procedure.length > 0"
											class="procedure-notes">
											<text class="notes-title">制作要点:</text>
											<text v-for="(step, stepIndex) in selectedProductDetails.procedure"
												:key="stepIndex" class="note-item">{{ stepIndex + 1 }}.
												{{ step }}</text>
										</view>
									</template>
								</template>
							</view>
						</view>
					</template>

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

		<AppModal v-model:visible="showCompleteTaskModal" title="完成任务并提报损耗">
			<view class="modal-body-footer-wrapper">
				<view class="modal-main-content">
					<AnimatedTabs v-model="activeLossTab" :tabs="lossTabs" />
					<view class="loss-product-list">
						<view v-for="product in allProductsInTask" :key="product.id" class="loss-product-item">
							<text class="loss-product-name">{{ product.name }} (剩余
								{{ getRemainingQuantity(product) }}/{{ product.plannedQuantity }})</text>
							<input class="loss-quantity-input" type="number" placeholder="损耗数量"
								:value="spoilageQuantities[activeLossTab][product.id]"
								@input="onSpoilageQuantityInput(activeLossTab, product.id, $event)" />
						</view>
					</view>
				</view>

				<view class="modal-actions">
					<AppButton type="secondary" @click="showCompleteTaskModal = false">取消</AppButton>
					<AppButton type="primary" @click="handleConfirmComplete" :loading="isSubmitting">
						{{ isSubmitting ? '提交中...' : '确认完成' }}
					</AppButton>
				</view>
			</view>
		</AppModal>
	</view>
</template>

<script setup lang="ts">
	import {
		ref,
		computed,
		reactive,
		watch
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
	// [核心修改] 导入新的 DTO 类型
	import type {
		ProductionTaskDetailDto,
		TaskCompletionItem
	} from '@/types/api';
	import {
		getTaskDetail,
		updateTaskStatus,
		completeTask
	} from '@/api/tasks';
	import AppModal from '@/components/AppModal.vue';
	import AppButton from '@/components/AppButton.vue';
	import DetailHeader from '@/components/DetailHeader.vue';
	import DetailPageLayout from '@/components/DetailPageLayout.vue';
	import ListItem from '@/components/ListItem.vue';
	import AnimatedTabs from '@/components/CssAnimatedTabs.vue';

	defineOptions({
		inheritAttrs: false
	});

	const dataStore = useDataStore();
	const toastStore = useToastStore();
	const temperatureStore = useTemperatureStore();

	const isLoading = ref(true);
	const isSubmitting = ref(false);
	// [核心修改] task 的类型更新为新的 DTO
	const task = ref<ProductionTaskDetailDto | null>(null);
	const showCompleteTaskModal = ref(false);
	const isStarted = ref(false);
	const selectedDoughFamilyId = ref<string | null>(null);
	const addedIngredients = ref(new Set<string>());
	const collapsedSections = ref(new Set<string>());
	const selectedProductId = ref<string>('');

	const lossTabs = ref([{
		key: 'kneading',
		label: '揉面失败'
	}, {
		key: 'fermentation',
		label: '发酵失败'
	}, {
		key: 'shaping',
		label: '整形失败'
	}, {
		key: 'baking',
		label: '烘烤失败'
	}, {
		key: 'other',
		label: '其他原因'
	},]);
	const activeLossTab = ref('kneading');
	const spoilageQuantities = reactive<Record<string, Record<string, number | null>>>({
		kneading: {},
		fermentation: {},
		shaping: {},
		baking: {},
		other: {},
	});

	const openCompleteTaskModal = () => {
		showCompleteTaskModal.value = true;
	};

	// [核心修改] 计算属性现在直接从 task.value.items 获取数据
	const allProductsInTask = computed(() => {
		return task.value?.items || [];
	});

	const getRemainingQuantity = (product : TaskCompletionItem) => {
		let totalSpoilage = 0;
		for (const stageKey in spoilageQuantities) {
			const quantity = spoilageQuantities[stageKey][product.id];
			if (quantity && Number(quantity) > 0) {
				totalSpoilage += Number(quantity);
			}
		}
		return product.plannedQuantity - totalSpoilage;
	};


	watch(allProductsInTask, (newProducts) => {
		if (newProducts.length > 0) {
			const initialQuantities : Record<string, null> = {};
			for (const product of newProducts) {
				initialQuantities[product.id] = null;
			}
			spoilageQuantities.kneading = { ...initialQuantities };
			spoilageQuantities.fermentation = { ...initialQuantities };
			spoilageQuantities.shaping = { ...initialQuantities };
			spoilageQuantities.baking = { ...initialQuantities };
			spoilageQuantities.other = { ...initialQuantities };
		}
	}, {
		immediate: true
	});

	// [核心修改] 增加损耗数量校验
	const onSpoilageQuantityInput = (stage : string, productId : string, event : any) => {
		const value = event.target?.value ?? event.detail.value;
		const product = allProductsInTask.value.find(p => p.id === productId);
		if (!product) return;

		// 计算除当前输入框外，其他所有阶段的总损耗
		let otherStagesSpoilage = 0;
		for (const stageKey in spoilageQuantities) {
			if (stageKey !== stage) {
				const quantity = spoilageQuantities[stageKey][productId];
				if (quantity && Number(quantity) > 0) {
					otherStagesSpoilage += Number(quantity);
				}
			}
		}

		const newQuantity = value === '' ? null : Number(value);
		const totalSpoilage = otherStagesSpoilage + (newQuantity || 0);

		if (totalSpoilage > product.plannedQuantity) {
			toastStore.show({
				message: `总损耗不能超过计划数量 ${product.plannedQuantity}`,
				type: 'error',
				duration: 2000
			});
			// 使用 nextTick 确保在DOM更新后再设置值，防止双向绑定问题
			nextTick(() => {
				if (spoilageQuantities[stage]) {
					const maxAllowed = product.plannedQuantity - otherStagesSpoilage;
					spoilageQuantities[stage][productId] = maxAllowed > 0 ? maxAllowed : null;
				}
			});
		} else {
			if (spoilageQuantities[stage]) {
				spoilageQuantities[stage][productId] = newQuantity;
			}
		}
	};

	const handleConfirmComplete = async () => {
		if (!task.value) return;

		const losses = [];
		for (const stage in spoilageQuantities) {
			for (const productId in spoilageQuantities[stage]) {
				const quantity = spoilageQuantities[stage][productId];
				if (quantity !== null && quantity > 0) {
					losses.push({
						productId,
						stage,
						quantity,
					});
				}
			}
		}

		isSubmitting.value = true;
		try {
			await completeTask(task.value.id, {
				losses
			});
			toastStore.show({
				message: '任务已完成',
				type: 'success'
			});
			await dataStore.fetchProductionData();
			setTimeout(() => {
				uni.navigateBack();
			}, 500);
		} catch (error) {
			console.error('Failed to complete task:', error);
		} finally {
			isSubmitting.value = false;
			showCompleteTaskModal.value = false;
		}
	};

	onLoad(async (options) => {
		const taskId = options?.taskId;
		if (!taskId) {
			return;
		}
		try {
			temperatureStore.initTemperatureSettings();
			// [核心修改] API 返回的就是处理好的数据，直接赋值
			const response = await getTaskDetail(taskId, temperatureStore.settings);
			task.value = response;

			if (task.value.status === 'IN_PROGRESS' || task.value.status === 'COMPLETED') {
				isStarted.value = true;
				// [核心修改] 初始化时默认选中第一个面团和该面团的第一个产品
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
	});

	const toggleCollapse = (sectionName : string) => {
		const newSet = new Set(collapsedSections.value);
		if (newSet.has(sectionName)) {
			newSet.delete(sectionName);
		} else {
			newSet.add(sectionName);
		}
		collapsedSections.value = newSet;
	};

	const toggleIngredientAdded = (id : string) => {
		const newSet = new Set(addedIngredients.value);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		addedIngredients.value = newSet;
	};

	const handleStartTask = async () => {
		if (!task.value) return;
		try {
			await updateTaskStatus(task.value.id, 'IN_PROGRESS');
			isStarted.value = true;
			task.value.status = 'IN_PROGRESS';
			toastStore.show({
				message: '任务已开始',
				type: 'success'
			});
			await dataStore.fetchProductionData();
			if (task.value.doughGroups.length > 0) {
				selectedDoughFamilyId.value = task.value.doughGroups[0].familyId;
			}
		} catch (error) {
			console.error('Failed to start task:', error);
		}
	};

	const selectDough = (familyId : string) => {
		selectedDoughFamilyId.value = familyId;
		// [核心修改] 当切换面团时，自动选中该面团下的第一个产品
		const doughDetails = selectedDoughDetails.value;
		if (doughDetails && doughDetails.productDetails.length > 0) {
			selectedProductId.value = doughDetails.productDetails[0].id;
		} else {
			selectedProductId.value = '';
		}
	};

	// [核心重构] 移除 groupedDoughs 计算属性，直接使用 task.value.doughGroups
	// [核心重构] selectedDoughDetails 现在是一个简单的查找
	const selectedDoughDetails = computed(() => {
		if (!task.value || !selectedDoughFamilyId.value) return null;
		return task.value.doughGroups.find(d => d.familyId === selectedDoughFamilyId.value) || null;
	});

	// [核心重构] selectedProductDetails 现在是一个简单的查找
	const selectedProductDetails = computed(() => {
		if (!selectedDoughDetails.value || !selectedProductId.value) return null;
		return selectedDoughDetails.value.productDetails.find(p => p.id === selectedProductId.value);
	});

	// [核心重构] productTabs 现在是一个简单的映射
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

	/* [核心新增] 对话框内部的flex布局容器 */
	.modal-body-footer-wrapper {
		display: flex;
		flex-direction: column;
		/* 通过AppModal的max-height和此处的flex布局来控制高度 */
		/* 注意：直接设置height: 100%可能在某些小程序中有问题，依赖flex:1来拉伸 */
	}

	/* [核心新增] 可滚动的主内容区 */
	.modal-main-content {
		flex: 1;
		/* 占据所有可用垂直空间 */
		min-height: 0;
		/* flex布局中允许内容区缩小的关键 */
		overflow-y: auto;
		/* 内容超长时出现滚动条 */
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
		width: 85px;
		box-sizing: border-box;
		border: 1px solid var(--border-color);
		height: 36px;
		flex-shrink: 0;
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

	.start-task-button-container,
	.bottom-actions-container {
		margin-top: 20px;
	}

	.group-title {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary);
		border: none;
		margin-top: 25px;
		padding: 4px 10px 4px 15px;
		position: relative;

		&::before {
			content: '';
			position: absolute;
			left: 0;
			top: 50%;
			transform: translateY(-50%);
			width: 4px;
			height: 16px;
			background-color: var(--primary-color, #42b983);
			border-radius: 2px;
		}
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

	.recipe-table {
		display: table;
		width: 100%;
		font-size: 14px;
		border-collapse: collapse;
		margin-top: 15px;

		.table-header,
		.table-row {
			display: table-row;
		}

		.table-header {
			color: var(--text-secondary);
			font-weight: 500;
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
			background-color: #dcccc0;
		}

		[class^="col-"] {
			display: table-cell;
			padding: 10px 4px;
			vertical-align: middle;
		}

		.col-ingredient {
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
		margin-top: 15px;

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

	.animated-tabs-container {
		margin-top: 10px;
	}
</style>