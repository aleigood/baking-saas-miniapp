<template>
	<view>
		<view class="page-content page-content-with-tabbar">
			<view class="profile-card" @click="navigateToCurrentUserDetail" :style="{ marginTop: systemStore.headerHeight + 'px' }">
				<view class="avatar">
					<image v-if="userStore.userInfo && userStore.userInfo.avatarUrl" :src="userStore.userInfo.avatarUrl" class="avatar-image"></image>
					<text v-else>{{ userStore.userInfo?.name?.[0] || '管' }}</text>
				</view>
				<view class="user-info">
					<view class="name">{{ userStore.userInfo?.name || '未设置昵称' }}</view>
					<view class="role">{{ currentTenantRoleDisplay }}</view>
				</view>
				<view class="arrow-icon">&#10095;</view>
			</view>

			<view class="card stats-card">
				<view class="stats-grid">
					<view class="stat-item" v-if="isOwner">
						<text class="stat-value">{{ stats.totalTenants ?? 0 }}</text>
						<text class="stat-label">店铺总数</text>
					</view>
					<view class="stat-item">
						<text class="stat-value">{{ stats.totalUsers ?? 0 }}</text>
						<text class="stat-label">人员总数</text>
					</view>
					<view class="stat-item">
						<text class="stat-value">{{ stats.totalRecipes ?? 0 }}</text>
						<text class="stat-label">配方总数</text>
					</view>
					<view class="stat-item">
						<text class="stat-value">{{ stats.totalTasks ?? 0 }}</text>
						<text class="stat-label">生产任务</text>
					</view>
				</view>
			</view>

			<view class="action-list">
				<ListItem v-if="isOwner" class="action-item" @click="navigateToTenantList" :bleed="true">
					<view class="action-item-content">
						<image class="action-icon" src="/static/icons/store.svg" />
						<text>店铺管理</text>
					</view>
				</ListItem>
				<ListItem v-if="canManagePersonnel" class="action-item" @click="navigateToPersonnelList" :bleed="true">
					<view class="action-item-content">
						<image class="action-icon" src="/static/icons/person.svg" />
						<text>人员管理</text>
					</view>
				</ListItem>
				<ListItem class="action-item" @click="handleOpenLogoutConfirm" :bleed="true">
					<view class="action-item-content">
						<image class="action-icon" src="/static/icons/logout.svg" />
						<text>退出登录</text>
					</view>
				</ListItem>
			</view>
		</view>

		<AppModal ref="logoutModalRef" :visible="uiStore.showLogoutConfirmModal" @update:visible="uiStore.closeModal(MODAL_KEYS.LOGOUT_CONFIRM)" title="退出登录">
			<view class="modal-prompt-text">您确定要退出登录吗？</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="uiStore.closeModal(MODAL_KEYS.LOGOUT_CONFIRM)">取消</AppButton>
				<AppButton type="danger" @click="handleLogout">确认退出</AppButton>
			</view>
		</AppModal>
	</view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useUserStore } from '@/store/user';
import { useDataStore } from '@/store/data';
import { useUiStore } from '@/store/ui';
import { useSystemStore } from '@/store/system';
import { MODAL_KEYS } from '@/constants/modalKeys';
import { getAppDashboardStats } from '@/api/dashboard';
import ListItem from '@/components/ListItem.vue';
import AppModal from '@/components/AppModal.vue';
import AppButton from '@/components/AppButton.vue';
import type { Role, DashboardStats } from '@/types/api';

const userStore = useUserStore();
const dataStore = useDataStore();
const uiStore = useUiStore();
const systemStore = useSystemStore();
const isNavigating = ref(false);

const stats = ref<Partial<DashboardStats>>({});
const isLoadingStats = ref(false);

// [核心修改] 定义 ref
const logoutModalRef = ref<InstanceType<typeof AppModal> | null>(null);

const fetchDashboardStats = async () => {
	isLoadingStats.value = true;
	try {
		const data = await getAppDashboardStats();
		stats.value = data;
	} catch (error) {
		console.error('获取看板数据失败:', error);
		stats.value = {};
	} finally {
		isLoadingStats.value = false;
	}
};

onShow(async () => {
	isNavigating.value = false;
	if (dataStore.dataStale.members || !dataStore.dataLoaded.members) {
		dataStore.fetchMembersData();
	}
	await fetchDashboardStats();
});

const currentUserRoleInTenant = computed(() => userStore.userInfo?.tenants.find((t) => t.tenant.id === dataStore.currentTenantId)?.role);

const isOwner = computed(() => currentUserRoleInTenant.value === 'OWNER');

const canManagePersonnel = computed(() => {
	return currentUserRoleInTenant.value === 'OWNER' || currentUserRoleInTenant.value === 'ADMIN';
});

const getRoleName = (role: Role) => {
	const roleMap: Record<Role, string> = {
		OWNER: '店主',
		ADMIN: '管理员',
		MEMBER: '员工',
		SUPER_ADMIN: '超级管理员'
	};
	return roleMap[role] || role;
};

const currentTenantRoleDisplay = computed(() => {
	return currentUserRoleInTenant.value ? getRoleName(currentUserRoleInTenant.value) : '未知角色';
});

const navigateToCurrentUserDetail = () => {
	if (isNavigating.value) return;
	isNavigating.value = true;
	uni.navigateTo({
		url: `/pages/personnel/profile`
	});
};

const navigateToPersonnelList = () => {
	if (isNavigating.value) return;
	isNavigating.value = true;
	uni.navigateTo({
		url: '/pages/personnel/list'
	});
};

const navigateToTenantList = () => {
	if (isNavigating.value) return;
	isNavigating.value = true;
	uni.navigateTo({
		url: '/pages/tenants/list'
	});
};

const handleOpenLogoutConfirm = () => {
	uiStore.openModal(MODAL_KEYS.LOGOUT_CONFIRM);
};

// [核心修改] 使用 closeAndRun 优雅退出
const handleLogout = () => {
	if (logoutModalRef.value) {
		logoutModalRef.value.closeAndRun(() => {
			userStore.logout();
		});
	} else {
		userStore.logout();
		uiStore.closeModal(MODAL_KEYS.LOGOUT_CONFIRM);
	}
};
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
@include list-item-content-style;

.personnel-header {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	background-color: rgba(253, 248, 242, 0.85);
	backdrop-filter: saturate(180%) blur(20px);
	z-index: 10;
	box-sizing: border-box;
}
.header-title-container {
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
}
.header-title {
	font-size: 18px;
	font-weight: 600;
	color: var(--text-primary);
}

.page-content {
	padding: 20px 15px 0 15px;
	position: relative;
	z-index: 1;
}

.profile-card {
	display: flex;
	align-items: center;
	padding: 20px;
	border-radius: 20px;
	margin-bottom: 30px;
	position: relative;
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
	overflow: hidden;
}

.avatar-image {
	width: 100%;
	height: 100%;
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

.stats-card {
	padding: 30px 0;
	margin-bottom: 40px;
}

.stats-grid {
	display: flex;
	justify-content: space-around;
	text-align: center;
}

.stat-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	flex: 1;
	padding: 5px 0;
}

.stat-value {
	font-size: 24px;
	font-weight: 600;
	color: var(--primary-color);
}

.stat-label {
	font-size: 13px;
	color: var(--text-secondary);
	margin-top: 5px;
}

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
	padding: 5px 5px;
	font-size: 16px;
	color: var(--text-primary);
}

.action-icon {
	width: 22px;
	height: 22px;
	margin-right: 15px;
}

.modal-prompt-text {
	font-size: 16px;
	color: var(--text-primary);
	text-align: center;
	margin-bottom: 25px;
}
</style>
