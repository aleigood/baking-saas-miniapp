<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader title="备料详情" />
		<DetailPageLayout @scroll="handleScroll">
			<view class="page-content page-content-with-fab">
				<template v-if="task">
					<view class="filter-wrapper">
						<FilterTabs v-model="activeTab" :tabs="filterTabs" />
					</view>

					<view v-if="filteredItems.length > 0">
						<view v-for="item in filteredItems" :key="item.id" class="card recipe-card">
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
										:key="item.id + '-' + ing.name + '-' + index"
										class="table-row"
										:class="{ 'is-added': addedIngredientsMap.has(`${item.id}-${ing.name}`) }"
										@longpress.prevent="toggleIngredientAdded(item.id, ing.name)"
									>
										<text class="col-ingredient">{{ ing.name }}</text>
										<text class="col-brand">{{ ing.isRecipe ? '自制' : ing.brand || '-' }}</text>
										<text class="col-usage">{{ formatWeight(ing.weightInGrams) }}</text>
									</view>
								</view>

								<view class="total-weight-summary">
									<text>重量总计: {{ formatWeight(item.totalWeight) }}</text>
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
	</view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import type { PrepTask, CalculatedRecipeDetails } from '@/types/api';
import DetailPageLayout from '@/components/DetailPageLayout.vue';
import DetailHeader from '@/components/DetailHeader.vue';
import FilterTabs from '@/components/FilterTabs.vue';
import { formatWeight } from '@/utils/format';
import AppModal from '@/components/AppModal.vue';
import FermentationCalculator from '@/components/FermentationCalculator.vue';
import ExpandingFab from '@/components/ExpandingFab.vue';

defineOptions({
	inheritAttrs: false
});

const isLoading = ref(true);
const task = ref<PrepTask | null>(null);

const addedIngredientsMap = reactive(new Set<string>());

const activeTab = ref<'PRE_DOUGH' | 'OTHER'>('PRE_DOUGH');
const filterTabs = ref([
	{ key: 'PRE_DOUGH', label: '面种' },
	{ key: 'OTHER', label: '其他' }
]);

const collapsedSections = ref(new Set<string>());

const showCalculatorModal = ref(false);
const isFabVisible = ref(true);
const lastScrollTop = ref(0);
const scrollThreshold = 5;

const toggleCollapse = (itemId: string) => {
	const newSet = new Set(collapsedSections.value);
	if (newSet.has(itemId)) {
		newSet.delete(itemId);
	} else {
		newSet.add(itemId);
	}
	collapsedSections.value = newSet;
};

const handleScroll = (event?: any) => {
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

const preDoughItems = computed(() => {
	if (!task.value) return [];
	return task.value.items.filter((item) => item.type === 'PRE_DOUGH');
});

const otherItems = computed(() => {
	if (!task.value) return [];
	return task.value.items.filter((item) => item.type !== 'PRE_DOUGH');
});

const filteredItems = computed(() => {
	return activeTab.value === 'PRE_DOUGH' ? preDoughItems.value : otherItems.value;
});

const toggleIngredientAdded = (itemId: string, ingredientName: string) => {
	uni.vibrateShort({});
	const compositeKey = `${itemId}-${ingredientName}`;
	if (addedIngredientsMap.has(compositeKey)) {
		addedIngredientsMap.delete(compositeKey);
	} else {
		addedIngredientsMap.add(compositeKey);
	}
};

onLoad(async (options) => {
	if (options && options.taskData) {
		try {
			const taskData = JSON.parse(decodeURIComponent(options.taskData));
			task.value = taskData as PrepTask;
		} catch (error) {
			console.error('解析前置任务数据失败:', error);
		}
	}
	isLoading.value = false;
});
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
/* [核心改造] 引入新的表格布局 Mixin */
@include table-layout;

.collapsible-content {
	max-height: 1000px;
	overflow: hidden;
	transition: max-height 0.3s ease-in-out;
	box-sizing: border-box;
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

.recipe-card {
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
</style>
