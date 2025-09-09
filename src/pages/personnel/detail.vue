<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader :title="selectedMember?.name || selectedMember?.phone || '加载中...'" />
		<DetailPageLayout>
			<view class="page-content" v-if="!isLoading && selectedMember">
				<view class="card">
					<view class="card-title">人员信息</view>
					<FormItem label="姓名">
						<input class="input-field is-disabled" type="text" :value="selectedMember.name || '未设置'"
							readonly />
					</FormItem>
					<FormItem label="手机号">
						<input class="input-field is-disabled" type="text" :value="selectedMember.phone" readonly />
					</FormItem>
					<FormItem label="加入日期">
						<input class="input-field is-disabled" type="text"
							:value="formatChineseDate(selectedMember.joinDate)" readonly />
					</FormItem>
					<FormItem label="角色">
						<picker mode="selector" :range="availableRolesDisplay" @change="onRoleChange"
							:disabled="!canEditRole">
							<view class="picker" :class="{ disabled: !canEditRole }">{{
                    editableMemberRoleDisplay
                  }}
								<view class="arrow-down"></view>
							</view>
						</picker>
					</FormItem>
					<AppButton type="primary" full-width @click="handleUpdateMemberRole"
						:disabled="!canEditRole || isSubmitting" :loading="isSubmitting">
						{{ isSubmitting ? '' : '保存修改' }}
					</AppButton>
					<AppButton type="danger" full-width @click="handleRemoveMember"
						:disabled="!canRemoveMember || isSubmitting">
						移除员工
					</AppButton>
				</view>
			</view>
			<view class="loading-spinner" v-else>
				<text>加载中...</text>
			</view>
		</DetailPageLayout>
	</view>
</template>

<script setup lang="ts">
	import { ref, computed } from 'vue';
	import { onLoad, onShow } from '@dcloudio/uni-app'; // [核心改造] 导入 onShow
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import { useToastStore } from '@/store/toast';
	import type { Member, Role } from '@/types/api';
	import { updateMember, removeMember } from '@/api/members';
	import FormItem from '@/components/FormItem.vue';
	import AppButton from '@/components/AppButton.vue';
	import DetailHeader from '@/components/DetailHeader.vue';
	import DetailPageLayout from '@/components/DetailPageLayout.vue';
	import { formatChineseDate } from '@/utils/format';

	defineOptions({
		inheritAttrs: false
	});

	const userStore = useUserStore();
	const dataStore = useDataStore();
	const toastStore = useToastStore();

	const isLoading = ref(true);
	const isSubmitting = ref(false);
	const selectedMember = ref<Member | null>(null);
	const editableMemberRole = ref<Role>('MEMBER');
	// [核心改造] 新增 memberId ref
	const memberId = ref<string | null>(null);

	// [核心改造] 将 onLoad 的逻辑提取到一个函数中
	const loadMemberData = () => {
		isLoading.value = true;
		if (memberId.value) {
			if (memberId.value === userStore.userInfo?.id) {
				const currentUserTenantInfo = userStore.userInfo.tenants.find(t => t.tenant.id === dataStore.currentTenantId);
				if (currentUserTenantInfo) {
					selectedMember.value = {
						id: userStore.userInfo.id,
						name: userStore.userInfo.name || '',
						phone: userStore.userInfo.phone,
						role: currentUserTenantInfo.role,
						status: 'ACTIVE',
						joinDate: userStore.userInfo.createdAt,
					};
					editableMemberRole.value = selectedMember.value.role;
				}
			} else {
				const memberFromStore = dataStore.members.find(m => m.id === memberId.value);
				if (memberFromStore) {
					selectedMember.value = JSON.parse(JSON.stringify(memberFromStore));
					editableMemberRole.value = selectedMember.value.role;
				}
			}
		}
		isLoading.value = false;
	};


	onLoad(async (options) => {
		memberId.value = options?.memberId || null;
		// [核心改造] 确保数据已加载
		if (!dataStore.dataLoaded.members) {
			await dataStore.fetchMembersData();
		}
		loadMemberData();
	});

	// [核心改造] 新增 onShow，用于在数据变脏时刷新
	onShow(() => {
		// 只有在非首次加载时才检查，避免重复加载
		if (!isLoading.value) {
			loadMemberData();
		}
	});

	const roleMap : Record<Role, string> = {
		OWNER: '店主',
		ADMIN: '管理员',
		MEMBER: '员工',
		SUPER_ADMIN: '超级管理员'
	};

	const getRoleName = (role : Role) => {
		return roleMap[role] || role;
	};

	const editableMemberRoleDisplay = computed(() => getRoleName(editableMemberRole.value));

	const currentUserRoleInTenant = computed(
		() => userStore.userInfo?.tenants.find(t => t.tenant.id === dataStore.currentTenantId)?.role
	);

	const canEditRole = computed(() => {
		if (!currentUserRoleInTenant.value ||
			!selectedMember.value ||
			selectedMember.value.id === userStore.userInfo?.id
		) {
			return false;
		}
		if (currentUserRoleInTenant.value === 'OWNER') {
			return selectedMember.value.role !== 'OWNER';
		}
		if (currentUserRoleInTenant.value === 'ADMIN') {
			return selectedMember.value.role === 'MEMBER';
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
		return currentUserRoleInTenant.value === 'OWNER' && selectedMember.value.role !== 'OWNER';
	});

	const availableRoles = computed(() => {
		if (currentUserRoleInTenant.value === 'OWNER') {
			return ['ADMIN', 'MEMBER'];
		}
		return [];
	});

	const availableRolesDisplay = computed(() => {
		return availableRoles.value.map(role => getRoleName(role as Role));
	});

	const onRoleChange = (e : any) => {
		editableMemberRole.value = availableRoles.value[e.detail.value] as Role;
	};

	const handleUpdateMemberRole = async () => {
		if (!selectedMember.value || !canEditRole.value) return;

		isSubmitting.value = true;
		try {
			await updateMember(selectedMember.value.id, { role: editableMemberRole.value });
			toastStore.show({ message: '角色更新成功', type: 'success' });
			dataStore.markMembersAsStale();
			uni.navigateBack();
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
			content: `确定要从本店铺移除 "${selectedMember.value!.name || selectedMember.value!.phone}" 吗？`,
			success: async (res) => {
				if (res.confirm) {
					isSubmitting.value = true;
					try {
						await removeMember(selectedMember.value!.id);
						toastStore.show({ message: '移除成功', type: 'success' });
						dataStore.markMembersAsStale();
						uni.navigateBack();
					} catch (error : any) {
						console.error('Failed to remove member:', error);
					} finally {
						isSubmitting.value = false;
					}
				}
			},
		});
	};
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';
	@include form-control-styles;

	.page-wrapper {
		display: flex;
		flex-direction: column;
		height: 100vh;
	}

	.picker.disabled {
		background-color: #e9ecef;
		color: #6c757d;
	}
</style>