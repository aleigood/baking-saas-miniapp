<template>
	<view class="full-height-container">
		<RefreshableLayout ref="refreshableLayout" @refresh="handleRefresh" @scroll="handleScroll" class="full-height-wrapper">
			<view class="page-content" :class="{ 'page-content-with-tabbar-fab': hasTabBar, 'page-content-with-fab': !hasTabBar }">
				<view class="summary-card">
					<div>
						<view class="value">{{ dataStore.homeStats.pendingCount }}</view>
						<view class="label">{{ pendingCountLabel }}</view>
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

				<view v-if="dataStore.production.length > 0">
					<ListItem
						v-for="task in dataStore.production"
						:key="task.id"
						@click="navigateToDetail(task)"
						@longpress="openTaskActions(task)"
						:vibrate-on-long-press="true"
						card-mode
						:style="{ '--card-border-color': (STATUS_MAP[task.status] || STATUS_MAP.DEFAULT).color }"
					>
						<view class="task-info">
							<view class="title">{{ getTaskTitle(task) }}</view>
							<view class="details">{{ getTaskDetails(task) }}</view>
						</view>
						<view class="status-tag" :class="(STATUS_MAP[task.status] || STATUS_MAP.DEFAULT).className">
							{{ (STATUS_MAP[task.status] || STATUS_MAP.DEFAULT).text }}
						</view>
					</ListItem>
				</view>
				<view v-else class="empty-state">
					<text>所选日期暂无任务</text>
				</view>
			</view>
		</RefreshableLayout>

		<ExpandingFab :actions="isSingleCategory ? [] : fabActions" :visible="isFabVisible" :no-tab-bar="!hasTabBar" @click="handleFabClick" />

		<CalendarModal :visible="isCalendarVisible" :task-dates="taskDates" @close="isCalendarVisible = false" @select="handleDateSelect" />

		<AppModal v-model:visible="showTaskActionsModal" title="制作任务" :no-header-line="true">
			<view class="options-list">
				<ListItem v-if="selectedTaskForAction?.status === 'PENDING'" class="option-item" @click="handleEditTask" :bleed="true">
					<view class="main-info">
						<view class="name">修改任务</view>
					</view>
				</ListItem>
				<ListItem v-if="selectedTaskForAction?.status === 'PENDING'" class="option-item" @click="handleOpenDeleteConfirm" :bleed="true">
					<view class="main-info">
						<view class="name danger-text">删除任务</view>
					</view>
				</ListItem>
				<ListItem v-else-if="selectedTaskForAction?.status === 'IN_PROGRESS'" class="option-item" @click="handleOpenCancelConfirm" :bleed="true">
					<view class="main-info">
						<view class="name danger-text">取消任务</view>
					</view>
				</ListItem>
			</view>
		</AppModal>

		<AppModal v-model:visible="showDeleteConfirmModal" title="确认删除">
			<view class="modal-prompt-text">确定要删除这个任务吗？</view>
			<view class="modal-warning-text">任务将被移除，此操作不可撤销。</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showDeleteConfirmModal = false">返回</AppButton>
				<AppButton type="danger" @click="handleConfirmDeleteTask" :loading="isSubmitting">
					{{ isSubmitting ? '删除中...' : '确认删除' }}
				</AppButton>
			</view>
		</AppModal>

		<AppModal v-model:visible="showCancelConfirmModal" title="确认取消">
			<view class="modal-prompt-text">确定要取消这个任务吗？</view>
			<view class="modal-warning-text">任务将被标记为已取消，此操作不会扣减任何原料库存。</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showCancelConfirmModal = false">返回</AppButton>
				<AppButton type="danger" @click="handleConfirmCancelTask" :loading="isSubmitting">
					{{ isSubmitting ? '取消中...' : '确认取消' }}
				</AppButton>
			</view>
		</AppModal>

		<AppModal v-model:visible="showTemperatureSettingsModal" title="设置温度参数">
			<view class="form-container">
				<view class="form-item">
					<view class="form-label">搅拌摩擦系数</view>
					<picker mode="selector" :range="temperatureStore.mixerTypes" range-key="text" :value="currentMixerPresetIndex" @change="handleMixerChange">
						<view class="picker">
							{{ temperatureStore.mixerTypes[currentMixerPresetIndex]?.text || '请选择' }}
							<view class="arrow-down"></view>
						</view>
					</picker>
				</view>

				<view class="form-item form-item-stacked" v-if="isCustomMode">
					<view class="form-item-row">
						<view class="form-label">自定义系数 (°C)</view>
						<input class="input-field" type="digit" v-model="tempSettings.mixerType" placeholder="输入校准值" />
					</view>
					<view class="form-help-text">请通过实测校准摩擦系数（商用机建议 12-20°C）</view>
				</view>

				<view class="form-item">
					<view class="form-label">环境温度 (°C)</view>
					<input class="input-field" type="digit" v-model="tempSettings.envTemp" placeholder="输入温度" />
				</view>
				<view class="form-item">
					<view class="form-label">面粉温度 (°C)</view>
					<input class="input-field" type="digit" v-model="tempSettings.flourTemp" placeholder="输入温度" />
				</view>
				<view class="form-item">
					<view class="form-label">水温 (°C)</view>
					<input class="input-field" type="digit" v-model="tempSettings.waterTemp" placeholder="输入温度" />
				</view>
			</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showTemperatureSettingsModal = false">取消</AppButton>
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
import AppModal from '@/components/AppModal.vue';
import ExpandingFab from '@/components/ExpandingFab.vue';
import ListItem from '@/components/ListItem.vue';
import IconButton from '@/components/IconButton.vue';
import AppButton from '@/components/AppButton.vue';
import CalendarModal from '@/components/CalendarModal.vue';
import RefreshableLayout from '@/components/RefreshableLayout.vue';
import type { ProductionTaskDto, PrepTask, RecipeCategory, ProductionTaskSummaryDto } from '@/types/api';
// [核心修改] 导入 deleteTask API
import { updateTaskStatus, getTaskDates, deleteTask } from '@/api/tasks';
import { formatChineseDate } from '@/utils/format';

const STATUS_MAP = {
	PENDING: {
		text: '待开始',
		className: 'status-pending',
		color: '#d4a373'
	},
	IN_PROGRESS: {
		text: '进行中',
		className: 'status-inprogress',
		color: '#27ae60'
	},
	PREP: {
		text: '待准备',
		className: 'status-prep',
		color: '#8e44ad'
	},
	DEFAULT: {
		text: '未知',
		className: '',
		color: 'transparent'
	}
};

const props = defineProps({
	hasTabBar: {
		type: Boolean,
		default: true
	}
});

const userStore = useUserStore();
const dataStore = useDataStore();
const uiStore = useUiStore();
const toastStore = useToastStore();
const temperatureStore = useTemperatureStore();

const categoryMap = {
	BREAD: '面包任务',
	PASTRY: '西点任务',
	DESSERT: '甜品任务',
	DRINK: '饮品任务'
};

const isSingleCategory = computed(() => {
	return Object.keys(dataStore.productsForTaskCreation).length === 1;
});

const singleCategoryKey = computed(() => {
	if (!isSingleCategory.value) return null;
	return Object.keys(dataStore.productsForTaskCreation)[0] as RecipeCategory;
});

const fabActions = computed(() => {
	const categories = Object.keys(dataStore.productsForTaskCreation) as RecipeCategory[];
	return categories.map((category) => ({
		icon: '/static/icons/add.svg',
		text: `${categoryMap[category] || category}`,
		action: () => navigateToCreatePage(category)
	}));
});

const refreshableLayout = ref<InstanceType<typeof RefreshableLayout> | null>(null);

const isSubmitting = ref(false);
const selectedTaskForAction = ref<ProductionTaskSummaryDto | null>(null);
const showCancelConfirmModal = ref(false);
// [核心修改] 新增删除确认弹窗状态
const showDeleteConfirmModal = ref(false);
const showTaskActionsModal = ref(false);
const showTemperatureSettingsModal = ref(false);

const isCalendarVisible = ref(false);
const todayForInit = new Date();
const selectedDate = ref(`${todayForInit.getFullYear()}-${String(todayForInit.getMonth() + 1).padStart(2, '0')}-${String(todayForInit.getDate()).padStart(2, '0')}`);
const taskDates = ref<string[]>([]);

const isNavigating = ref(false);

const isFabVisible = ref(true);
const lastScrollTop = ref(0);
const scrollThreshold = 5;

const tempSettings = reactive<{
	mixerType: number;
	envTemp: number | null;
	flourTemp: number | null;
	waterTemp: number | null;
}>({
	mixerType: 16, // [核心修改] 默认值改为 16
	envTemp: 25,
	flourTemp: 25,
	waterTemp: 25
});

// [核心修改] 删除旧的 currentMixerIndex (computed)
// const currentMixerIndex = computed(() => {
// 	return temperatureStore.mixerTypes.findIndex((m) => m.value === tempSettings.mixerType);
// });

// [核心修改] 新增 currentMixerPresetIndex (ref) 来跟踪 picker 的选择
const currentMixerPresetIndex = ref(0);

// [核心修改] 新增 isCustomMode (computed) 来判断是否显示自定义输入框
const isCustomMode = computed(() => {
	// 检查当前 picker 选中的项
	const selected = temperatureStore.mixerTypes[currentMixerPresetIndex.value];
	// 如果选中项的值是 -1 (我们设定的自定义标记)，则返回 true
	return selected && selected.value === -1;
});

const pendingCountLabel = computed(() => {
	const todayDate = new Date();
	const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
	if (selectedDate.value === today) {
		return '今日待完成';
	}
	const date = new Date(selectedDate.value);
	return `${date.getMonth() + 1}月${date.getDate()}日待完成`;
});

const pageTitle = computed(() => {
	const todayDate = new Date();
	const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
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
	isNavigating.value = false;

	try {
		if (dataStore.dataStale.productsForTaskCreation || !dataStore.dataLoaded.productsForTaskCreation || dataStore.dataStale.recipes) {
			await dataStore.fetchProductsForTaskCreation();
		}
		if (dataStore.dataStale.production || !dataStore.dataLoaded.production) {
			await Promise.all([dataStore.fetchProductionData(selectedDate.value), getTaskDates().then((dates) => (taskDates.value = dates))]);
		}
	} catch (error) {
		console.error('Failed to load data on show:', error);
	}
});

const handleScroll = (event: any) => {
	const scrollTop = event.detail.scrollTop;

	if (Math.abs(scrollTop - lastScrollTop.value) <= scrollThreshold) {
		return;
	}

	if (scrollTop > lastScrollTop.value && scrollTop > 50) {
		isFabVisible.value = false;
	} else {
		isFabVisible.value = true;
	}

	lastScrollTop.value = scrollTop < 0 ? 0 : scrollTop;
};

const handleRefresh = async () => {
	try {
		dataStore.markProductionAsStale();
		dataStore.markProductsForTaskCreationAsStale();
		await Promise.all([dataStore.fetchProductsForTaskCreation(), dataStore.fetchProductionData(selectedDate.value), getTaskDates().then((dates) => (taskDates.value = dates))]);
	} finally {
		refreshableLayout.value?.finishRefresh();
	}
};

const handleDateSelect = async (date: string) => {
	selectedDate.value = date;
	isCalendarVisible.value = false;
	await dataStore.fetchProductionData(date);
};

const getTaskTitle = (task: ProductionTaskSummaryDto | PrepTask) => {
	if (task.status === 'PREP') {
		return (task as PrepTask).title;
	}
	const regularTask = task as ProductionTaskSummaryDto;
	if (!regularTask.items || regularTask.items.length === 0) return '未知任务';
	return regularTask.items.map((item) => `${item.product.name} x${item.quantity}`).join('、');
};

const getTotalQuantity = (task: ProductionTaskSummaryDto) => {
	if (!task.items) return 0;
	return task.items.reduce((sum, item) => sum + item.quantity, 0);
};

// [核心修改] 重新规划副标题格式，统一单日和跨天任务的显示逻辑
const getTaskDetails = (task: any) => {
	if (task.status === 'PREP') {
		return task.details;
	}

	const regularTask = task as ProductionTaskSummaryDto;
	let dateDisplay: string;

	const startDateStr = regularTask.startDate.split('T')[0];
	const endDateStr = regularTask.endDate ? regularTask.endDate.split('T')[0] : startDateStr;

	if (regularTask.endDate && startDateStr !== endDateStr) {
		const startDate = new Date(regularTask.startDate);
		const endDate = new Date(regularTask.endDate);
		const startMonth = startDate.getMonth() + 1;
		const startDay = startDate.getDate();
		const endMonth = endDate.getMonth() + 1;
		const endDay = endDate.getDate();

		if (startMonth === endMonth) {
			dateDisplay = `${startMonth}月${startDay}日-${endDay}日`;
		} else {
			dateDisplay = `${startMonth}月${startDay}日-${endMonth}月${endDay}日`;
		}
	} else {
		// 对于单日任务，直接使用中文日期格式
		dateDisplay = formatChineseDate(regularTask.startDate);
	}

	const totalQuantity = getTotalQuantity(regularTask);
	const creator = regularTask.createdBy?.name || regularTask.createdBy?.phone || '未知';

	return `${dateDisplay} 总数: ${totalQuantity} | by ${creator}`;
};

const navigateToDetail = (task: any) => {
	if (isNavigating.value) return;
	isNavigating.value = true;

	const isPrepTask = task.status === 'PREP';
	if (isPrepTask) {
		uni.navigateTo({ url: `/pages/production/prep-detail?date=${selectedDate.value}` });
	} else {
		uni.navigateTo({ url: `/pages/production/detail?taskId=${task.id}` });
	}
};

const navigateToHistory = () => {
	if (isNavigating.value) return;
	isNavigating.value = true;
	uni.navigateTo({ url: '/pages/production/history' });
};

const openTaskActions = (task: any) => {
	if (task.status === 'PREP') return;
	selectedTaskForAction.value = task as ProductionTaskSummaryDto;
	showTaskActionsModal.value = true;
};

const handleEditTask = () => {
	if (isNavigating.value || !selectedTaskForAction.value) return;
	isNavigating.value = true;
	showTaskActionsModal.value = false;

	dataStore.clearTaskProgress(selectedTaskForAction.value.id);

	uni.setStorageSync('task_to_edit', JSON.stringify(selectedTaskForAction.value));
	uni.navigateTo({
		url: `/pages/production/create?taskId=${selectedTaskForAction.value.id}`
	});
};

// [核心修改] 新增打开删除确认弹窗的函数
const handleOpenDeleteConfirm = () => {
	showTaskActionsModal.value = false;
	showDeleteConfirmModal.value = true;
};

const handleOpenCancelConfirm = () => {
	showTaskActionsModal.value = false;
	showCancelConfirmModal.value = true;
};

// [核心修改] 新增确认删除任务的处理函数
const handleConfirmDeleteTask = async () => {
	if (!selectedTaskForAction.value) return;
	isSubmitting.value = true;
	try {
		await deleteTask(selectedTaskForAction.value.id); // 调用删除 API

		dataStore.clearTaskProgress(selectedTaskForAction.value.id);

		toastStore.show({ message: '任务已删除', type: 'success' });
		dataStore.markProductionAsStale(); // 标记列表数据过时

		// 重新获取数据刷新列表
		await Promise.all([dataStore.fetchProductionData(selectedDate.value), getTaskDates().then((dates) => (taskDates.value = dates))]);
	} catch (error) {
		console.error('Failed to delete task:', error);
		// 可以在这里添加更具体的错误提示，例如 toastStore.show({...})
	} finally {
		isSubmitting.value = false;
		showDeleteConfirmModal.value = false; // 关闭删除确认弹窗
		selectedTaskForAction.value = null;
	}
};

const handleConfirmCancelTask = async () => {
	if (!selectedTaskForAction.value) return;
	isSubmitting.value = true;
	try {
		await updateTaskStatus(selectedTaskForAction.value.id, 'CANCELLED');

		dataStore.clearTaskProgress(selectedTaskForAction.value.id);

		toastStore.show({ message: '任务已取消', type: 'success' });
		dataStore.markProductionAsStale();
		dataStore.markHistoricalTasksAsStale(); // 取消的任务会进入历史记录

		await Promise.all([dataStore.fetchProductionData(selectedDate.value), getTaskDates().then((dates) => (taskDates.value = dates))]);
	} catch (error) {
		console.error('Failed to cancel task:', error);
	} finally {
		isSubmitting.value = false;
		showCancelConfirmModal.value = false;
		selectedTaskForAction.value = null;
	}
};

const navigateToCreatePage = (category: RecipeCategory) => {
	if (isNavigating.value) return;
	isNavigating.value = true;
	uni.navigateTo({ url: `/pages/production/create?category=${category}&date=${selectedDate.value}` });
};

const handleFabClick = () => {
	const categories = Object.keys(dataStore.productsForTaskCreation);

	if (categories.length === 0) {
		toastStore.show({
			message: '请先创建配方才能添加生产任务',
			type: 'info'
		});
		return;
	}

	if (categories.length === 1) {
		navigateToCreatePage(categories[0] as RecipeCategory);
	}
};

// [核心修改] 更新 openTemperatureSettingsModal 逻辑
const openTemperatureSettingsModal = () => {
	// 1. 从 store 加载当前保存的设置到 tempSettings
	Object.assign(tempSettings, temperatureStore.settings);

	// 2. 检查加载的 F 值 (tempSettings.mixerType) 是否在预设列表中
	const matchingPresetIndex = temperatureStore.mixerTypes.findIndex((m) => m.value === tempSettings.mixerType);

	if (matchingPresetIndex !== -1) {
		// 3a. 找到了！说明当前 F 值是一个预设值
		currentMixerPresetIndex.value = matchingPresetIndex;
	} else {
		// 3b. 没找到！说明当前 F 值是自定义的 (e.g., 14.5)
		// 找到 "自定义" 选项的索引
		const customIndex = temperatureStore.mixerTypes.findIndex((m) => m.value === -1);
		// 将 picker 设置到 "自定义"
		currentMixerPresetIndex.value = customIndex > -1 ? customIndex : 0;
	}

	// 4. 打开弹窗
	showTemperatureSettingsModal.value = true;
};

// [核心修改] 更新 handleMixerChange 逻辑
const handleMixerChange = (e: any) => {
	const selectedIndex = e.detail.value;
	currentMixerPresetIndex.value = selectedIndex; // 更新 picker 的索引状态

	const selectedValue = temperatureStore.mixerTypes[selectedIndex].value;

	if (selectedValue !== -1) {
		// 如果用户选择的*不是* "自定义" (value: -1)
		// 那么就用这个预设值 (e.g., 9, 12, 16, 20) 更新 tempSettings.mixerType
		tempSettings.mixerType = selectedValue;
	}
	// 如果用户选择的是 "自定义" (value: -1)
	// 我们 *不* 覆盖 tempSettings.mixerType
	// 这样，输入框 (v-if="isCustomMode") 就会显示出当前F值 (e.g., 14.5)，并允许用户编辑
};

// [核心修改] handleSaveTemperatureSettings 逻辑是正确的，无需修改
const handleSaveTemperatureSettings = () => {
	temperatureStore.saveTemperatureSettings({
		// tempSettings.mixerType 要么是选择的预设值，要么是自定义输入的值
		mixerType: Number(tempSettings.mixerType) || temperatureStore.settings.mixerType,
		envTemp: Number(tempSettings.envTemp) || temperatureStore.settings.envTemp,
		flourTemp: Number(tempSettings.flourTemp) || temperatureStore.settings.flourTemp,
		waterTemp: Number(tempSettings.waterTemp) || temperatureStore.settings.waterTemp
	});
	showTemperatureSettingsModal.value = false;
	toastStore.show({ message: '设置已保存', type: 'success' });
};
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
@include list-item-option-style;
@include form-control-styles;

.full-height-container {
	height: 100%;
	display: flex;
	flex-direction: column;
}

.full-height-wrapper {
	height: 100%;
	display: flex;
	flex-direction: column;
}

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

.clickable-title {
	display: flex;
	align-items: center;
	gap: 8px;

	.card-title {
		color: var(--primary-color);
		font-weight: 500;
	}
}

.calendar-icon {
	width: 20px;
	height: 20px;
	opacity: 0.7;
}

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
	font-weight: 500;
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

/* [核心新增] 删除/取消按钮的危险文本样式 */
.danger-text {
	color: var(--danger-color, #e74c3c);
}

.form-container {
	padding: 0 5px;
}

/* [核心修改] 调整帮助文本样式 */
.form-help-text {
	font-size: 13px;
	color: var(--text-secondary);
	padding: 5px 0px 10px 0px;
	margin-top: 0; /* [核心修改] 移除负边距 */
	width: 100%;
	box-sizing: border-box;
}

.form-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 10px 0;
	border-bottom: 1px solid var(--border-color-light, #f0f0f0);
}

/* [核心修改] 新增 .form-item-stacked 样式 */
.form-item-stacked {
	flex-direction: column;
	align-items: stretch;
	padding: 10px 0 0 0; /* 调整内边距，让边框在帮助文本下方 */
}

/* [核心修改] 新增 .form-item-row 样式 */
.form-item-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	width: 100%;
}

.form-container .form-item:last-of-type {
	border-bottom: none;
}

.form-label {
	font-size: 16px;
	color: var(--text-primary);
	white-space: nowrap;
	margin-right: 15px;
}

.input-field {
	width: 90px;
}

.picker {
	min-width: 120px;
	width: auto;
	text-align: right;
}
</style>
