<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader title="新建任务" />
		<DetailPageLayout>
			<view class="page-content">
				<view class="card">
					<view class="card-title">生产日期</view>
					<view class="date-picker-row">
						<view class="date-picker-item">
							<label class="date-label">开始日期</label>
							<picker mode="date" :value="taskForm.startDate" @change="onDateChange($event, 'start')">
								<view class="picker-display">{{ taskForm.startDate }}</view>
							</picker>
						</view>
						<view class="date-picker-item">
							<label class="date-label">结束日期</label>
							<picker mode="date" :value="taskForm.endDate" :start="taskForm.startDate"
								@change="onDateChange($event, 'end')">
								<view class="picker-display">{{ taskForm.endDate }}</view>
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
									<view v-for="(item, itemIndex) in group.items" :key="itemIndex"
										class="summary-item">
										{{ item }}<span v-if="itemIndex < group.items.length - 1">、 </span>
									</view>
								</view>
							</view>
						</view>
						<view v-else class="summary-placeholder">产品数量汇总</view>
					</view>
					<CssAnimatedTabs v-model="activeTab" :tabs="productTabs" />
					<view class="product-grid">
						<view v-for="product in productsInCurrentTab" :key="product.id" class="product-item">
							<text class="product-name">{{ product.name }}</text>
							<input class="quantity-input" type="number" placeholder="数量"
								:value="taskQuantities[product.id]" @input="onQuantityInput(product.id, $event)" />
						</view>
					</view>
				</view>

				<AppButton type="primary" full-width :disabled="!isCreatable" @click="handleCreateTasks"
					:loading="isCreating">
					{{ isCreating ? '' : '创建任务' }}
				</AppButton>
			</view>
		</DetailPageLayout>
		<Toast />
	</view>
</template>

<script setup lang="ts">
	import { ref, computed, reactive, onMounted } from 'vue';
	import { useDataStore } from '@/store/data';
	import { useToastStore } from '@/store/toast';
	import { useUiStore } from '@/store/ui';
	import { createTask } from '@/api/tasks';
	import AppButton from '@/components/AppButton.vue';
	import DetailHeader from '@/components/DetailHeader.vue';
	import DetailPageLayout from '@/components/DetailPageLayout.vue';
	import CssAnimatedTabs from '@/components/CssAnimatedTabs.vue';
	import Toast from '@/components/Toast.vue';
	import type { ProductListItem } from '@/types/api';

	defineOptions({
		inheritAttrs: false
	});

	const dataStore = useDataStore();
	const toastStore = useToastStore();
	const uiStore = useUiStore();

	const isLoading = ref(false);
	const isCreating = ref(false);

	const today = new Date().toISOString().split('T')[0];
	const taskForm = reactive({
		startDate: today,
		endDate: today,
	});

	const taskQuantities = reactive<Record<string, number | null>>({});
	const summaryGroups = ref<{ name : string; items : string[] }[]>([]);
	const activeTab = ref('');

	onMounted(async () => {
		isLoading.value = true;
		if (!dataStore.dataLoaded.recipes) {
			await dataStore.fetchRecipesData();
		}
		if (productTabs.value.length > 0) {
			activeTab.value = productTabs.value[0].key;
		}
		dataStore.productList.forEach(p => {
			taskQuantities[p.id] = null;
		});
		isLoading.value = false;
	});

	const onQuantityInput = (productId : string, event : any) => {
		const value = event.target?.value ?? event.detail.value;
		taskQuantities[productId] = value === '' ? null : Number(value);
		updateSummary();
	};

	const groupedProducts = computed(() => {
		return dataStore.productList.reduce((groups, product) => {
			const groupName = product.type;
			if (!groups[groupName]) {
				groups[groupName] = [];
			}
			groups[groupName].push(product);
			return groups;
		}, {} as Record<string, ProductListItem[]>);
	});

	const productTabs = computed(() => {
		return Object.keys(groupedProducts.value).map(name => ({ key: name, label: name }));
	});

	const productsInCurrentTab = computed(() => {
		return groupedProducts.value[activeTab.value] || [];
	});

	const isCreatable = computed(() => {
		return Object.values(taskQuantities).some(qty => qty && qty > 0);
	});

	const onDateChange = (e : any, type : 'start' | 'end') => {
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
		const groups : { name : string; items : string[] }[] = [];
		for (const groupName in groupedProducts.value) {
			const productsInGroup = groupedProducts.value[groupName];
			const quantifiedProducts = productsInGroup
				.map(p => ({ name: p.name, quantity: taskQuantities[p.id] || 0 }))
				.filter(p => p.quantity > 0);

			if (quantifiedProducts.length > 0) {
				groups.push({
					name: groupName,
					items: quantifiedProducts.map(p => `${p.name} x${p.quantity}`),
				});
			}
		}
		summaryGroups.value = groups;
	};

	const handleCreateTasks = async () => {
		const productsToCreate = Object.entries(taskQuantities)
			.filter(([, quantity]) => quantity && quantity > 0)
			.map(([productId, quantity]) => ({
				productId,
				quantity: Number(quantity),
			}));

		if (productsToCreate.length === 0) {
			toastStore.show({ message: '请输入要生产的数量', type: 'error' });
			return;
		}

		isCreating.value = true;
		try {
			const payload = {
				startDate: new Date(taskForm.startDate).toISOString(),
				endDate: new Date(taskForm.endDate).toISOString(),
				products: productsToCreate,
			};
			const res = await createTask(payload);

			if (res.warning) {
				uiStore.setNextPageToast({ message: res.warning, type: 'error', duration: 3000 });
			} else {
				uiStore.setNextPageToast({ message: '任务已创建', type: 'success' });
			}

			await dataStore.fetchProductionData();

			uni.navigateBack();

		} catch (error) {
			console.error('Failed to create tasks:', error);
		} finally {
			isCreating.value = false;
		}
	};
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

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

	.picker-display {
		background-color: var(--bg-color);
		padding: 10px;
		border-radius: 8px;
		text-align: center;
		font-size: 15px;
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
	}

	.product-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 0 10%; // 保持向中间靠拢
	}

	.product-name {
		width: calc(50% - 6px); // 占据50%宽度并减去一半的gap
		font-size: 15px;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		text-align: right;
	}

	.quantity-input {
		width: calc(50% - 6px); // 占据50%宽度并减去一半的gap
		background-color: var(--bg-color);
		border-radius: 8px;
		padding: 0 10px;
		text-align: center;
		font-size: 15px;
		box-sizing: border-box;
		border: 1px solid var(--border-color);
		height: 36px;
	}
</style>