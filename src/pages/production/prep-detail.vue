<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader title="备料详情" />
		<DetailPageLayout>
			<view class="page-content">
				<template v-if="task">
					<view class="filter-wrapper">
						<FilterTabs v-model="activeTab" :tabs="filterTabs" />
					</view>

					<view v-if="filteredItems.length > 0">
						<view v-for="item in filteredItems" :key="item.id" class="card recipe-card">
							<view class="card-title-wrapper" @click="toggleCollapse(item.id)">
								<span class="card-title">{{ item.name }}</span>
								<span class="arrow"
									:class="{ collapsed: collapsedSections.has(item.id) }">&#10095;</span>
							</view>

							<view class="collapsible-content"
								:class="{ 'is-collapsed': collapsedSections.has(item.id) }">
								<view class="recipe-table">
									<view class="table-header">
										<text class="col-ingredient">原料</text>
										<text class="col-brand">品牌</text>
										<text class="col-usage">用量</text>
									</view>
									<view v-for="(ing, index) in item.ingredients" :key="index" class="table-row"
										:class="{ 'is-added': addedIngredientsMap[item.id]?.has(ing.name) }"
										@longpress.prevent="toggleIngredientAdded(item.id, ing.name)">
										<text class="col-ingredient">{{ ing.name }}</text>
										<text class="col-brand">{{ ing.isRecipe ? '自制' : (ing.brand || '-') }}</text>
										<text class="col-usage">{{ formatWeight(ing.weightInGrams) }}</text>
									</view>
								</view>

								<view class="total-weight-summary">
									<text>重量总计: {{ formatWeight(item.totalWeight) }}</text>
								</view>

								<view v-if="item.procedure && item.procedure.length > 0" class="procedure-notes">
									<text class="notes-title">制作要点:</text>
									<text v-for="(step, stepIndex) in item.procedure" :key="stepIndex"
										class="note-item">{{ stepIndex + 1 }}. {{ step }}</text>
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
	</view>
</template>

<script setup lang="ts">
	import { ref, reactive, computed } from 'vue';
	import { onLoad } from '@dcloudio/uni-app';
	// [核心修改] 从 api 类型中导入 CalculatedRecipeDetails
	import type { PrepTask, CalculatedRecipeDetails } from '@/types/api';
	import DetailPageLayout from '@/components/DetailPageLayout.vue';
	import DetailHeader from '@/components/DetailHeader.vue';
	import FilterTabs from '@/components/FilterTabs.vue';
	import { formatWeight } from '@/utils/format';

	defineOptions({
		inheritAttrs: false
	});

	const isLoading = ref(true);
	const task = ref<PrepTask | null>(null);

	const addedIngredientsMap = reactive<Record<string, Set<string>>>({});

	const activeTab = ref<'PRE_DOUGH' | 'OTHER'>('PRE_DOUGH');
	const filterTabs = ref([
		{ key: 'PRE_DOUGH', label: '面种' },
		{ key: 'OTHER', label: '其他' },
	]);

	const collapsedSections = ref(new Set<string>());

	const toggleCollapse = (itemId : string) => {
		const newSet = new Set(collapsedSections.value);
		if (newSet.has(itemId)) {
			newSet.delete(itemId);
		} else {
			newSet.add(itemId);
		}
		collapsedSections.value = newSet;
	};


	// [核心修改] 使用新的 type 字段进行分类
	const preDoughItems = computed(() => {
		if (!task.value) return [];
		return task.value.items.filter(item => item.type === 'PRE_DOUGH');
	});

	// [核心修改] 使用新的 type 字段进行分类
	const otherItems = computed(() => {
		if (!task.value) return [];
		return task.value.items.filter(item => item.type !== 'PRE_DOUGH');
	});

	const filteredItems = computed(() => {
		return activeTab.value === 'PRE_DOUGH' ? preDoughItems.value : otherItems.value;
	});


	const toggleIngredientAdded = (itemId : string, ingredientName : string) => {
		if (!addedIngredientsMap[itemId]) {
			addedIngredientsMap[itemId] = new Set<string>();
		}
		const addedSet = addedIngredientsMap[itemId];
		if (addedSet.has(ingredientName)) {
			addedSet.delete(ingredientName);
		} else {
			addedSet.add(ingredientName);
		}
	};

	onLoad(async (options) => {
		if (options && options.taskData) {
			try {
				const taskData = JSON.parse(decodeURIComponent(options.taskData));
				task.value = taskData as PrepTask;
			} catch (error) {
				console.error("解析前置任务数据失败:", error);
			}
		}
		isLoading.value = false;
	});
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	/* [新增] 定义折叠内容容器的动画 */
	.collapsible-content {
		max-height: 1000px;
		overflow: hidden;
		transition: max-height 0.35s ease-in-out;
		box-sizing: border-box;
	}

	/* [新增] 定义折叠状态下的样式 */
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

	.recipe-table {
		display: table;
		width: 100%;
		font-size: 14px;
		margin-top: 25px;
		border-collapse: collapse;

		.table-header,
		.table-row {
			display: table-row;
			border-bottom: 1px solid var(--border-color);
		}

		.table-header {
			color: var(--text-secondary);
			font-weight: 500;
		}

		.table-row {
			color: var(--text-primary);
			transition: background-color 0.3s ease;
			border-bottom: 1px solid var(--border-color);
		}

		.table-row:last-child {
			border-bottom: none;
		}

		.table-row.is-added {
			background-color: #f0ebe5;
		}

		[class^="col-"] {
			display: table-cell;
			padding: 10px 4px;
			vertical-align: middle;
		}

		.col-ingredient {
			min-width: 60px;
			word-break: break-word;
		}

		.col-brand {
			color: var(--text-secondary);
			min-width: 60px;
			white-space: nowrap;
			text-align: center;
		}

		.col-usage {
			text-align: right;
			white-space: nowrap;
		}

		.col-ingredient {
			width: 40%;
		}

		.col-brand {
			width: 30%;
		}

		.col-usage {
			width: 30%;
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

	.section-title {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary);
		margin-bottom: 5px;
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