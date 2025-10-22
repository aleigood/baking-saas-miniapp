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
							<view v-for="item in filteredPrepItems" :key="item.id" class="card recipe-card">
								<view class="card-title-wrapper" @click="toggleCollapse(item.id)">
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
// [新增] 导入获取前置任务详情的 API 方法
import { getPrepTaskDetails } from '@/api/tasks';
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

const isLoading = ref(true);
const task = ref<PrepTask | null>(null);

const addedIngredientsMap = reactive(new Set<string>());

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
	const tabs = [{ key: 'BILL_OF_MATERIALS', label: '备料清单' }];
	if (preDoughItems.value.length > 0) {
		tabs.push({ key: 'PRE_DOUGH', label: '面种' });
	}
	if (extraItems.value.length > 0) {
		tabs.push({ key: 'EXTRA', label: '馅料' });
	}
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
};

// [核心修改] 重构 onLoad 逻辑，让页面自己请求数据
onLoad(async (options) => {
	isLoading.value = true;
	if (options && options.date) {
		try {
			// 调用新的 API 方法获取数据
			const taskData = await getPrepTaskDetails(options.date);
			task.value = taskData;
			// 设置默认显示的 Tab
			if (!hasMaterials.value && preDoughItems.value.length > 0) {
				activeTab.value = 'PRE_DOUGH';
			} else if (!hasMaterials.value && extraItems.value.length > 0) {
				activeTab.value = 'EXTRA';
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
	max-height: 1000px;
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
}

.card-title-wrapper {
	margin-bottom: 0px;
}

.arrow {
	font-size: 14px;
	color: var(--text-secondary);
	transform: rotate(90deg);
	transition: transform 0.3s ease;
	padding: 5px;
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
	padding: 10px 4px;
	font-size: 13px;
	color: var(--text-secondary);
	border-top: 1px solid var(--border-color);
}

.procedure-notes {
	font-size: 12px;
	color: var(--text-secondary);
	line-height: 1.6;

	.notes-title {
		font-weight: 600;
		display: block;
		margin-bottom: 5px;
	}

	.note-item {
		display: block;
	}
}

.highlight {
	font-weight: 600;
	color: var(--primary-color);
}
</style>
