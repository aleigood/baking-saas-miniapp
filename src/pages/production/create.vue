<template>
	<view class="page-container">
		<view class="page-header">
			<view class="detail-header">
				<view class="back-btn" @click="navigateBack">&#10094;</view>
				<h2 class="detail-title">新建生产任务</h2>
			</view>
		</view>
		<view class="page-content">
			<view class="loading-spinner" v-if="isLoading">
				<text>加载中...</text>
			</view>
			<template v-else>
				<view class="card">
					<view v-for="(group, groupName) in groupedProducts" :key="groupName" class="product-group">
						<view class="group-title">{{ groupName }}</view>
						<view v-for="product in group" :key="product.id" class="product-item">
							<view class="product-name">{{ product.name }}</view>
							<view class="quantity-control">
								<button class="btn-stepper" @click="decreaseQuantity(product.id)">-</button>
								<input class="input-stepper" type="number"
									v-model.number="taskQuantities[product.id]" />
								<button class="btn-stepper" @click="increaseQuantity(product.id)">+</button>
							</view>
						</view>
					</view>
				</view>
				<!-- [新增] 添加一个常驻的、更符合交互习惯的创建按钮 -->
				<button class="btn btn-primary btn-full-width" :disabled="!hasTasksToCreate" @click="handleCreateTasks"
					:loading="isCreating">
					{{ isCreating ? '生成中...' : '生成任务' }}
				</button>
			</template>
		</view>
		<!-- [修改] 移除此处的 FAB 按钮 -->
		<!-- <AppFab v-if="hasTasksToCreate" @click="handleCreateTasks" /> -->
	</view>
</template>

<script setup lang="ts">
	import { ref, computed, reactive } from 'vue';
	import { onShow } from '@dcloudio/uni-app';
	import { useDataStore } from '@/store/data';
	import { createTasks } from '@/api/tasks';
	import AppFab from '@/components/AppFab.vue';

	const dataStore = useDataStore();
	const isLoading = ref(false);
	const isCreating = ref(false);
	const taskQuantities = reactive<Record<string, number>>({});

	onShow(async () => {
		isLoading.value = true;
		// 页面显示时，确保配方数据已加载
		if (!dataStore.dataLoaded.recipes) {
			await dataStore.fetchRecipesData();
		}
		isLoading.value = false;
	});

	const groupedProducts = computed(() => {
		return dataStore.productList.reduce((groups, product) => {
			const groupName = product.type;
			if (!groups[groupName]) {
				groups[groupName] = [];
			}
			groups[groupName].push(product);
			// 初始化数量为0
			if (taskQuantities[product.id] === undefined) {
				taskQuantities[product.id] = 0;
			}
			return groups;
		}, {} as Record<string, typeof dataStore.productList>);
	});

	const hasTasksToCreate = computed(() => {
		return Object.values(taskQuantities).some(qty => qty > 0);
	});

	const increaseQuantity = (productId : string) => {
		taskQuantities[productId]++;
	};
	const decreaseQuantity = (productId : string) => {
		if (taskQuantities[productId] > 0) {
			taskQuantities[productId]--;
		}
	};

	const handleCreateTasks = async () => {
		const tasksToCreate = Object.entries(taskQuantities)
			.filter(([, quantity]) => quantity > 0)
			.map(([productId, quantity]) => ({
				productId,
				quantity,
				plannedDate: new Date().toISOString(),
			}));

		if (tasksToCreate.length === 0) {
			uni.showToast({ title: '请输入要生产的数量', icon: 'none' });
			return;
		}

		isCreating.value = true;
		uni.showLoading({ title: '正在生成任务...' });
		try {
			await createTasks(tasksToCreate);
			uni.hideLoading();
			uni.showToast({ title: '任务创建成功', icon: 'success' });
			// 刷新主页面的数据
			await dataStore.fetchProductionData();
			uni.navigateBack();
		} catch (error) {
			uni.hideLoading();
			console.error('Failed to create tasks:', error);
		} finally {
			isCreating.value = false;
		}
	};

	const navigateBack = () => {
		uni.navigateBack();
	};
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	.page-container {
		padding-bottom: 20px;
	}

	.product-group {
		margin-bottom: 20px;
	}

	.group-title {
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary);
		padding: 10px 5px;
		border-bottom: 1px solid var(--border-color);
		margin-bottom: 10px;
	}

	.product-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 5px;
	}

	.product-name {
		font-size: 15px;
	}

	.quantity-control {
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.btn-stepper {
		width: 30px;
		height: 30px;
		line-height: 30px;
		padding: 0;
		font-size: 20px;
		background-color: #f3e9e3;
		color: var(--text-secondary);
		border-radius: 50%;
	}

	.input-stepper {
		width: 40px;
		height: 30px;
		text-align: center;
		border: none;
		background-color: var(--bg-color);
		font-size: 16px;
	}
</style>