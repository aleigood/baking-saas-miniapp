<template>
	<AppModal :visible="uiStore.showStoreModal" @update:visible="uiStore.closeModal(MODAL_KEYS.STORE)" title="选择门店" :no-header-line="true">
		<view class="options-list">
			<ListItem v-for="tenant in dataStore.tenants" :key="tenant.id" @click="handleSelectTenant(tenant.id)" class="option-item" :bleed="true">
				<view class="main-info">
					<view class="name">{{ tenant.name }}</view>
				</view>
				<view class="side-info" v-if="dataStore.currentTenant?.id === tenant.id">
					<view class="value checkmark-icon">✓</view>
				</view>
			</ListItem>
		</view>
	</AppModal>
</template>

<script setup lang="ts">
import { useUiStore } from '@/store/ui';
import { useDataStore } from '@/store/data';
import { MODAL_KEYS } from '@/constants/modalKeys';
import AppModal from '@/components/AppModal.vue';
import ListItem from '@/components/ListItem.vue';

const uiStore = useUiStore();
const dataStore = useDataStore();

const handleSelectTenant = async (tenantId: string) => {
	// 如果选择的是当前店铺，则直接关闭弹窗
	if (dataStore.currentTenantId === tenantId) {
		uiStore.closeModal(MODAL_KEYS.STORE);
		return;
	}
	try {
		await dataStore.selectTenant(tenantId);
		uiStore.closeModal(MODAL_KEYS.STORE);
		// [核心说明] selectTenant 内部已经处理了数据重置和用户信息刷新
		// 页面级的 onShow 钩子会负责后续的数据加载
	} catch (error) {
		console.error('Failed to select tenant:', error);
	}
};
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';

// [核心新增] 引入公共样式
@include list-item-content-style;
@include list-item-option-style;

.options-list {
	.option-item {
		text-align: left;

		:deep(.main-info) {
			justify-content: flex-start;
		}

		:deep(.desc) {
			display: block;
		}

		.checkmark-icon {
			color: var(--primary-color);
			font-weight: bold;
			font-size: 18px;
		}
	}
}
</style>
