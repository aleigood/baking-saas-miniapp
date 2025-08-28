<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader title="新建生产任务" />
		<DetailPageLayout>
			<view class="page-content">
				<!-- 日期选择 -->
				<view class="card">
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

				<!-- 数量汇总 -->
				<view class="summary-card">
					<pre v-if="summaryText" class="summary-text">{{ summaryText }}</pre>
					<view v-else class="summary-placeholder">待添加产品...</view>
				</view>

				<!-- 产品选择 -->
				<view class="card">
					<CssAnimatedTabs v-model="activeTab" :tabs="productTabs" />
					<view class="product-grid">
						<view v-for="product in productsInCurrentTab" :key="product.id" class="product-item">
							<view class="product-name">{{ product.name }}</view>
							<input class="quantity-input" type="number" placeholder="数量"
								v-model.number="taskQuantities[product.id]" @input="updateSummary" />
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

	const isLoading = ref(false);
	const isCreating = ref(false);

	const today = new Date().toISOString().split('T')[0];
	const taskForm = reactive({
		startDate: today,
		endDate: today,
	});

	const taskQuantities = reactive<Record<string, number | null>>({});
	const summaryText = ref('');
	const activeTab = ref('');

	onMounted(async () => {
		isLoading.value = true;
		if (!dataStore.dataLoaded.recipes) {
			await dataStore.fetchRecipesData();
		}
		// 初始化 activeTab 和 quantities
		if (productTabs.value.length > 0) {
			activeTab.value = productTabs.value[0].key;
		}
		dataStore.productList.forEach(p => {
			taskQuantities[p.id] = null;
		});
		isLoading.value = false;
	});

	// 将产品按类型分组
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

	// 为 Tabs 生成数据
	const productTabs = computed(() => {
		return Object.keys(groupedProducts.value).map(name => ({
			key: name,
			label: name
		}));
	});

	// 获取当前 Tab 下的产品列表
	const productsInCurrentTab = computed(() => {
		return groupedProducts.value[activeTab.value] || [];
	});

	// 更新汇总文本
	const updateSummary = () => {
		let text = '';
		for (const groupName in groupedProducts.value) {
			const productsInGroup = groupedProducts.value[groupName];
			const quantifiedProducts = productsInGroup
				.map(p => ({
					name: p.name,
					quantity: taskQuantities[p.id] || 0
				}))
				.filter(p => p.quantity > 0);

			if (quantifiedProducts.length > 0) {
				text += `【${groupName}】\n`;
				const columns : string[][] = [[], []];
				quantifiedProducts.forEach((p, index) => {
					columns[index % 2].push(`${p.name} x${p.quantity}`);
				});

				const maxRows = Math.max(columns[0].length, columns[1].length);
				for (let i = 0; i < maxRows; i++) {
					const left = columns[0][i] || '';
					const right = columns[1][i] || '';
					text += `${left.padEnd(10, ' ')}\t${right}\n`;
				}
				text += '\n';
			}
		}
		summaryText.value = text.trim();
	};

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
				toastStore.show({ message: res.warning, type: 'error', duration: 3000 });
			} else {
				toastStore.show({ message: '任务已创建', type: 'success' });
			}
			await dataStore.fetchProductionData();
			setTimeout(() => {
				uni.navigateBack();
			}, 500);

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
		background-color: #f0ebe5;
		border-radius: 12px;
		padding: 15px;
		min-height: 100px;
		margin-bottom: 20px;
		font-family: monospace;
	}

	.summary-text {
		font-size: 14px;
		color: var(--text-primary);
		white-space: pre-wrap;
		word-wrap: break-word;
	}

	.summary-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		min-height: 70px;
		color: var(--text-secondary);
	}

	.product-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 15px;
		margin-top: 20px;
	}

	.product-item {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.product-name {
		font-size: 15px;
	}

	.quantity-input {
		background-color: var(--bg-color);
		border-radius: 8px;
		padding: 10px;
		text-align: center;
		font-size: 15px;
		width: 100%;
		box-sizing: border-box;
	}
</style>