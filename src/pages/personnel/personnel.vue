<template>
	<view class="page-wrapper">
		<IconButton v-if="isOwner" class="recipe-editor-scan-btn" :style="scanButtonStyle" @click="scanRecipeEditorLogin">
			<image class="scan-icon" src="/static/icons/scan-simple.svg" />
		</IconButton>
		<view class="page-content page-content-with-tabbar">
			<view class="profile-section ripple-container" @click="navigateToCurrentUserDetail" :style="{ marginTop: (systemStore.headerHeight || 88) + 10 + 'px' }">
				<view class="avatar-wrapper">
					<UserAvatar :user-id="userStore.userInfo?.id" :avatar-url="userStore.userInfo?.avatarUrl" :size="64" />
				</view>
				<view class="user-info">
					<view class="user-name-row">
						<text class="name">{{ getUserDisplayName(userStore.userInfo) }}</text>
						<text class="role-badge">{{ currentTenantRoleDisplay }}</text>
					</view>

					<!-- 极简无边界排版：VIP文本流 -->
					<view v-if="subscriptionSummary" class="vip-text-flow" :class="subscriptionSummary.state.toLowerCase()" @click.stop="navigateToBenefits">
						<text class="vip-title">{{ vipTitle }}</text>
						<text class="vip-divider" v-if="vipDate">·</text>
						<text class="vip-date" v-if="vipDate">{{ vipDate }}</text>
						<text class="vip-arrow">›</text>
					</view>
				</view>
				<view class="arrow-icon">&#10095;</view>
			</view>

			<view class="card stats-card">
				<view class="stats-grid">
					<view class="stat-item" v-if="isOwner" :key="'stat-tenants'">
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
				<ListItem :key="'item-tenants'" class="action-item" @click="navigateToTenantList" :bleed="true">
					<view class="action-item-content">
						<view class="action-left">
							<image class="action-icon" src="/static/icons/store.svg" />
							<text>{{ isOwner ? '店铺管理' : '申请创建店铺' }}</text>
						</view>
						<view class="action-right">&#10095;</view>
					</view>
				</ListItem>
				<ListItem v-if="canManagePersonnel" :key="'item-personnel'" class="action-item" @click="navigateToPersonnelList" :bleed="true">
					<view class="action-item-content">
						<view class="action-left">
							<image class="action-icon" src="/static/icons/person.svg" />
							<text>人员管理</text>
						</view>
						<view class="action-right">&#10095;</view>
					</view>
				</ListItem>
				<ListItem :key="'item-subscription'" class="action-item" @click="navigateToManageSubscription" :bleed="true" :divider="false">
					<view class="action-item-content">
						<view class="action-left">
							<image class="action-icon" src="/static/icons/vip.svg" />
							<text>管理订阅</text>
						</view>
						<view class="action-right">&#10095;</view>
					</view>
				</ListItem>
			</view>

			<view class="logout-card ripple-container" @click="handleOpenLogoutConfirm">
				<text class="logout-text">退出登录</text>
			</view>
		</view>

		<AppModal
			ref="logoutModalRef"
			:visible="uiStore.showLogoutConfirmModal"
			:key="'logout-confirm-modal'"
			@update:visible="uiStore.closeModal(MODAL_KEYS.LOGOUT_CONFIRM)"
			title="退出登录"
		>
			<view class="modal-prompt-text">您确定要退出登录吗？</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="uiStore.closeModal(MODAL_KEYS.LOGOUT_CONFIRM)">取消</AppButton>
				<AppButton type="danger" @click="handleLogout">确认退出</AppButton>
			</view>
		</AppModal>

		<!-- 新增：自定义扫码操作菜单 -->
		<AppModal
			v-model:visible="showScanActionModal"
			:key="'scan-action-modal'"
			title="授权登录"
			:no-header-line="true"
		>
			<view class="options-list">
				<ListItem class="option-item" @click="startScanRecipeEditorQr" :bleed="true">
					<view class="main-info">
						<view class="name">扫描网页二维码</view>
					</view>
				</ListItem>
				<ListItem class="option-item" @click="openInputCodeModal" :bleed="true" :divider="false">
					<view class="main-info">
						<view class="name">输入网页验证码</view>
					</view>
				</ListItem>
			</view>
		</AppModal>

		<!-- 新增：输入验证码弹窗 -->
		<AppModal
			v-model:visible="showInputCodeModal"
			:key="'input-code-modal'"
			title="输入电脑端验证码"
		>
			<view class="form-container" style="padding-top: 10px;">
				<view class="form-item">
					<input class="input-field" type="text" v-model="recipeEditorCode" placeholder="请输入网页上的 6 位验证码" />
				</view>
			</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showInputCodeModal = false">取消</AppButton>
				<AppButton type="primary" @click="confirmInputRecipeEditorCode" :loading="isSubmittingAction">授权</AppButton>
			</view>
		</AppModal>

		<!-- 新增：确认授权弹窗 -->
		<AppModal
			v-model:visible="showAuthConfirmModal"
			:key="'auth-confirm-modal'"
			title="授权电脑端编辑"
		>
			<view class="modal-prompt-text" style="text-align: center; padding: 20px 0;">
				是否允许电脑端为当前店铺“<text style="color: var(--primary-color); font-weight: bold;">{{ dataStore.currentTenant?.name || '当前店铺' }}</text>”创建配方草稿？
			</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showAuthConfirmModal = false">取消</AppButton>
				<AppButton type="primary" @click="confirmAuthRecipeEditor" :loading="isSubmittingAction">允许</AppButton>
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
import { useToastStore } from '@/store/toast';
import { MODAL_KEYS } from '@/constants/modalKeys';
import { getAppDashboardStats } from '@/api/dashboard';
import { getSubscriptionSummary, type SubscriptionSummary } from '@/api/billing';
import { approveRecipeEditorSession, approveRecipeEditorSessionByCode, type RecipeEditorScanPayload } from '@/api/recipe-editor';
import { formatChineseDate } from '@/utils/format';
import ListItem from '@/components/ListItem.vue';
import AppModal from '@/components/AppModal.vue';
import AppButton from '@/components/AppButton.vue';
import IconButton from '@/components/IconButton.vue';
import UserAvatar from '@/components/UserAvatar.vue';
import { getUserDisplayName } from '@/utils/user-display';
import type { DashboardStats, TenantRole } from '@/types/api';

const userStore = useUserStore();
const dataStore = useDataStore();
const uiStore = useUiStore();
const systemStore = useSystemStore();
const toastStore = useToastStore();
const isNavigating = ref(false);

const showScanActionModal = ref(false);
const showInputCodeModal = ref(false);
const showAuthConfirmModal = ref(false);
const isSubmittingAction = ref(false);
const recipeEditorCode = ref('');
const pendingScanPayload = ref<RecipeEditorScanPayload | null>(null);

const stats = ref<Partial<DashboardStats>>({});
const isLoadingStats = ref(false);
const subscriptionSummary = ref<SubscriptionSummary | null>(null);
const subscriptionLoaded = ref(false);

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

const fetchSubscription = async () => {
	try {
		subscriptionSummary.value = await getSubscriptionSummary();
	} catch (error) {
		console.error('获取订阅信息失败:', error);
		subscriptionSummary.value = null;
	} finally {
		subscriptionLoaded.value = true;
	}
};

onShow(async () => {
	isNavigating.value = false;
	if (dataStore.dataStale.members || !dataStore.dataLoaded.members) {
		dataStore.fetchMembersData();
	}
	await Promise.all([fetchDashboardStats(), fetchSubscription()]);
});

const currentUserRoleInTenant = computed(() => userStore.userInfo?.tenants.find((t) => t.tenant.id === dataStore.currentTenantId)?.role);

const isOwner = computed(() => currentUserRoleInTenant.value === 'OWNER');

const scanButtonStyle = computed(() => {
	const menu = systemStore.menuButtonPosition;
	const buttonSize = 40; // IconButton default size
	
	if (!menu) {
		const top = systemStore.navBarContentTop || 54;
		const navHeight = systemStore.navBarHeight || 32;
		return {
			top: `${top - (buttonSize - navHeight) / 2}px`,
			right: '108px',
			width: `${buttonSize}px`,
			height: `${buttonSize}px`
		};
	}
	const windowWidth = uni.getWindowInfo().windowWidth;
	const gap = 12; // Increase gap to 12px for better visual spacing
	return {
		top: `${menu.top - (buttonSize - menu.height) / 2}px`,
		right: `${Math.max(12, windowWidth - menu.left + gap)}px`,
		width: `${buttonSize}px`,
		height: `${buttonSize}px`
	};
});

const canManagePersonnel = computed(() => {
	return currentUserRoleInTenant.value === 'OWNER' || currentUserRoleInTenant.value === 'ADMIN';
});

const getRoleName = (role: TenantRole) => {
	const roleMap: Record<TenantRole, string> = {
		OWNER: '店主',
		ADMIN: '管理员',
		MEMBER: '员工'
	};
	return roleMap[role] || role;
};

const currentTenantRoleDisplay = computed(() => {
	return currentUserRoleInTenant.value ? getRoleName(currentUserRoleInTenant.value) : '未知角色';
});

const vipTitle = computed(() => {
	if (!subscriptionLoaded.value) return '加载中...';
	if (!subscriptionSummary.value) return '';
	const state = subscriptionSummary.value.state;
	if (state === 'FREE') return '免费版';
	if (state === 'TRIAL') return '专业版试用';
	if (state === 'GRACE') return '订阅已到期';
	if (state === 'PAID') return '专业尊享版';
	return '';
});

const vipDate = computed(() => {
	if (!subscriptionSummary.value) return '';
	const state = subscriptionSummary.value.state;
	if (state === 'FREE' || state === 'GRACE') return '';
	if (subscriptionSummary.value.entitledUntil) {
		const date = new Date(subscriptionSummary.value.entitledUntil);
		return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} 到期`;
	}
	return '';
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

const navigateToBenefits = () => {
	if (isNavigating.value) return;
	isNavigating.value = true;
	uni.navigateTo({ url: '/pages/subscription/benefits' });
};

const navigateToManageSubscription = () => {
	if (isNavigating.value) return;
	isNavigating.value = true;
	uni.navigateTo({ url: '/pages/subscription/subscription' });
};

const parseRecipeEditorScanPayload = (raw: string): RecipeEditorScanPayload | null => {
	if (raw.startsWith('RE:')) {
		const [, sessionId, token] = raw.split(':');
		if (sessionId && token) return { type: 'RECIPE_EDITOR_LOGIN', sessionId, token };
	}
	try {
		const parsed = JSON.parse(raw) as RecipeEditorScanPayload;
		if (parsed?.type === 'RECIPE_EDITOR_LOGIN' && parsed.sessionId && parsed.token) {
			return parsed;
		}
	} catch (error) {
		const query = raw.includes('?') ? raw.split('?')[1] : raw;
		const params = query.split('&').reduce<Record<string, string>>((acc, pair) => {
			const [key, value] = pair.split('=');
			if (key && value) acc[decodeURIComponent(key)] = decodeURIComponent(value);
			return acc;
		}, {});
		if (params.sessionId && params.token) {
			return { type: 'RECIPE_EDITOR_LOGIN', sessionId: params.sessionId, token: params.token };
		}
	}
	return null;
};

const scanRecipeEditorLogin = () => {
	showScanActionModal.value = true;
};

const openInputCodeModal = () => {
	showScanActionModal.value = false;
	recipeEditorCode.value = '';
	showInputCodeModal.value = true;
};

const startScanRecipeEditorQr = () => {
	showScanActionModal.value = false;
	uni.scanCode({
		onlyFromCamera: true,
		success: (res) => {
			const payload = parseRecipeEditorScanPayload(res.result);
			if (!payload) {
				toastStore.show({ message: '不是有效的编辑器二维码', type: 'error' });
				return;
			}
			pendingScanPayload.value = payload;
			showAuthConfirmModal.value = true;
		},
		fail: () => {
			toastStore.show({ message: '未完成扫码', type: 'error' });
		}
	});
};

const confirmAuthRecipeEditor = async () => {
	if (!pendingScanPayload.value) return;
	isSubmittingAction.value = true;
	try {
		await approveRecipeEditorSession(pendingScanPayload.value.sessionId, pendingScanPayload.value.token);
		toastStore.show({ message: '电脑端已登录', type: 'success' });
		showAuthConfirmModal.value = false;
	} catch (error) {
		console.error('授权电脑端编辑器失败:', error);
	} finally {
		isSubmittingAction.value = false;
	}
};

const confirmInputRecipeEditorCode = async () => {
	const code = recipeEditorCode.value.trim().toUpperCase();
	if (!code) {
		toastStore.show({ message: '请输入验证码', type: 'error' });
		return;
	}
	isSubmittingAction.value = true;
	try {
		await approveRecipeEditorSessionByCode(code);
		toastStore.show({ message: '电脑端已登录', type: 'success' });
		showInputCodeModal.value = false;
	} catch (error) {
		console.error('验证码授权电脑端编辑器失败:', error);
	} finally {
		isSubmittingAction.value = false;
	}
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

.recipe-editor-scan-btn {
	position: fixed;
	z-index: 20;
	background: transparent;
}

.scan-icon {
	width: 24px;
	height: 24px;
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
	padding: 15px 15px;
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
	margin-bottom: 0;
}

.user-name-row {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 2px;
}

.role-badge {
	display: inline-block;
	font-size: 11px;
	color: var(--primary-color);
	background-color: rgba(212, 163, 115, 0.12);
	padding: 2px 8px;
	border-radius: 10px;
	font-weight: 500;
}

/* 顶级 UI/UX：无边界排版流设计 */
.vip-text-flow {
	display: inline-flex;
	align-items: center;
	margin-top: 2px;
	padding: 2px 8px 2px 0; /* 右侧留白增加点击区域，左侧无需内边距以对齐名字 */
	transition: opacity 0.2s ease;
	color: var(--primary-color);

	&:active {
		opacity: 0.5;
	}

	.vip-title {
		font-size: 13px;
		font-weight: 600;
		letter-spacing: 0.2px;
	}

	.vip-divider {
		margin: 0 6px;
		font-size: 14px;
		opacity: 0.35;
		font-weight: 700;
	}

	.vip-date {
		font-size: 12px;
		font-weight: 400;
		opacity: 0.6;
		letter-spacing: 0.2px;
	}

	.vip-arrow {
		margin-left: 4px;
		font-size: 16px;
		font-weight: 300;
		opacity: 0.4;
		transform: translateY(-0.5px);
	}

	/* 免费版 - 极致弱化 */
	&.free {
		color: var(--text-secondary);

		.vip-title {
			font-weight: 500;
			opacity: 0.8;
		}

		.vip-arrow {
			opacity: 0.3;
		}
	}

	/* 到期 - 警告色克制处理 */
	&.grace {
		color: #c94b4b;

		.vip-title {
			opacity: 0.9;
		}

		.vip-arrow {
			opacity: 0.5;
		}
	}
}

.arrow-icon {
	font-size: 16px;
	color: #c4b5a6;
	margin-left: auto;
	margin-right: 5px;
	font-weight: 500;
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

	:deep(.action-item) {
		.list-item-content.bleed-padding {
			padding-top: 15px;
			padding-bottom: 15px;
		}
	}
}

.action-item-content {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: 2px 5px;
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
