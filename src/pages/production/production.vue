<template>
	<view>
		<view class="page-content page-content-with-tabbar-fab">
			<view class="summary-card">
				<div>
					<view class="value">{{ dataStore.homeStats.pendingCount }}</view>
					<view class="label">今日待完成</view>
				</div>
				<div>
					<view class="value">{{ temperatureStore.settings.envTemp }}°C</view>
					<view class="label">环境温度</view>
				</div>
			</view>

			<view class="card-title-wrapper">
				<view class="clickable-title" @click="isCalendarVisible = true">
					<image class="calendar-icon" src="/static/icons/calendar.svg" />
					<span class="card-title">{{ pageTitle }}</span>
					<view class="dropdown-arrow"></view>
				</view>
				<view class="header-actions">
					<IconButton @click.stop="openTemperatureSettingsModal">
						<image class="header-icon" src="/static/icons/temp.svg" />
					</IconButton>
					<IconButton @click.stop="navigateToHistory">
						<image class="header-icon" src="/static/icons/history.svg" />
					</IconButton>
				</view>
			</view>

			<view v-if="isLoading" class="loading-spinner">
				<text>加载中...</text>
			</view>
			<view v-else-if="dataStore.production.length > 0">
				<ListItem v-for="task in dataStore.production" :key="task.id" @click="navigateToDetail(task)"
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
				<text>所选日期暂无任务</text>
			</view>
		</view>

		<AppFab @click="navigateToCreatePage" />

		<CalendarModal :visible="isCalendarVisible" :task-dates="taskDates" @close="isCalendarVisible = false"
			@select="handleDateSelect" />

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

		<AppModal :visible="uiStore.showTemperatureSettingsModal"
			@update:visible="uiStore.closeModal(MODAL_KEYS.TEMPERATURE_SETTINGS)" title="设置温度参数">
			<view class="form-container">
				<view class="form-item">
					<view class="form-label">和面机类型</view>
					<picker mode="selector" :range="temperatureStore.mixerTypes" range-key="text"
						:value="currentMixerIndex" @change="handleMixerChange">
						<view class="picker-display">
							{{ temperatureStore.mixerTypes[currentMixerIndex]?.text || '请选择' }}
							<view class="arrow-down"></view>
						</view>
					</picker>
				</view>
				<view class="form-item">
					<view class="form-label">环境温度 (°C)</view>
					<input class="form-input" type="number" v-model.number="tempSettings.envTemp" placeholder="输入温度" />
				</view>
				<view class="form-item">
					<view class="form-label">面粉温度 (°C)</view>
					<input class="form-input" type="number" v-model.number="tempSettings.flourTemp"
						placeholder="输入温度" />
				</view>
				<view class="form-item">
					<view class="form-label">水温 (°C)</view>
					<input class="form-input" type="number" v-model.number="tempSettings.waterTemp"
						placeholder="输入温度" />
				</view>
			</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="uiStore.closeModal(MODAL_KEYS.TEMPERATURE_SETTINGS)">取消</AppButton>
				<AppButton type="primary" @click="handleSaveTemperatureSettings">保存</AppButton>
			</view>
		</AppModal>
	</view>
</template>

<script setup lang="ts">
	import { ref, computed, reactive } from 'vue';
	import { onShow, onLoad } from '@dcloudio/uni-app';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import { useUiStore } from '@/store/ui';
	import { useToastStore } from '@/store/toast';
	import { useTemperatureStore } from '@/store/temperature';
	import { MODAL_KEYS } from '@/constants/modalKeys';
	import AppModal from '@/components/AppModal.vue';
	import AppFab from '@/components/AppFab.vue';
	import ListItem from '@/components/ListItem.vue';
	import IconButton from '@/components/IconButton.vue';
	import AppButton from '@/components/AppButton.vue';
	import CalendarModal from '@/components/CalendarModal.vue'; // [新增]
	import type { ProductionTaskDto, PrepTask } from '@/types/api';
	import { updateTaskStatus, getTaskDates } from '@/api/tasks'; // [修改]
	import { formatChineseDate } from '@/utils/format';

	const userStore = useUserStore();
	const dataStore = useDataStore();
	const uiStore = useUiStore();
	const toastStore = useToastStore();
	const temperatureStore = useTemperatureStore();

	const isLoading = ref(true);
	const isSubmitting = ref(false);
	const selectedTaskForAction = ref<ProductionTaskDto | null>(null);
	const showCancelConfirmModal = ref(false);

	// [新增] 日历相关状态
	const isCalendarVisible = ref(false);
	// [修改] 修正时区问题，使用本地日期
	const todayForInit = new Date();
	const selectedDate = ref(
		`${todayForInit.getFullYear()}-${String(todayForInit.getMonth() + 1).padStart(2, '0')}-${String(
			todayForInit.getDate()
		).padStart(2, '0')}`
	);
	const taskDates = ref<string[]>([]);

	const tempSettings = reactive({
		mixerType: 9,
		envTemp: 25,
		flourTemp: 25,
		waterTemp: 25,
	});

	const currentMixerIndex = computed(() => {
		return temperatureStore.mixerTypes.findIndex(m => m.value === tempSettings.mixerType);
	});

	// [修改] 页面标题现在是动态的
	const pageTitle = computed(() => {
		// [修改] 修正时区问题，使用本地日期
		const todayDate = new Date();
		const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(
			todayDate.getDate()
		).padStart(2, '0')}`;
		if (selectedDate.value === today) {
			return '今日任务';
		}
		const date = new Date(selectedDate.value);
		return `${date.getMonth() + 1}月${date.getDate()}日任务`;
	});

	onLoad(() => {
		temperatureStore.initTemperatureSettings();
	});

	onShow(async () => {
		// [核心新增] 在页面显示时，检查并消费“信箱”中的消息
		const toastMessage = uiStore.consumeNextPageToast();
		if (toastMessage) {
			toastStore.show(toastMessage);
		}

		isLoading.value = true;
		try {
			// [修改] 传入选定日期获取任务，并获取所有任务日期用于日历标记
			await Promise.all([
				dataStore.fetchProductionData(selectedDate.value),
				getTaskDates().then(dates => taskDates.value = dates)
			]);
		} catch (error) {
			console.error("Failed to load data on show:", error);
		} finally {
			isLoading.value = false;
		}
	});

	// [新增] 处理日期选择
	const handleDateSelect = async (date : string) => {
		selectedDate.value = date;
		isCalendarVisible.value = false; // [修复] 选择后关闭日历
		isLoading.value = true;
		await dataStore.fetchProductionData(date);
		isLoading.value = false;
	};

	// [核心修改] 移除 allTasksForDisplay 计算属性

	const getTaskTitle = (task : ProductionTaskDto | PrepTask) => {
		if (task.status === 'PREP') {
			return (task as PrepTask).title;
		}
		const regularTask = task as ProductionTaskDto;
		if (!regularTask.items || regularTask.items.length === 0) return '未知任务';
		return regularTask.items.map(item => `${item.product.name} x${item.quantity}`).join('、');
	};

	const getTaskCardStyle = (task : any) => {
		const colorMap : Record<string, string> = {
			PENDING: '#d4a373',
			IN_PROGRESS: '#27ae60',
			PREP: '#8e44ad',
		};
		const color = colorMap[task.status] || 'transparent';
		return { '--card-border-color': color };
	};

	const getTotalQuantity = (task : ProductionTaskDto) => {
		if (!task.items) return 0;
		return task.items.reduce((sum, item) => sum + item.quantity, 0);
	};

	const getTaskDetails = (task : any) => {
		if (task.status === 'PREP') {
			return task.details;
		}
		const formattedDate = formatChineseDate(task.startDate);
		const creator = userStore.userInfo?.name || userStore.userInfo?.phone || '创建人';
		const totalQuantity = getTotalQuantity(task);
		return `${formattedDate} - by ${creator} | 计划总数: ${totalQuantity}`;
	};

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

	const getStatusClass = (status : any) => {
		const map : Record<string, string> = {
			PENDING: 'status-pending',
			IN_PROGRESS: 'status-inprogress',
			PREP: 'status-prep'
		};
		return map[status] || '';
	};

	const navigateToDetail = (task : any) => {
		const isPrepTask = task.status === 'PREP';
		// [核心修改] prepTask 的数据现在也包含在 task 对象中
		if (isPrepTask) {
			const prepTaskData = encodeURIComponent(JSON.stringify(task));
			uni.navigateTo({ url: `/pages/production/prep-detail?taskData=${prepTaskData}` });
		} else {
			uni.navigateTo({ url: `/pages/production/detail?taskId=${task.id}` });
		}
	};

	const navigateToHistory = () => {
		uni.navigateTo({ url: '/pages/production/history' });
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
			toastStore.show({ message: '任务已取消', type: 'success' });
			await dataStore.fetchProductionData(selectedDate.value);
		} catch (error) {
			console.error('Failed to cancel task:', error);
		} finally {
			isSubmitting.value = false;
			showCancelConfirmModal.value = false;
			selectedTaskForAction.value = null;
		}
	};

	const navigateToCreatePage = () => {
		uni.navigateTo({ url: '/pages/production/create' });
	};

	const openTemperatureSettingsModal = () => {
		Object.assign(tempSettings, temperatureStore.settings);
		uiStore.openModal(MODAL_KEYS.TEMPERATURE_SETTINGS);
	};

	const handleMixerChange = (e : any) => {
		const selectedIndex = e.detail.value;
		tempSettings.mixerType = temperatureStore.mixerTypes[selectedIndex].value;
	};

	const handleSaveTemperatureSettings = () => {
		temperatureStore.saveTemperatureSettings(tempSettings);
		uiStore.closeModal(MODAL_KEYS.TEMPERATURE_SETTINGS);
		toastStore.show({ message: '设置已保存', type: 'success' });
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

	/* [修改] 调整可点击标题样式 */
	.clickable-title {
		display: flex;
		align-items: center;
		gap: 8px;

		.card-title {
			color: var(--primary-color); // 使用主题色
			font-weight: 400; // [修改] 标题文字不要加粗
		}
	}

	.calendar-icon {
		width: 20px;
		height: 20px;
		opacity: 0.7;
	}

	/* [新增] 下拉箭头样式 */
	.dropdown-arrow {
		width: 0;
		height: 0;
		border-left: 5px solid transparent;
		border-right: 5px solid transparent;
		border-top: 6px solid var(--text-secondary);
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

	.status-tag.status-prep {
		background-color: #8e44ad;
	}

	.form-container {
		padding: 0 5px;
		margin-top: 10px;
	}

	.form-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 10px 0;
		// border-bottom: 1px solid var(--border-color);

		// &:last-of-type {
		// 	border-bottom: none;
		// }
	}

	.form-label {
		font-size: 16px;
		color: var(--text-primary);
	}

	.form-input {
		background-color: var(--bg-color);
		border-radius: 8px;
		padding: 0 10px;
		text-align: center;
		font-size: 15px;
		width: 90px;
		box-sizing: border-box;
		border: 1px solid var(--border-color);
		height: 36px;
		color: var(--text-primary);
	}

	/* [核心修改] 将选择器样式更新为与输入框一致 */
	.picker-display {
		height: 36px;
		border: 1px solid var(--border-color);
		border-radius: 8px;
		background-color: var(--bg-color);
		font-size: 15px;
		color: var(--text-primary);
		box-sizing: border-box;
		position: relative;
		/* 使用flex布局使文字垂直居中 */
		display: flex;
		align-items: center;
		justify-content: center;
		/* 调整padding以适应箭头 */
		padding: 0 30px 0 15px;
	}

	.arrow-down {
		position: absolute;
		right: 10px;
		top: 50%;
		transform: translateY(-50%);
		width: 0;
		height: 0;
		border-left: 5px solid transparent;
		border-right: 5px solid transparent;
		border-top: 6px solid #999;
	}
</style>