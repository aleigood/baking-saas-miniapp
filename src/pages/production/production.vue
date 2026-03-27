<template>
	<view class="full-height-container">
		<RefreshableLayout ref="refreshableLayout" @refresh="handleRefresh" @scroll="handleScroll" class="full-height-wrapper">
			<view
				class="page-content animated-content"
				:class="[{ 'page-content-with-tabbar-fab': hasTabBar, 'page-content-with-fab': !hasTabBar }, { 'is-revealed': !isLoading && hasBeenActivated }]"
				v-if="hasBeenActivated"
			>
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

				<template v-if="dataStore.production.length > 0">
					<view :key="listAnimationKey">
						<ListItem
							v-for="(task, index) in dataStore.production"
							:key="`${task.id}_${task.status}`"
							@click="navigateToDetail(task)"
							@longpress="openTaskActions(task)"
							:vibrate-on-long-press="true"
							card-mode
							:animation-index="index"
							:animate-on-mount="triggerListAnimation"
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
				</template>

				<EmptyState v-else-if="isInitialFetchDone" icon="/static/icons/empty-list.svg" title="所选日期暂无任务" subtitle="点击下方按钮创建新的生产任务" />
			</view>

			<view
				v-if="isLoading && uiStore.activeTab === 'production'"
				class="page-content skeleton-overlay"
				:class="{ 'page-content-with-tabbar-fab': hasTabBar, 'page-content-with-fab': !hasTabBar }"
			>
				<view style="height: 120px; margin-bottom: 20px; border-radius: 20px; background-color: #faf8f5"></view>
				<SkeletonList :count="5" />
			</view>
		</RefreshableLayout>

		<ExpandingFab :actions="isSingleCategory ? [] : fabActions" :visible="isFabVisible" :no-tab-bar="!hasTabBar" @click="handleFabClick" />

		<CalendarModal :visible="isCalendarVisible" :task-dates="taskDates" @close="isCalendarVisible = false" @select="handleDateSelect" />

		<AppModal ref="taskActionsModalRef" v-model:visible="showTaskActionsModal" title="制作任务" :no-header-line="true">
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
import { ref, computed, reactive, watch } from 'vue';
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
// [新增] 引入双缓冲组件
import SkeletonList from '@/components/SkeletonList.vue';
import EmptyState from '@/components/EmptyState.vue';
import type { ProductionTaskDto, PrepTask, RecipeCategory, ProductionTaskSummaryDto } from '@/types/api';
import { updateTaskStatus, getTaskDates, deleteTask } from '@/api/tasks';
import { formatChineseDate, formatWeight } from '@/utils/format';

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

// [新增] 双缓冲局部状态及按需激活状态
const isLoading = ref(false);
const hasBeenActivated = ref(false);
const isInitialFetchDone = ref(false);

const listAnimationKey = ref(Date.now());
const triggerListAnimation = ref(false);
const isFirstLoad = ref(true);

const categoryMap: Record<string, string> = {
	BREAD: '制作面包',
	PASTRY: '制作西点',
	DESSERT: '制作甜品',
	DRINK: '制作饮品',
	OTHER: '制作原料'
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
const taskActionsModalRef = ref<InstanceType<typeof AppModal> | null>(null);

const isSubmitting = ref(false);
const selectedTaskForAction = ref<ProductionTaskSummaryDto | null>(null);
const showCancelConfirmModal = ref(false);
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
	mixerType: 16,
	envTemp: 25,
	flourTemp: 25,
	waterTemp: 25
});

const currentMixerPresetIndex = ref(0);

const isCustomMode = computed(() => {
	const selected = temperatureStore.mixerTypes[currentMixerPresetIndex.value];
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

const triggerListAnimationWithKeyUpdate = (playAnimation: boolean) => {
	listAnimationKey.value = Date.now();
	triggerListAnimation.value = playAnimation;
};

// [修改] 优化静默刷新逻辑：从子页面返回时不再展示骨架屏闪烁
const loadDataIfNeeded = async () => {
	if (uiStore.activeTab !== 'production') return;

	const isFirstTimeOpening = !hasBeenActivated.value;
	const needsFetch =
		dataStore.dataStale.productsForTaskCreation ||
		!dataStore.dataLoaded.productsForTaskCreation ||
		dataStore.dataStale.recipes ||
		dataStore.dataStale.production ||
		!dataStore.dataLoaded.production;

	if (isFirstTimeOpening) {
		hasBeenActivated.value = true;
		isLoading.value = true; // 仅首次进入时开启骨架屏
	}
	// [核心修改] 删除了 else if (needsFetch) { isLoading.value = true; }
	// 如果页面已经激活过，即使数据过期 (needsFetch)，也不显示骨架屏，只在后台静默拉取新数据

	try {
		let didFetchProduction = false;
		if (dataStore.dataStale.productsForTaskCreation || !dataStore.dataLoaded.productsForTaskCreation || dataStore.dataStale.recipes) {
			await dataStore.fetchProductsForTaskCreation();
		}
		if (dataStore.dataStale.production || !dataStore.dataLoaded.production) {
			await Promise.all([dataStore.fetchProductionData(selectedDate.value), getTaskDates().then((dates) => (taskDates.value = dates))]);
			didFetchProduction = true;
		}
		isInitialFetchDone.value = true;
		return didFetchProduction;
	} catch (error) {
		console.error('Failed to load data on show:', error);
		isInitialFetchDone.value = true;
		return false;
	} finally {
		if (isFirstTimeOpening || needsFetch) {
			setTimeout(() => {
				isLoading.value = false;
				if (isFirstLoad.value) {
					triggerListAnimationWithKeyUpdate(false);
					isFirstLoad.value = false;
				} else {
					triggerListAnimationWithKeyUpdate(false);
				}
			}, 200);
		} else {
			isLoading.value = false;
			triggerListAnimationWithKeyUpdate(false);
		}
	}
};

watch(
	() => uiStore.activeTab,
	(newTab, oldTab) => {
		if (newTab === 'production') {
			loadDataIfNeeded();
		} else if (oldTab === 'production') {
			triggerListAnimation.value = false;
		}
	},
	{ immediate: true }
);

onLoad(() => {
	temperatureStore.initTemperatureSettings();
});

onShow(() => {
	isNavigating.value = false;
	showTaskActionsModal.value = false;
	loadDataIfNeeded();
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
		setTimeout(() => {
			triggerListAnimationWithKeyUpdate(true);
		}, 700);
	}
};

const handleDateSelect = async (date: string) => {
	selectedDate.value = date;
	isCalendarVisible.value = false;
	isLoading.value = true;
	await dataStore.fetchProductionData(date);
	setTimeout(() => {
		isLoading.value = false;
		triggerListAnimationWithKeyUpdate(true);
	}, 200);
};

const isSelfMadeItem = (item: any) => {
	return item.product?.recipeVersion?.family?.category === 'OTHER';
};

const getTaskTitle = (task: ProductionTaskDto | PrepTask) => {
	if (task.status === 'PREP') {
		return (task as PrepTask).title;
	}
	const regularTask = task as ProductionTaskDto;
	if (!regularTask.items || regularTask.items.length === 0) return '未知任务';

	return regularTask.items
		.map((item) => {
			if (isSelfMadeItem(item)) {
				return `${item.product.name} ${item.quantity}g`;
			}
			return `${item.product.name} x${item.quantity}`;
		})
		.join('、');
};

const getTotalQuantity = (task: ProductionTaskDto) => {
	if (!task.items) return 0;
	return task.items.reduce((sum, item) => {
		if (isSelfMadeItem(item)) {
			return sum + 1;
		}
		return sum + item.quantity;
	}, 0);
};

const getTaskDetails = (task: any) => {
	if (task.status === 'PREP') {
		return task.details;
	}

	const regularTask = task as ProductionTaskDto;
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

	uni.setStorageSync('task_to_edit', JSON.stringify(selectedTaskForAction.value));

	if (taskActionsModalRef.value) {
		taskActionsModalRef.value.closeAndRun(() => {
			const firstItem = selectedTaskForAction.value?.items[0];
			if (firstItem && isSelfMadeItem(firstItem)) {
				uni.navigateTo({
					url: `/pages/production/create-ingredient?taskId=${selectedTaskForAction.value!.id}`
				});
			} else {
				uni.navigateTo({
					url: `/pages/production/create?taskId=${selectedTaskForAction.value!.id}`
				});
			}
		});
	} else {
		showTaskActionsModal.value = false;
		uni.navigateTo({
			url: `/pages/production/create?taskId=${selectedTaskForAction.value.id}`
		});
	}
};

const handleOpenDeleteConfirm = () => {
	showTaskActionsModal.value = false;
	showDeleteConfirmModal.value = true;
};

const handleOpenCancelConfirm = () => {
	showTaskActionsModal.value = false;
	showCancelConfirmModal.value = true;
};

const handleConfirmDeleteTask = async () => {
	if (!selectedTaskForAction.value) return;
	isSubmitting.value = true;
	try {
		await deleteTask(selectedTaskForAction.value.id);

		dataStore.clearTaskProgress(selectedTaskForAction.value.id);

		toastStore.show({ message: '任务已删除', type: 'success' });
		dataStore.markProductionAsStale();

		await Promise.all([dataStore.fetchProductionData(selectedDate.value), getTaskDates().then((dates) => (taskDates.value = dates))]);
		triggerListAnimationWithKeyUpdate(true);
	} catch (error) {
		console.error('Failed to delete task:', error);
	} finally {
		isSubmitting.value = false;
		showDeleteConfirmModal.value = false;
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
		dataStore.markHistoricalTasksAsStale();

		await Promise.all([dataStore.fetchProductionData(selectedDate.value), getTaskDates().then((dates) => (taskDates.value = dates))]);
		triggerListAnimationWithKeyUpdate(true);
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
	if (category === 'OTHER') {
		uni.navigateTo({ url: `/pages/production/create-ingredient?date=${selectedDate.value}` });
	} else {
		uni.navigateTo({ url: `/pages/production/create?category=${category}&date=${selectedDate.value}` });
	}
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

const openTemperatureSettingsModal = () => {
	Object.assign(tempSettings, temperatureStore.settings);
	const matchingPresetIndex = temperatureStore.mixerTypes.findIndex((m) => m.value === tempSettings.mixerType);

	if (matchingPresetIndex !== -1) {
		currentMixerPresetIndex.value = matchingPresetIndex;
	} else {
		const customIndex = temperatureStore.mixerTypes.findIndex((m) => m.value === -1);
		currentMixerPresetIndex.value = customIndex > -1 ? customIndex : 0;
	}
	showTemperatureSettingsModal.value = true;
};

const handleMixerChange = (e: any) => {
	const selectedIndex = e.detail.value;
	currentMixerPresetIndex.value = selectedIndex;

	const selectedValue = temperatureStore.mixerTypes[selectedIndex].value;

	if (selectedValue !== -1) {
		tempSettings.mixerType = selectedValue;
	}
};

const handleSaveTemperatureSettings = () => {
	temperatureStore.saveTemperatureSettings({
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

.danger-text {
	color: var(--danger-color, #e74c3c);
}

.form-container {
	padding: 0 5px;
}

.form-help-text {
	font-size: 13px;
	color: var(--text-secondary);
	padding: 5px 0px 10px 0px;
	margin-top: 0;
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

.form-item-stacked {
	flex-direction: column;
	align-items: stretch;
	padding: 10px 0 0 0;
}

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
