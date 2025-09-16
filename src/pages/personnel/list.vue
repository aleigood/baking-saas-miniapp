<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader title="人员管理" />
		<DetailPageLayout @scroll="handleScroll">
			<view class="page-content no-horizontal-padding page-content-with-fab">
				<view v-if="isOwner" class="filter-container">
					<FilterTabs v-model="activeTenantFilter" :tabs="filterTabsData" />
				</view>

				<template v-if="isOwner && activeTenantFilter === 'all' && membersToDisplay.length > 0">
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
					</view>
				</template>
				<template v-else-if="membersToDisplay.length > 0">
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

		<ExpandingFab v-if="canManagePersonnel" @click="openCreateModal" :no-tab-bar="true" :visible="isFabVisible" />

		<AppModal v-model:visible="showCreateModal" title="新增员工">
			<FormItem label="员工姓名">
				<input class="input-field" type="text" v-model="createForm.name" placeholder="请输入姓名" />
			</FormItem>
			<FormItem label="手机号码">
				<input class="input-field" type="tel" v-model="createForm.phone" placeholder="请输入手机号" />
			</FormItem>
			<FormItem label="初始密码">
				<input class="input-field" type="password" v-model="createForm.password" placeholder="请输入初始密码" />
			</FormItem>
			<FormItem label="员工角色">
				<picker mode="selector" :range="availableRolesForCreation" range-key="text" @change="onRoleChange">
					<view class="picker">
						{{ selectedRoleForCreationText }}
						<view class="arrow-down"></view>
					</view>
				</picker>
			</FormItem>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showCreateModal = false">取消</AppButton>
				<AppButton type="primary" @click="handleCreateMember" :disabled="isSubmitting" :loading="isSubmitting">
					{{ isSubmitting ? '' : '确认新增' }}
				</AppButton>
			</view>
		</AppModal>
	</view>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useDataStore } from '@/store/data';
import { useUserStore } from '@/store/user';
import { useToastStore } from '@/store/toast';
import { useUiStore } from '@/store/ui';
import { createMember, getMembers, getAllMembersByOwner } from '@/api/members';
import DetailHeader from '@/components/DetailHeader.vue';
import DetailPageLayout from '@/components/DetailPageLayout.vue';
import ListItem from '@/components/ListItem.vue';
import ExpandingFab from '@/components/ExpandingFab.vue';
import AppModal from '@/components/AppModal.vue';
import FormItem from '@/components/FormItem.vue';
import AppButton from '@/components/AppButton.vue';
import FilterTabs from '@/components/FilterTabs.vue';
// [核心修改] 导入 TenantWithMembers 类型
import type { Role, Member, Tenant, TenantWithMembers } from '@/types/api';
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

const createForm = reactive<{ name: string; phone: string; password: string; role: Role }>({
	name: '',
	phone: '',
	password: '',
	role: 'MEMBER'
});

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

const roleMap: Record<Role, string> = {
	OWNER: '店主',
	ADMIN: '管理员',
	MEMBER: '员工',
	SUPER_ADMIN: '超级管理员'
};

const getRoleName = (role: Role) => {
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
	createForm.role = availableRolesForCreation.value[selectedIndex].value as Role;
};

const navigateToDetail = (memberId: string) => {
	if (isNavigating.value) return;
	isNavigating.value = true;

	uni.navigateTo({
		url: `/pages/personnel/detail?memberId=${memberId}`
	});
};

const openCreateModal = () => {
	createForm.name = '';
	createForm.phone = '';
	createForm.password = '';
	createForm.role = 'MEMBER';
	showCreateModal.value = true;
};

const handleCreateMember = async () => {
	if (!createForm.name || !createForm.phone || !createForm.password) {
		toastStore.show({ message: '请填写所有字段', type: 'error' });
		return;
	}
	isSubmitting.value = true;
	try {
		await createMember(createForm);
		toastStore.show({ message: '员工创建成功', type: 'success' });
		showCreateModal.value = false;

		await loadPersonnelData();
	} catch (error: any) {
		console.error('创建成员失败:', error);
		if (error.statusCode !== 409) {
			toastStore.show({ message: '创建失败，请重试', type: 'error' });
		}
	} finally {
		isSubmitting.value = false;
	}
};
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
