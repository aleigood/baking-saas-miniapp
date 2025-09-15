<template>
	<view class="page-header" :style="headerStyle">
		<view class="header-content" :style="contentStyle">
			<view class="user-profile" @click="openMenu">
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

	<AppModal v-model:visible="isMenuVisible" title="用户选项" :no-header-line="true">
		<view class="options-list">
			<ListItem v-if="canSwitchTenants" class="option-item" @click="openStoreSelector" :bleed="true">
				<view class="main-info">
					<view class="name">
						<image src="/static/icons/store.svg" class="menu-icon" />
						<text>切换门店</text>
					</view>
				</view>
			</ListItem>
			<ListItem class="option-item" @click="navigateToProfile" :bleed="true">
				<view class="main-info">
					<view class="name">
						<image src="/static/icons/person.svg" class="menu-icon" />
						<text>修改信息</text>
					</view>
				</view>
			</ListItem>
			<ListItem class="option-item" @click="handleOpenLogoutConfirm" :bleed="true">
				<view class="main-info">
					<view class="name">
						<image src="/static/icons/logout.svg" class="menu-icon" />
						<text>退出登录</text>
					</view>
				</view>
			</ListItem>
		</view>
	</AppModal>

	<AppModal :visible="uiStore.showLogoutConfirmModal" @update:visible="uiStore.closeModal(MODAL_KEYS.LOGOUT_CONFIRM)" title="退出登录">
		<view class="modal-prompt-text">您确定要退出登录吗？</view>
		<view class="modal-actions">
			<AppButton type="secondary" @click="uiStore.closeModal(MODAL_KEYS.LOGOUT_CONFIRM)">取消</AppButton>
			<AppButton type="danger" @click="handleConfirmLogout">确认退出</AppButton>
		</view>
	</AppModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSystemStore } from '@/store/system';
import { useUserStore } from '@/store/user';
import { useDataStore } from '@/store/data';
import { useUiStore } from '@/store/ui';
import { MODAL_KEYS } from '@/constants/modalKeys';
import AppModal from '@/components/AppModal.vue';
import ListItem from '@/components/ListItem.vue';
// [核心新增] 导入 AppButton 组件
import AppButton from '@/components/AppButton.vue';

const systemStore = useSystemStore();
const userStore = useUserStore();
const dataStore = useDataStore();
const uiStore = useUiStore();

const isMenuVisible = ref(false);

const headerStyle = computed(() => ({
	height: `${systemStore.headerHeight}px`
}));

const contentStyle = computed(() => ({
	top: `${systemStore.navBarContentTop}px`,
	height: `${systemStore.navBarHeight}px`
}));

const canSwitchTenants = computed(() => {
	return userStore.userInfo && userStore.userInfo.tenants && userStore.userInfo.tenants.length > 1;
});

const openMenu = () => {
	isMenuVisible.value = true;
};

const openStoreSelector = () => {
	isMenuVisible.value = false;
	setTimeout(() => {
		uiStore.openModal(MODAL_KEYS.STORE);
	}, 300);
};

const navigateToProfile = () => {
	uni.navigateTo({
		url: '/pages/personnel/profile'
	});
	isMenuVisible.value = false;
};

// [核心修改] handleLogout 重命名为 handleOpenLogoutConfirm，并修改逻辑
const handleOpenLogoutConfirm = () => {
	isMenuVisible.value = false; // 先关闭选项模态框
	// 延迟打开下一个模态框，以获得更好的过渡效果
	setTimeout(() => {
		uiStore.openModal(MODAL_KEYS.LOGOUT_CONFIRM);
	}, 300);
};

// [核心新增] 新增确认退出登录的函数
const handleConfirmLogout = () => {
	userStore.logout();
	uiStore.closeModal(MODAL_KEYS.LOGOUT_CONFIRM);
};
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
@include list-item-option-style;

.user-profile {
	display: flex;
	align-items: center;
	flex: 1;
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
	flex-grow: 1;
	flex-shrink: 1;
	overflow: hidden;
}

.user-name {
	font-size: 18px;
	font-weight: 600;
	color: var(--text-primary);
	line-height: 1.2;
	white-space: nowrap;
	text-overflow: ellipsis;
	overflow: hidden;
}

.tenant-name {
	font-size: 13px;
	color: var(--text-secondary);
	margin-top: 2px;
	white-space: nowrap;
	text-overflow: ellipsis;
	overflow: hidden;
}

.option-item .main-info .name {
	display: flex;
	align-items: center;
}

.menu-icon {
	width: 22px;
	height: 22px;
	margin-right: 15px;
}

/* [核心新增] 确认对话框的文字样式 */
.modal-prompt-text {
	font-size: 16px;
	color: var(--text-primary);
	text-align: center;
	margin-bottom: 25px;
}
</style>
