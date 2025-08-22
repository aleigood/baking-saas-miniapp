<template>
	<view>
		<view class="page-content page-content-with-tabbar-fab">
			<view class="summary-card">
				<div>
					<view class="value">{{ homeStats.pendingCount }}</view>
					<view class="label">待完成</view>
				</div>
				<div>
					<view class="value">{{ homeStats.completedThisWeekCount }}</view>
					<view class="label">本周已完成</view>
				</div>
			</view>

			<!-- [新增] 前置准备任务的显示区域 -->
			<!-- (New) Display area for the preparation task -->
			<view v-if="dataStore.prepTask">
				<view class="card-title-wrapper">
					<span class="card-title">前置任务</span>
				</view>
				<ListItem :key="dataStore.prepTask.id" @click="navigateToDetail(dataStore.prepTask)" card-mode
					class="prep-task-card">
					<view class="task-info">
						<view class="title">{{ dataStore.prepTask.title }}</view>
						<view class="details">{{ dataStore.prepTask.details }}</view>
					</view>
					<view class="status-tag status-prep">
						去准备
					</view>
				</ListItem>
			</view>

			<view class="card-title-wrapper">
				<span class="card-title">制作任务</span>
				<view class="header-actions">
					<IconButton v-if="hasCompletedTasks" @click="navigateToHistory">
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
			<view v-else-if="sortedTasks.length > 0">
				<ListItem v-for="task in sortedTasks" :key="task.id" @click="navigateToDetail(task)"
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
		reactive
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
	// [修改] 引入 PrepTask 类型以支持新功能
	import type {
		ProductionTaskDto,
		PrepTask
	} from '@/types/api';
	import {
		updateTaskStatus
	} from '@/api/tasks';
	import {
		getProductionHomeStats
	} from '@/api/stats';
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

	const homeStats = reactive({
		pendingCount: 0,
		completedThisWeekCount: 0,
	});

	const isInitialLoad = ref(true);

	const fetchHomeStats = async () => {
		try {
			const stats = await getProductionHomeStats();
			homeStats.pendingCount = stats.pendingCount;
			homeStats.completedThisWeekCount = stats.completedThisWeekCount;
		} catch (error) {
			console.error('Failed to fetch home stats:', error);
		}
	};

	onShow(async () => {
		try {
			if (!dataStore.dataLoaded.production) {
				isInitialLoad.value = true;
			}
			// [修改] 每次进入页面都重新获取任务数据，以保证前置任务的实时性
			await Promise.all([
				dataStore.fetchProductionData(),
				fetchHomeStats()
			]);
		} catch (error) {
			console.error("Failed to load data on show:", error);
		} finally {
			isInitialLoad.value = false;
		}
	});

	const sortedTasks = computed(() => {
		// [修复] 数据源从 dataStore.production 调整为 dataStore.production，以解决 filter of undefined 错误
		const activeTasks = dataStore.production.filter(
			task => task.status === 'PENDING' || task.status === 'IN_PROGRESS'
		);

		const inProgressTasks = activeTasks.filter(task => task.status === 'IN_PROGRESS');
		const pendingTasks = activeTasks.filter(task => task.status === 'PENDING');

		inProgressTasks.sort((a, b) => new Date(b.plannedDate).getTime() - new Date(a.plannedDate).getTime());
		pendingTasks.sort((a, b) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime());

		return [...inProgressTasks, ...pendingTasks];
	});

	const hasCompletedTasks = computed(() => {
		// [修复] 数据源从 dataStore.production 调整为 dataStore.production
		return dataStore.production.some(task => task.status === 'COMPLETED');
	});

	const getTaskTitle = (task : ProductionTaskDto) => {
		if (!task.items || task.items.length === 0) {
			return '未知任务';
		}
		return task.items.map(item => `${item.product.name} x${item.quantity}`).join('、');
	};

	// [新增] 方法：根据任务状态返回动态样式对象
	const getTaskCardStyle = (task : ProductionTaskDto) => {
		const colorMap = {
			PENDING: '#d4a373',
			IN_PROGRESS: '#27ae60',
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

	const getTaskDetails = (task : ProductionTaskDto) => {
		const formattedDate = formatChineseDate(task.plannedDate);
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

	// [修改] 改造导航方法，使其能处理普通任务和前置任务
	const navigateToDetail = (task : ProductionTaskDto | PrepTask) => {
		const isPrepTask = task.id === 'prep-task-01';
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

	const openTaskActions = (task : ProductionTaskDto) => {
		selectedTaskForAction.value = task;
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
	/* [兼容性修复] 引入新增的 Mixin */
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

	/* [新增] 前置任务卡片的特殊样式 */
	/* (New) Special styles for the prep task card */
	.prep-task-card {
		--card-border-color: #8e44ad;
		margin-bottom: 20px;
	}

	.status-tag.status-prep {
		background-color: #8e44ad;
	}
</style>