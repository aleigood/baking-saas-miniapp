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

		<StoreSelectorModal />

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
// [核心删除] 不再需要导入 MODAL_KEYS 和 createInvitation
// import { createInvitation } from '@/api/invitations';
// import { MODAL_KEYS } from '@/constants/modalKeys';

import CustomTabBar from '@/components/CustomTabBar.vue';
import MainHeader from '@/components/MainHeader.vue';
import Toast from '@/components/Toast.vue';
// [核心新增] 导入新的全局模态框组件
import StoreSelectorModal from '@/components/StoreSelectorModal.vue';
// [核心删除] 不再需要这些组件
// import AppModal from '@/components/AppModal.vue';
// import FormItem from '@/components/FormItem.vue';
// import ListItem from '@/components/ListItem.vue';
// import AppButton from '@/components/AppButton.vue';

// 引入四个页面级组件
import ProductionPage from '@/pages/production/production.vue';
import IngredientsPage from '@/pages/ingredients/ingredients.vue';
import RecipesPage from '@/pages/recipes/recipes.vue';
import PersonnelPage from '@/pages/personnel/personnel.vue';

const uiStore = useUiStore();
const dataStore = useDataStore();
const userStore = useUserStore();
const toastStore = useToastStore();

// [核心重构] onShow 负责加载基础数据，移除不必要的验证
onShow(async () => {
	// [核心改造] 将消费Toast的逻辑移至main.vue的onShow顶部，并指定自己的地址
	const toastMessage = uiStore.consumeNextPageToast('/pages/main/main');
	if (toastMessage) {
		toastStore.show(toastMessage);
	}

	// launch.vue 已经确保了 token 和 userInfo 的有效性
	// 我们只需要确保店铺信息被加载，然后按需加载当前标签页的数据
	if (!dataStore.tenants || dataStore.tenants.length === 0) {
		await dataStore.fetchTenants();
	}
	// 主动加载默认标签页的数据
	loadDataForActiveTab(uiStore.activeTab);
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

// [核心删除] handleSelectTenant 逻辑已移至 StoreSelectorModal 组件中
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
// [核心删除] 不再需要这两个 mixin
// @include list-item-content-style;
// @include list-item-option-style;

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
</style>
