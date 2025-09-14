<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="main-page-container" :class="{ 'personnel-active-bg': uiStore.activeTab === 'personnel' }">
		<MainHeader v-if="uiStore.activeTab !== 'personnel'" :transparent="uiStore.activeTab === 'personnel'" />

		<view class="content-area">
			<ProductionPage v-show="uiStore.activeTab === 'production'" />
			<IngredientsPage v-show="uiStore.activeTab === 'ingredients'" />
			<RecipesPage v-show="uiStore.activeTab === 'recipes'" />
			<PersonnelPage v-show="uiStore.activeTab === 'personnel'" />
		</view>

		<CustomTabBar />

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

		<Toast />
	</view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'; // 引入 watch
import { onShow } from '@dcloudio/uni-app';
import { useUiStore } from '@/store/ui';
import { useDataStore } from '@/store/data';
import { useUserStore } from '@/store/user';
import { useToastStore } from '@/store/toast';
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

// [核心重构] onShow 负责校验登录状态和加载基础数据
onShow(async () => {
	// [核心改造] 将消费Toast的逻辑移至main.vue的onShow顶部，并指定自己的地址
	const toastMessage = uiStore.consumeNextPageToast('/pages/main/main');
	if (toastMessage) {
		toastStore.show(toastMessage);
	}

	if (userStore.token) {
		try {
			// 验证token并获取用户信息
			await userStore.fetchUserInfo();
			if (userStore.userInfo) {
				// token有效，获取店铺信息
				await dataStore.fetchTenants();
				// 主动加载默认标签页的数据
				loadDataForActiveTab(uiStore.activeTab);
			} else {
				throw new Error('User info not found after fetch');
			}
		} catch (error) {
			console.error('Token validation failed in main page, redirecting to login', error);
			// [核心修复] 调用正确的函数名 handleUnauthorized
			userStore.handleUnauthorized();
		}
	} else {
		// [核心修复] 调用正确的函数名 handleUnauthorized
		userStore.handleUnauthorized();
	}
});

// [核心新增] 创建一个函数，用于根据当前激活的 Tab 按需加载数据
const loadDataForActiveTab = (tabKey: string) => {
	switch (tabKey) {
		case 'production':
			if (dataStore.dataStale.production || !dataStore.dataLoaded.production) {
				dataStore.fetchProductionData();
			}
			break;
		case 'ingredients':
			if (dataStore.dataStale.ingredients || !dataStore.dataLoaded.ingredients) {
				dataStore.fetchIngredientsData();
			}
			break;
		case 'recipes':
			if (dataStore.dataStale.recipes || !dataStore.dataLoaded.recipes) {
				dataStore.fetchRecipesData();
			}
			break;
		case 'personnel':
			if (dataStore.dataStale.members || !dataStore.dataLoaded.members) {
				dataStore.fetchMembersData();
			}
			break;
	}
};

// [核心新增] 监听 Tab 切换，主动加载数据
watch(
	() => uiStore.activeTab,
	(newTab) => {
		loadDataForActiveTab(newTab);
	}
);

const handleSelectTenant = async (tenantId: string) => {
	if (dataStore.currentTenantId === tenantId) {
		uiStore.closeModal(MODAL_KEYS.STORE);
		return;
	}
	try {
		await dataStore.selectTenant(tenantId);
		uiStore.closeModal(MODAL_KEYS.STORE);
		// 切换店铺后，重新加载当前 Tab 的数据
		loadDataForActiveTab(uiStore.activeTab);
	} catch (error) {
		console.error('Failed to select tenant:', error);
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
	background-image: url('@/static/backgrounds/personnel-bg.svg');
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
