<template>
	<view>
		<view class="page-header">
			<view class="store-selector" @click="uiStore.openModal('store')">
				{{ dataStore.currentTenant?.name || '请选择店铺' }} &#9662;
			</view>
			<view class="user-avatar" @click="uiStore.openModal('userMenu')">{{
        userStore.userInfo?.name?.[0] || '管'
      }}</view>
		</view>

		<view class="page-content page-content-with-fab">
			<view class="loading-spinner" v-if="isLoading">
				<text>加载中...</text>
			</view>
			<template v-else>
				<view class="summary-card">
					<div>
						<view class="value">{{ totalPendingBreadCount }}</view>
						<view class="label">待完成</view>
					</div>
					<div>
						<view class="value">{{ thisWeeksCompletedBreadCount }}</view>
						<view class="label">本周已完成</view>
					</div>
				</view>

				<view class="card-title-wrapper">
					<span class="card-title">进行中的任务</span>
					<image v-if="hasCompletedTasks" class="header-icon"
						src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%238c5a3b'%3E%3Cpath d='M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.25 2.52.77-1.28-3.52-2.09V8H12z'/%3E%3C/svg%3E"
						@click="navigateToHistory" />
				</view>

				<!-- 任务列表 -->
				<view v-if="activeTasks.length > 0">
					<!-- [核心重构] 使用 ListItem 组件，并通过事件监听实现交互 -->
					<ListItem v-for="task in activeTasks" :key="task.id" @click="navigateToDetail(task)"
						@longpress="handleLongPressAction(task)" class="task-card" :class="getStatusClass(task.status)">
						<view class="task-info">
							<view class="title">{{ getTaskTitle(task) }}</view>
							<view class="details">{{ getTaskDetails(task) }}</view>
						</view>
						<view class="status-tag" :class="getStatusClass(task.status)">
							{{ getStatusText(task.status) }}
						</view>
					</ListItem>
				</view>
				<view v-else class="empty-state">
					<text>暂无进行中的任务</text>
				</view>
			</template>
		</view>

		<AppFab @click="navigateToCreatePage" />

		<AppModal v-model:visible="showTaskActionsModal" title="任务操作">
			<view class="list-item" @click="handleCancelTaskFromModal">
				取消任务
			</view>
		</AppModal>
	</view>
</template>

<script setup lang="ts">
	import { ref, computed } from 'vue';
	import { onShow } from '@dcloudio/uni-app';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import { useUiStore } from '@/store/ui';
	import AppModal from '@/components/AppModal.vue';
	import AppFab from '@/components/AppFab.vue';
	import ListItem from '@/components/ListItem.vue'; // [核心新增] 引入新组件
	import type { ProductionTaskDto } from '@/types/api';
	import { updateTaskStatus } from '@/api/tasks';

	const userStore = useUserStore();
	const dataStore = useDataStore();
	const uiStore = useUiStore();

	const isLoading = ref(false);
	const showTaskActionsModal = ref(false);
	const selectedTaskForAction = ref<ProductionTaskDto | null>(null);

	// [核心删除] 移除所有与触摸事件和水波纹相关的本地状态
	// const longPressTimer = ref<any>(null);
	// const touchMoved = ref(false);
	// const ripples = ref<Record<string, any[]>>({});

	onShow(async () => {
		await dataStore.fetchProductionData();
	});

	const activeTasks = computed(() => {
		return dataStore.production.filter(
			task => task.status === 'PENDING' || task.status === 'IN_PROGRESS'
		);
	});

	const totalPendingBreadCount = computed(() => {
		return activeTasks.value
			.reduce((sum, task) => sum + getTotalQuantity(task), 0);
	});

	const thisWeeksCompletedBreadCount = computed(() => {
		const now = new Date();
		const dayOfWeek = now.getDay();
		const startOfWeek = new Date(now);
		startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
		startOfWeek.setHours(0, 0, 0, 0);

		return dataStore.production
			.filter(task => {
				if (task.status !== 'COMPLETED') return false;
				const completedDate = new Date(task.plannedDate);
				return completedDate >= startOfWeek;
			})
			.reduce((sum, task) => sum + getTotalQuantity(task), 0);
	});

	const hasCompletedTasks = computed(() => {
		return dataStore.production.some(task => task.status === 'COMPLETED');
	});

	const getTaskTitle = (task : ProductionTaskDto) => {
		if (!task.items || task.items.length === 0) {
			return '未知任务';
		}
		return task.items.map(item => `${item.product.name} x${item.quantity}`).join('、');
	};

	const getTotalQuantity = (task : ProductionTaskDto) => {
		if (!task.items) return 0;
		return task.items.reduce((sum, item) => sum + item.quantity, 0);
	};

	const getTaskDetails = (task : ProductionTaskDto) => {
		const date = new Date(task.plannedDate);
		const formattedDate = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
		const creator = userStore.userInfo?.name || userStore.userInfo?.phone || '创建人';
		const totalQuantity = getTotalQuantity(task);
		return `${formattedDate} - by ${creator} | 计划总数: ${totalQuantity}`;
	};

	const getStatusText = (status : ProductionTaskDto['status']) => {
		const map = {
			PENDING: '待开始',
			IN_PROGRESS: '进行中',
			COMPLETED: '已完成',
			CANCELLED: '已取消'
		};
		return map[status] || '未知';
	};

	const getStatusClass = (status : ProductionTaskDto['status']) => {
		const map = {
			PENDING: 'status-pending',
			IN_PROGRESS: 'status-inprogress',
			COMPLETED: 'status-completed',
			CANCELLED: 'status-cancelled'
		};
		return map[status] || '';
	};

	const navigateToDetail = (task : ProductionTaskDto) => {
		uni.navigateTo({
			url: `/pages/production/detail?taskId=${task.id}`
		});
	};

	const navigateToHistory = () => {
		uni.navigateTo({
			url: '/pages/production/history'
		});
	};

	// [核心删除] 移除 handleTouchStart, handleTouchMove, handleTouchEnd

	// 实际执行长按的函数
	const handleLongPressAction = (task : ProductionTaskDto) => {
		selectedTaskForAction.value = task;
		showTaskActionsModal.value = true;
	};

	const handleCancelTaskFromModal = async () => {
		if (!selectedTaskForAction.value) return;
		showTaskActionsModal.value = false;
		await cancelTask(selectedTaskForAction.value.id);
		selectedTaskForAction.value = null;
	};

	const cancelTask = async (taskId : string) => {
		uni.showLoading({ title: '正在取消...' });
		try {
			await updateTaskStatus(taskId, 'CANCELLED');
			uni.hideLoading();
			uni.showToast({ title: '任务已取消', icon: 'success' });
			await dataStore.fetchProductionData();
		} catch (error) {
			uni.hideLoading();
			console.error('Failed to cancel task:', error);
			uni.showToast({ title: '操作失败，请重试', icon: 'none' });
		}
	};

	const navigateToCreatePage = () => {
		uni.navigateTo({
			url: '/pages/production/create',
		});
	};

	const alert = (msg : string) => {
		uni.showToast({ title: msg, icon: 'none' });
	};
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

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

	/* [核心修改] 将 task-card 的样式应用到 ListItem 组件上 */
	.task-card {
		/* ListItem 已经有 list-item 的基础样式，这里只添加 task-card 特有的样式 */
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: var(--card-bg);
		padding: 20px;
		border-radius: 20px;
		margin-bottom: 15px;
		cursor: pointer;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
		border-left: 5px solid;
		/* 移除 ListItem 自带的 border-bottom */
		border-bottom: none !important;
	}

	.task-card.status-pending {
		border-color: #d4a373;
	}

	.task-card.status-inprogress {
		border-color: #27ae60;
	}

	.task-info {
		flex: 1;
		margin-right: 15px;
	}

	.task-card .title {
		font-size: 16px;
		font-weight: 400;
		margin-bottom: 8px;
		word-break: break-all;
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		line-height: 1.4;
	}

	.task-card .details {
		color: var(--text-secondary);
		font-size: 14px;
	}

	.header-icon {
		width: 24px;
		height: 24px;
	}

	.status-tag {
		padding: 4px 12px;
		border-radius: 15px;
		font-size: 13px;
		color: white;
		font-weight: 500;
		white-space: nowrap;
	}

	.status-tag.status-pending {
		background-color: #d4a373;
	}

	.status-tag.status-inprogress {
		background-color: #27ae60;
	}

	.status-tag.status-completed {
		background-color: #a9c1de;
	}

	.status-tag.status-cancelled {
		background-color: #a8a8a8;
	}
</style>