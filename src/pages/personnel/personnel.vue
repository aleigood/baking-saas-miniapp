<template>
	<view class="page-container">
		<view class="page-header">
			<view class="store-selector" @click="showStoreModal = true">{{ dataStore.currentTenant?.name }} &#9662;
			</view>
			<view class="user-avatar" @click="showUserMenu = true">{{
        userStore.userInfo?.name[0] || '管'
      }}</view>
		</view>
		<view class="page-content">
			<view class="loading-spinner" v-if="isLoading">
				<text>加载中...</text>
			</view>
			<template v-else>
				<!-- 列表页 -->
				<view v-if="!selectedMember">
					<view v-for="member in dataStore.members" :key="member.id" class="list-item"
						@click="selectMember(member)">
						<view class="main-info">
							<view class="name">{{ member.name }}</view>
							<view class="desc">加入于: {{ member.joinDate }}</view>
						</view>
						<view class="side-info">
							<view class="value">{{ member.role }}</view>
						</view>
					</view>
				</view>

				<!-- 详情页 -->
				<view v-else>
					<view class="detail-page">
						<view class="detail-header">
							<view class="back-btn" @click="selectedMember = null">&#10094;</view>
							<h2 class="detail-title">{{ selectedMember.name }}</h2>
						</view>
						<view class="card">
							<view class="card-title">人员信息</view>
							<FormItem label="姓名">
								<input class="input-field" type="text" :value="selectedMember.name" readonly />
							</FormItem>
							<FormItem label="加入日期">
								<input class="input-field" type="text" :value="selectedMember.joinDate" readonly />
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
								:disabled="!canRemoveMember || isSubmitting" :loading="isSubmitting">
								删除员工
							</button>
						</view>
					</view>
				</view>
			</template>
		</view>

		<view v-if="!selectedMember && canInvite" class="fab" @click="handleInvite">+</view>

		<AppModal v-model:visible="showStoreModal" title="选择门店">
			<view v-for="tenant in dataStore.tenants" :key="tenant.id" class="list-item"
				@click="handleSelectTenant(tenant.id)">{{ tenant.name }}</view>
		</AppModal>

		<AppModal v-model:visible="showUserMenu">
			<view class="list-item" style="border: none; padding: 10px 15px" @click="userStore.logout()">退出登录
			</view>
		</AppModal>

		<AppModal v-model:visible="showInviteModal" title="邀请新成员">
			<view v-if="isCreatingInvite">
				<text>正在生成邀请码...</text>
			</view>
			<view v-else-if="invitation">
				<FormItem label="邀请码 (24小时内有效)">
					<input class="input-field" type="text" :value="invitation.invitationCode" disabled />
				</FormItem>
				<button class="btn-save" @click="copyInviteCode">复制邀请码</button>
			</view>
		</AppModal>
	</view>
</template>

<script setup lang="ts">
	import { ref, computed, watch } from 'vue';
	import { onShow } from '@dcloudio/uni-app';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import type { Member, InvitationResponse } from '@/types/api';
	import { updateMemberRole, removeMember } from '@/api/members';
	import { createInvitation } from '@/api/invitations';
	import AppModal from '@/components/AppModal.vue';
	import FormItem from '@/components/FormItem.vue';

	const userStore = useUserStore();
	const dataStore = useDataStore();

	const selectedMember = ref<Member | null>(null);
	const editableMemberRole = ref<Member['role']>('BAKER');
	const isSubmitting = ref(false);
	const showStoreModal = ref(false);
	const showUserMenu = ref(false);
	const showInviteModal = ref(false);
	const isCreatingInvite = ref(false);
	const invitation = ref<InvitationResponse | null>(null);
	const isLoading = ref(false);

	onShow(async () => {
		if (!dataStore.dataLoaded.members) {
			isLoading.value = true;
			await dataStore.fetchMembersData();
			isLoading.value = false;
		}
	});

	const currentUserRole = computed(
		() => dataStore.members.find((m) => m.id === userStore.userInfo?.id)?.role,
	);

	const canInvite = computed(() => {
		return currentUserRole.value === 'OWNER' || currentUserRole.value === 'MANAGER';
	});

	const canEditRole = computed(() => {
		if (
			!currentUserRole.value ||
			!selectedMember.value ||
			selectedMember.value.id === userStore.userInfo?.id
		) {
			return false;
		}
		if (currentUserRole.value === 'OWNER') {
			return true;
		}
		if (currentUserRole.value === 'MANAGER') {
			return selectedMember.value.role === 'BAKER';
		}
		return false;
	});

	const canRemoveMember = computed(() => {
		if (
			!currentUserRole.value ||
			!selectedMember.value ||
			selectedMember.value.id === userStore.userInfo?.id
		) {
			return false;
		}
		if (currentUserRole.value === 'OWNER') {
			return true;
		}
		if (currentUserRole.value === 'MANAGER') {
			return selectedMember.value.role === 'BAKER';
		}
		return false;
	});

	const availableRoles = computed(() => {
		if (currentUserRole.value === 'OWNER') {
			return ['OWNER', 'MANAGER', 'BAKER'];
		}
		if (currentUserRole.value === 'MANAGER') {
			return ['BAKER'];
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
			await updateMemberRole(selectedMember.value.id, editableMemberRole.value);
			uni.showToast({ title: '角色更新成功', icon: 'success' });
			selectedMember.value = null;
			await dataStore.fetchMembersData();
		} catch (error : any) {
			console.error('Failed to update role:', error);
			uni.showToast({
				title: error.data?.message || '操作失败，请重试',
				icon: 'none',
			});
		} finally {
			isSubmitting.value = false;
		}
	};

	const handleRemoveMember = () => {
		if (!selectedMember.value || !canRemoveMember.value) return;

		uni.showModal({
			title: '确认删除',
			content: `确定要删除员工 "${selectedMember.value.name}" 吗？此操作不可撤销。`,
			success: async (res) => {
				if (res.confirm) {
					isSubmitting.value = true;
					try {
						await removeMember(selectedMember.value!.id);
						uni.showToast({ title: '删除成功', icon: 'success' });
						selectedMember.value = null;
						await dataStore.fetchMembersData();
					} catch (error : any) {
						console.error('Failed to remove member:', error);
						uni.showToast({
							title: error.data?.message || '删除失败，请重试',
							icon: 'none',
						});
					} finally {
						isSubmitting.value = false;
					}
				}
			},
		});
	};

	const handleSelectTenant = async (tenantId : string) => {
		isLoading.value = true;
		await dataStore.selectTenant(tenantId);
		showStoreModal.value = false;
		await dataStore.fetchMembersData();
		isLoading.value = false;
	};

	const handleInvite = async () => {
		showInviteModal.value = true;
		isCreatingInvite.value = true;
		invitation.value = null;
		try {
			const res = await createInvitation();
			invitation.value = res;
		} catch (error) {
			console.error('Failed to create invitation:', error);
			uni.showToast({ title: '生成邀请码失败', icon: 'none' });
			showInviteModal.value = false;
		} finally {
			isCreatingInvite.value = false;
		}
	};

	const copyInviteCode = () => {
		if (!invitation.value) return;
		uni.setClipboardData({
			data: invitation.value.invitationCode,
			success: () => {
				uni.showToast({ title: '邀请码已复制', icon: 'success' });
				showInviteModal.value = false;
			},
		});
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
</style>