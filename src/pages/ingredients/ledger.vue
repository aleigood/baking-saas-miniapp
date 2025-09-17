<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader title="库存流水" />
		<DetailPageLayout @scrolltolower="handleLoadMore">
			<view class="page-content">
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

				<view v-if="isLoading" class="loading-spinner">
					<text>加载中...</text>
				</view>
				<template v-else-if="ledgerEntries.length > 0">
					<view class="procurement-list">
						<view class="list-header ledger-header">
							<text class="col-date-operator">日期/操作人</text>
							<text class="col-type">类型</text>
							<text class="col-change">变动</text>
							<text class="col-details">详情</text>
						</view>
						<ListItem v-for="(entry, index) in ledgerEntries" :key="index" class="procurement-item" :no-padding="true" :divider="index < ledgerEntries.length - 1">
							<view class="procurement-item-content ledger-item-content">
								<view class="col-date-operator">
									<view class="details-main">{{ formatDateTime(entry.date, 'MM-DD HH:mm') }}</view>
									<view class="details-sub">{{ entry.operator }}</view>
								</view>
								<text class="col-type" :class="getTypeClass(entry.type)">{{ entry.type }}</text>
								<text class="col-change" :class="{ positive: entry.change > 0, negative: entry.change < 0 }">
									{{ formatWeight(entry.change) }}
								</text>
								<view class="col-details">
									<view class="details-main">{{ entry.details }}</view>
								</view>
							</view>
						</ListItem>
					</view>
					<view class="load-more-container">
						<view v-if="isLoadingMore" class="loading-spinner">加载中...</view>
						<view v-if="!hasMore && !isLoading && ledgerEntries.length > 0" class="no-more-tasks">没有更多了</view>
					</view>
				</template>
				<view v-else class="empty-state">
					<text>暂无符合条件的流水记录</text>
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

		<AppModal v-model:visible="isSearchModalVisible" title="搜索流水">
			<FormItem label="关键字">
				<input class="input-field" v-model="filters.keyword" placeholder="输入详情、品牌、规格等关键字" @confirm="applyAndFetch(true)" />
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
import type { IngredientLedgerEntry, Ingredient, Member } from '@/types/api';
import { getIngredientLedger } from '@/api/ingredients';
import { formatDateTime, formatWeight } from '@/utils/format';
import DetailHeader from '@/components/DetailHeader.vue';
import DetailPageLayout from '@/components/DetailPageLayout.vue';
import ListItem from '@/components/ListItem.vue';
import AppModal from '@/components/AppModal.vue';
import AdvancedFilterBar from '@/components/AdvancedFilterBar.vue';
import AppButton from '@/components/AppButton.vue';
import FormItem from '@/components/FormItem.vue';

defineOptions({
	inheritAttrs: false
});

const isLoading = ref(false);
const toastStore = useToastStore();
const dataStore = useDataStore();

const ledgerEntries = ref<IngredientLedgerEntry[]>([]);
const isSelectorVisible = ref(false);
const isSearchModalVisible = ref(false);
const isDateSelectorVisible = ref(false);
const editingFilterKey = ref<string>('');

const filters = reactive<{
	ingredientId: string | null;
	keyword: string;
	type: '采购入库' | '生产消耗' | '库存调整' | '生产损耗' | null;
	userId: string | null;
	startDate: string;
	endDate: string;
}>({
	ingredientId: null,
	keyword: '',
	type: null,
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
	{
		key: 'type',
		label: '类型',
		options: [
			{ text: '采购入库', value: '采购入库' },
			{ text: '生产消耗', value: '生产消耗' },
			{ text: '库存调整', value: '库存调整' },
			{ text: '生产损耗', value: '生产损耗' }
		]
	},
	{ key: 'userId', label: '操作人', options: dataStore.members.map((m: Member) => ({ text: m.name || m.phone, value: m.id })) },
	{ key: 'dateRange', label: '操作时间', options: [] }
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
	if (!dataStore.allIngredients) return [];
	return [...dataStore.allIngredients].sort((a, b) => b.totalConsumptionInGrams - a.totalConsumptionInGrams);
});

const page = ref(1);
const limit = ref(20);
const hasMore = ref(true);
const isLoadingMore = ref(false);

onLoad(async () => {
	if (!dataStore.dataLoaded.ingredients) await dataStore.fetchIngredientsData();
	if (!dataStore.dataLoaded.members) await dataStore.fetchMembersData();

	if (allIngredients.value.length > 0) {
		filters.ingredientId = allIngredients.value[0].id;
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

const resetDateRange = () => {
	tempDateRange.startDate = '';
	tempDateRange.endDate = '';
};

const fetchLedgerData = async (loadMore = false) => {
	if (!filters.ingredientId) {
		toastStore.show({ message: '请先选择一个原料', type: 'info' });
		ledgerEntries.value = [];
		return;
	}

	if (loadMore) {
		isLoadingMore.value = true;
	} else {
		isLoading.value = true;
		page.value = 1;
		ledgerEntries.value = [];
	}

	try {
		const params: Record<string, any> = {
			page: page.value,
			limit: limit.value,
			...filters
		};
		Object.keys(params).forEach((key) => (params[key] == null || params[key] === '') && delete params[key]);

		const response = await getIngredientLedger(filters.ingredientId, params);
		if (loadMore) {
			ledgerEntries.value.push(...response.data);
		} else {
			ledgerEntries.value = response.data;
		}
		hasMore.value = response.meta.hasMore;
	} catch (error) {
		console.error('Failed to fetch ingredient ledger:', error);
		toastStore.show({ message: '获取库存流水失败', type: 'error' });
	} finally {
		isLoading.value = false;
		isLoadingMore.value = false;
	}
};

const handleLoadMore = async () => {
	if (hasMore.value && !isLoadingMore.value) {
		page.value++;
		await fetchLedgerData(true);
	}
};

const getTypeClass = (type: IngredientLedgerEntry['type']) => {
	switch (type) {
		case '采购入库':
			return 'type-procurement';
		case '生产消耗':
			return 'type-consumption';
		case '生产损耗':
			return 'type-spoilage';
		case '库存调整':
			return 'type-adjustment';
		default:
			return '';
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
		grid-template-columns: 2.5fr 1.8fr 1.8fr 2.5fr;
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
		grid-template-columns: 2.5fr 1.8fr 1.8fr 2.5fr;
	}

	.col-change,
	.col-type {
		text-align: center;
	}

	.col-date-operator {
		padding-left: 5px;

		.details-main {
			color: var(--text-primary);
			font-weight: 500;
		}

		.details-sub {
			font-size: 12px;
			margin-top: 2px;
		}
	}

	.col-type {
		padding: 2px 4px;
		border-radius: 4px;
		background-color: #f3f4f6;
		color: #6b7280;
		font-weight: 500;
	}

	.type-procurement {
		background-color: #e0f2f1;
		color: #00796b;
	}

	.type-consumption {
		background-color: #fff3e0;
		color: #fb8c00;
	}

	.type-spoilage {
		background-color: #ffebee;
		color: #c62828;
	}

	.type-adjustment {
		background-color: #e3f2fd;
		color: #1565c0;
	}

	.col-details {
		text-align: right;
		word-break: break-all;
		padding-right: 5px;

		.details-main {
			color: var(--text-primary);
		}
	}

	.positive {
		color: #27ae60;
		font-weight: 500;
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

.checkmark-icon {
	color: var(--primary-color);
	font-weight: bold;
	font-size: 18px;
}

/* [核心重构] 更新日期选择模态框的内部样式 */
.date-picker-modal-content {
	display: flex;
	flex-direction: column;
	padding: 10px 0;
}

/* [核心新增] 与“新建任务”页面保持一致的紧凑日期选择器样式 */
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
