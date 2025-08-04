<template>
	<view class="page-container">
		<view class="page-header">
			<view class="store-selector" @click="showStoreModal = true">{{ dataStore.currentTenant?.name }} &#9662;
			</view>
			<view class="user-avatar" @click="showUserMenu = true">{{
        userStore.userInfo?.phone[0] || '管'
      }}</view>
		</view>
		<view class="page-content">
			<view class="loading-spinner" v-if="isLoading">
				<text>加载中...</text>
			</view>
			<template v-else>
				<view v-if="!selectedMember">
					<view v-for="member in dataStore.members" :key="member.id" class="list-item"
						@click="selectMember(member)">
						<view class="main-info">
							<view class="name">{{ member.phone }}</view>
							<view class="desc">加入于: {{ new Date(member.joinDate).toLocaleDateString() }}</view>
						</view>
						<view class="side-info">
							<view class="value">{{ member.role }}</view>
						</view>
					</view>
				</view>

				<view v-else>
					<view class="detail-page">
						<view class="detail-header">
							<view class="back-btn" @click="selectedMember = null">&#10094;</view>
							<h2 class="detail-title">{{ selectedMember.phone }}</h2>
						</view>
						<view class="card">
							<view class="card-title">人员信息</view>
							<FormItem label="手机号">
								<input class="input-field" type="text" :value="selectedMember.phone" readonly />
							</FormItem>
							<FormItem label="加入日期">
								<input class="input-field" type="text"
									:value="new Date(selectedMember.joinDate).toLocaleDateString()" readonly />
							</FormItem>
							<FormItem label="角色">
								<picker mode="selector" :range="availableRoles" @change="onRoleChange"
									:disabled="!canEditRole">
									<view class="picker" :class="{ disabled: !canEditRole }">{{
                    editableMemberRole
                  }}</view>
								</picker>
							</FormItem>
							<button class="btn-save" @click="handleUpdateMemberRole"
								:disabled="!canEditRole || isSubmitting" :loading="isSubmitting">
								{{ isSubmitting ? '保存中...' : '保存修改' }}
							</button>
							<button class="btn-danger" @click="handleRemoveMember"
								:disabled="!canRemoveMember || isSubmitting">
								移除员工
							</button>
						</view>
					</view>
				</view>
			</template>
		</view>

		<view v-if="!selectedMember && canInvite" class="fab" @click="showInviteModal = true">+</view>

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
				<button class="btn-cancel" @click="showInviteModal = false">
					取消
				</button>
				<button class="btn-confirm" @click="handleInvite" :disabled="isCreatingInvite"
					:loading="isCreatingInvite">
					{{ isCreatingInvite ? '发送中...' : '确认邀请' }}
				</button>
			</view>
		</AppModal>
	</view>
</template>

<script setup lang="ts">
	import { ref, computed, watch } from 'vue';
	import { onShow } from '@dcloudio/uni-app';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import type { Member, Role } from '@/types/api';
	import { updateMember, removeMember } from '@/api/members'; // 更新 API 调用
	import { createInvitation } from '@/api/invitations';
	import AppModal from '@/components/AppModal.vue';
	import FormItem from '@/components/FormItem.vue';

	const userStore = useUserStore();
	const dataStore = useDataStore();

	const selectedMember = ref<Member | null>(null);
	const editableMemberRole = ref<Role>('MEMBER');
	const isSubmitting = ref(false);
	const showStoreModal = ref(false);
	const showUserMenu = ref(false);
	const showInviteModal = ref(false);
	const isCreatingInvite = ref(false);
	const inviteePhone = ref(''); // 新增：被邀请人手机号
	const isLoading = ref(false);

	onShow(async () => {
		if (!dataStore.dataLoaded.members) {
			isLoading.value = true;
			await dataStore.fetchMembersData();
			isLoading.value = false;
		}
	});

	const currentUserRoleInTenant = computed(
		() => userStore.userInfo?.tenants.find(t => t.tenant.id === dataStore.currentTenantId)?.role
	);


	const canInvite = computed(() => {
		return currentUserRoleInTenant.value === 'OWNER' || currentUserRoleInTenant.value === 'ADMIN';
	});

	const canEditRole = computed(() => {
		if (!currentUserRoleInTenant.value ||
			!selectedMember.value ||
			selectedMember.value.id === userStore.userInfo?.id
		) {
			return false;
		}
		if (currentUserRoleInTenant.value === 'OWNER') {
			return selectedMember.value.role !== 'OWNER'; // 所有者不能修改自己
		}
		if (currentUserRoleInTenant.value === 'ADMIN') {
			return selectedMember.value.role === 'MEMBER'; // 管理员只能修改成员
		}
		return false;
	});

	const canRemoveMember = computed(() => {
		if (!currentUserRoleInTenant.value ||
			!selectedMember.value ||
			selectedMember.value.id === userStore.userInfo?.id
		) {
			return false;
		}
		// 只有所有者能移除成员（非自己）
		return currentUserRoleInTenant.value === 'OWNER' && selectedMember.value.role !== 'OWNER';
	});

	const availableRoles = computed(() => {
		if (currentUserRoleInTenant.value === 'OWNER') {
			return ['ADMIN', 'MEMBER']; // 所有者可以指派管理员和成员
		}
		return [];
	});

	const selectMember = (member : Member) => {
		selectedMember.value = { ...member };
		editableMemberRole.value = member.role;
	};

	const onRoleChange = (e : any) => {
		editableMemberRole.value = availableRoles.value[e.detail.value];
	};

	const handleUpdateMemberRole = async () => {
		if (!selectedMember.value || !canEditRole.value) return;

		isSubmitting.value = true;
		try {
			await updateMember(selectedMember.value.id, { role: editableMemberRole.value });
			uni.showToast({ title: '角色更新成功', icon: 'success' });
			selectedMember.value = null;
			await dataStore.fetchMembersData(); // 刷新成员列表
		} catch (error : any) {
			console.error('Failed to update role:', error);
		} finally {
			isSubmitting.value = false;
		}
	};

	const handleRemoveMember = () => {
		if (!selectedMember.value || !canRemoveMember.value) return;

		uni.showModal({
			title: '确认移除',
			content: `确定要从本店铺移除 "${selectedMember.value!.phone}" 吗？`,
			success: async (res) => {
				if (res.confirm) {
					isSubmitting.value = true;
					try {
						await removeMember(selectedMember.value!.id);
						uni.showToast({ title: '移除成功', icon: 'success' });
						selectedMember.value = null;
						await dataStore.fetchMembersData();
					} catch (error : any) {
						console.error('Failed to remove member:', error);
					} finally {
						isSubmitting.value = false;
					}
				}
			},
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

	watch(
		() => dataStore.currentTenantId,
		() => {
			selectedMember.value = null;
		},
	);
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

	.picker.disabled {
		background-color: #e9ecef;
		color: #6c757d;
	}

	.btn-save {
		width: 100%;
		padding: 14px;
		border: none;
		border-radius: 12px;
		background-color: var(--primary-color);
		color: white;
		font-size: 16px;
		margin-top: 20px;
		font-weight: 500;
	}

	.btn-danger {
		width: 100%;
		padding: 14px;
		border: none;
		border-radius: 12px;
		background-color: var(--danger-color);
		color: white;
		font-size: 16px;
		margin-top: 15px;
		font-weight: 500;
	}

	.modal-actions {
		display: flex;
		gap: 10px;
		margin-top: 30px;
	}

	.modal-actions button {
		flex: 1;
		padding: 12px;
		border: none;
		border-radius: 12px;
		font-size: 16px;
		font-weight: 500;
	}

	.btn-cancel {
		background-color: #f3e9e3;
		color: var(--text-secondary);
	}

	.btn-confirm {
		background-color: var(--primary-color);
		color: white;
	}
</style>