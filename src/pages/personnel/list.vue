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
import { ref, computed, onMounted, reactive } from 'vue'; // [核心新增] 导入 reactive
import { onShow } from '@dcloudio/uni-app';
import { useDataStore } from '@/store/data';
import { useUserStore } from '@/store/user';
import { useToastStore } from '@/store/toast';
import { useUiStore } from '@/store/ui';
import { createMember, getMembers } from '@/api/members'; // [核心修改] 导入 createMember API
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

const isSubmitting = ref(false); // [核心修改] 复用 isSubmitting 状态
const isNavigating = ref(false);
const showCreateModal = ref(false); // [核心修改] 更改变量名以更清晰地反映其用途

const isFabVisible = ref(true);
const lastScrollTop = ref(0);
const scrollThreshold = 5;

// [核心改造] 创建一个响应式对象来处理新增员工的表单
const createForm = reactive<{ name: string; phone: string; password: string; role: Role }>({
	name: '',
	phone: '',
	password: '',
	role: 'MEMBER' // 默认角色为员工
});

// [核心新增] 用于存储所有者选择的店铺ID和该店铺的成员列表
const selectedTenantIdForOwner = ref<string>('');
const ownerSelectedTenantMembers = ref<Member[]>([]);
const isLoadingMembers = ref(false);

// [核心修改] onMounted 中不再需要设置默认店铺
onMounted(async () => {
	// 页面挂载时，如果用户是所有者，则默认选中当前登录的店铺
	// if (isOwner.value) {
	// 	selectedTenantIdForOwner.value = dataStore.currentTenantId;
	// }
});

onShow(async () => {
	isNavigating.value = false;
	const toastMessage = uiStore.consumeNextPageToast('/pages/personnel/list');
	if (toastMessage) {
		toastStore.show(toastMessage);
	}

	// [核心修改] 更新数据获取逻辑
	if (isOwner.value) {
		// [核心修改] 每次显示页面时，都将当前选择的店铺ID与全局currentTenantId同步
		selectedTenantIdForOwner.value = dataStore.currentTenantId;
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

const roleMap: Record<Role, string> = {
	OWNER: '店主',
	ADMIN: '管理员',
	MEMBER: '员工',
	SUPER_ADMIN: '超级管理员'
};

const getRoleName = (role: Role) => {
	return roleMap[role] || role;
};

// [核心新增] 计算创建新成员时可选的角色列表
const availableRolesForCreation = computed(() => {
	if (isOwner.value) {
		return [
			{ text: '管理员', value: 'ADMIN' },
			{ text: '员工', value: 'MEMBER' }
		];
	}
	return [{ text: '员工', value: 'MEMBER' }];
});

// [核心新增] 计算 picker 中显示的当前选中的角色文本
const selectedRoleForCreationText = computed(() => {
	return getRoleName(createForm.role);
});

// [核心新增] 当创建角色选择变化时
const onRoleChange = (e: any) => {
	const selectedIndex = e.detail.value;
	createForm.role = availableRolesForCreation.value[selectedIndex].value as Role;
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

const openCreateModal = () => {
	// [核心改造] 打开模态框时重置表单
	createForm.name = '';
	createForm.phone = '';
	createForm.password = '';
	createForm.role = 'MEMBER'; // 总是重置为默认角色
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

		// [核心修改] 创建成功后，刷新对应店铺的成员列表
		if (isOwner.value) {
			await fetchMembersForSelectedTenant();
		} else {
			dataStore.markMembersAsStale();
			await dataStore.fetchMembersData();
		}
	} catch (error: any) {
		console.error('创建成员失败:', error);
		// 后端 ConflictException (409) 会触发这里的错误处理
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
