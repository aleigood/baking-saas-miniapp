<template>
	<view class="page-container">
		<view class="page-header">
			<view class="store-selector" @click="showStoreModal = true">
				{{ dataStore.currentTenant?.name || '请选择店铺' }} &#9662;
			</view>
			<view class="user-avatar" @click="showUserMenu = true">{{
        userStore.userInfo?.phone[0] || '管'
      }}</view>
		</view>

		<view class="page-content">
			<view class="loading-spinner" v-if="isLoading">
				<text>加载中...</text>
			</view>
			<template v-else>
				<!-- [移除] 欢迎语 -->
				<!-- (Removed) Welcome message -->

				<!-- [新增] 任务看板 -->
				<!-- (New) Task summary board -->
				<view class="summary-card">
					<div>
						<view class="value">{{ todaysPendingCount }}</view>
						<view class="label">今日待完成</view>
					</div>
					<div>
						<view class="value">{{ thisWeeksCompletedCount }}</view>
						<view class="label">本周已完成</view>
					</div>
				</view>

				<!-- [修改] 任务列表标题和历史按钮 -->
				<!-- (Modified) Task list title and history button -->
				<view class="card-title-wrapper">
					<span class="card-title">进行中的任务</span>
					<!-- [修改] 仅当有已完成任务时显示历史按钮 -->
					<!-- (Modified) Show history button only if there are completed tasks -->
					<image v-if="hasCompletedTasks" class="header-icon"
						src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%238c5a3b'%3E%3Cpath d='M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.25 2.52.77-1.28-3.52-2.09V8H12z'/%3E%3C/svg%3E"
						@click="alert('查看制作历史')" />
				</view>

				<!-- [修改] 循环 activeTasks 并应用新的卡片样式 -->
				<!-- (Modified) Loop through activeTasks and apply new card style -->
				<view v-if="activeTasks.length > 0">
					<view v-for="task in activeTasks" :key="task.id" class="task-card"
						:class="task.status === 'IN_PROGRESS' ? 'status-inprogress' : 'status-pending'">
						<view class="title">{{ getTaskTitle(task) }}</view>
						<view class="details">
							<!-- [修改] 详情信息格式 -->
							<!-- (Modified) Details info format -->
							<span>{{ getTaskDetails(task) }}</span>
							<span>{{ task.status === 'PENDING' ? '待开始' : '进行中' }}</span>
						</view>
					</view>
				</view>
				<view v-else class="empty-state">
					<text>暂无进行中的任务</text>
				</view>
			</template>
		</view>

		<AppFab @click="navigateToCreatePage" />

		<AppModal v-model:visible="showStoreModal" title="选择门店">
			<view v-for="tenant in dataStore.tenants" :key="tenant.id" class="list-item"
				@click="handleSelectTenant(tenant.id)">{{ tenant.name }}</view>
		</AppModal>

		<AppModal v-model:visible="showUserMenu">
			<view class="list-item" style="border: none; padding: 10px 15px" @click="userStore.logout()">退出登录
			</view>
		</AppModal>
	</view>
</template>

<script setup lang="ts">
	import { ref, computed } from 'vue';
	import { onShow } from '@dcloudio/uni-app';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import AppModal from '@/components/AppModal.vue';
	import AppFab from '@/components/AppFab.vue';
	import type { ProductionTaskDto } from '@/types/api'; // [新增] 导入类型

	const userStore = useUserStore();
	const dataStore = useDataStore();

	const isLoading = ref(false);
	const showStoreModal = ref(false);
	const showUserMenu = ref(false);

	onShow(async () => {
		isLoading.value = true;
		// fetchProductionData 会获取所有状态的任务
		await dataStore.fetchProductionData();
		isLoading.value = false;
	});

	// [新增] 筛选出“待开始”和“进行中”的任务
	const activeTasks = computed(() => {
		return dataStore.production.filter(
			task => task.status === 'PENDING' || task.status === 'IN_PROGRESS'
		);
	});

	// [修改] 计算今日待完成任务数 (改为统计任务数量)
	// (Modified: Calculate today's pending tasks by counting tasks)
	const todaysPendingCount = computed(() => {
		const today = new Date().toISOString().split('T')[0];
		return activeTasks.value.filter(task => task.plannedDate.startsWith(today)).length;
	});

	// [修改] 计算本周已完成任务数 (改为统计任务数量)
	// (Modified: Calculate this week's completed tasks by counting tasks)
	const thisWeeksCompletedCount = computed(() => {
		const now = new Date();
		const dayOfWeek = now.getDay(); // 0 (Sun) - 6 (Sat)
		const startOfWeek = new Date(now);
		// 将周一作为一周的开始
		startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
		startOfWeek.setHours(0, 0, 0, 0);

		return dataStore.production.filter(task => {
			if (task.status !== 'COMPLETED') return false;
			const completedDate = new Date(task.plannedDate); // 假设计划日期接近完成日期
			return completedDate >= startOfWeek;
		}).length;
	});

	// [新增] 判断是否存在已完成的任务，以决定是否显示历史按钮
	const hasCompletedTasks = computed(() => {
		return dataStore.production.some(task => task.status === 'COMPLETED');
	});

	// [修改] 获取任务标题的辅助函数，显示更清晰
	const getTaskTitle = (task : ProductionTaskDto) => {
		if (!task.items || task.items.length === 0) {
			return '未知任务';
		}
		const title = task.items.map(item => `${item.product.name} x${item.quantity}`).join('、');
		// 如果标题太长，进行截断
		return title.length > 25 ? title.substring(0, 23) + '...' : title;
	};

	// [修改] 获取任务总数的辅助函数
	const getTotalQuantity = (task : ProductionTaskDto) => {
		if (!task.items) return 0;
		return task.items.reduce((sum, item) => sum + item.quantity, 0);
	};

	// [新增] 获取任务详情文本的辅助函数
	// (New: Helper function to get task details text)
	const getTaskDetails = (task : ProductionTaskDto) => {
		const date = new Date(task.plannedDate);
		const formattedDate = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
		// 注意：后端数据目前没有创建人信息，这里暂时使用当前登录用户作为示例
		// (Note: Backend data currently lacks creator info, using current user as a placeholder)
		const creator = userStore.userInfo?.phone || '创建人';
		const totalQuantity = getTotalQuantity(task);
		return `${formattedDate} - by ${creator} | 计划总数: ${totalQuantity}`;
	};

	const navigateToCreatePage = () => {
		uni.navigateTo({
			url: '/pages/production/create',
		});
	};

	const handleSelectTenant = async (tenantId : string) => {
		if (dataStore.currentTenantId === tenantId) {
			showStoreModal.value = false;
			return;
		}
		isLoading.value = true;
		await dataStore.selectTenant(tenantId);
		showStoreModal.value = false;
		await dataStore.fetchProductionData();
		isLoading.value = false;
	};

	const alert = (msg : string) => {
		uni.showToast({ title: msg, icon: 'none' });
	};
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	/* [新增] 首页欢迎语和看板样式 */
	.welcome {
		font-size: 26px;
		font-weight: 700;
		margin-bottom: 20px;
		padding: 0 5px;
	}

	.summary-card {
		display: flex;
		justify-content: space-around;
		background: var(--card-bg);
		padding: 20px;
		border-radius: 20px;
		margin-bottom: 20px;
		text-align: center;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
	}

	.summary-card .value {
		font-size: 22px;
		font-weight: bold;
		color: var(--primary-color);
	}

	.summary-card .label {
		font-size: 14px;
		color: var(--text-secondary);
		margin-top: 5px;
	}

	/* [新增] 新的任务卡片样式 */
	.task-card {
		background: var(--card-bg);
		padding: 20px;
		border-radius: 20px;
		margin-bottom: 15px;
		border-left: 5px solid;
		cursor: pointer;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
	}

	.task-card.status-inprogress {
		border-color: var(--accent-color);
	}

	.task-card.status-pending {
		border-color: #a9c1de;
	}

	.task-card .title {
		font-size: 18px;
		font-weight: 600;
		margin-bottom: 5px;
	}

	.task-card .details {
		display: flex;
		justify-content: space-between;
		color: var(--text-secondary);
		font-size: 14px;
	}

	.header-icon {
		width: 24px;
		height: 24px;
	}
</style>