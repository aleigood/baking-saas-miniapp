<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="main-page-container" :class="{ 'personnel-active-bg': uiStore.activeTab === 'personnel' }">
		<MainHeader :transparent="uiStore.activeTab === 'personnel'" />

		<view class="content-area">
			<ProductionPage v-show="uiStore.activeTab === 'production'" />
			<IngredientsPage v-show="uiStore.activeTab === 'ingredients'" />
			<RecipesPage v-show="uiStore.activeTab === 'recipes'" />
			<PersonnelPage v-show="uiStore.activeTab === 'personnel'" />
		</view>

		<CustomTabBar />

		<AppModal :visible="uiStore.showStoreModal" @update:visible="uiStore.closeModal(MODAL_KEYS.STORE)" title="选择门店"
			:no-header-line="true">
			<view class="options-list">
				<ListItem v-for="tenant in dataStore.tenants" :key="tenant.id" @click="handleSelectTenant(tenant.id)"
					class="option-item" :bleed="true">
					<view class="main-info">
						<view class="name">{{ tenant.name }}</view>
					</view>
					<view class="side-info" v-if="dataStore.currentTenant?.id === tenant.id">
						<view class="value checkmark-icon">✓</view>
					</view>
				</ListItem>
			</view>
		</AppModal>

		<Toast />
	</view>
</template>

<script setup lang="ts">
	import { ref } from 'vue';
	import { onShow } from '@dcloudio/uni-app';
	import { useUiStore } from '@/store/ui';
	import { useDataStore } from '@/store/data';
	import { useUserStore } from '@/store/user';
	import { useToastStore } from '@/store/toast';
	import { createInvitation } from '@/api/invitations';
	import { MODAL_KEYS } from '@/constants/modalKeys';

	import CustomTabBar from '@/components/CustomTabBar.vue';
	import MainHeader from '@/components/MainHeader.vue';
	import AppModal from '@/components/AppModal.vue';
	import FormItem from '@/components/FormItem.vue';
	import ListItem from '@/components/ListItem.vue';
	import AppButton from '@/components/AppButton.vue';
	import Toast from '@/components/Toast.vue';

	// 引入四个页面级组件
	import ProductionPage from '@/pages/production/production.vue';
	import IngredientsPage from '@/pages/ingredients/ingredients.vue';
	import RecipesPage from '@/pages/recipes/recipes.vue';
	import PersonnelPage from '@/pages/personnel/personnel.vue';

	const uiStore = useUiStore();
	const dataStore = useDataStore();
	const userStore = useUserStore();
	const toastStore = useToastStore();

	// [核心恢复] onShow只负责加载租户信息
	onShow(() => {
		dataStore.fetchTenants();
	});

	const handleSelectTenant = async (tenantId : string) => {
		if (dataStore.currentTenantId === tenantId) {
			uiStore.closeModal(MODAL_KEYS.STORE);
			return;
		}
		try {
			await dataStore.selectTenant(tenantId);
			uiStore.closeModal(MODAL_KEYS.STORE);
			if (uiStore.activeTab === 'production') await dataStore.fetchProductionData();
			if (uiStore.activeTab === 'ingredients') await dataStore.fetchIngredientsData();
			if (uiStore.activeTab === 'recipes') await dataStore.fetchRecipesData();
			if (uiStore.activeTab === 'personnel') await dataStore.fetchMembersData();
		} catch (error) {
			console.error("Failed to select tenant:", error);
		}
	};
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	@include list-item-content-style;
	@include list-item-option-style;

	.main-page-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		width: 100%;
		overflow: hidden;
		background-color: #fdf8f2;
		transition: background-color 0.3s ease;
	}

	.main-page-container.personnel-active-bg {
		background-color: #fdf8f2;
		background-image: url("@/static/backgrounds/personnel-bg.svg");
		background-repeat: no-repeat;
		background-size: 100% auto;
		background-position: top center;
	}

	.content-area {
		flex: 1;
		min-height: 0;
		width: 100%;
		box-sizing: border-box;
	}

	.input-field {
		width: 100%;
		height: 44px;
		line-height: 44px;
		padding: 0 12px;
		border: 1px solid var(--border-color);
		border-radius: 10px;
		font-size: 14px;
		background-color: #f8f9fa;
		box-sizing: border-box;
	}

	.modal-prompt-text {
		font-size: 16px;
		color: var(--text-primary);
		text-align: center;
		margin-bottom: 25px;
	}

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