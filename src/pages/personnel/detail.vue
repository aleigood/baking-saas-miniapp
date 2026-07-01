<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader :title="selectedMember?.displayName || '加载中...'" />
		<DetailPageLayout>
			<view class="page-content" v-if="!isLoading && selectedMember">
				<view class="member-profile-header">
					<UserAvatar :user-id="selectedMember.id" :avatar-url="selectedMember.avatarUrl" :size="72" class="member-large-avatar" />
					<view class="member-header-info">
						<text class="member-header-name">{{ selectedMember.displayName }}</text>
						<text class="role-tag" :class="selectedMember.role.toLowerCase()">{{ getRoleName(selectedMember.role) }}</text>
					</view>
				</view>

				<view class="card info-card">
					<view class="info-section-title">基本信息</view>
					
					<view class="info-row">
						<text class="info-label">微信昵称</text>
						<text class="info-value">{{ selectedMember.wechatNickname || '未设置昵称' }}</text>
					</view>
					<view class="info-row">
						<text class="info-label">加入时间</text>
						<text class="info-value">{{ formatChineseDate(selectedMember.joinDate) }}</text>
					</view>
				</view>

				<view class="card action-card" v-if="canEditRole || canRemoveMember">
					<view class="info-section-title">角色与管理</view>
					
					<view class="form-item-styled" v-if="canEditRole">
						<text class="form-label-styled">修改角色</text>
						<picker mode="selector" :range="availableRolesDisplay" @change="onRoleChange">
							<view class="picker-styled">
								<text class="picker-val">{{ editableMemberRoleDisplay }}</text>
								<view class="arrow-down"></view>
							</view>
						</picker>
					</view>

					<view class="button-group">
						<AppButton v-if="canEditRole" type="primary" full-width @click="handleUpdateMemberRole" :disabled="isSubmitting" :loading="isSubmitting">
							保存修改
						</AppButton>
						<AppButton v-if="canRemoveMember" type="danger" full-width @click="handleRemoveMember" :disabled="isSubmitting" class="remove-btn">
							移除员工
						</AppButton>
					</view>
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
import { onLoad, onShow } from '@dcloudio/uni-app';
import { useUserStore } from '@/store/user';
import { useDataStore } from '@/store/data';
import { useToastStore } from '@/store/toast';
import { useUiStore } from '@/store/ui';
import type { Member, TenantRole } from '@/types/api';
import { getMember, updateMember, removeMember } from '@/api/members'; // [核心修正] 导入 getMember
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
const uiStore = useUiStore();

const isLoading = ref(true);
const isSubmitting = ref(false);
const selectedMember = ref<Member | null>(null);
const editableMemberRole = ref<TenantRole>('MEMBER');
const memberId = ref<string | null>(null);

// [核心重构] 封装数据加载逻辑
const loadMemberData = async () => {
	if (!memberId.value) return;

	// 优先尝试从 Pinia store 中获取数据
	let member = dataStore.members.find((m) => m.id === memberId.value);

	if (member) {
		selectedMember.value = JSON.parse(JSON.stringify(member));
	} else {
		// 如果 store 中没有，则直接通过 API 请求
		try {
			const fetchedMember = await getMember(memberId.value);
			selectedMember.value = fetchedMember;
			// 获取到数据后，可以标记成员列表为过时，以便下次返回时刷新
			dataStore.markMembersAsStale();
		} catch (error) {
			console.error('获取成员信息失败:', error);
			toastStore.show({ message: '无法加载成员信息', type: 'error' });
			uni.navigateBack();
			return;
		}
	}

	if (selectedMember.value) {
		editableMemberRole.value = selectedMember.value.role;
	}
};

onLoad(async (options) => {
	memberId.value = options?.memberId || null;
	isLoading.value = true;
	// 确保基础数据已加载，以便进行权限判断
	if (!dataStore.dataLoaded.members) {
		await dataStore.fetchMembersData();
	}
	await loadMemberData(); // 执行数据加载
	isLoading.value = false;
});

// [核心修正] 修复 onShow 逻辑，在数据过时的情况下重新获取
onShow(async () => {
	if (dataStore.dataStale.members) {
		isLoading.value = true;
		await dataStore.fetchMembersData(); // 先刷新列表
		await loadMemberData(); // 再重新加载当前成员数据
		isLoading.value = false;
	}
});

const roleMap: Record<TenantRole, string> = {
	OWNER: '店主',
	ADMIN: '管理员',
	MEMBER: '员工'
};

const getRoleName = (role: TenantRole) => {
	return roleMap[role] || role;
};

const editableMemberRoleDisplay = computed(() => getRoleName(editableMemberRole.value));

const currentUserRoleInTenant = computed(() => userStore.userInfo?.tenants.find((t) => t.tenant.id === dataStore.currentTenantId)?.role);

const canEditRole = computed(() => {
	if (!currentUserRoleInTenant.value || !selectedMember.value || selectedMember.value.id === userStore.userInfo?.id) {
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
	if (!currentUserRoleInTenant.value || !selectedMember.value || selectedMember.value.id === userStore.userInfo?.id) {
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
	return availableRoles.value.map((role) => getRoleName(role as TenantRole));
});

const onRoleChange = (e: any) => {
	editableMemberRole.value = availableRoles.value[e.detail.value] as TenantRole;
};

const handleUpdateMemberRole = async () => {
	if (!selectedMember.value || !canEditRole.value) return;

	isSubmitting.value = true;
	try {
		await updateMember(selectedMember.value.id, { role: editableMemberRole.value });
		// [核心改造] 将Toast消息定向发送到人员列表页
		uiStore.setNextPageToast({ message: '角色更新成功', type: 'success' }, '/pages/personnel/list');
		dataStore.markMembersAsStale();
		uni.navigateBack();
	} catch (error: any) {
		console.error('Failed to update role:', error);
	} finally {
		isSubmitting.value = false;
	}
};

const handleRemoveMember = () => {
	if (!selectedMember.value || !canRemoveMember.value) return;

	uni.showModal({
		title: '确认移除',
		content: `确定要从本店铺移除 "${selectedMember.value!.displayName}" 吗？`,
		success: async (res) => {
			if (res.confirm) {
				isSubmitting.value = true;
				try {
					await removeMember(selectedMember.value!.id);
					// [核心改造] 将Toast消息定向发送到人员列表页
					uiStore.setNextPageToast({ message: '移除成功', type: 'success' }, '/pages/personnel/list');
					dataStore.markMembersAsStale();
					uni.navigateBack();
				} catch (error: any) {
					console.error('Failed to remove member:', error);
				} finally {
					isSubmitting.value = false;
				}
			}
		}
	});
};
</script>

<style scoped lang="scss">
.page-wrapper {
	display: flex;
	flex-direction: column;
	min-height: 100vh;
	background-color: #fdf8f2;
}

.page-content {
	padding: 20px 16px;
}

.member-profile-header {
	display: flex;
	align-items: center;
	gap: 16px;
	background: #fff;
	border-radius: 20px;
	padding: 20px;
	border: 1px solid rgba(140, 90, 59, 0.08);
	box-shadow: 0 4px 16px rgba(89, 61, 42, 0.02);
	margin-bottom: 16px;
}

.member-large-avatar {
	box-shadow: 0 4px 10px rgba(140, 90, 59, 0.15);
	border-radius: 50%;
}

.member-header-info {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 6px;
}

.member-header-name {
	font-size: 20px;
	font-weight: 700;
	color: var(--text-primary);
}

.role-tag {
	display: inline-block;
	font-size: 11px;
	font-weight: 600;
	padding: 4px 10px;
	border-radius: 8px;
}
.role-tag.owner {
	background-color: #fef3c7;
	color: #d97706;
}
.role-tag.admin {
	background-color: #e0f2fe;
	color: #0284c7;
}
.role-tag.member {
	background-color: #dcfce7;
	color: #16a34a;
}

.card {
	background: #fff;
	border-radius: 20px;
	border: 1px solid rgba(140, 90, 59, 0.08);
	box-shadow: 0 4px 16px rgba(89, 61, 42, 0.02);
	padding: 20px;
	margin-bottom: 16px;
}

.info-section-title {
	font-size: 15px;
	font-weight: 700;
	color: var(--text-primary);
	margin-bottom: 16px;
	padding-bottom: 8px;
	border-bottom: 1px solid rgba(140, 90, 59, 0.08);
}

.info-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 12px 0;
}

.info-row:not(:last-child) {
	border-bottom: 1px dashed rgba(140, 90, 59, 0.05);
}

.info-label {
	font-size: 14px;
	color: var(--text-secondary);
}

.info-value {
	font-size: 14px;
	font-weight: 500;
	color: var(--text-primary);
}

.form-item-styled {
	display: flex;
	flex-direction: column;
	gap: 6px;
	margin-bottom: 16px;
}

.form-label-styled {
	font-size: 13px;
	font-weight: 600;
	color: var(--text-secondary);
}

.picker-styled {
	display: flex;
	justify-content: space-between;
	align-items: center;
	height: 48px;
	background: #fff;
	border: 1px solid var(--border-color);
	border-radius: 12px;
	padding: 0 16px;
	box-sizing: border-box;
}

.picker-val {
	font-size: 15px;
	font-weight: 500;
	color: var(--text-primary);
}

.arrow-down {
	width: 0;
	height: 0;
	border-left: 5px solid transparent;
	border-right: 5px solid transparent;
	border-top: 5px solid var(--text-secondary);
}

.button-group {
	display: flex;
	flex-direction: column;
	gap: 12px;
	margin-top: 20px;
}

.remove-btn {
	margin-top: 4px;
}
</style>
