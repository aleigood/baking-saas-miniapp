<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper" @click="hidePopover">
		<DetailHeader title="前置任务" />
		<DetailPageLayout @scroll="handleScroll">
			<view class="page-content page-content-with-fab">
				<template v-if="task">
					<view class="filter-wrapper">
						<FilterTabs v-model="activeTab" :tabs="filterTabs" />
					</view>

					<view v-if="activeTab === 'BILL_OF_MATERIALS'">
						<template v-if="hasMaterials">
							<view v-if="billOfMaterials.standardItems.length > 0" class="card">
								<view class="card-title-wrapper" @click="toggleCollapse('standardItems')">
									<span class="card-title">标准原料</span>
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
									<span class="card-title">即时采购原料</span>
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
							<text>今日无需采购任何原料</text>
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
									<span class="card-title">{{ item.name }}</span>
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
										<template v-if="item.targetWeight != null">
											<text>制作总量：{{ formatWeight(item.totalWeight) }} (需求量：{{ formatWeight(item.targetWeight) }})</text>
										</template>
										<template v-else>
											<text>制作总量：{{ formatWeight(item.totalWeight) }}</text>
										</template>
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
						</view>
					</view>
				</template>
				<view v-else-if="isLoading" class="loading-spinner">
					<text>加载中...</text>
				</view>
			</view>
		</DetailPageLayout>

		<AppModal v-model:visible="showCalculatorModal" title="发酵计算器">
			<FermentationCalculator :pre-doughs="preDoughItems" @close="showCalculatorModal = false" />
		</AppModal>

		<ExpandingFab v-if="preDoughItems.length > 0" :icon="'/static/icons/calculator.svg'" @click="showCalculatorModal = true" :no-tab-bar="true" :visible="isFabVisible" />

		<AppPopover :visible="popover.visible" :content="popover.content" :targetRect="popover.targetRect" placement="right" :offsetY="0" />
	</view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, getCurrentInstance } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import type { PrepTask, CalculatedRecipeDetails, BillOfMaterialsResponseDto, TaskIngredientDetail } from '@/types/api';
import { getPrepTaskDetails } from '@/api/tasks';
import { useDataStore } from '@/store/data'; // [新增] 导入 data store
import DetailPageLayout from '@/components/DetailPageLayout.vue';
import DetailHeader from '@/components/DetailHeader.vue';
import FilterTabs from '@/components/FilterTabs.vue';
import { formatWeight } from '@/utils/format';
import AppModal from '@/components/AppModal.vue';
import FermentationCalculator from '@/components/FermentationCalculator.vue';
import ExpandingFab from '@/components/ExpandingFab.vue';
import AppPopover from '@/components/AppPopover.vue';

defineOptions({
	inheritAttrs: false
});

const instance = getCurrentInstance();
const dataStore = useDataStore(); // [新增] 初始化 data store

const isLoading = ref(true);
const task = ref<PrepTask | null>(null);
const taskDate = ref<string | null>(null); // [新增] 用于存储当前任务的日期

const addedIngredientsMap = reactive(new Set<string>());

// [新增] 用于跟踪已完成的“面种”或“馅料”卡片
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

const filterTabs = computed(() => {
	const tabs = []; // [修改] 初始化为空数组
	// [修改] 先添加“面种”和“馅料”（如果存在）
	if (preDoughItems.value.length > 0) {
		tabs.push({ key: 'PRE_DOUGH', label: '面种' });
	}
	if (extraItems.value.length > 0) {
		tabs.push({ key: 'EXTRA', label: '馅料' });
	}
	// [修改] 最后添加“备料清单”
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

	// [新增] 调用 dataStore 保存状态
	if (taskDate.value) {
		dataStore.savePrepTaskProgress(taskDate.value, addedIngredientsMap, completedItems.value);
	}
};

// [新增] 切换“面种”或“馅料”卡片的完成状态
const toggleItemCompleted = (itemId: string) => {
	// 提供一个短暂的震动反馈
	uni.vibrateShort({});
	const newSet = new Set(completedItems.value);
	if (newSet.has(itemId)) {
		newSet.delete(itemId); // 再次点击取消完成
	} else {
		newSet.add(itemId); // 标记为完成
	}
	completedItems.value = newSet;

	// [新增] 调用 dataStore 保存状态
	if (taskDate.value) {
		dataStore.savePrepTaskProgress(taskDate.value, addedIngredientsMap, completedItems.value);
	}
};

// [核心修改] 重构 onLoad 逻辑，让页面自己请求数据
onLoad(async (options) => {
	isLoading.value = true;
	if (options && options.date) {
		taskDate.value = options.date; // [新增] 保存日期

		// [新增] 自动清理昨天的前置任务缓存
		try {
			// [中文注释] 兼容 iOS，需要将 '-' 替换为 '/'
			const todayForCache = new Date(taskDate.value.replace(/-/g, '/'));
			todayForCache.setDate(todayForCache.getDate() - 1); // 设置为昨天
			// [中文注释] 格式化为 'YYYY-MM-DD'
			const year = todayForCache.getFullYear();
			const month = (todayForCache.getMonth() + 1).toString().padStart(2, '0');
			const day = todayForCache.getDate().toString().padStart(2, '0');
			const yesterdayStr = `${year}-${month}-${day}`;
			// [中文注释] 清理昨天的缓存
			dataStore.clearPrepTaskProgress(yesterdayStr);
		} catch (e) {
			console.warn('Failed to clear yesterday prep task progress', e);
		}

		try {
			// [新增] 调用 dataStore 的方法加载当天的缓存
			const { addedIngredients, completedItems: loadedCompletedItems } = dataStore.loadPrepTaskProgress(taskDate.value);
			// [中文注释] 清空当前的 Set，用缓存数据填充
			addedIngredientsMap.clear();
			addedIngredients.forEach((key) => addedIngredientsMap.add(key));
			// [中文注释] 更新 ref
			completedItems.value = loadedCompletedItems;

			// 调用新的 API 方法获取数据
			const taskData = await getPrepTaskDetails(options.date);
			task.value = taskData;

			// [修改] 设置默认显示的 Tab
			// [中文注释] 确保在数据加载后，filterTabs 计算属性会更新
			// [中文注释] 然后我们显式地将 activeTab 设置为 filterTabs 数组中的第一个
			if (filterTabs.value.length > 0) {
				activeTab.value = filterTabs.value[0].key;
			}
		} catch (error) {
			console.error('获取前置任务详情失败:', error);
			// 你可以在这里添加一个错误提示
		}
	} else {
		console.error('缺少 date 参数，无法加载前置任务');
	}
	isLoading.value = false;
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

.filter-wrapper {
	margin-bottom: 20px;
}

.card {
	margin-bottom: 20px;
	transition: opacity 0.3s ease;
}

.card-title-wrapper {
	margin-bottom: 0px;
	display: flex;
	align-items: center;
	gap: 8px;
}

.card-title {
	flex: 1;
	min-width: 0;
	transition: text-decoration 0.3s ease;
}

.arrow {
	font-size: 14px;
	color: var(--text-secondary);
	transform: rotate(90deg);
	transition: transform 0.3s ease;
	padding: 5px;
	flex-shrink: 0;
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
		font-weight: 600;
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
		font-weight: 600;
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
	padding: 10px 4px;
	font-size: 13px;
	color: var(--text-secondary);
	border-top: 1px solid var(--border-color);
}

.procedure-notes {
	@include procedure-notes-style;
	margin-top: 15px;
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

.completion-toggle {
	padding: 5px;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
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
</style>
