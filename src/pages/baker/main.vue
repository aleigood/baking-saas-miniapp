<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="baker-page-container">
		<BakerHeader />

		<view class="content-area">
			<ProductionPage :has-tab-bar="false" />
		</view>

		<StoreSelectorModal />

		<Toast />
	</view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { useDataStore } from '@/store/data';
import { useUserStore } from '@/store/user';
import { useSystemStore } from '@/store/system';
import { useUiStore } from '@/store/ui';
import { useToastStore } from '@/store/toast';
import BakerHeader from '@/components/BakerHeader.vue';
import ProductionPage from '@/pages/production/production.vue';
import Toast from '@/components/Toast.vue';
import StoreSelectorModal from '@/components/StoreSelectorModal.vue'; // [核心新增] 导入组件

const dataStore = useDataStore();
const userStore = useUserStore();
const systemStore = useSystemStore();
const uiStore = useUiStore();
const toastStore = useToastStore();

// onShow 钩子用于确保页面显示时数据是最新的
onShow(async () => {
	// [核心新增] 消费定向发送到本页面的 Toast 消息
	const toastMessage = uiStore.consumeNextPageToast('/pages/baker/main');
	if (toastMessage) {
		toastStore.show(toastMessage);
	}

	// 校验登录状态，如果未登录则返回登录页
	if (!userStore.token) {
		userStore.handleUnauthorized();
		return;
	}

	// 确保用户信息和店铺信息已加载
	if (!userStore.userInfo) {
		await userStore.fetchUserInfo();
	}
	if (dataStore.tenants.length === 0) {
		await dataStore.fetchTenants();
	}

	// 按需加载生产任务数据
	if (dataStore.dataStale.production || !dataStore.dataLoaded.production) {
		dataStore.fetchProductionData();
	}
});
</script>

<style scoped lang="scss">
.baker-page-container {
	display: flex;
	flex-direction: column;
	height: 100vh;
	width: 100%;
	overflow: hidden;
	background-color: #fdf8f2;
}

.content-area {
	flex: 1;
	min-height: 0;
	width: 100%;
	box-sizing: border-box;
}
</style>
