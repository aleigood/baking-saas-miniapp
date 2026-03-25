<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper" @click="hidePopover">
		<DetailHeader title="前置任务" />
		<DetailPageLayout @scroll="handleScroll">
			<view class="page-content page-content-with-fab">
				<template v-if="task">
					<view class="filter-header-container">
						<FilterTabs v-model="activeTab" :tabs="filterTabs" />

						<IconButton v-if="task.sourceTasks && task.sourceTasks.length > 1" @click="openTaskFilter" style="margin-left: 10px">
							<image class="header-icon" src="/static/icons/filter.svg" mode="aspectFit" />
						</IconButton>
					</view>

					<view v-if="activeTab === 'BILL_OF_MATERIALS'">
						<template v-if="hasMaterials">
							<view v-if="billOfMaterials.standardItems.length > 0" class="card">
								<view class="card-title-wrapper" @click="toggleCollapse('standardItems')">
									<span class="card-title title-text">标准原料</span>
									<view class="spacer"></view>
									<span class="arrow" :class="{ collapsed: collapsedSections.has('standardItems') }">&#10095;</span>
								</view>
								<view class="collapsible-content" :class="{ 'is-collapsed': collapsedSections.has('standardItems') }">
									<view class="smart-table">
										<view class="table-header">
											<text class="col-ingredient">原料</text>
											<text class="col-brand">品牌</text>
											<text class="col-stock">库存</text>
											<text class="col-usage">需求量</text>
										</view>
										<view v-for="item in billOfMaterials.standardItems" :key="item.ingredientId" class="table-row">
											<text class="col-ingredient">{{ item.ingredientName }}</text>
											<text class="col-brand">{{ item.brand || '-' }}</text>
											<text class="col-stock">{{ formatWeight(item.currentStock) }}</text>
											<text class="col-usage" :class="{ highlight: item.currentStock < item.totalRequired }">{{ formatWeight(item.totalRequired) }}</text>
										</view>
									</view>
								</view>
							</view>

							<view v-if="billOfMaterials.nonInventoriedItems.length > 0" class="card">
								<view class="card-title-wrapper" @click="toggleCollapse('nonInventoriedItems')">
									<span class="card-title title-text">即时采购原料</span>
									<view class="spacer"></view>
									<span class="arrow" :class="{ collapsed: collapsedSections.has('nonInventoriedItems') }">&#10095;</span>
								</view>
								<view class="collapsible-content" :class="{ 'is-collapsed': collapsedSections.has('nonInventoriedItems') }">
									<view class="smart-table">
										<view class="table-header">
											<text class="col-ingredient">原料</text>
											<text class="col-brand">品牌</text>
											<text class="col-usage">需求量</text>
										</view>
										<view v-for="item in billOfMaterials.nonInventoriedItems" :key="item.ingredientId" class="table-row">
											<text class="col-ingredient">{{ item.ingredientName }}</text>
											<text class="col-brand">{{ item.brand || '-' }}</text>
											<text class="col-usage highlight">{{ formatWeight(item.totalRequired) }}</text>
										</view>
									</view>
								</view>
							</view>
						</template>
						<view v-else class="empty-state">
							<text>选中任务下无需采购任何原料</text>
						</view>
					</view>

					<view v-if="activeTab !== 'BILL_OF_MATERIALS'">
						<view v-if="filteredPrepItems.length > 0">
							<view v-for="item in filteredPrepItems" :key="item.id" class="card recipe-card" :class="{ 'is-completed': completedItems.has(item.id) }">
								<view class="card-title-wrapper" @click="toggleCollapse(item.id)">
									<view class="completion-toggle" @click.stop="toggleItemCompleted(item.id)">
										<view class="check-icon" :class="{ 'is-checked': completedItems.has(item.id) }">
											<view v-if="completedItems.has(item.id)" class="check-mark"></view>
										</view>
									</view>

									<span class="card-title title-text" @click.stop="toggleItemCompleted(item.id)">{{ item.name }}</span>

									<view class="spacer"></view>

									<span class="arrow" :class="{ collapsed: collapsedSections.has(item.id) }">&#10095;</span>
								</view>

								<view class="collapsible-content" :class="{ 'is-collapsed': collapsedSections.has(item.id) }">
									<view class="fixed-grid-table">
										<view class="table-header">
											<text class="col-ingredient">原料</text>
											<text class="col-brand">品牌</text>
											<text class="col-usage">用量</text>
										</view>
										<view
											v-for="(ing, index) in item.ingredients"
											:key="item.id + '-' + index"
											class="table-row"
											:class="{ 'is-added': addedIngredientsMap.has(`${item.id}-${index}`) }"
											@click.stop="showExtraInfo(ing.extraInfo, `info-icon-${item.id}-${index}`)"
											@longpress.prevent="toggleIngredientAdded(item.id, index)"
										>
											<view class="col-ingredient ingredient-name-cell">
												<view v-if="ing.extraInfo" class="ingredient-with-icon" :id="`info-icon-${item.id}-${index}`">
													<text>{{ ing.name }}</text>
													<image class="info-icon" src="/static/icons/info.svg" mode="aspectFit"></image>
												</view>
												<text v-else>{{ ing.name }}</text>
											</view>
											<text class="col-brand">{{ ing.isRecipe ? '自制' : ing.brand || '-' }}</text>
											<text class="col-usage">{{ formatWeight(ing.weightInGrams) }}</text>
										</view>
									</view>

									<view class="total-weight-summary">
										<view class="summary-item">
											<text class="summary-label">需求总量</text>
											<text class="summary-value">{{ formatWeight((item.targetWeight || item.totalWeight) + (item.stockWeight || 0)) }}</text>
										</view>

										<view class="summary-divider"></view>

										<view class="summary-item">
											<text class="summary-label">库存抵扣</text>
											<text class="summary-value">{{ formatWeight(item.stockWeight || 0) }}</text>
										</view>

										<view class="summary-divider"></view>

										<view v-if="item.targetWeight != null" class="summary-item">
											<text class="summary-label">目标产出</text>
											<text class="summary-value highlight-value">{{ formatWeight(item.targetWeight) }}</text>
										</view>

										<view v-if="item.targetWeight != null" class="summary-divider"></view>
										<view class="summary-item">
											<text class="summary-label">预计投料</text>
											<text class="summary-value text-secondary">{{ formatWeight(item.totalWeight) }}</text>
										</view>
									</view>

									<view v-if="item.procedure && item.procedure.length > 0" class="procedure-notes">
										<text class="notes-title">制作要点:</text>
										<text v-for="(step, stepIndex) in item.procedure" :key="stepIndex" class="note-item">{{ stepIndex + 1 }}. {{ step }}</text>
									</view>
								</view>
							</view>
						</view>
						<view v-else class="empty-state">
							<text>该分类下暂无备料</text>
							<view class="empty-state-sub">或库存充足无需制作</view>
						</view>
					</view>
				</template>
				<view v-else-if="isLoading" class="loading-spinner">
					<text>加载中...</text>
				</view>
			</view>
		</DetailPageLayout>

		<AppModal v-model:visible="showTaskFilterModal" title="筛选生产任务">
			<scroll-view scroll-y class="task-filter-list">
				<view class="task-filter-item ripple-container" @click="toggleSelectAllTasks">
					<view class="check-icon" :class="{ 'is-checked': isAllTasksSelected }">
						<view v-if="isAllTasksSelected" class="check-mark"></view>
					</view>
					<text class="task-name font-bold">全选当前日期的所有任务</text>
				</view>
				<view v-for="sourceTask in task?.sourceTasks" :key="sourceTask.id" class="task-filter-item ripple-container" @click="toggleTaskSelection(sourceTask.id)">
					<view class="check-icon" :class="{ 'is-checked': tempSelectedTaskIds.includes(sourceTask.id) }">
						<view v-if="tempSelectedTaskIds.includes(sourceTask.id)" class="check-mark"></view>
					</view>
					<text class="task-name">{{ sourceTask.name }}</text>
				</view>
			</scroll-view>

			<view class="modal-actions">
				<AppButton type="secondary" @click="showTaskFilterModal = false">取消</AppButton>
				<AppButton type="primary" @click="applyTaskFilter">确定</AppButton>
			</view>
		</AppModal>

		<AppModal v-model:visible="showCalculatorModal" title="发酵计算器">
			<FermentationCalculator :pre-doughs="preDoughItems" @close="showCalculatorModal = false" />
		</AppModal>

		<ExpandingFab v-if="task" :actions="fabActions" :no-tab-bar="true" :visible="isFabVisible" />

		<AppPopover :visible="popover.visible" :content="popover.content" :targetRect="popover.targetRect" placement="right" :offsetY="0" />
	</view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, getCurrentInstance } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import type { PrepTask, BillOfMaterialsResponseDto } from '@/types/api';
import { getPrepTaskDetails, getPrepTaskPdfUrl } from '@/api/tasks';
import { useDataStore } from '@/store/data';
import { useUserStore } from '@/store/user';
import { useToastStore } from '@/store/toast';
import DetailPageLayout from '@/components/DetailPageLayout.vue';
import DetailHeader from '@/components/DetailHeader.vue';
import FilterTabs from '@/components/FilterTabs.vue';
import { formatWeight } from '@/utils/format';
import AppModal from '@/components/AppModal.vue';
import AppButton from '@/components/AppButton.vue';
import IconButton from '@/components/IconButton.vue'; // [新增] 引入 IconButton 组件
import FermentationCalculator from '@/components/FermentationCalculator.vue';
import ExpandingFab from '@/components/ExpandingFab.vue';
import AppPopover from '@/components/AppPopover.vue';

defineOptions({
	inheritAttrs: false
});

const instance = getCurrentInstance();
const dataStore = useDataStore();
const userStore = useUserStore();
const toastStore = useToastStore();

const isLoading = ref(true);
const isPrinting = ref(false);
const task = ref<PrepTask | null>(null);
const taskDate = ref<string | null>(null);

// 筛选功能相关状态
const selectedTaskIds = ref<string[]>([]);
const tempSelectedTaskIds = ref<string[]>([]);
const showTaskFilterModal = ref(false);

const addedIngredientsMap = reactive(new Set<string>());
const completedItems = ref(new Set<string>());

const activeTab = ref('BILL_OF_MATERIALS');
const collapsedSections = ref(new Set<string>());

const showCalculatorModal = ref(false);
const isFabVisible = ref(true);
const lastScrollTop = ref(0);
const scrollThreshold = 5;

const popover = reactive<{
	visible: boolean;
	content: string;
	targetRect: {
		left: number;
		top: number;
		width: number;
		height: number;
	} | null;
}>({
	visible: false,
	content: '',
	targetRect: null
});

const fabActions = computed(() => {
	const actions = [];

	actions.push({
		icon: '/static/icons/print.svg',
		text: '打印备料单',
		action: handlePrintPrepTask
	});

	if (preDoughItems.value.length > 0) {
		actions.push({
			icon: '/static/icons/calculator.svg',
			text: '发酵计算器',
			action: () => {
				showCalculatorModal.value = true;
			}
		});
	}

	return actions;
});

const handlePrintPrepTask = () => {
	if (!taskDate.value) return;

	if (isPrinting.value) return;
	isPrinting.value = true;

	const url = getPrepTaskPdfUrl(taskDate.value);
	const token = userStore.token;

	uni.downloadFile({
		url: url,
		header: {
			Authorization: `Bearer ${token}`
		},
		success: function (res) {
			if (res.statusCode === 200) {
				const filePath = res.tempFilePath;
				uni.openDocument({
					filePath: filePath,
					fileType: 'pdf',
					showMenu: true,
					success: function () {
						console.log('打开文档成功');
					},
					fail: function (err) {
						toastStore.show({ message: '无法预览文件', type: 'error' });
					}
				});
			} else {
				toastStore.show({ message: '下载失败', type: 'error' });
			}
		},
		fail: function (err) {
			toastStore.show({ message: '网络请求失败', type: 'error' });
		},
		complete: () => {
			isPrinting.value = false;
		}
	});
};

const filterTabs = computed(() => {
	const tabs = [];
	if (preDoughItems.value.length > 0) {
		tabs.push({ key: 'PRE_DOUGH', label: '面种' });
	}
	if (extraItems.value.length > 0) {
		tabs.push({ key: 'EXTRA', label: '自制原料' });
	}
	tabs.push({ key: 'BILL_OF_MATERIALS', label: '备料清单' });
	return tabs;
});

const billOfMaterials = computed<BillOfMaterialsResponseDto>(() => {
	return task.value?.billOfMaterials || { standardItems: [], nonInventoriedItems: [] };
});

const hasMaterials = computed(() => {
	return billOfMaterials.value.standardItems.length > 0 || billOfMaterials.value.nonInventoriedItems.length > 0;
});

const preDoughItems = computed(() => {
	if (!task.value) return [];
	return task.value.items.filter((item) => item.type === 'PRE_DOUGH');
});

const extraItems = computed(() => {
	if (!task.value) return [];
	return task.value.items.filter((item) => item.type === 'EXTRA');
});

const filteredPrepItems = computed(() => {
	if (activeTab.value === 'PRE_DOUGH') return preDoughItems.value;
	if (activeTab.value === 'EXTRA') return extraItems.value;
	return [];
});

const toggleCollapse = (itemId: string) => {
	const newSet = new Set(collapsedSections.value);
	if (newSet.has(itemId)) {
		newSet.delete(itemId);
	} else {
		newSet.add(itemId);
	}
	collapsedSections.value = newSet;
};

// 筛选弹窗相关方法
const openTaskFilter = () => {
	tempSelectedTaskIds.value = [...selectedTaskIds.value];
	showTaskFilterModal.value = true;
};

const toggleTaskSelection = (id: string) => {
	const idx = tempSelectedTaskIds.value.indexOf(id);
	if (idx > -1) {
		tempSelectedTaskIds.value.splice(idx, 1);
	} else {
		tempSelectedTaskIds.value.push(id);
	}
};

const isAllTasksSelected = computed(() => {
	return task.value?.sourceTasks && task.value.sourceTasks.length > 0 && tempSelectedTaskIds.value.length === task.value.sourceTasks.length;
});

const toggleSelectAllTasks = () => {
	if (task.value?.sourceTasks) {
		if (isAllTasksSelected.value) {
			tempSelectedTaskIds.value = [];
		} else {
			tempSelectedTaskIds.value = task.value.sourceTasks.map((t) => t.id);
		}
	}
};

const applyTaskFilter = () => {
	selectedTaskIds.value = [...tempSelectedTaskIds.value];
	showTaskFilterModal.value = false;

	// [修复] 解决由于 DOM 元素卸载引起的unknown removedNode 报错
	setTimeout(async () => {
		await fetchTaskData();
	}, 300);
};

const showExtraInfo = (info: string | null | undefined, elementId: string) => {
	if (!info) {
		hidePopover();
		return;
	}

	if (popover.visible && popover.content === info) {
		hidePopover();
		return;
	}

	const query = uni.createSelectorQuery().in(instance);
	query
		.select('#' + elementId)
		.boundingClientRect((rect: UniApp.NodeInfo) => {
			if (rect) {
				popover.content = info;
				popover.targetRect = {
					left: rect.left,
					top: rect.top,
					width: rect.width,
					height: rect.height
				};
				popover.visible = true;
			} else {
				hidePopover();
			}
		})
		.exec();
};

const hidePopover = () => {
	popover.visible = false;
};

const handleScroll = (event?: any) => {
	if (popover.visible) {
		hidePopover();
	}

	if (!event || !event.detail) {
		return;
	}
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

const toggleIngredientAdded = (itemId: string, ingredientIndex: number) => {
	uni.vibrateShort({});
	const compositeKey = `${itemId}-${ingredientIndex}`;
	if (addedIngredientsMap.has(compositeKey)) {
		addedIngredientsMap.delete(compositeKey);
	} else {
		addedIngredientsMap.add(compositeKey);
	}

	if (taskDate.value) {
		dataStore.savePrepTaskProgress(taskDate.value, addedIngredientsMap, completedItems.value);
	}
};

const toggleItemCompleted = (itemId: string) => {
	uni.vibrateShort({});
	const newSet = new Set(completedItems.value);
	if (newSet.has(itemId)) {
		newSet.delete(itemId);
	} else {
		newSet.add(itemId);
	}
	completedItems.value = newSet;

	if (taskDate.value) {
		dataStore.savePrepTaskProgress(taskDate.value, addedIngredientsMap, completedItems.value);
	}
};

const fetchTaskData = async () => {
	isLoading.value = true;
	try {
		if (task.value?.sourceTasks && selectedTaskIds.value.length === 0) {
			task.value = {
				...task.value,
				items: [],
				billOfMaterials: { standardItems: [], nonInventoriedItems: [] }
			};
			isLoading.value = false;
			return;
		}

		let taskIdsParam = undefined;
		if (task.value?.sourceTasks && selectedTaskIds.value.length < task.value.sourceTasks.length) {
			taskIdsParam = selectedTaskIds.value;
		} else if (!task.value?.sourceTasks && selectedTaskIds.value.length > 0) {
			taskIdsParam = selectedTaskIds.value;
		}

		const taskData = await getPrepTaskDetails(taskDate.value!, taskIdsParam);
		task.value = taskData;

		if (task.value?.sourceTasks && selectedTaskIds.value.length === 0) {
			selectedTaskIds.value = task.value.sourceTasks.map((t) => t.id);
			tempSelectedTaskIds.value = [...selectedTaskIds.value];
		}

		if (filterTabs.value.length > 0 && !filterTabs.value.find((t) => t.key === activeTab.value)) {
			activeTab.value = filterTabs.value[0].key;
		}
	} catch (error) {
		console.error('获取前置任务详情失败:', error);
	} finally {
		isLoading.value = false;
	}
};

onLoad(async (options) => {
	if (options && options.date) {
		taskDate.value = options.date;

		try {
			const todayForCache = new Date(taskDate.value.replace(/-/g, '/'));
			todayForCache.setDate(todayForCache.getDate() - 1);
			const year = todayForCache.getFullYear();
			const month = (todayForCache.getMonth() + 1).toString().padStart(2, '0');
			const day = todayForCache.getDate().toString().padStart(2, '0');
			const yesterdayStr = `${year}-${month}-${day}`;
			dataStore.clearPrepTaskProgress(yesterdayStr);
		} catch (e) {
			console.warn('Failed to clear yesterday prep task progress', e);
		}

		try {
			const { addedIngredients, completedItems: loadedCompletedItems } = dataStore.loadPrepTaskProgress(taskDate.value);
			addedIngredientsMap.clear();
			addedIngredients.forEach((key) => addedIngredientsMap.add(key));
			completedItems.value = loadedCompletedItems;

			await fetchTaskData();
		} catch (error) {
			console.error('初始化任务数据失败:', error);
			isLoading.value = false;
		}
	} else {
		console.error('缺少 date 参数，无法加载前置任务');
		isLoading.value = false;
	}
});
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
@include table-layout;

.collapsible-content {
	max-height: 10000px;
	overflow: hidden;
	transition: max-height 0.3s ease-in-out;
	box-sizing: border-box;

	&:last-child {
		padding-bottom: 10px;
	}
}

.collapsible-content.is-collapsed {
	max-height: 0;
}

.page-wrapper {
	display: flex;
	flex-direction: column;
	height: 100vh;
}

/* 顶部标签和筛选按钮容器 */
.filter-header-container {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20px;
}

/* [新增] 参照 production.vue 的图标样式 */
.header-icon {
	width: 24px;
	height: 24px;
}

/* 弹窗内任务列表样式 */
.task-filter-list {
	max-height: 50vh;
	overflow-y: auto;
	margin-top: 10px;
}

.task-filter-item {
	display: flex;
	align-items: center;
	padding: 12px 0;
	border-bottom: 1px solid var(--border-color);

	&:last-child {
		border-bottom: none;
	}
}

.task-name {
	margin-left: 10px;
	font-size: 14px;
	color: var(--text-primary);
}

.font-bold {
	font-weight: 600;
}

.card {
	margin-bottom: 20px;
	transition: opacity 0.3s ease;
}

/* 标题栏容器：高度严格限制为 29px */
.card-title-wrapper {
	margin-bottom: 0px;
	display: flex;
	align-items: center;
	gap: 0;
	height: 29px;
	min-height: 29px;
	padding: 0;
}

/* 标题文字 */
.card-title {
	min-width: 0;
	transition: text-decoration 0.3s ease;
	flex: none;
	font-weight: 600;
	font-size: 16px;
	color: var(--text-primary);
	line-height: 29px;
	padding: 0;
}

/* 占位符 */
.spacer {
	flex: 1;
	height: 100%;
	background: transparent;
}

/* 箭头图标 */
.arrow {
	font-size: 14px;
	color: var(--text-secondary);
	transform: rotate(90deg);
	transition: transform 0.3s ease;
	padding: 0 10px;
	flex-shrink: 0;
	height: 100%;
	display: flex;
	align-items: center;
}

.arrow.collapsed {
	transform: rotate(0deg);
}

.smart-table {
	font-size: 14px;
	color: var(--text-primary);
	margin-top: 25px;

	.table-header {
		color: var(--text-secondary);
		font-weight: 500;
		border-bottom: 1px solid var(--border-color);
	}

	.table-row {
		color: var(--text-primary);
		transition: background-color 0.3s ease;

		border-bottom: 1px solid var(--border-color);

		&:last-child {
			border-bottom: none;
		}
	}
}

.fixed-grid-table {
	font-size: 14px;
	margin-top: 25px;

	.table-header {
		color: var(--text-secondary);
		font-weight: 500;
	}

	.table-row {
		color: var(--text-primary);
		transition: background-color 0.3s ease;
	}

	.table-row.is-added {
		background-color: #f0ebe5;
	}

	.ingredient-with-icon {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}

	.info-icon {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
	}
}

.total-weight-summary {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	padding: 15px 0;
	border-top: 1px solid var(--border-color);
	margin-top: 20px;
}

.summary-divider {
	width: 1px;
	height: 20px;
	background-color: var(--border-color);
	margin: 0 16px;
}

.summary-item {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	flex: none;
}

.summary-label {
	font-size: 12px;
	color: var(--text-secondary);
	margin-bottom: 4px;
}

.summary-value {
	font-size: 15px;
	font-weight: 600;
	color: var(--text-primary);
}

.procedure-notes {
	@include procedure-notes-style;
	margin-top: 25px;
}

.highlight {
	font-weight: 600;
	color: var(--primary-color);
}

.recipe-card.is-completed {
	opacity: 0.65;

	.card-title {
		text-decoration: line-through;
		text-decoration-color: var(--text-secondary);
	}
}

/* 复选框容器 */
.completion-toggle {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	height: 100%;
	padding-right: 8px;
}

.check-icon {
	width: 20px;
	height: 20px;
	border: 2px solid var(--text-secondary);
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.2s ease;
	box-sizing: border-box;
	pointer-events: auto;
}

.check-icon.is-checked {
	border-color: var(--primary-color);
	background-color: var(--primary-color);
}

.check-mark {
	width: 6px;
	height: 11px;
	border: solid #ffffff;
	border-width: 0 2px 2px 0;
	transform: rotate(45deg) translateY(-1px) translateX(-1px);
}

.empty-state-sub {
	font-size: 13px;
	color: var(--text-secondary);
	margin-top: 5px;
}

.highlight-value {
	color: var(--primary-color);
	font-weight: bold;
}
.text-secondary {
	color: #999;
}
</style>
