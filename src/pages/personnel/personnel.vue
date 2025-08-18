<template>
	<view>
		<view class="page-content page-content-with-tabbar">

			<view class="profile-bg">
			</view>

			<view :style="{ height: systemStore.statusBarHeight + 'px' }"></view>

			<view class="profile-card" @click="navigateToCurrentUserDetail">
				<view class="avatar">
					{{ userStore.userInfo?.name?.[0] || '管' }}
				</view>
				<view class="user-info">
					<view class="name">{{ userStore.userInfo?.name || '未设置昵称' }}</view>
					<view class="role">{{ currentTenantRoleDisplay }}</view>
				</view>
				<view class="arrow-icon">
					&#10095;
				</view>
			</view>

			<view class="card placeholder-card">
				<view class="card-title">新功能开发中</view>
				<view class="placeholder-text">敬请期待更多精彩功能！</view>
			</view>

			<view class="action-list">
				<ListItem v-if="canManagePersonnel" class="action-item" @click="navigateToPersonnelList" :bleed="true">
					<view class="action-item-content">
						<image class="action-icon" src="/static/icons/settings.svg" />
						<text>人员管理</text>
					</view>
				</ListItem>
				<ListItem class="action-item" @click="uiStore.openModal(MODAL_KEYS.INVITE)" :bleed="true">
					<view class="action-item-content">
						<image class="action-icon" src="/static/icons/add.svg" />
						<text>邀请新成员</text>
					</view>
				</ListItem>
				<ListItem class="action-item" @click="handleOpenLogoutConfirm" :bleed="true">
					<view class="action-item-content">
						<image class="action-icon" src="/static/icons/remove.svg" />
						<text>退出登录</text>
					</view>
				</ListItem>
			</view>
		</view>

		<AppModal :visible="uiStore.showLogoutConfirmModal"
			@update:visible="uiStore.closeModal(MODAL_KEYS.LOGOUT_CONFIRM)" title="退出登录">
			<view class="modal-prompt-text">
				您确定要退出登录吗？
			</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="uiStore.closeModal(MODAL_KEYS.LOGOUT_CONFIRM)">取消</AppButton>
				<AppButton type="danger" @click="handleLogout">确认退出</AppButton>
			</view>
		</AppModal>
	</view>
</template>

<script setup lang="ts">
	import { computed } from 'vue';
	import { onShow } from '@dcloudio/uni-app';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import { useUiStore } from '@/store/ui';
	import { useSystemStore } from '@/store/system';
	import { MODAL_KEYS } from '@/constants/modalKeys';
	import ListItem from '@/components/ListItem.vue';
	import AppModal from '@/components/AppModal.vue';
	import AppButton from '@/components/AppButton.vue';
	import type { Role } from '@/types/api';

	// [新增] 引入所有需要的 store
	const userStore = useUserStore();
	const dataStore = useDataStore();
	const uiStore = useUiStore();
	const systemStore = useSystemStore();

	// [新增] 页面显示时获取最新数据
	onShow(async () => {
		if (!dataStore.dataLoaded.members) {
			await dataStore.fetchMembersData();
		}
	});

	// [新增] 计算当前用户的角色信息
	const currentUserRoleInTenant = computed(
		() => userStore.userInfo?.tenants.find(t => t.tenant.id === dataStore.currentTenantId)?.role
	);

	// [新增] 检查当前用户是否具备人员管理权限
	const canManagePersonnel = computed(() => {
		return currentUserRoleInTenant.value === 'OWNER' || currentUserRoleInTenant.value === 'ADMIN';
	});

	// [新增] 将角色英文标识转换为中文显示
	const getRoleName = (role : Role) => {
		const roleMap : Record<Role, string> = {
			OWNER: '店主',
			ADMIN: '管理员',
			MEMBER: '员工',
			SUPER_ADMIN: '超级管理员'
		};
		return roleMap[role] || role;
	};

	// [新增] 获取当前租户的角色中文名
	const currentTenantRoleDisplay = computed(() => {
		return currentUserRoleInTenant.value ? getRoleName(currentUserRoleInTenant.value) : '未知角色';
	});

	// [新增] 导航到当前用户的详情/编辑页
	const navigateToCurrentUserDetail = () => {
		if (userStore.userInfo?.id) {
			uni.navigateTo({
				url: `/pages/personnel/detail?memberId=${userStore.userInfo.id}`,
			});
		}
	};

	// [新增] 导航到人员管理列表页
	const navigateToPersonnelList = () => {
		uni.navigateTo({
			url: '/pages/personnel/list',
		});
	};

	// [新增] 打开退出登录确认模态框
	const handleOpenLogoutConfirm = () => {
		uiStore.openModal(MODAL_KEYS.LOGOUT_CONFIRM);
	};

	// [新增] 处理退出登录逻辑
	const handleLogout = () => {
		userStore.logout();
		uiStore.closeModal(MODAL_KEYS.LOGOUT_CONFIRM);
	};
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';
	@include list-item-content-style;

	// [新增] 为页面内容区域增加内边距
	.page-content {
		padding: 0 15px;
		/* [新增] 增加相对定位，为背景图提供定位锚点 */
		position: relative;
		z-index: 1;
	}

	/* [新增] 顶部背景图样式 */
	.profile-bg {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		width: 100%;
		z-index: 0; // 确保在内容下方

		image {
			width: 100%;
		}
	}

	// [新增] 用户信息卡片样式
	.profile-card {
		display: flex;
		align-items: center;
		background-color: var(--card-bg);
		padding: 20px;
		border-radius: 20px;
		margin-top: 15px;
		margin-bottom: 20px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
	}

	.avatar {
		width: 60px;
		height: 60px;
		border-radius: 50%;
		background-color: var(--primary-color);
		color: white;
		display: flex;
		justify-content: center;
		align-items: center;
		font-size: 24px;
		font-weight: bold;
		margin-right: 15px;
	}

	.user-info {
		flex: 1;
	}

	.user-info .name {
		font-size: 18px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.user-info .role {
		font-size: 14px;
		color: var(--text-secondary);
		margin-top: 5px;
	}

	.arrow-icon {
		font-size: 20px;
		color: var(--text-secondary);
	}

	// [新增] 占位卡片样式
	.placeholder-card {
		text-align: center;
	}

	.placeholder-text {
		color: var(--text-secondary);
		font-size: 14px;
		margin-top: 10px;
	}

	// [新增] 操作列表样式
	.action-list {
		background-color: var(--card-bg);
		border-radius: 20px;
		overflow: hidden;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
	}

	.action-item-content {
		display: flex;
		align-items: center;
		width: 100%;
		padding: 5px 20px; // 调整内边距以适应图标
		font-size: 16px;
		color: var(--text-primary);
	}

	.action-icon {
		width: 22px;
		height: 22px;
		margin-right: 15px;
	}

	// [新增] 模态框文本样式
	.modal-prompt-text {
		font-size: 16px;
		color: var(--text-primary);
		text-align: center;
		margin-bottom: 25px;
	}
</style>