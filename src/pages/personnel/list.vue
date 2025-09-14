<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader title="人员管理" />
		<DetailPageLayout @scroll="handleScroll">
			<view v-if="isOwner" class="shop-selector-container">
				<picker mode="selector" :range="tenantsForPicker" range-key="name" @change="onTenantChange">
					<view class="picker">
						<text>{{ selectedTenantName }}</text>
						<view class="arrow-down"></view>
					</view>
				</picker>
			</view>

			<view class="page-content no-horizontal-padding page-content-with-fab">
				<template v-if="membersToDisplay.length > 0">
					<ListItem
						v-for="(member, index) in membersToDisplay"
						:key="member.id"
						@click="navigateToDetail(member.id)"
						:bleed="true"
						:divider="index < membersToDisplay.length - 1"
					>
						<view class="member-details">
							<view class="member-avatar">
								{{ member.name?.[0] || '员' }}
							</view>
							<view class="main-info">
								<view class="name">{{ member.name || member.phone }}</view>
								<view class="desc">加入于: {{ formatChineseDate(member.joinDate) }}</view>
							</view>
						</view>
						<view class="side-info">
							<view class="value">{{ getRoleName(member.role) }}</view>
						</view>
					</ListItem>
				</template>
				<view v-else class="empty-state">
					<text>暂无人员信息</text>
				</view>
			</view>
		</DetailPageLayout>

		<ExpandingFab v-if="canManagePersonnel" @click="openInviteModal" :no-tab-bar="true" :visible="isFabVisible" />

		<AppModal v-model:visible="showInviteModal" title="邀请新成员">
			<FormItem label="被邀请人手机号">
				<input class="input-field" type="tel" v-model="inviteePhone" placeholder="请输入手机号" />
			</FormItem>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showInviteModal = false">取消</AppButton>
				<AppButton type="primary" @click="handleInvite" :disabled="isCreatingInvite" :loading="isCreatingInvite">
					{{ isCreatingInvite ? '' : '确认邀请' }}
				</AppButton>
			</view>
		</AppModal>
	</view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useDataStore } from '@/store/data';
import { useUserStore } from '@/store/user';
import { useToastStore } from '@/store/toast';
import { useUiStore } from '@/store/ui';
import { createInvitation } from '@/api/invitations';
import { getMembers } from '@/api/members'; // [核心修改] 导入 getMembers API
import DetailHeader from '@/components/DetailHeader.vue';
import DetailPageLayout from '@/components/DetailPageLayout.vue';
import ListItem from '@/components/ListItem.vue';
import ExpandingFab from '@/components/ExpandingFab.vue';
import AppModal from '@/components/AppModal.vue';
import FormItem from '@/components/FormItem.vue';
import AppButton from '@/components/AppButton.vue';
import type { Role, Member, Tenant } from '@/types/api'; // [核心修改] 导入 Member 和 Tenant 类型
import { formatChineseDate } from '@/utils/format';

defineOptions({
	inheritAttrs: false
});

const dataStore = useDataStore();
const userStore = useUserStore();
const toastStore = useToastStore();
const uiStore = useUiStore();

const isCreatingInvite = ref(false);
const inviteePhone = ref('');
const isNavigating = ref(false);
const showInviteModal = ref(false);

const isFabVisible = ref(true);
const lastScrollTop = ref(0);
const scrollThreshold = 5;

// [核心新增] 用于存储所有者选择的店铺ID和该店铺的成员列表
const selectedTenantIdForOwner = ref<string>('');
const ownerSelectedTenantMembers = ref<Member[]>([]);
const isLoadingMembers = ref(false);

onMounted(async () => {
	// 页面挂载时，如果用户是所有者，则默认选中当前登录的店铺
	if (isOwner.value) {
		selectedTenantIdForOwner.value = dataStore.currentTenantId;
	}
});

onShow(async () => {
	isNavigating.value = false;
	const toastMessage = uiStore.consumeNextPageToast('/pages/personnel/list');
	if (toastMessage) {
		toastStore.show(toastMessage);
	}

	// [核心修改] 更新数据获取逻辑
	if (isOwner.value) {
		// 如果是所有者，根据选择的店铺ID获取成员
		await fetchMembersForSelectedTenant();
	} else if (dataStore.dataStale.members || !dataStore.dataLoaded.members) {
		// 如果是管理员，则像以前一样获取当前店铺的成员
		await dataStore.fetchMembersData();
	}
});

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

// [核心新增] 判断当前用户是否为所有者
const isOwner = computed(() => currentUserRoleInTenant.value === 'OWNER');

const canManagePersonnel = computed(() => {
	return currentUserRoleInTenant.value === 'OWNER' || currentUserRoleInTenant.value === 'ADMIN';
});

// [核心新增] 根据角色决定显示哪个成员列表
const membersToDisplay = computed(() => {
	return isOwner.value ? ownerSelectedTenantMembers.value : dataStore.members;
});

// [核心新增] 为 picker 准备的店铺列表
const tenantsForPicker = computed(() => dataStore.tenants);

// [核心新增] 显示在 picker 中的当前选中店铺名称
const selectedTenantName = computed(() => {
	const tenant = dataStore.tenants.find((t) => t.id === selectedTenantIdForOwner.value);
	return tenant ? tenant.name : '选择店铺';
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

// [核心新增] 当所有者切换店铺选择时触发
const onTenantChange = async (e: any) => {
	const selectedIndex = e.detail.value;
	const selectedTenant = tenantsForPicker.value[selectedIndex];
	if (selectedTenant) {
		selectedTenantIdForOwner.value = selectedTenant.id;
		await fetchMembersForSelectedTenant();
	}
};

// [核心新增] 为所有者获取指定店铺成员列表的函数
const fetchMembersForSelectedTenant = async () => {
	if (!selectedTenantIdForOwner.value || isLoadingMembers.value) return;
	isLoadingMembers.value = true;
	try {
		ownerSelectedTenantMembers.value = await getMembers(selectedTenantIdForOwner.value);
	} catch (error) {
		console.error('获取指定店铺成员失败:', error);
		toastStore.show({ message: '获取成员列表失败', type: 'error' });
	} finally {
		isLoadingMembers.value = false;
	}
};

const navigateToDetail = (memberId: string) => {
	if (isNavigating.value) return;
	isNavigating.value = true;

	uni.navigateTo({
		url: `/pages/personnel/detail?memberId=${memberId}`
	});
};

const openInviteModal = () => {
	showInviteModal.value = true;
};

const handleInvite = async () => {
	if (!inviteePhone.value) {
		toastStore.show({ message: '请输入手机号', type: 'error' });
		return;
	}
	isCreatingInvite.value = true;
	try {
		// 提示：邀请功能默认是邀请到当前登录的店铺。
		// 如果需要所有者能邀请到指定店铺，后端 createInvitation 也需要接收 tenantId。
		await createInvitation(inviteePhone.value);
		toastStore.show({ message: '邀请已发送', type: 'success' });
		showInviteModal.value = false;
		inviteePhone.value = '';
		dataStore.markMembersAsStale();
	} catch (error) {
		console.error('Failed to create invitation:', error);
	} finally {
		isCreatingInvite.value = false;
	}
};
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
@include list-item-content-style;
@include form-control-styles; // [核心新增] 引入表单样式以美化 picker

.page-wrapper {
	display: flex;
	flex-direction: column;
	height: 100vh;
}

/* [核心新增] 店铺选择器样式 */
.shop-selector-container {
	padding: 10px 15px;
	background-color: #fdf8f2;
	border-bottom: 1px solid var(--border-color);

	.picker {
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary);
		display: flex;
		justify-content: center;
		align-items: center;
		height: 30px;

		.arrow-down {
			margin-left: 8px;
			border-top-color: var(--text-primary);
		}
	}
}

.member-details {
	display: flex;
	align-items: center;
	flex: 1;
}

.member-avatar {
	width: 42px;
	height: 42px;
	border-radius: 50%;
	background-color: var(--primary-color);
	color: white;
	display: flex;
	justify-content: center;
	align-items: center;
	font-size: 18px;
	font-weight: bold;
	margin-right: 15px;
	flex-shrink: 0;
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
</style>
