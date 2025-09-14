<template>
	<view class="baker-header-wrapper" :style="{ height: systemStore.headerHeight + 'px', paddingTop: systemStore.statusBarHeight + 'px' }">
		<view class="baker-header-content" :style="{ height: systemStore.navBarHeight + 'px' }">
			<view class="user-profile" @click="navigateToProfile">
				<view class="avatar">
					<image v-if="userStore.userInfo?.avatarUrl" :src="userStore.userInfo.avatarUrl" class="avatar-image"></image>
					<text v-else>{{ userStore.userInfo?.name?.[0] || '员' }}</text>
				</view>
				<view class="user-info">
					<view class="user-name">{{ userStore.userInfo?.name || '面包师' }}</view>
					<view class="tenant-name">{{ dataStore.currentTenant?.name || '加载中...' }}</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup lang="ts">
import { useSystemStore } from '@/store/system';
import { useUserStore } from '@/store/user';
import { useDataStore } from '@/store/data';

const systemStore = useSystemStore();
const userStore = useUserStore();
const dataStore = useDataStore();

const navigateToProfile = () => {
	uni.navigateTo({
		url: '/pages/personnel/profile'
	});
};
</script>

<style scoped lang="scss">
.baker-header-wrapper {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	background-color: rgba(253, 248, 242, 0.85);
	backdrop-filter: saturate(180%) blur(20px);
	z-index: 100;
	box-sizing: border-box;
}

.baker-header-content {
	display: flex;
	align-items: center;
	padding: 0 15px;
}

.user-profile {
	display: flex;
	align-items: center;
	flex: 1;
}

.avatar {
	width: 42px;
	height: 42px;
	border-radius: 50%;
	background-color: var(--primary-color);
	color: white;
	display: flex;
	justify-content: center;
	align-items: center;
	font-size: 20px;
	font-weight: bold;
	margin-right: 12px;
	overflow: hidden;
	flex-shrink: 0;
}

.avatar-image {
	width: 100%;
	height: 100%;
}

.user-info {
	display: flex;
	flex-direction: column;
}

.user-name {
	font-size: 18px;
	font-weight: 600;
	color: var(--text-primary);
	line-height: 1.2;
}

.tenant-name {
	font-size: 13px;
	color: var(--text-secondary);
	margin-top: 2px;
}
</style>
