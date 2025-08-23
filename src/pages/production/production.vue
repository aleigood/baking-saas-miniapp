<template>
	<view>
		<view class="page-content page-content-with-tabbar-fab">
			<view class="summary-card">
				<div>
					<view class="value">{{ dataStore.homeStats.pendingCount }}</view>
					<view class="label">待完成</view>
				</div>
				<div>
					<view class="value">{{ dataStore.homeStats.completedThisWeekCount }}</view>
					<view class="label">本周已完成</view>
				</div>
			</view>

			<view class="card-title-wrapper">
				<span class="card-title">制作任务</span>
				<view class="header-actions">
					<IconButton v-if="dataStore.hasHistory" @click="navigateToHistory">
						<image class="header-icon" src="/static/icons/history.svg" />
					</IconButton>
					<IconButton @click="navigateToStats">
						<image class="header-icon" src="/static/icons/stats.svg" />
					</IconButton>
				</view>
			</view>

			<view v-if="isInitialLoad" class="loading-spinner">
				<text>加载中...</text>
			</view>
			<view v-else-if="allTasksForDisplay.length > 0">
				<ListItem v-for="task in allTasksForDisplay" :key="task.id" @click="navigateToDetail(task)"
					@longpress="openTaskActions(task)" :vibrate-on-long-press="true" card-mode
					:style="getTaskCardStyle(task)">
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
		</view>

		<AppFab @click="navigateToCreatePage" />

		<AppModal :visible="uiStore.showTaskActionsModal" @update:visible="uiStore.closeModal(MODAL_KEYS.TASK_ACTIONS)"
			title="制作任务" :no-header-line="true">
			<view class="options-list">
				<ListItem class="option-item" @click="handleOpenCancelConfirm" :bleed="true">
					<view class="main-info">
						<view class="name">取消任务</view>
					</view>
				</ListItem>
			</view>
		</AppModal>

		<AppModal v-model:visible="showCancelConfirmModal" title="确认取消">
			<view class="modal-prompt-text">
				确定要取消这个任务吗？
			</view>
			<view class="modal-warning-text">
				任务将被标记为已取消，此操作不会扣减任何原料库存。
			</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showCancelConfirmModal = false">返回</AppButton>
				<AppButton type="danger" @click="handleConfirmCancelTask" :loading="isSubmitting">
					{{ isSubmitting ? '取消中...' : '确认取消' }}
				</AppButton>
			</view>
		</AppModal>
	</view>
</template>

<script setup lang="ts">
	import {
		ref,
		computed,
	} from 'vue';
	import {
		onShow
	} from '@dcloudio/uni-app';
	import {
		useUserStore
	} from '@/store/user';
	import {
		useDataStore
	} from '@/store/data';
	import {
		useUiStore
	} from '@/store/ui';
	import {
		useToastStore
	} from '@/store/toast';
	import {
		MODAL_KEYS
	} from '@/constants/modalKeys';
	import MainHeader from '@/components/MainHeader.vue';
	import AppModal from '@/components/AppModal.vue';
	import AppFab from '@/components/AppFab.vue';
	import ListItem from '@/components/ListItem.vue';
	import IconButton from '@/components/IconButton.vue';
	import AppButton from '@/components/AppButton.vue';
	import type {
		ProductionTaskDto,
		PrepTask
	} from '@/types/api';
	import {
		updateTaskStatus
	} from '@/api/tasks';
	import {
		formatChineseDate
	} from '@/utils/format';

	const userStore = useUserStore();
	const dataStore = useDataStore();
	const uiStore = useUiStore();
	const toastStore = useToastStore();

	const isSubmitting = ref(false);
	const selectedTaskForAction = ref<ProductionTaskDto | null>(null);

	const showCancelConfirmModal = ref(false);

	const isInitialLoad = ref(true);

	onShow(async () => {
		try {
			if (!dataStore.dataLoaded.production) {
				isInitialLoad.value = true;
			}
			await dataStore.fetchProductionData();
		} catch (error) {
			console.error("Failed to load data on show:", error);
		} finally {
			isInitialLoad.value = false;
		}
	});

	// [核心改造] 创建一个新的计算属性，将前置任务和常规任务合并
	const allTasksForDisplay = computed(() => {
		const activeTasks = dataStore.production.filter(
			task => task.status === 'PENDING' || task.status === 'IN_PROGRESS'
		);

		const inProgressTasks = activeTasks.filter(task => task.status === 'IN_PROGRESS');
		const pendingTasks = activeTasks.filter(task => task.status === 'PENDING');

		inProgressTasks.sort((a, b) => new Date(b.plannedDate).getTime() - new Date(a.plannedDate).getTime());
		pendingTasks.sort((a, b) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime());

		const sortedRegularTasks = [...inProgressTasks, ...pendingTasks];

		// 如果存在前置任务，则将其放在数组的最前面
		if (dataStore.prepTask) {
			// 为了能在列表中正确渲染，我们给前置任务一个 status 属性
			const prepTaskForList = { ...dataStore.prepTask, status: 'PREP' };
			return [prepTaskForList, ...sortedRegularTasks];
		}

		return sortedRegularTasks;
	});

	// [核心改造] getTaskTitle 现在能处理前置任务和常规任务
	const getTaskTitle = (task : ProductionTaskDto | PrepTask) => {
		if (task.status === 'PREP') {
			return (task as PrepTask).title;
		}
		const regularTask = task as ProductionTaskDto;
		if (!regularTask.items || regularTask.items.length === 0) {
			return '未知任务';
		}
		return regularTask.items.map(item => `${item.product.name} x${item.quantity}`).join('、');
	};

	// [核心改造] getTaskCardStyle 现在能处理前置任务
	const getTaskCardStyle = (task : any) => {
		const colorMap : Record<string, string> = {
			PENDING: '#d4a373',
			IN_PROGRESS: '#27ae60',
			PREP: '#8e44ad', // 为前置任务定义边框颜色
		};
		const color = colorMap[task.status] || 'transparent';
		return {
			'--card-border-color': color
		};
	};

	const getTotalQuantity = (task : ProductionTaskDto) => {
		if (!task.items) return 0;
		return task.items.reduce((sum, item) => sum + item.quantity, 0);
	};

	// [核心改造] getTaskDetails 现在能处理前置任务和常规任务
	const getTaskDetails = (task : any) => {
		if (task.status === 'PREP') {
			return task.details;
		}
		const formattedDate = formatChineseDate(task.plannedDate);
		const creator = userStore.userInfo?.name || userStore.userInfo?.phone || '创建人';
		const totalQuantity = getTotalQuantity(task);
		return `${formattedDate} - by ${creator} | 计划总数: ${totalQuantity}`;
	};

	// [核心改造] getStatusText 现在能处理前置任务
	const getStatusText = (status : any) => {
		const map : Record<string, string> = {
			PENDING: '待开始',
			IN_PROGRESS: '进行中',
			COMPLETED: '已完成',
			CANCELLED: '已取消',
			PREP: '去准备',
		};
		return map[status] || '未知';
	};

	// [核心改造] getStatusClass 现在能处理前置任务
	const getStatusClass = (status : any) => {
		const map : Record<string, string> = {
			PENDING: 'status-pending',
			IN_PROGRESS: 'status-inprogress',
			COMPLETED: 'status-completed',
			CANCELLED: 'status-cancelled',
			PREP: 'status-prep'
		};
		return map[status] || '';
	};

	const navigateToDetail = (task : any) => {
		const isPrepTask = task.status === 'PREP';
		const url = isPrepTask ?
			`/pages/production/prep-detail` :
			`/pages/production/detail?taskId=${task.id}`;
		uni.navigateTo({
			url
		});
	};

	const navigateToHistory = () => {
		uni.navigateTo({
			url: '/pages/production/history'
		});
	};

	const navigateToStats = () => {
		uni.navigateTo({
			url: '/pages/production/stats'
		});
	};

	const openTaskActions = (task : any) => {
		if (task.status === 'PREP') return;
		selectedTaskForAction.value = task as ProductionTaskDto;
		uiStore.openModal(MODAL_KEYS.TASK_ACTIONS);
	};

	const handleOpenCancelConfirm = () => {
		uiStore.closeModal(MODAL_KEYS.TASK_ACTIONS);
		showCancelConfirmModal.value = true;
	};

	const handleConfirmCancelTask = async () => {
		if (!selectedTaskForAction.value) return;

		isSubmitting.value = true;
		try {
			await updateTaskStatus(selectedTaskForAction.value.id, 'CANCELLED');
			toastStore.show({
				message: '任务已取消',
				type: 'success'
			});
			await dataStore.fetchProductionData();
		} catch (error) {
			console.error('Failed to cancel task:', error);
		} finally {
			isSubmitting.value = false;
			showCancelConfirmModal.value = false;
			selectedTaskForAction.value = null;
		}
	};

	const navigateToCreatePage = () => {
		uni.navigateTo({
			url: '/pages/production/create',
		});
	};
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';
	@include list-item-option-style;

	.summary-card {
		display: flex;
		justify-content: space-around;
		background: var(--card-bg);
		padding: 25px 20px;
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

	.task-info {
		flex: 1;
		margin-right: 15px;
	}

	.title {
		color: var(--text-primary);
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

	.details {
		color: var(--text-secondary);
		font-size: 14px;
	}

	.header-actions {
		display: flex;
		gap: 8px;
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

	.prep-task-card {
		--card-border-color: #8e44ad;
		margin-bottom: 20px;
	}

	.status-tag.status-prep {
		background-color: #8e44ad;
	}
</style>