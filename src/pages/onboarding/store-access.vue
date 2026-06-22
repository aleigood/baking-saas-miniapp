<template>
	<page-meta page-style="background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper" :style="{ paddingTop: systemStore.statusBarHeight + 'px' }">
		<view class="top-bar">
			<view>
				<view class="page-title">选择如何开始</view>
				<view class="account-phone">当前账号 {{ userStore.userInfo?.phone }}</view>
			</view>
			<AppButton type="text-link" @click="userStore.logout">退出</AppButton>
		</view>

		<scroll-view scroll-y class="content-scroll">
			<view class="content">
				<view class="section">
					<view class="section-title">创建自己的店铺</view>
					<view class="section-desc">创建后你将成为店主，并可以配置订阅、人员和配方。</view>
					<input class="tenant-input" v-model.trim="tenantName" maxlength="60" placeholder="请输入店铺名称" />
					<AppButton type="primary" full-width :loading="creating" @click="handleCreateTenant">创建店铺</AppButton>
				</view>

				<view class="section-divider"><text>或接受店铺邀请</text></view>

				<view class="section">
					<view class="section-title">待接受邀请</view>
					<view class="section-desc">这里只显示发送到你当前手机号且仍在有效期内的邀请，无法搜索其他店铺。</view>
					<view v-if="loadingInvitations" class="empty-text">正在加载邀请...</view>
					<view v-else-if="invitations.length === 0" class="empty-text">暂时没有待接受的店铺邀请</view>
					<view v-else class="invitation-list">
						<view v-for="invitation in invitations" :key="invitation.id" class="invitation-item">
							<view class="invitation-info">
								<view class="tenant-name">{{ invitation.tenant.name }}</view>
								<view class="invitation-meta">邀请角色：{{ roleName(invitation.role) }} · {{ formatChineseDate(invitation.expiresAt) }}前有效</view>
							</view>
							<AppButton type="secondary" :loading="acceptingId === invitation.id" @click="handleAccept(invitation)">接受</AppButton>
						</view>
					</view>
				</view>
			</view>
		</scroll-view>
		<Toast />
	</view>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { acceptStoreInvitation, createFirstTenant, getPendingInvitations, type StoreInvitation } from '@/api/onboarding';
import AppButton from '@/components/AppButton.vue';
import Toast from '@/components/Toast.vue';
import { useDataStore } from '@/store/data';
import { useSystemStore } from '@/store/system';
import { useToastStore } from '@/store/toast';
import { useUserStore } from '@/store/user';
import type { Role } from '@/types/api';
import { formatChineseDate } from '@/utils/format';

const tenantName = ref('我的店铺');
const invitations = ref<StoreInvitation[]>([]);
const loadingInvitations = ref(false);
const creating = ref(false);
const acceptingId = ref('');
const userStore = useUserStore();
const dataStore = useDataStore();
const systemStore = useSystemStore();
const toastStore = useToastStore();

const roleName = (role: Role) => ({ OWNER: '店主', ADMIN: '管理员', MEMBER: '员工', SUPER_ADMIN: '超级管理员' })[role];

const loadInvitations = async () => {
	loadingInvitations.value = true;
	try {
		invitations.value = await getPendingInvitations();
	} finally {
		loadingInvitations.value = false;
	}
};

const activateTenant = async (accessToken: string, tenantId: string, role: Role, target?: string) => {
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
		await activateTenant(result.accessToken, result.tenant.id, result.role, '/pages/subscription/subscription');
	} finally {
		creating.value = false;
	}
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
});
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
.page-wrapper { height: 100vh; background: var(--bg-color); display: flex; flex-direction: column; box-sizing: border-box; }
.top-bar { min-height: 76px; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); box-sizing: border-box; }
.page-title { font-size: 23px; font-weight: 700; color: var(--text-primary); }
.account-phone { margin-top: 4px; font-size: 13px; color: var(--text-secondary); }
.content-scroll { flex: 1; min-height: 0; }
.content { padding: 24px 20px 50px; max-width: 640px; margin: 0 auto; box-sizing: border-box; }
.section { width: 100%; }
.section-title { font-size: 18px; font-weight: 600; color: var(--text-primary); }
.section-desc { margin: 7px 0 16px; color: var(--text-secondary); font-size: 13px; line-height: 1.55; }
.tenant-input { width: 100%; height: 48px; padding: 0 14px; margin-bottom: 14px; border: 1px solid var(--border-color); background: #fff; border-radius: 8px; box-sizing: border-box; font-size: 15px; }
.section-divider { display: flex; align-items: center; justify-content: center; margin: 30px 0; color: var(--text-secondary); font-size: 12px; }
.section-divider::before, .section-divider::after { content: ''; height: 1px; background: var(--border-color); flex: 1; }
.section-divider text { padding: 0 12px; }
.invitation-list { display: flex; flex-direction: column; gap: 10px; }
.invitation-item { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px; background: #fff; border: 1px solid var(--border-color); border-radius: 8px; }
.invitation-info { flex: 1; min-width: 0; }
.tenant-name { font-size: 16px; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.invitation-meta, .empty-text { margin-top: 5px; font-size: 12px; color: var(--text-secondary); line-height: 1.5; }
.empty-text { padding: 20px 0; text-align: center; }
</style>
