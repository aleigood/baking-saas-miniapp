<template>
	<view class="page-wrapper">
		<view class="page-content page-content-with-tabbar">
			<view class="profile-section ripple-container" @click="navigateToCurrentUserDetail" :style="{ marginTop: systemStore.headerHeight + 10 + 'px' }">
				<view class="avatar-wrapper">
					<view class="avatar">
						<image v-if="userStore.userInfo && userStore.userInfo.avatarUrl" :src="userStore.userInfo.avatarUrl" class="avatar-image"></image>
						<text v-else>{{ userStore.userInfo?.name?.[0] || '管' }}</text>
					</view>
				</view>
				<view class="user-info">
					<view class="name">{{ userStore.userInfo?.name || '未设置昵称' }}</view>
					<view class="role-badge">{{ currentTenantRoleDisplay }}</view>
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
						<view class="action-left">
							<image class="action-icon" src="/static/icons/store.svg" />
							<text>店铺管理</text>
						</view>
						<view class="action-right">&#10095;</view>
					</view>
				</ListItem>
				<ListItem v-if="canManagePersonnel" class="action-item" @click="navigateToPersonnelList" :bleed="true" :divider="false">
					<view class="action-item-content">
						<view class="action-left">
							<image class="action-icon" src="/static/icons/person.svg" />
							<text>人员管理</text>
						</view>
						<view class="action-right">&#10095;</view>
					</view>
				</ListItem>
			</view>

			<view class="logout-card ripple-container" @click="handleOpenLogoutConfirm">
				<text class="logout-text">退出登录</text>
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

/* --- [保持一致] 页面容器与全局背景色完美统一 --- */
.page-wrapper {
	display: flex;
	flex-direction: column;
	min-height: 100vh;
	background-color: #fdf8f2; /* 绝对统一的暖白底色，绝不发暗 */
	position: relative;
	overflow: hidden;
}

/* 环境光斑基础设置 */
.page-wrapper::before,
.page-wrapper::after {
	content: '';
	position: absolute;
	border-radius: 50%;
	filter: blur(60px); /* 加大模糊，让光晕像雾气一样柔和 */
	z-index: 0;
	pointer-events: none;
}

/* 主光斑：右上角的主题色柔光 */
.page-wrapper::before {
	width: 320px;
	height: 320px;
	background-color: rgba(212, 163, 115, 0.22); /* 降低浓度，只留下一抹淡淡的暖咖色呼吸光 */
	top: -80px;
	right: -60px;
	animation: aurora-float-1 15s infinite ease-in-out alternate;
}

/* 辅光斑：左侧的明亮暖光 */
.page-wrapper::after {
	width: 280px;
	height: 280px;
	background-color: rgba(250, 237, 205, 0.6); /* 极高明度的亮暖色，起提亮和增加层次的作用 */
	top: 60px;
	left: -50px;
	animation: aurora-float-2 18s infinite ease-in-out alternate-reverse;
}

.page-content {
	padding: 20px 15px 0 15px;
	position: relative;
	z-index: 1;
}

/* --- 舒缓的动态呼吸轨迹 --- */
@keyframes aurora-float-1 {
	0% {
		transform: translate(0, 0) scale(1);
	}
	50% {
		transform: translate(-30px, 20px) scale(1.05);
	}
	100% {
		transform: translate(15px, -15px) scale(0.95);
	}
}

@keyframes aurora-float-2 {
	0% {
		transform: translate(0, 0) scale(1);
	}
	50% {
		transform: translate(40px, -20px) scale(1.1);
	}
	100% {
		transform: translate(-15px, 30px) scale(1);
	}
}

/* --- 以下为组件精细化样式 --- */
.profile-section {
	display: flex;
	align-items: center;
	padding: 15px 10px;
	border-radius: 20px;
	margin-bottom: 25px;
	position: relative;
}

.avatar-wrapper {
	position: relative;
	margin-right: 18px;
}

.avatar {
	width: 64px;
	height: 64px;
	border-radius: 50%;
	background-color: var(--primary-color);
	border: 3px solid #ffffff;
	box-shadow: 0 4px 12px rgba(212, 163, 115, 0.25);
	color: white;
	display: flex;
	justify-content: center;
	align-items: center;
	font-size: 26px;
	font-weight: bold;
	overflow: hidden;
}

.avatar-image {
	width: 100%;
	height: 100%;
}

.user-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: flex-start;
}

.user-info .name {
	font-size: 20px;
	font-weight: 700;
	color: var(--text-primary);
	margin-bottom: 4px;
}

.role-badge {
	display: inline-block;
	font-size: 12px;
	color: var(--primary-color);
	background-color: rgba(212, 163, 115, 0.12);
	padding: 3px 10px;
	border-radius: 12px;
	font-weight: 500;
}

.arrow-icon {
	font-size: 16px;
	color: #cccccc;
	margin-right: 5px;
}

.stats-card {
	padding: 25px 0;
	margin-bottom: 30px;
	border-radius: 20px;
	background-color: #ffffff;
	box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
}

.stats-grid {
	display: flex;
	justify-content: space-around;
	align-items: center;
	text-align: center;
}

.stat-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	flex: 1;
	padding: 5px 0;
	position: relative;
}

.stat-item:not(:last-child)::after {
	content: '';
	position: absolute;
	right: 0;
	top: 20%;
	height: 60%;
	width: 1px;
	background-color: rgba(0, 0, 0, 0.05);
}

.stat-value {
	font-size: 24px;
	font-weight: 700;
	color: var(--primary-color);
	line-height: 1.2;
}

.stat-label {
	font-size: 12px;
	color: var(--text-secondary);
	margin-top: 6px;
}

.action-list {
	background-color: var(--card-bg);
	border-radius: 20px;
	overflow: hidden;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
	margin-bottom: 20px;
}

.action-item-content {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: 12px 5px;
}

.action-left {
	display: flex;
	align-items: center;
	font-size: 15px;
	font-weight: 500;
	color: var(--text-primary);
}

.action-icon {
	width: 22px;
	height: 22px;
	margin-right: 15px;
}

.action-right {
	font-size: 14px;
	color: #d8d8d8;
}

.logout-card {
	background-color: var(--card-bg);
	border-radius: 20px;
	padding: 16px 0;
	display: flex;
	justify-content: center;
	align-items: center;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
	margin-bottom: 40px;
}

.logout-text {
	color: #e63946;
	font-size: 16px;
	font-weight: 500;
}

.modal-prompt-text {
	font-size: 16px;
	color: var(--text-primary);
	text-align: center;
	margin-bottom: 25px;
}
</style>
