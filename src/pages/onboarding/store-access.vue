<template>
	<page-meta page-style="background-color: #fdf8f2; overflow: hidden;"></page-meta>
	<view class="onboarding-wrapper" :style="{ paddingTop: statusBarHeight + 'px' }">
		<!-- 装饰背景，防溢出 -->
		<view class="bg-wrapper-overflow-fix">
			<view class="header-bg"></view>
			<image class="footer-croissant" src="/static/icons/croissant.svg" mode="aspectFit"></image>
		</view>

		<!-- 顶部个人信息卡片 & 退出区 (安全避开小程序右侧胶囊) -->
		<view class="profile-card-bar">
			<view class="user-meta">
				<view class="avatar-circle">{{ userStore.userInfo?.name?.[0] || '烘' }}</view>
				<view class="user-info-text">
					<view class="user-name-row">
						<text class="user-name">你好，{{ userStore.userInfo?.name || '新成员' }}</text>
						<text class="logout-text-btn" @click="handleLogout">退出登录</text>
					</view>
					<text class="user-phone">{{ userStore.userInfo?.phone }}</text>
				</view>
			</view>
		</view>

		<view class="welcome-banner" :class="{ 'enter-active': pageLoaded }">
			<view class="banner-title">选择您的开始方式</view>
			<view class="banner-subtitle">在此开启或加入已有的数字化店铺</view>
		</view>

		<!-- 卡片滚动容器 -->
		<scroll-view scroll-y class="cards-scroll-container" :show-scrollbar="false" :class="{ 'enter-active': pageLoaded }">
			<view class="cards-layout">
				<!-- 卡片 A：接受邀请，加入已有店铺 -->
				<view class="guided-card invitation-card">
					<view class="card-header">
						<view class="card-icon-tag bg-cyan">
							<image class="mini-icon" src="/static/icons/person.svg" mode="aspectFit"></image>
						</view>
						<view class="card-title-group">
							<view class="card-title">加入已有的店铺</view>
							<view class="card-subtitle">已被店主邀请？在此一键接受</view>
						</view>
					</view>

					<view v-if="loadingInvitations" class="loading-state">
						<view class="spinner"></view>
						<text>正在检索邀请...</text>
					</view>
					<view v-else-if="invitations.length > 0" class="invitations-list-wrapper">
						<view v-for="invitation in invitations" :key="invitation.id" class="custom-invitation-item">
							<view class="invitation-detail">
								<text class="invitation-tenant">{{ invitation.tenant.name }}</text>
								<view class="invitation-badge-row">
									<text class="role-capsule" :class="invitation.role.toLowerCase()">
										{{ roleName(invitation.role) }}
									</text>
									<text class="expire-time">有效期至 {{ formatChineseDate(invitation.expiresAt) }}</text>
								</view>
							</view>
							<AppButton type="primary" size="mini" :loading="acceptingId === invitation.id" @click="handleAccept(invitation)">接受</AppButton>
						</view>
					</view>
					<view v-else class="empty-invitations">
						<image class="empty-icon" src="/static/icons/info.svg" mode="aspectFit"></image>
						<text class="empty-tip">当前账号暂无邀请，若店主刚刚发送，可尝试重新登录或稍后刷新</text>
					</view>
				</view>

				<!-- 连线装饰“或者” -->
				<view class="step-connector">
					<view class="line"></view>
					<text class="or-text">或者</text>
					<view class="line"></view>
				</view>

				<!-- 卡片 B：自己创建店铺 -->
				<view class="guided-card create-card">
					<view class="card-header">
						<view class="card-icon-tag bg-brown">
							<image class="mini-icon" src="/static/icons/store.svg" mode="aspectFit"></image>
						</view>
						<view class="card-title-group">
							<view class="card-title">自主创建店铺</view>
							<view class="card-subtitle">成为店主，管理您的成员与配方</view>
						</view>
					</view>

					<view class="create-form-wrapper">
						<text class="input-label">店铺名称</text>
						<input class="modern-tenant-input" v-model.trim="tenantName" maxlength="60" placeholder="请输入店铺名称" placeholder-style="color: #c4b5a6;" />
						<AppButton type="primary" full-width :loading="creating" @click="requestCreateTenant" class="action-btn-styled">
							{{ creating ? '' : '创建并成为店主' }}
						</AppButton>
					</view>
				</view>
			</view>
		</scroll-view>

		<!-- 确认确认框 -->
		<AppModal v-model:visible="showCreateConfirm" title="确认创建店铺">
			<view class="modal-prompt-text">确认要创建店铺 “{{ tenantName }}” 吗？</view>
			<view class="modal-warning-text">创建后您将成为该店铺的店主，负责管理成员与订阅。如果您只是受邀员工，请等待店主向您发送邀请。</view>
			<view class="modal-actions">
				<AppButton type="secondary" class="modal-btn" @click="showCreateConfirm = false">取消</AppButton>
				<AppButton type="primary" class="modal-btn" :loading="creating" @click="handleCreateTenant">确认创建</AppButton>
			</view>
		</AppModal>

		<Toast />
	</view>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { acceptStoreInvitation, createFirstTenant, getPendingInvitations, type StoreInvitation } from '@/api/onboarding';
import AppButton from '@/components/AppButton.vue';
import AppModal from '@/components/AppModal.vue';
import Toast from '@/components/Toast.vue';
import { useDataStore } from '@/store/data';
import { useSystemStore } from '@/store/system';
import { useToastStore } from '@/store/toast';
import { useUserStore } from '@/store/user';
import type { TenantRole } from '@/types/api';
import { formatChineseDate } from '@/utils/format';

const tenantName = ref('我的店铺');
const invitations = ref<StoreInvitation[]>([]);
const loadingInvitations = ref(false);
const creating = ref(false);
const showCreateConfirm = ref(false);
const acceptingId = ref('');
const userStore = useUserStore();
const dataStore = useDataStore();
const systemStore = useSystemStore();
const toastStore = useToastStore();

const pageLoaded = ref(false);

const statusBarHeight = computed(() => systemStore.statusBarHeight);

const roleName = (role: TenantRole) => ({ OWNER: '店主', ADMIN: '管理员', MEMBER: '员工' })[role];

const loadInvitations = async () => {
	loadingInvitations.value = true;
	try {
		invitations.value = await getPendingInvitations();
	} finally {
		loadingInvitations.value = false;
	}
};

const handleLogout = () => {
	// 双重保险：登出 store 状态 + 强制返回登录页
	try {
		userStore.logout();
	} catch (e) {
		console.error('Logout error:', e);
	}
	uni.reLaunch({ url: '/pages/login/login' });
};

const activateTenant = async (accessToken: string, tenantId: string, role: TenantRole, target?: string) => {
	userStore.setToken(accessToken);
	uni.setStorageSync('tenant_id', tenantId);
	dataStore.currentTenantId = tenantId;
	await userStore.fetchUserInfo();
	await dataStore.fetchTenants();
	uni.reLaunch({ url: target || (role === 'MEMBER' ? '/pages/baker/main' : '/pages/main/main') });
};

const handleCreateTenant = async () => {
	if (!tenantName.value) {
		toastStore.show({ message: '请输入店铺名称', type: 'error' });
		return;
	}
	creating.value = true;
	try {
		const result = await createFirstTenant(tenantName.value);
		showCreateConfirm.value = false;
		await activateTenant(result.accessToken, result.tenant.id, result.role, '/pages/main/main');
	} finally {
		creating.value = false;
	}
};

const requestCreateTenant = () => {
	if (!tenantName.value) {
		toastStore.show({ message: '请输入店铺名称', type: 'error' });
		return;
	}
	showCreateConfirm.value = true;
};

const handleAccept = async (invitation: StoreInvitation) => {
	acceptingId.value = invitation.id;
	try {
		const result = await acceptStoreInvitation(invitation.id);
		await activateTenant(result.accessToken, invitation.tenant.id, result.role);
	} finally {
		acceptingId.value = '';
	}
};

onMounted(async () => {
	if (!userStore.userInfo) await userStore.fetchUserInfo();
	if (userStore.userInfo?.name) tenantName.value = `${userStore.userInfo.name}的店铺`;
	await loadInvitations();
	setTimeout(() => {
		pageLoaded.value = true;
	}, 100);
});
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';

.onboarding-wrapper {
	display: flex;
	flex-direction: column;
	width: 100vw;
	height: 100vh;
	background-color: var(--bg-color);
	box-sizing: border-box;
	position: relative;
	overflow: hidden;
}

.bg-wrapper-overflow-fix {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	overflow: hidden;
	pointer-events: none;
	z-index: 0;
}

.header-bg {
	position: absolute;
	top: -15vh;
	left: -20vw;
	width: 140vw;
	height: 40vh;
	background-image: url('@/static/backgrounds/personnel-bg.svg');
	background-size: cover;
	opacity: 0.3;
	transform: rotate(-10deg);
}

.footer-croissant {
	position: absolute;
	bottom: -20vh;
	right: -40vw;
	width: 120vw;
	height: 120vw;
	opacity: 0.05;
}

/* 顶部个人卡片 */
.profile-card-bar {
	display: flex;
	align-items: center;
	justify-content: flex-start;
	padding: 12px 24px;
	z-index: 10;
	margin-top: 10px;
}

.user-meta {
	display: flex;
	align-items: center;
	gap: 10px;
}

.avatar-circle {
	width: 38px;
	height: 38px;
	background-color: var(--primary-color);
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #ffffff;
	font-weight: 600;
	font-size: 14px;
	box-shadow: 0 4px 10px rgba(140, 90, 59, 0.15);
}

.user-info-text {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.user-name-row {
	display: flex;
	align-items: center;
	gap: 10px;
}

.user-name {
	font-size: 14px;
	font-weight: 600;
	color: var(--text-primary);
}

.user-phone {
	font-size: 12px;
	color: var(--text-secondary);
}

.logout-text-btn {
	font-size: 11px;
	font-weight: 500;
	color: #ab9d88;
	background-color: rgba(171, 157, 136, 0.12);
	padding: 2px 8px;
	border-radius: 6px;
	cursor: pointer;
	transition: all 0.2s ease;
	-webkit-tap-highlight-color: transparent;
	
	&:active {
		transform: scale(0.95);
		background-color: rgba(171, 157, 136, 0.2);
	}
}

/* 大标题区 */
.welcome-banner {
	padding: 16px 24px 8px;
	z-index: 5;
	opacity: 0;
	transform: translateY(15px);
	transition: opacity 0.5s ease-out, transform 0.5s ease-out;
	
	&.enter-active {
		opacity: 1;
		transform: translateY(0);
	}
}

.banner-title {
	font-size: 26px;
	font-weight: 700;
	color: var(--text-primary);
}

.banner-subtitle {
	font-size: 14px;
	color: var(--text-secondary);
	margin-top: 4px;
}

/* 滚动容器 */
.cards-scroll-container {
	flex: 1;
	min-height: 0;
	z-index: 5;
	opacity: 0;
	transform: translateY(20px);
	transition: opacity 0.6s ease-out 0.1s, transform 0.6s ease-out 0.1s;
	
	&.enter-active {
		opacity: 1;
		transform: translateY(0);
	}
}

/* 隐藏原生滚动条 */
:deep(.cards-scroll-container) {
	::-webkit-scrollbar {
		width: 0 !important;
		height: 0 !important;
		color: transparent !important;
		display: none !important;
	}
}

.cards-layout {
	padding: 12px 20px 40px;
	display: flex;
	flex-direction: column;
	gap: 16px;
	box-sizing: border-box;
}

/* 引导向导卡片 */
.guided-card {
	background-color: #ffffff;
	border-radius: 20px;
	border: 1px solid rgba(140, 90, 59, 0.1);
	box-shadow: 0 8px 24px rgba(89, 61, 42, 0.04);
	padding: 20px;
	box-sizing: border-box;
	
	&.create-card {
		background: linear-gradient(135deg, #ffffff, #fff7f1);
		border-color: rgba(140, 90, 59, 0.12);
	}
}

.card-header {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 16px;
}

.card-icon-tag {
	width: 40px;
	height: 40px;
	border-radius: 12px;
	display: flex;
	align-items: center;
	justify-content: center;
	
	&.bg-cyan {
		background-color: #e0f2fe;
	}
	
	&.bg-brown {
		background-color: #fef3c7;
	}
}

.mini-icon {
	width: 20px;
	height: 20px;
}

.card-title-group {
	display: flex;
	flex-direction: column;
}

.card-title {
	font-size: 17px;
	font-weight: 700;
	color: var(--text-primary);
}

.card-subtitle {
	font-size: 12px;
	color: var(--text-secondary);
}

/* 接受邀请列表 */
.invitations-list-wrapper {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.custom-invitation-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	background-color: #fcfcfc;
	border: 1px solid var(--border-color);
	border-radius: 14px;
	padding: 12px 14px;
	box-sizing: border-box;
}

.invitation-detail {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
	gap: 4px;
}

.invitation-tenant {
	font-size: 15px;
	font-weight: 600;
	color: var(--text-primary);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.invitation-badge-row {
	display: flex;
	align-items: center;
	gap: 6px;
}

.role-capsule {
	font-size: 10px;
	font-weight: 600;
	padding: 2px 6px;
	border-radius: 4px;
	
	&.owner {
		background-color: #fef3c7;
		color: #d97706;
	}
	&.admin {
		background-color: #e0f2fe;
		color: #0284c7;
	}
	&.member {
		background-color: #dcfce7;
		color: #16a34a;
	}
}

.expire-time {
	font-size: 10px;
	color: var(--text-secondary);
}

.empty-invitations {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 20px 10px;
	text-align: center;
	gap: 8px;
}

.empty-icon {
	width: 24px;
	height: 24px;
	opacity: 0.3;
}

.empty-tip {
	font-size: 12px;
	color: var(--text-secondary);
	line-height: 1.5;
}

.loading-state {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	padding: 20px;
	color: var(--text-secondary);
	font-size: 13px;
}

/* 或者连接线 */
.step-connector {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	padding: 4px 0;
}

.step-connector .line {
	flex: 1;
	height: 1px;
	background-color: rgba(140, 90, 59, 0.12);
}

.or-text {
	font-size: 12px;
	color: var(--text-secondary);
	padding: 0 16px;
	font-weight: 500;
}

/* 创建店铺表单 */
.create-form-wrapper {
	display: flex;
	flex-direction: column;
	width: 100%;
}

.input-label {
	font-size: 13px;
	font-weight: 600;
	color: var(--text-primary);
	margin-bottom: 6px;
}

.modern-tenant-input {
	width: 100%;
	height: 48px;
	background-color: #ffffff;
	border: 1px solid var(--border-color);
	border-radius: 12px;
	padding: 0 16px;
	box-sizing: border-box;
	font-size: 15px;
	margin-bottom: 16px;
	transition: all 0.3s ease;
	
	&:focus {
		border-color: var(--primary-color);
		box-shadow: 0 0 0 3px rgba(140, 90, 59, 0.1);
	}
}

.modal-prompt-text {
	font-size: 16px;
	font-weight: 600;
	color: var(--text-primary);
	text-align: center;
	margin-bottom: 10px;
}

.modal-warning-text {
	font-size: 13px;
	color: var(--text-secondary);
	text-align: center;
	margin-bottom: 20px;
	line-height: 1.5;
}

.modal-actions {
	display: flex;
	gap: 12px;
	margin-top: 20px;
	width: 100%;
	box-sizing: border-box;
}

.modal-btn {
	flex: 1;
}
</style>
