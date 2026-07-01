<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader title="人员管理" />
		<DetailPageLayout @scroll="handleScroll">
			<view class="page-content no-horizontal-padding page-content-with-fab">
				<view v-if="isOwner" :key="'filter-tabs-container'" class="filter-container">
					<FilterTabs v-model="activeTenantFilter" :tabs="filterTabsData" />
				</view>
				<view v-if="isOwner && pendingApplications.length" class="applications-card">
					<view class="applications-title">待确认申请 <text>{{ pendingApplications.length }}</text></view>
					<view v-for="item in pendingApplications" :key="item.id" class="application-row">
						<UserAvatar :user-id="item.applicant.id" :avatar-url="item.applicant.avatarUrl" :size="40" />
						<view class="application-main"><text>{{ item.displayName }}<text v-if="item.wechatNickname"> · {{ item.wechatNickname }}</text></text><text>{{ getRoleName(item.joinLink.role) }}{{ item.message ? ` · ${item.message}` : '' }}</text></view>
						<view class="application-actions"><text @click="rejectApplication(item.id)">拒绝</text><text class="approve" @click="approveApplication(item.id)">同意</text></view>
					</view>
				</view>

				<template v-if="isOwner && activeTenantFilter === 'all' && membersToDisplay.length > 0" :key="'members-owner-all'">
					<view v-for="group in groupedMembers" :key="group.tenantId">
						<view class="tenant-group-header">{{ group.tenantName }}</view>
						<ListItem
							v-for="(member, index) in group.members"
							:key="member.id"
							@click="navigateToDetail(member.id)"
							:bleed="true"
							:divider="index < group.members.length - 1"
						>
							<view class="member-details">
								<UserAvatar class="member-avatar" :user-id="member.id" :avatar-url="member.avatarUrl" :size="42" />
								<view class="main-info">
									<view class="name">{{ member.displayName }}</view>
									<view class="desc">加入于 {{ formatChineseDate(member.joinDate) }}</view>
								</view>
							</view>
							<view class="side-info">
								<text class="role-tag" :class="member.role.toLowerCase()">{{ getRoleName(member.role) }}</text>
							</view>
						</ListItem>
					</view>
				</template>
				<template v-else-if="membersToDisplay.length > 0" :key="'members-filtered'">
					<ListItem
						v-for="(member, index) in membersToDisplay"
						:key="member.id"
						@click="navigateToDetail(member.id)"
						:bleed="true"
						:divider="index < membersToDisplay.length - 1"
					>
						<view class="member-details">
							<UserAvatar class="member-avatar" :user-id="member.id" :avatar-url="member.avatarUrl" :size="42" />
							<view class="main-info">
								<view class="name">{{ member.displayName }}</view>
								<view class="desc">加入于 {{ formatChineseDate(member.joinDate) }}</view>
							</view>
						</view>
						<view class="side-info">
							<text class="role-tag" :class="member.role.toLowerCase()">{{ getRoleName(member.role) }}</text>
						</view>
					</ListItem>
				</template>
				<view v-else :key="'members-empty'" class="empty-state">
					<text>暂无人员信息</text>
				</view>
			</view>
		</DetailPageLayout>

		<ExpandingFab v-if="canManagePersonnel" @click="openCreateModal" :no-tab-bar="true" :visible="isFabVisible" />

		<AppModal v-model:visible="showCreateModal" :key="'create-member-modal'" title="邀请成员">
			<FormItem label="员工角色">
				<picker mode="selector" :range="availableRolesForCreation" range-key="text" @change="onRoleChange">
					<view class="picker">
						{{ selectedRoleForCreationText }}
						<view class="arrow-down"></view>
					</view>
				</picker>
			</FormItem>
			<view v-if="sharePath" class="share-ready"><text>邀请卡片已准备好</text><text>有效期 7 天</text></view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showCreateModal = false">取消</AppButton>
				<button v-if="sharePath" class="share-button" open-type="share">发送邀请</button>
				<AppButton v-else type="primary" @click="handleCreateMember" :disabled="isSubmitting" :loading="isSubmitting">{{ isSubmitting ? '' : '生成邀请' }}</AppButton>
			</view>
		</AppModal>
	</view>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue';
import { onShareAppMessage, onShow } from '@dcloudio/uni-app';
import { useDataStore } from '@/store/data';
import { useUserStore } from '@/store/user';
import { useToastStore } from '@/store/toast';
import { useUiStore } from '@/store/ui';
import { approveMembershipApplication, createJoinLink, getMembershipApplications, getMembers, getAllMembersByOwner, rejectMembershipApplication, type MembershipApplication } from '@/api/members';
import DetailHeader from '@/components/DetailHeader.vue';
import DetailPageLayout from '@/components/DetailPageLayout.vue';
import ListItem from '@/components/ListItem.vue';
import ExpandingFab from '@/components/ExpandingFab.vue';
import AppModal from '@/components/AppModal.vue';
import FormItem from '@/components/FormItem.vue';
import AppButton from '@/components/AppButton.vue';
import FilterTabs from '@/components/FilterTabs.vue';
import UserAvatar from '@/components/UserAvatar.vue';
// [核心修改] 导入 TenantWithMembers 类型
import type { Member, Tenant, TenantRole, TenantWithMembers } from '@/types/api';
import { formatChineseDate } from '@/utils/format';

defineOptions({
	inheritAttrs: false
});

const dataStore = useDataStore();
const userStore = useUserStore();
const toastStore = useToastStore();
const uiStore = useUiStore();

const isSubmitting = ref(false);
const isNavigating = ref(false);
const showCreateModal = ref(false);

const isFabVisible = ref(true);
const lastScrollTop = ref(0);
const scrollThreshold = 5;

const createForm = reactive<{ role: TenantRole }>({ role: 'MEMBER' });
const sharePath = ref('');
const pendingApplications = ref<MembershipApplication[]>([]);

// [核心重构] allOwnerMembersData 用于存储从后端一次性获取的完整数据
const allOwnerMembersData = ref<TenantWithMembers[]>([]);
const isLoadingMembers = ref(false);
const activeTenantFilter = ref<string>('all');

watch(activeTenantFilter, (newFilter, oldFilter) => {
	// [核心重构] 筛选逻辑现在在前端完成，不再需要重新请求数据
	// if (newFilter !== oldFilter) {
	// 	loadPersonnelData();
	// }
});

onShow(async () => {
	isNavigating.value = false;
	const toastMessage = uiStore.consumeNextPageToast('/pages/personnel/list');
	if (toastMessage) {
		toastStore.show(toastMessage);
	}

	if (isOwner.value) {
		activeTenantFilter.value = dataStore.currentTenantId;
	}

	await loadPersonnelData();
	if (isOwner.value) pendingApplications.value = (await getMembershipApplications()).filter((item) => item.status === 'PENDING');
});

const filterTabsData = computed(() => {
	// [核心修改] 直接从 allOwnerMembersData 生成 tabs，确保与数据源一致
	const tenantTabs = allOwnerMembersData.value.map((t) => ({
		key: t.tenantId,
		label: t.tenantName
	}));
	return [{ key: 'all', label: '全部' }, ...tenantTabs];
});

const loadPersonnelData = async () => {
	if (isOwner.value) {
		isLoadingMembers.value = true;
		try {
			// [核心重构] 一次性获取所有数据
			allOwnerMembersData.value = await getAllMembersByOwner();
		} catch (error) {
			console.error('获取人员列表失败:', error);
			toastStore.show({ message: '获取人员列表失败', type: 'error' });
			allOwnerMembersData.value = [];
		} finally {
			isLoadingMembers.value = false;
		}
	} else if (dataStore.dataStale.members || !dataStore.dataLoaded.members) {
		await dataStore.fetchMembersData();
	}
};

const handleScroll = (event?: any) => {
	if (!event || !event.detail) {
		return;
	}
	const scrollTop = event.detail.scrollTop;

	if (Math.abs(scrollTop - lastScrollTop.value) <= scrollThreshold) {
		return;
	}

	if (scrollTop > lastScrollTop.value && scrollTop > 50) {
		isFabVisible.value = false;
	} else {
		isFabVisible.value = true;
	}

	lastScrollTop.value = scrollTop < 0 ? 0 : scrollTop;
};

const currentUserRoleInTenant = computed(() => userStore.userInfo?.tenants.find((t) => t.tenant.id === dataStore.currentTenantId)?.role);

const isOwner = computed(() => currentUserRoleInTenant.value === 'OWNER');

const canManagePersonnel = computed(() => {
	return currentUserRoleInTenant.value === 'OWNER' || currentUserRoleInTenant.value === 'ADMIN';
});

// [核心重构] groupedMembers 用于在“全部”视图下进行分组展示
const groupedMembers = computed(() => {
	return allOwnerMembersData.value;
});

const membersToDisplay = computed(() => {
	if (isOwner.value) {
		if (activeTenantFilter.value === 'all') {
			// [核心重构] 将所有店铺的员工列表“扁平化”为一个数组
			// 使用 Map 来去重，防止同一个人在不同店铺出现时重复显示
			const memberMap = new Map<string, Member>();
			allOwnerMembersData.value.forEach((group) => {
				group.members.forEach((member) => {
					if (!memberMap.has(member.id)) {
						memberMap.set(member.id, member);
					}
				});
			});
			return Array.from(memberMap.values());
		} else {
			// [核心重构] 从已获取的数据中查找对应店铺的员工
			const tenantData = allOwnerMembersData.value.find((t) => t.tenantId === activeTenantFilter.value);
			return tenantData ? tenantData.members : [];
		}
	} else {
		return dataStore.members;
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

const availableRolesForCreation = computed(() => {
	if (isOwner.value) {
		return [
			{ text: '管理员', value: 'ADMIN' },
			{ text: '员工', value: 'MEMBER' }
		];
	}
	return [{ text: '员工', value: 'MEMBER' }];
});

const selectedRoleForCreationText = computed(() => {
	return getRoleName(createForm.role);
});

const onRoleChange = (e: any) => {
	const selectedIndex = e.detail.value;
	createForm.role = availableRolesForCreation.value[selectedIndex].value as TenantRole;
};

const navigateToDetail = (memberId: string) => {
	if (isNavigating.value) return;
	isNavigating.value = true;

	uni.navigateTo({
		url: `/pages/personnel/detail?memberId=${memberId}`
	});
};

const openCreateModal = () => {
	createForm.role = 'MEMBER';
	sharePath.value = '';
	showCreateModal.value = true;
};

const handleCreateMember = async () => {
	isSubmitting.value = true;
	try {
		const link = await createJoinLink(createForm.role);
		sharePath.value = `/pages/onboarding/join-application?token=${encodeURIComponent(link.token)}`;
	} catch (error: any) {
		console.error('创建成员失败:', error);
		if (error.statusCode !== 409) {
			toastStore.show({ message: '创建失败，请重试', type: 'error' });
		}
	} finally {
		isSubmitting.value = false;
	}
};

onShareAppMessage(() => ({ title: `邀请你加入${dataStore.currentTenant?.name || '我的店铺'}`, path: sharePath.value || '/pages/launch/launch' }));
const approveApplication = async (id: string) => { await approveMembershipApplication(id); pendingApplications.value = pendingApplications.value.filter((item) => item.id !== id); await loadPersonnelData(); toastStore.show({ message: '已同意加入', type: 'success' }); };
const rejectApplication = async (id: string) => { await rejectMembershipApplication(id); pendingApplications.value = pendingApplications.value.filter((item) => item.id !== id); };
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
@include list-item-content-style;
@include form-control-styles;
@include list-item-option-style;

.page-wrapper {
	display: flex;
	flex-direction: column;
	height: 100vh;
}

.filter-container {
	padding: 10px 15px;
	padding-bottom: 20px;
}

/* [核心新增] “全部”视图下，用于展示门店名称的标题样式 */
.tenant-group-header {
	padding: 10px 20px;
	background-color: #f8f4ef;
	color: var(--text-secondary);
	font-size: 14px;
	font-weight: 500;
	position: sticky;
	top: 0;
	z-index: 1;
}

.member-details {
	display: flex;
	align-items: center;
	flex: 1;
}

.member-avatar {
	margin-right: 15px;
}

.input-field {
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

.applications-card{margin:8px 14px 18px;padding:16px;background:#fff8f1;border:1px solid #f0dfd0;border-radius:18px}.applications-title{font-size:15px;font-weight:700;margin-bottom:10px}.applications-title text{font-size:11px;color:#fff;background:#b9794e;border-radius:20px;padding:2px 7px;margin-left:5px}.application-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid #f1e5da}.application-main{flex:1;min-width:0;display:flex;flex-direction:column}.application-main text:first-child{font-size:14px;font-weight:700}.application-main text:last-child{font-size:11px;color:#998577;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.application-actions{display:flex;gap:8px;font-size:12px;color:#987867}.application-actions text{padding:7px 9px}.application-actions .approve{color:#fff;background:#8c5a3b;border-radius:9px}.share-ready{display:flex;justify-content:space-between;padding:14px;margin:12px 0;background:#f6eee7;border-radius:12px;font-size:13px;color:#775743}.share-ready text:last-child{font-size:11px;color:#aa8d79}.share-button {
	display: flex;
	justify-content: center;
	align-items: center;
	width: 100%;
	min-height: 54px;
	box-sizing: border-box;
	border: none;
	border-radius: 15px;
	font-size: 16px;
	font-weight: 500;
	text-align: center;
	position: relative;
	overflow: hidden;
	transform: translateZ(0);
	background-image: linear-gradient(135deg, var(--accent-color) 0%, var(--primary-color) 100%);
	color: white;
	box-shadow: 0 4px 15px rgba(140, 90, 59, 0.2);
	margin: 0;
	padding: 10px 15px;
	line-height: normal;
	transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}
.share-button::after {
	border: none;
}
.share-button:active {
	transform: scale(0.97);
	box-shadow: 0 2px 8px rgba(140, 90, 59, 0.25);
}
.role-tag {
	display: inline-block;
	font-size: 11px;
	font-weight: 600;
	padding: 4px 10px;
	border-radius: 8px;
	text-align: center;
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
</style>
