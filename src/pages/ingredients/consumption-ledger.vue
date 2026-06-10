<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader :title="pageTitle" />
		<DetailPageLayout @scrolltolower="handleLoadMore">
			<view class="page-content animated-content" :class="{ 'is-revealed': !isLoading && isInitialFetchDone }">
				<view class="filter-container">
					<AdvancedFilterBar
						:model-value="filters"
						:filters="filterConfig"
						:show-search="true"
						@pill-click="openFilterSelector"
						@search-click="openSearchModal"
						:get-pill-text="getPillText"
					/>
				</view>

				<template v-if="records.length > 0">
					<view class="procurement-list">
						<view class="list-header ledger-header">
							<text class="col-date-operator">日期/操作人</text>
							<text class="col-task">任务</text>
							<text class="col-change">消耗量</text>
						</view>
						<ListItem v-for="(record, index) in records" :key="record.id" class="procurement-item" :no-padding="true" :divider="index < records.length - 1">
							<view class="procurement-item-content ledger-item-content">
								<view class="col-date-operator">
									<view class="details-main">{{ formatDateTime(record.date, 'MM-DD HH:mm') }}</view>
									<view class="details-sub">{{ record.operator }}</view>
								</view>
								<view class="col-task">
									<view class="details-main">{{ record.taskName }}</view>
								</view>
								<text class="col-change negative">
									-{{ formatWeight(record.quantityInGrams) }}
								</text>
							</view>
						</ListItem>
					</view>
					<view class="load-more-container">
						<view v-if="isLoadingMore" class="loading-spinner" style="padding-top: 10px">加载中...</view>
						<view v-if="!hasMore && !isLoading && records.length > 0" class="no-more-tasks">没有更多了</view>
					</view>
				</template>

				<EmptyState v-else-if="isInitialFetchDone" icon="/static/icons/empty-list.svg" title="暂无消耗记录" subtitle="当前筛选条件下没有找到符合的数据" />
			</view>

			<view v-if="isLoading && page === 1" class="page-content skeleton-overlay">
				<view class="filter-container">
					<view class="skeleton-block shimmer" style="height: 36px; border-radius: 18px; margin-bottom: 10px"></view>
				</view>

				<view class="procurement-list">
					<view class="list-header ledger-header">
						<text class="col-date-operator">日期/操作人</text>
						<text class="col-task">任务</text>
						<text class="col-change">消耗量</text>
					</view>
					<ListItem v-for="i in 10" :key="i" class="procurement-item" :no-padding="true" :divider="i < 10">
						<view class="procurement-item-content ledger-item-content">
							<view class="col-date-operator">
								<view class="skeleton-block shimmer" style="width: 80%; height: 14px; margin-bottom: 6px"></view>
								<view class="skeleton-block shimmer" style="width: 60%; height: 12px"></view>
							</view>
							<view class="col-task">
								<view class="skeleton-block shimmer" style="width: 90%; height: 14px"></view>
							</view>
							<view class="col-change" style="display: flex; justify-content: flex-end">
								<view class="skeleton-block shimmer" style="width: 50px; height: 14px"></view>
							</view>
						</view>
					</ListItem>
				</view>
			</view>
		</DetailPageLayout>

		<AppModal :visible="isSelectorVisible" @update:visible="isSelectorVisible = false" :title="selectorTitle" :no-header-line="true">
			<scroll-view :scroll-y="true" class="options-scroll-view">
				<view class="options-list">
					<ListItem v-if="editingFilterKey !== 'ingredientId'" @click="handleFilterOptionSelect({ text: '全部', value: null })" class="option-item" :bleed="true">
						<view class="main-info">
							<view class="name">全部</view>
						</view>
						<view class="side-info" v-if="filters[editingFilterKey] === null">
							<view class="value checkmark-icon">✓</view>
						</view>
					</ListItem>
					<ListItem v-for="option in currentSelectorOptions" :key="option.value" @click="handleFilterOptionSelect(option)" class="option-item" :bleed="true">
						<view class="main-info">
							<view class="name">{{ option.text }}</view>
						</view>
						<view class="side-info" v-if="filters[editingFilterKey] === option.value">
							<view class="value checkmark-icon">✓</view>
						</view>
					</ListItem>
				</view>
			</scroll-view>
		</AppModal>

		<AppModal v-model:visible="isDateSelectorVisible" title="选择日期范围">
			<view class="date-picker-modal-content">
				<view class="date-picker-row">
					<view class="date-picker-item">
						<label class="date-label">开始日期</label>
						<picker mode="date" :value="tempDateRange.startDate" @change="onDateChange($event, 'startDate')">
							<view class="picker" :class="{ placeholder: !tempDateRange.startDate }">
								{{ tempDateRange.startDate || '请选择' }}
								<view class="arrow-down"></view>
							</view>
						</picker>
					</view>
					<view class="date-picker-item">
						<label class="date-label">结束日期</label>
						<picker mode="date" :value="tempDateRange.endDate" :start="tempDateRange.startDate" @change="onDateChange($event, 'endDate')">
							<view class="picker" :class="{ placeholder: !tempDateRange.endDate }">
								{{ tempDateRange.endDate || '请选择' }}
								<view class="arrow-down"></view>
							</view>
						</picker>
					</view>
				</view>
			</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="isDateSelectorVisible = false">取消</AppButton>
				<AppButton type="primary" @click="applyDateRange">确认</AppButton>
			</view>
		</AppModal>

		<AppModal v-model:visible="isSearchModalVisible" title="搜索消耗记录">
			<FormItem label="关键字">
				<input class="input-field" v-model="filters.keyword" placeholder="输入详情、产品、规格等关键字" @confirm="applyAndFetch(true)" />
			</FormItem>
			<view class="modal-actions">
				<AppButton type="secondary" @click="isSearchModalVisible = false">取消</AppButton>
				<AppButton type="primary" @click="applyAndFetch(true)">确认搜索</AppButton>
			</view>
		</AppModal>
	</view>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useToastStore } from '@/store/toast';
import { useDataStore } from '@/store/data';
import type { IngredientConsumptionLedgerEntry, Ingredient, Member } from '@/types/api';
import { getIngredientConsumptionLedger } from '@/api/ingredients';
import { formatDateTime, formatWeight } from '@/utils/format';
import DetailHeader from '@/components/DetailHeader.vue';
import DetailPageLayout from '@/components/DetailPageLayout.vue';
import ListItem from '@/components/ListItem.vue';
import AppModal from '@/components/AppModal.vue';
import AdvancedFilterBar from '@/components/AdvancedFilterBar.vue';
import AppButton from '@/components/AppButton.vue';
import FormItem from '@/components/FormItem.vue';
import EmptyState from '@/components/EmptyState.vue';

defineOptions({
	inheritAttrs: false
});

const isLoading = ref(false);
const isInitialFetchDone = ref(false);

const toastStore = useToastStore();
const dataStore = useDataStore();

const records = ref<IngredientConsumptionLedgerEntry[]>([]);
const isSelectorVisible = ref(false);
const isSearchModalVisible = ref(false);
const isDateSelectorVisible = ref(false);
const editingFilterKey = ref<string>('');

const filters = reactive<{
	ingredientId: string | null;
	keyword: string;
	userId: string | null;
	startDate: string;
	endDate: string;
}>({
	ingredientId: null,
	keyword: '',
	userId: null,
	startDate: '',
	endDate: ''
});

const tempDateRange = reactive({
	startDate: '',
	endDate: ''
});

const filterConfig = computed(() => [
	{ key: 'ingredientId', label: '全部原料', options: allIngredients.value.map((i: Ingredient) => ({ text: i.name, value: i.id })) },
	{ key: 'userId', label: '操作人', options: dataStore.members.map((m: Member) => ({ text: m.name || m.phone, value: m.id })) },
	{ key: 'dateRange', label: '选择时间', options: [] }
]);

const selectorTitle = computed(() => {
	const filter = filterConfig.value.find((f) => f.key === editingFilterKey.value);
	return filter ? `选择${filter.label}` : '请选择';
});

const currentSelectorOptions = computed(() => {
	const filter = filterConfig.value.find((f) => f.key === editingFilterKey.value);
	return filter ? filter.options : [];
});

const allIngredients = computed(() => {
	if (!dataStore.ingredients?.allIngredients) return [];
	return [...dataStore.ingredients.allIngredients].sort((a, b) => b.totalConsumptionInGrams - a.totalConsumptionInGrams);
});

const currentIngredient = computed(() => {
	return allIngredients.value.find((i) => i.id === filters.ingredientId);
});

const pageTitle = computed(() => {
	return currentIngredient.value ? `${currentIngredient.value.name}消耗流水` : '消耗流水';
});

const page = ref(1);
const limit = ref(20);
const hasMore = ref(true);
const isLoadingMore = ref(false);

onLoad(async (options) => {
	if (!dataStore.dataLoaded.ingredients) await dataStore.fetchIngredientsData();
	if (!dataStore.dataLoaded.members) await dataStore.fetchMembersData();

	if (options && options.ingredientId) {
		filters.ingredientId = options.ingredientId;
	} else if (allIngredients.value.length > 0) {
		filters.ingredientId = allIngredients.value[0].id;
	}

	if (filters.ingredientId) {
		await fetchLedgerData(false);
	}
});

const openFilterSelector = (key: string) => {
	editingFilterKey.value = key;
	if (key === 'dateRange') {
		tempDateRange.startDate = filters.startDate;
		tempDateRange.endDate = filters.endDate;
		isDateSelectorVisible.value = true;
	} else {
		isSelectorVisible.value = true;
	}
};

const openSearchModal = () => {
	isSearchModalVisible.value = true;
};

const applyAndFetch = (fromSearchModal = false) => {
	if (fromSearchModal) {
		isSearchModalVisible.value = false;
	}
	fetchLedgerData(false);
};

const handleFilterOptionSelect = (option: { text: string; value: string | number | null }) => {
	filters[editingFilterKey.value] = option.value;
	isSelectorVisible.value = false;
	fetchLedgerData(false);
};

const onDateChange = (e: any, type: 'startDate' | 'endDate') => {
	tempDateRange[type] = e.detail.value;
};

const applyDateRange = () => {
	if (tempDateRange.startDate && tempDateRange.endDate && new Date(tempDateRange.startDate) > new Date(tempDateRange.endDate)) {
		toastStore.show({ message: '开始日期不能晚于结束日期', type: 'error' });
		return;
	}
	filters.startDate = tempDateRange.startDate;
	filters.endDate = tempDateRange.endDate;
	isDateSelectorVisible.value = false;
	fetchLedgerData(false);
};

const fetchLedgerData = async (loadMore = false) => {
	if (!filters.ingredientId) {
		toastStore.show({ message: '请先选择一个原料', type: 'info' });
		records.value = [];
		return;
	}

	if (loadMore) {
		isLoadingMore.value = true;
	} else {
		isLoading.value = true;
		page.value = 1;
	}

	try {
		const params: Record<string, any> = {
			page: page.value,
			limit: limit.value,
			...filters
		};
		Object.keys(params).forEach((key) => (params[key] == null || params[key] === '') && delete params[key]);

		const response = await getIngredientConsumptionLedger(filters.ingredientId, params);

		if (loadMore) {
			records.value.push(...response.data);
		} else {
			records.value = response.data;
		}

		hasMore.value = response.meta.hasMore;
		isInitialFetchDone.value = true;
	} catch (error) {
		console.error('Failed to fetch ingredient consumption ledger:', error);
		if (!loadMore) {
			records.value = [];
		}
	} finally {
		if (loadMore) {
			isLoadingMore.value = false;
		} else {
			setTimeout(() => {
				isLoading.value = false;
			}, 200);
		}
	}
};

const handleLoadMore = async () => {
	if (hasMore.value && !isLoadingMore.value) {
		page.value++;
		await fetchLedgerData(true);
	}
};



const getPillText = (filter: any) => {
	const { key, label, options } = filter;
	const selectedValue = filters[key];

	if (key === 'dateRange') {
		if (filters.startDate && filters.endDate) {
			if (filters.startDate === filters.endDate) {
				return filters.startDate.substring(5); // e.g., "08-15"
			}
			return `${filters.startDate.substring(5)} 至 ${filters.endDate.substring(5)}`;
		}
		return label;
	}

	if (key === 'ingredientId') {
		const selectedIngredient = allIngredients.value.find((ing) => ing.id === selectedValue);
		return selectedIngredient ? selectedIngredient.name : '选择原料';
	}

	if (selectedValue === null || selectedValue === undefined) {
		return label;
	}
	const selectedOption = options.find((opt: any) => opt.value === selectedValue);
	return selectedOption ? selectedOption.text : label;
};
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
@include list-item-option-style;
@include form-control-styles;

/* 页面特有的骨架屏动效支持 */
.skeleton-block {
	background-color: #f0f2f5;
	border-radius: 4px;
}

.shimmer {
	position: relative;
	overflow: hidden;
}

.shimmer::after {
	content: '';
	position: absolute;
	top: 0;
	left: -100%;
	width: 200%;
	height: 100%;
	background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0, rgba(255, 255, 255, 0.6) 50%, rgba(255, 255, 255, 0) 100%);
	animation: shimmer-sweep 1.5s infinite linear;
}

@keyframes shimmer-sweep {
	100% {
		transform: translateX(100%);
	}
}

.page-wrapper {
	display: flex;
	flex-direction: column;
	height: 100vh;
}

.filter-container {
	padding: 0;
}

.procurement-list {
	padding: 0 15px;
	.list-header {
		display: grid;
		align-items: center;
		padding: 8px 5px;
		font-size: 13px;
		font-weight: 600;
		color: var(--primary-color);
		border-bottom: 1px solid var(--border-color);
		margin-bottom: 5px;
	}

	.ledger-header {
		grid-template-columns: 2.8fr 5.2fr 2fr;
	}

	.procurement-item-content {
		display: grid;
		align-items: center;
		width: 100%;
		padding: 12px 5px;
		font-size: 13px;
		color: var(--text-secondary);
	}

	.ledger-item-content {
		grid-template-columns: 2.8fr 5.2fr 2fr;
	}

	.col-change {
		text-align: right;
		padding-right: 5px;
	}

	.col-date-operator {
		padding-left: 5px;
		text-align: left;

		.details-main {
			color: var(--text-primary);
			font-weight: 500;
		}

		.details-sub {
			font-size: 11px;
			margin-top: 2px;
			color: var(--text-secondary);
		}
	}

	.col-task {
		text-align: left;
		padding-right: 10px;
		word-break: break-all;

		.details-main {
			color: var(--text-primary);
			line-height: 1.4;
		}
	}

	.negative {
		color: #e74c3c;
		font-weight: 500;
	}
}

.load-more-container {
	padding: 15px;
	text-align: center;
	color: #999;
	font-size: 14px;
}

.no-more-tasks {
	font-size: 13px;
	color: var(--text-secondary);
}

.checkmark-icon {
	color: var(--primary-color);
	font-weight: bold;
	font-size: 18px;
}

.date-picker-modal-content {
	display: flex;
	flex-direction: column;
	padding: 10px 0;
}

.date-picker-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 15px;
	margin-bottom: 20px;
}

.date-picker-item {
	flex: 1;
}

.date-label {
	font-size: 13px;
	color: var(--text-secondary);
	margin-bottom: 8px;
	display: block;
}

.options-scroll-view {
	max-height: 60vh;
}
</style>
