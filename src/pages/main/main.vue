<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="main-page-container" :class="{ 'personnel-active-bg': uiStore.activeTab === 'personnel' }">
		<MainHeader v-if="uiStore.activeTab !== 'personnel'" :transparent="uiStore.activeTab === 'personnel'" />

		<view class="content-area" :style="{ '--header-height': (uiStore.activeTab !== 'personnel' ? systemStore.headerHeight : 0) + 'px' }">
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
import { onShow } from '@dcloudio/uni-app';
import { watch } from 'vue';
import { useUiStore } from '@/store/ui';
import { useDataStore } from '@/store/data';
import { useToastStore } from '@/store/toast';
import { useSystemStore } from '@/store/system';

import CustomTabBar from '@/components/CustomTabBar.vue';
import MainHeader from '@/components/MainHeader.vue';
import Toast from '@/components/Toast.vue';
import StoreSelectorModal from '@/components/StoreSelectorModal.vue';
import { useEntitlementsStore } from '@/store/entitlements';

// 引入四个页面级组件
import ProductionPage from '@/pages/production/production.vue';
import IngredientsPage from '@/pages/ingredients/ingredients.vue';
import RecipesPage from '@/pages/recipes/recipes.vue';
import PersonnelPage from '@/pages/personnel/personnel.vue';

const uiStore = useUiStore();
const dataStore = useDataStore();
const toastStore = useToastStore();
const systemStore = useSystemStore();
const entitlementsStore = useEntitlementsStore();

// [核心重构] onShow 只负责加载全局性的基础数据和消费 Toast
onShow(async () => {
	// 消费 Toast
	const toastMessage = uiStore.consumeNextPageToast('/pages/main/main');
	if (toastMessage) {
		toastStore.show(toastMessage);
	}

	// 确保店铺信息已加载，这是所有页面都可能需要的基础数据
	if (!dataStore.tenants || dataStore.tenants.length === 0) {
		await dataStore.fetchTenants();
	}
	await entitlementsStore.refresh(true);
});

watch(
	() => dataStore.currentTenantId,
	() => entitlementsStore.refresh(true)
);
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';

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
