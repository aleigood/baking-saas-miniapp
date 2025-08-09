<template>
	<view class="page-container">
		<view class="page-header">
			<view class="store-selector" @click="showStoreModal = true">{{ dataStore.currentTenant?.name }} &#9662;
			</view>
			<view class="user-avatar" @click="showUserMenu = true">{{
        userStore.userInfo?.name?.[0] || '管'
      }}</view>
		</view>
		<view class="page-content">
			<view class="loading-spinner" v-if="isLoading">
				<text>加载中...</text>
			</view>
			<template v-else>
				<view v-for="member in dataStore.members" :key="member.id" class="list-item"
					@click="navigateToDetail(member.id)">
					<view class="main-info">
						<view class="name">{{ member.name || member.phone }}</view>
						<view class="desc">加入于: {{ new Date(member.joinDate).toLocaleDateString() }}</view>
					</view>
					<view class="side-info">
						<view class="value">{{ getRoleName(member.role) }}</view>
					</view>
				</view>
			</template>
		</view>

		<AppFab v-if="canInvite" @click="showInviteModal = true" />

		<AppModal v-model:visible="showStoreModal" title="选择门店">
			<view v-for="tenant in dataStore.tenants" :key="tenant.id" class="list-item"
				@click="handleSelectTenant(tenant.id)">{{ tenant.name }}</view>
		</AppModal>

		<AppModal v-model:visible="showUserMenu">
			<view class="list-item" style="border: none; padding: 10px 15px" @click="userStore.logout()">退出登录
			</view>
		</AppModal>

		<AppModal v-model:visible="showInviteModal" title="邀请新成员">
			<FormItem label="被邀请人手机号">
				<input class="input-field" type="tel" v-model="inviteePhone" placeholder="请输入手机号" />
			</FormItem>
			<view class="modal-actions">
				<button class="btn btn-secondary" @click="showInviteModal = false">
					取消
				</button>
				<button class="btn btn-primary" @click="handleInvite" :disabled="isCreatingInvite"
					:loading="isCreatingInvite">
					{{ isCreatingInvite ? '发送中...' : '确认邀请' }}
				</button>
			</view>
		</AppModal>
	</view>
</template>

<script setup lang="ts">
	import { ref, computed } from 'vue';
	import { onShow } from '@dcloudio/uni-app';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import { createInvitation } from '@/api/invitations';
	import AppModal from '@/components/AppModal.vue';
	import FormItem from '@/components/FormItem.vue';
	import AppFab from '@/components/AppFab.vue';
	import type { Role } from '@/types/api';

	const userStore = useUserStore();
	const dataStore = useDataStore();

	const isSubmitting = ref(false);
	const showStoreModal = ref(false);
	const showUserMenu = ref(false);
	const showInviteModal = ref(false);
	const isCreatingInvite = ref(false);
	const inviteePhone = ref('');
	const isLoading = ref(false);

	onShow(async () => {
		// isLoading.value = true; // [修改] 删除此行，不再显示加载中状态
		await dataStore.fetchMembersData();
		// isLoading.value = false; // [修改] 删除此行
	});

	const currentUserRoleInTenant = computed(
		() => userStore.userInfo?.tenants.find(t => t.tenant.id === dataStore.currentTenantId)?.role
	);

	const canInvite = computed(() => {
		return currentUserRoleInTenant.value === 'OWNER' || currentUserRoleInTenant.value === 'ADMIN';
	});

	// [核心新增] 角色名称映射函数
	const getRoleName = (role : Role) => {
		const roleMap = {
			OWNER: '店主',
			ADMIN: '管理员',
			MEMBER: '员工',
			SUPER_ADMIN: '超级管理员'
		};
		return roleMap[role] || role;
	};

	const navigateToDetail = (memberId : string) => {
		uni.navigateTo({
			url: `/pages/personnel/detail?memberId=${memberId}`,
		});
	};

	const handleSelectTenant = async (tenantId : string) => {
		if (dataStore.currentTenantId === tenantId) {
			showStoreModal.value = false;
			return;
		}
		isLoading.value = true;
		await dataStore.selectTenant(tenantId);
		showStoreModal.value = false;
		await dataStore.fetchMembersData();
		isLoading.value = false;
	};

	const handleInvite = async () => {
		if (!inviteePhone.value) {
			uni.showToast({ title: '请输入手机号', icon: 'none' });
			return;
		}
		isCreatingInvite.value = true;
		try {
			await createInvitation(inviteePhone.value);
			uni.showToast({ title: '邀请已发送', icon: 'success' });
			showInviteModal.value = false;
			inviteePhone.value = '';
		} catch (error) {
			console.error('Failed to create invitation:', error);
		} finally {
			isCreatingInvite.value = false;
		}
	};
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	.input-field,
	.picker {
		width: 100%;
		height: 44px;
		line-height: 44px;
		padding: 0 12px;
		border: 1px solid var(--border-color);
		border-radius: 10px;
		font-size: 14px;
		background-color: #f8f9fa;
		box-sizing: border-box;
	}
</style>