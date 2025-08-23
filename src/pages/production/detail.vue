<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader title="任务详情" />
		<DetailPageLayout>
			<view class="page-content" v-if="!isLoading && task">
				<view class="detail-page">
					<view class="card-full-bleed-list">
						<view class="card-title-wrapper">
							<span class="card-title">面团列表</span>
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

					<template v-if="isStarted && selectedDoughDetails">
						<view class="card">
							<view class="group-title">
								<span>{{ selectedDoughDetails.familyName }} (总重:
									{{ selectedDoughDetails.totalDoughWeight.toFixed(0) }}g)</span>
							</view>
							<view class="recipe-table-container-full-bleed">
								<view class="recipe-table">
									<view class="table-header">
										<text class="col-ingredient">原料</text>
										<text class="col-brand">品牌</text>
										<text class="col-usage">用量</text>
										<text class="col-action">操作</text>
									</view>
									<view v-for="ing in selectedDoughDetails.mainDoughIngredients" :key="ing.id"
										class="table-row" :class="{ 'is-added': addedIngredients.has(ing.id) }">
										<text class="col-ingredient">{{ ing.name }}</text>
										<text class="col-brand">{{ ing.brand || '-' }}</text>
										<text class="col-usage">{{ ing.weightInGrams.toFixed(1) }}g</text>
										<view class="col-action">
											<view class="action-tag"
												:class="{ 'is-added': addedIngredients.has(ing.id) }"
												@click="!addedIngredients.has(ing.id) && addIngredient(ing.id)"
												@longpress.prevent="removeIngredient(ing.id)">
												{{ addedIngredients.has(ing.id) ? '已添加' : '添加' }}
											</view>
										</view>
									</view>
								</view>
								<view v-if="selectedDoughDetails.mainDoughProcedure.length > 0" class="procedure-notes">
									<text class="notes-title">制作要点:</text>
									<text v-for="(step, stepIndex) in selectedDoughDetails.mainDoughProcedure"
										:key="stepIndex" class="note-item">{{ stepIndex + 1 }}. {{ step }}</text>
								</view>
							</view>

							<view class="group-title">面团汇总</view>
							<view class="recipe-table-container-full-bleed">
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

							<view v-for="product in selectedDoughDetails.products" :key="product.id">
								<template
									v-if="product.mixIns.length > 0 || product.fillings.length > 0 || product.procedure.length > 0">
									<view class="group-title">{{product.name}}</view>
									<view class="recipe-table-container-full-bleed">
										<view v-if="product.mixIns.length > 0" class="recipe-table detail-table">
											<view class="table-header">
												<text class="col-ingredient">辅料</text>
												<text class="col-brand">品牌</text>
												<text class="col-usage">总用量</text>
											</view>
											<view v-for="ing in product.mixIns" :key="ing.id" class="table-row">
												<text class="col-ingredient">{{ ing.name }}</text>
												<text class="col-brand">{{ ing.brand || '-' }}</text>
												<text class="col-usage">{{ ing.totalWeightInGrams.toFixed(1) }}g</text>
											</view>
										</view>
										<view v-if="product.fillings.length > 0" class="recipe-table detail-table">
											<view class="table-header">
												<text class="col-ingredient">馅料</text>
												<text class="col-brand">品牌</text>
												<text class="col-usage">用量/个</text>
											</view>
											<view v-for="ing in product.fillings" :key="ing.id" class="table-row">
												<text class="col-ingredient">{{ ing.name }}</text>
												<text class="col-brand">{{ ing.brand || '-' }}</text>
												<text class="col-usage">{{ ing.weightInGrams.toFixed(1) }}g</text>
											</view>
										</view>
										<view v-if="product.procedure.length > 0" class="procedure-notes">
											<text class="notes-title">制作要点:</text>
											<text v-for="(step, stepIndex) in product.procedure" :key="stepIndex"
												class="note-item">{{ stepIndex + 1 }}. {{ step }}</text>
										</view>
									</view>
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

		<AppModal v-model:visible="showCompleteTaskModal" title="确认完成任务">
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
	const task = ref<any | null>(null);
	const showCompleteTaskModal = ref(false);
	const isStarted = ref(false);
	const selectedDoughFamilyId = ref<string | null>(null);
	const addedIngredients = ref(new Set<string>());

	onLoad(async (options) => {
		const taskId = options?.taskId;
		if (!taskId) { return; }
		try {
			const response = await getTaskDetail(taskId);
			if ('items' in response) {
				task.value = response;
				if (task.value.status === 'IN_PROGRESS' || task.value.status === 'COMPLETED') {
					isStarted.value = true;
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

	const addIngredient = (id : string) => {
		addedIngredients.value.add(id);
	};
	const removeIngredient = (id : string) => {
		addedIngredients.value.delete(id);
	};

	const handleStartTask = async () => {
		if (!task.value) return;
		try {
			await updateTaskStatus(task.value.id, 'IN_PROGRESS');
			isStarted.value = true;
			task.value.status = 'IN_PROGRESS';
			toastStore.show({ message: '任务已开始', type: 'success' });
			await dataStore.fetchProductionData();
			if (groupedDoughs.value.length > 0) {
				selectedDoughFamilyId.value = groupedDoughs.value[0].familyId;
			}
		} catch (error) { console.error('Failed to start task:', error); }
	};

	const selectDough = (familyId : string) => {
		selectedDoughFamilyId.value = selectedDoughFamilyId.value === familyId ? null : familyId;
	};

	const groupedDoughs = computed(() => {
		if (!task.value || !task.value.items) return [];
		const doughsMap = new Map<string, { familyName : string; products : any[] }>();
		task.value.items.forEach((item : any) => {
			const familyId = item.product.recipeVersion.family.id;
			const familyName = item.product.recipeVersion.family.name;
			if (!doughsMap.has(familyId)) {
				doughsMap.set(familyId, { familyName, products: [] });
			}
			doughsMap.get(familyId)!.products.push({ ...item.product, quantity: item.quantity });
		});
		return Array.from(doughsMap.entries()).map(([familyId, data]) => ({
			familyId,
			familyName: data.familyName,
			productsDescription: data.products.map(p => `${p.name} x${p.quantity}`).join(', '),
		}));
	});

	const selectedDoughDetails = computed(() => {
		if (!task.value || !selectedDoughFamilyId.value) return null;

		const itemsForSelectedDough = task.value.items.filter(
			(item : any) => item.product.recipeVersion.family.id === selectedDoughFamilyId.value
		);
		if (itemsForSelectedDough.length === 0) return null;

		const firstItem = itemsForSelectedDough[0];
		const familyName = firstItem.product.recipeVersion.family.name;
		const mainDoughInfo = firstItem.product.recipeVersion.doughs[0];

		const mainDoughIngredientsMap = new Map<string, any>();
		let totalDoughWeight = 0;

		itemsForSelectedDough.forEach((item : any) => {
			const product = item.product;
			const recipeVersion = product.recipeVersion;
			recipeVersion.doughs.forEach((dough : any) => {
				const isMainDough = dough.id === mainDoughInfo.id;
				let totalFlourRatio = 0;
				dough.ingredients.forEach((ing : any) => {
					if (ing.ingredient?.isFlour) totalFlourRatio += ing.ratio;
				});
				if (totalFlourRatio === 0) totalFlourRatio = 100;
				const weightPerRatioPoint = product.baseDoughWeight / totalFlourRatio;
				dough.ingredients.forEach((ing : any) => {
					const weight = weightPerRatioPoint * ing.ratio * item.quantity;
					if (isMainDough) {
						totalDoughWeight += weight;
						const ingId = ing.ingredient?.id || ing.linkedPreDough?.id;
						if (!ingId) return;
						const existing = mainDoughIngredientsMap.get(ingId);
						if (existing) {
							existing.weightInGrams += weight;
						} else {
							mainDoughIngredientsMap.set(ingId, {
								id: ingId,
								name: ing.ingredient?.name || ing.linkedPreDough.name,
								brand: ing.ingredient?.activeSku?.brand || null,
								weightInGrams: weight,
							});
						}
					}
				});
			});
		});

		const productsDetails = itemsForSelectedDough.map((item : any) => {
			const product = item.product;
			let totalMixInWeight = 0;

			const mixIns = product.ingredients
				.filter((ing : any) => ing.type === 'MIX_IN' && ing.ingredient)
				.map((ing : any) => {
					let productFlourWeight = 0;
					let totalFlourRatio = 0;
					product.recipeVersion.doughs[0].ingredients.forEach((i : any) => {
						if (i.ingredient?.isFlour) totalFlourRatio += i.ratio;
					});
					if (totalFlourRatio > 0) {
						const weightPerRatioPoint = product.baseDoughWeight / totalFlourRatio;
						product.recipeVersion.doughs[0].ingredients.forEach((i : any) => {
							if (i.ingredient?.isFlour) productFlourWeight += weightPerRatioPoint * i.ratio;
						});
					}
					const weight = (productFlourWeight * ing.ratio / 100) * item.quantity;
					totalMixInWeight += weight;
					return {
						id: ing.ingredient.id,
						name: ing.ingredient.name,
						brand: ing.ingredient.activeSku?.brand,
						totalWeightInGrams: weight,
					};
				});

			const fillings = product.ingredients
				.filter((ing : any) => ing.type === 'FILLING')
				.map((ing : any) => ({
					id: ing.ingredient?.id || ing.linkedExtra?.id,
					name: ing.ingredient?.name || ing.linkedExtra.name,
					// [修改] 增加 brand 字段的提取，使其与辅料的数据结构一致
					brand: ing.ingredient?.activeSku?.brand || null,
					weightInGrams: ing.weightInGrams,
				}));

			return {
				id: product.id,
				name: product.name,
				quantity: item.quantity,
				totalBaseDoughWeight: product.baseDoughWeight * item.quantity,
				divisionWeight: product.baseDoughWeight + (totalMixInWeight / item.quantity),
				mixIns,
				fillings,
				procedure: product.procedure || [],
			};
		});

		return {
			familyId: selectedDoughFamilyId.value,
			familyName,
			totalDoughWeight,
			mainDoughIngredients: Array.from(mainDoughIngredientsMap.values()),
			mainDoughProcedure: mainDoughInfo.procedure || [],
			products: productsDetails,
		};
	});

	const openCompleteTaskModal = () => { /* ... */ };
	const handleConfirmCompleteTask = async () => { /* ... */ };
	const getTotalQuantity = (task : ProductionTaskDetailDto) => { /* ... */ };
	const formattedDate = computed(() => { /* ... */ });
	const creatorName = computed(() => { /* ... */ });
	const totalQuantity = computed(() => { /* ... */ });
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
		padding-top: 20px;
		padding-bottom: 10px;
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

	.recipe-table-container-full-bleed {
		background-color: #faf8f5;
		border-radius: 16px;
		margin-top: 15px;
		padding: 15px 0;
		overflow: hidden;
	}

	.group-title {
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary);
		padding: 15px 5px 0 5px;
	}

	.sub-group-title {
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: 10px;
		margin-top: 15px;
		padding: 0 5px;
	}

	.recipe-table {
		display: table;
		width: 100%;
		font-size: 14px;
		border-collapse: collapse;

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
			position: relative;

			&.is-added {
				background-color: #e6f7d5;
			}
		}

		.table-row:not(:last-child)::after {
			content: '';
			position: absolute;
			bottom: 0;
			left: 15px;
			right: 15px;
			height: 1px;
			background-color: var(--border-color);
		}


		[class^="col-"] {
			display: table-cell;
			padding: 10px 15px;
			vertical-align: middle;
		}

		.col-usage {
			text-align: right;
			white-space: nowrap;
		}

		.col-brand {
			color: var(--text-secondary);
			min-width: 60px;
			white-space: nowrap;
			text-align: center;
		}

		.col-action {
			width: 60px;
			text-align: center;
		}
	}

	.action-tag {
		font-size: 12px;
		font-weight: 500;
		padding: 4px 12px;
		border-radius: 15px;
		background-color: #f3e9e3;
		color: var(--text-secondary);
		display: inline-block;
		transition: background-color 0.3s, color 0.3s;

		&.is-added {
			background-color: #5ac725;
			color: white;
		}
	}

	.procedure-notes {
		margin-top: 15px;
		font-size: 12px;
		color: var(--text-secondary);
		line-height: 1.6;
		padding: 0 15px 15px 15px;

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

		.table-header,
		.info-row {
			display: table-row;
		}

		.table-header {
			color: var(--text-secondary);
			font-weight: 500;
		}

		.info-row {
			position: relative;
		}

		.info-row:not(:last-child)::after {
			content: '';
			position: absolute;
			bottom: 0;
			left: 15px;
			right: 15px;
			height: 1px;
			background-color: var(--border-color);
		}

		[class^="col-"] {
			display: table-cell;
			padding: 10px 15px;
			vertical-align: middle;
			text-align: right;
			white-space: nowrap;
		}

		.col-product-name {
			text-align: left;
		}
	}

	.detail-table {
		margin-top: 10px;

		.table-row {
			background-color: transparent !important;
		}
	}
</style>