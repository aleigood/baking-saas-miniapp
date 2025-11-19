<template>
	<view class="card" v-if="selectedSku">
		<view class="card-title">{{ selectedSku.brand || '无品牌' }}的采购记录</view>
		<view class="procurement-list">
			<view class="list-header">
				<text class="col-date">采购日期</text>
				<text class="col-quantity">数量</text>
				<text class="col-price">单价</text>
				<text class="col-total">总价</text>
			</view>
			<view v-if="displayedProcurementRecords && displayedProcurementRecords.length > 0">
				<ListItem
					v-for="record in displayedProcurementRecords"
					:key="record.id"
					class="procurement-item"
					@longpress="$emit('longpress', record)"
					:vibrate-on-long-press="true"
					:no-padding="true"
				>
					<view class="procurement-item-content">
						<text class="col-date">{{ formatDateTime(record.purchaseDate) }}</text>
						<text class="col-quantity">{{ record.packagesPurchased }} 包</text>
						<text class="col-price">¥{{ formatMoney(record.pricePerPackage) }}</text>
						<text class="col-total">¥{{ formatMoney(record.packagesPurchased * Number(record.pricePerPackage)) }}</text>
					</view>
				</ListItem>
			</view>
			<view v-else class="empty-procurements">无采购记录</view>
		</view>
		<AppButton v-if="hasMoreRecords" type="text-link" @click="loadMoreRecords">加载更多</AppButton>
	</view>
</template>

<script setup lang="ts">
import { ref, computed, type PropType } from 'vue';
import type { IngredientSKU, ProcurementRecord } from '@/types/api';
// [核心修改] 引入 formatMoney
import { formatDateTime, formatMoney } from '@/utils/format';
import ListItem from '@/components/ListItem.vue';
import AppButton from '@/components/AppButton.vue';

const props = defineProps({
	selectedSku: {
		type: Object as PropType<IngredientSKU | null>,
		default: null
	}
});

const emit = defineEmits(['longpress']);

const displayedRecordsCount = ref(10);

const displayedProcurementRecords = computed(() => {
	if (!props.selectedSku || !props.selectedSku.procurementRecords) return [];
	return props.selectedSku.procurementRecords.slice(0, displayedRecordsCount.value);
});

const hasMoreRecords = computed(() => {
	if (!props.selectedSku || !props.selectedSku.procurementRecords) return false;
	return displayedRecordsCount.value < props.selectedSku.procurementRecords.length;
});

const loadMoreRecords = () => {
	displayedRecordsCount.value += 10;
};
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';

.procurement-list {
	.list-header {
		display: grid;
		grid-template-columns: 2fr 1.5fr 1.5fr 1.5fr;
		align-items: center;
		padding: 8px 5px;
		font-size: 13px;
		font-weight: 600;
		color: var(--primary-color);
		border-bottom: 1px solid var(--border-color);
		margin-bottom: 5px;
	}

	.procurement-item {
	}

	.procurement-item-content {
		display: grid;
		grid-template-columns: 2fr 1.5fr 1.5fr 1.5fr;
		align-items: center;
		width: 100%;
		padding: 8px 5px;
		font-size: 13px;
		color: var(--text-secondary);
	}

	.col-quantity,
	.col-price,
	.col-total {
		text-align: right;
	}
}

.empty-procurements {
	text-align: center;
	color: #b0a8a2;
	padding: 20px 0;
	font-size: 13px;
}
</style>
