<template>
	<view class="baker-header-wrapper" :style="{ height: systemStore.headerHeight + 'px', paddingTop: systemStore.statusBarHeight + 'px' }">
		<view class="baker-header-content" :style="{ height: systemStore.navBarHeight + 'px' }">
			<view class="user-profile" @click="toggleMenu">
				<view class="avatar">
					<image v-if="userStore.userInfo?.avatarUrl" :src="userStore.userInfo.avatarUrl" class="avatar-image"></image>
					<text v-else>{{ userStore.userInfo?.name?.[0] || '员' }}</text>
				</view>
				<view class="user-info">
					<view class="user-name">{{ userStore.userInfo?.name || '面包师' }}</view>
					<view class="tenant-name">{{ dataStore.currentTenant?.name || '加载中...' }}</view>
				</view>
				<view class="arrow-down" :class="{ 'is-active': isMenuVisible }"></view>
			</view>
		</view>
	</view>

	<view v-if="isMenuVisible" class="menu-overlay" @click="closeMenu"></view>
	<view v-if="isMenuVisible" class="menu-dropdown" :style="{ top: systemStore.headerHeight + 'px' }">
		<view class="menu-item" @click="navigateToProfile">
			<image src="/static/icons/person.svg" class="menu-icon" />
			<text>修改信息</text>
		</view>
		<view class="menu-item" @click="handleLogout">
			<image src="/static/icons/logout.svg" class="menu-icon" />
			<text>退出登录</text>
		</view>
	</view>
</template>

<script setup lang="ts">
import { ref } from 'vue'; // [核心新增] 导入 ref
import { useSystemStore } from '@/store/system';
import { useUserStore } from '@/store/user';
import { useDataStore } from '@/store/data';

const systemStore = useSystemStore();
const userStore = useUserStore();
const dataStore = useDataStore();

// [核心新增] 控制菜单可见性的状态
const isMenuVisible = ref(false);

const toggleMenu = () => {
	isMenuVisible.value = !isMenuVisible.value;
};

const closeMenu = () => {
	isMenuVisible.value = false;
};

const navigateToProfile = () => {
	uni.navigateTo({
		url: '/pages/personnel/profile'
	});
	closeMenu(); // 关闭菜单
};

const handleLogout = () => {
	userStore.logout();
	closeMenu(); // 关闭菜单
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
	// [核心新增] 给点击区域一个内边距，方便用户点击
	padding: 5px 0;
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
	flex: 1; // [核心新增] 让文字区域占据更多空间
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

/* [核心新增] 箭头样式 */
.arrow-down {
	width: 0;
	height: 0;
	border-left: 5px solid transparent;
	border-right: 5px solid transparent;
	border-top: 6px solid var(--text-secondary);
	transition: transform 0.3s ease;
	margin-left: 10px;

	&.is-active {
		transform: rotate(180deg);
	}
}

/* [核心新增] 菜单和遮罩层样式 */
.menu-overlay {
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	background-color: rgba(0, 0, 0, 0.1);
	z-index: 98;
}

.menu-dropdown {
	position: fixed;
	right: 15px;
	background-color: white;
	border-radius: 12px;
	box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
	z-index: 99;
	width: 150px;
	overflow: hidden;
	padding: 5px;
}

.menu-item {
	display: flex;
	align-items: center;
	padding: 12px 15px;
	font-size: 15px;
	color: var(--text-primary);
	border-radius: 8px;

	&:active {
		background-color: #f7f7f7;
	}
}

.menu-icon {
	width: 18px;
	height: 18px;
	margin-right: 12px;
}
</style>
