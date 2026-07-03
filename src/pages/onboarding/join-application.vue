<template>
	<view class="redirect-page" :style="{ paddingTop: statusBarHeight + 'px' }">
		<image class="redirect-logo" src="/static/icons/croissant.svg" mode="aspectFit" />
		<text>正在打开店铺邀请...</text>
	</view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useSystemStore } from '@/store/system';
import { useUserStore } from '@/store/user';

const systemStore = useSystemStore();
const userStore = useUserStore();
const statusBarHeight = computed(() => systemStore.statusBarHeight);

onLoad((options) => {
	const token = decodeURIComponent(String(options?.token || ''));
	if (!token) {
		uni.reLaunch({ url: '/pages/launch/launch' });
		return;
	}
	uni.setStorageSync('pending_join_token', token);
	uni.reLaunch({ url: userStore.token ? '/pages/onboarding/store-access' : '/pages/login/login' });
});
</script>

<style scoped lang="scss">
.redirect-page { min-height: 100vh; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; background: #fdf8f2; color: #9a8778; font-size: 13px; }
.redirect-logo { width: 72px; height: 72px; opacity: .75; }
</style>
