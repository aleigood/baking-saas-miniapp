<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader title="店铺管理" />
		<DetailPageLayout>
			<view class="page-content no-horizontal-padding page-content-with-fab">
				<template v-if="tenants.length > 0" :key="'tenants-list-container'">
					<ListItem
						v-for="(tenant, index) in tenants"
						:key="tenant.id"
						@longpress.stop="handleLongPress(tenant)"
						:vibrate-on-long-press="canManageTenant(tenant.id)"
						:bleed="true"
						:divider="index < tenants.length - 1"
					>
						<view class="store-icon-wrapper">
							<image class="store-icon" src="/static/icons/store.svg" />
						</view>
						<view class="tenant-details">
							<view class="main-info">
								<view class="name">{{ tenant.name }}</view>
								<view class="creation-date">创立于: {{ getLocalDate(new Date(tenant.createdAt)) }}</view>
							</view>
						</view>
						<view class="side-info">
							<view class="value" :class="tenant.status === 'ACTIVE' ? 'status-active' : 'status-inactive'">
								{{ tenant.status === 'ACTIVE' ? '营业中' : '已停用' }}
							</view>
						</view>
					</ListItem>
				</template>
				<view v-else :key="'tenants-empty'" class="empty-state">
					<text>暂无店铺信息</text>
				</view>
			</view>
		</DetailPageLayout>

		<ExpandingFab :actions="fabActions" :no-tab-bar="true" />

		<AppModal v-model:visible="showEditModal" :key="'edit-tenant-modal'" :title="isEditing ? '修改店铺' : '新增店铺'">
			<FormItem label="店铺名称">
				<input class="input-field" v-model="editableTenant.name" placeholder="请输入店铺名称" />
			</FormItem>
			<FormItem v-if="isEditing" label="店铺状态">
				<picker mode="selector" :range="statusOptions" range-key="text" @change="onStatusChange">
					<view class="picker">
						{{ selectedStatusText }}
						<view class="arrow-down"></view>
					</view>
				</picker>
			</FormItem>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showEditModal = false">取消</AppButton>
				<AppButton type="primary" @click="handleSaveTenant" :disabled="isSubmitting" :loading="isSubmitting">
					{{ isSubmitting ? '' : '确认' }}
				</AppButton>
			</view>
		</AppModal>

		<AppModal v-model:visible="showTenantActionsModal" :key="'tenant-actions-modal'" title="店铺操作" :no-header-line="true">
			<view class="options-list">
				<ListItem class="option-item" @click="handleEditFromMenu" :bleed="true">
					<view class="main-info">
						<view class="name">修改店铺</view>
					</view>
				</ListItem>
			</view>
		</AppModal>
	</view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useToastStore } from '@/store/toast';
import { useUserStore } from '@/store/user';
import { getTenants, createTenant, updateTenant } from '@/api/tenants';
// [代码重构] 导入公共日期格式化函数
import { getLocalDate } from '@/utils/format';
import type { Tenant } from '@/types/api';
import DetailHeader from '@/components/DetailHeader.vue';
import DetailPageLayout from '@/components/DetailPageLayout.vue';
import ListItem from '@/components/ListItem.vue';
import ExpandingFab from '@/components/ExpandingFab.vue';
import AppModal from '@/components/AppModal.vue';
import FormItem from '@/components/FormItem.vue';
import AppButton from '@/components/AppButton.vue';

defineOptions({
	inheritAttrs: false
});

const toastStore = useToastStore();
const userStore = useUserStore();

const tenants = ref<Tenant[]>([]);
const isLoading = ref(false);
const isSubmitting = ref(false);
const showEditModal = ref(false);
const isEditing = ref(false);

const editableTenant = ref<Partial<Tenant>>({
	id: '',
	name: '',
	status: 'ACTIVE'
});

const showTenantActionsModal = ref(false);
const selectedTenant = ref<Tenant | null>(null);

const fabActions = computed(() => {
	const actions = [
		{
			icon: '/static/icons/add.svg',
			text: '新增店铺',
			action: openAddModal
		}
	];
	return actions;
});

const ownedTenantIds = computed(() => new Set(userStore.userInfo?.tenants.filter((item) => item.role === 'OWNER').map((item) => item.tenant.id) ?? []));

const canManageTenant = (tenantId: string) => ownedTenantIds.value.has(tenantId);

const statusOptions = ref([
	{ text: '营业中', value: 'ACTIVE' },
	{ text: '已停用', value: 'INACTIVE' }
]);

const selectedStatusText = computed(() => {
	return editableTenant.value.status === 'ACTIVE' ? '营业中' : '已停用';
});

onMounted(() => {
	fetchTenants();
});

const fetchTenants = async () => {
	isLoading.value = true;
	try {
		tenants.value = await getTenants();
	} catch (error) {
		console.error('获取店铺列表失败:', error);
		toastStore.show({ message: '获取店铺列表失败', type: 'error' });
	} finally {
		isLoading.value = false;
	}
};

const openAddModal = () => {
	isEditing.value = false;
	editableTenant.value = { name: '', status: 'ACTIVE' };
	showEditModal.value = true;
};

const openEditModal = (tenant: Tenant) => {
	isEditing.value = true;
	editableTenant.value = { ...tenant };
	showEditModal.value = true;
};

const onStatusChange = (e: any) => {
	editableTenant.value.status = statusOptions.value[e.detail.value].value as 'ACTIVE' | 'INACTIVE';
};

const handleSaveTenant = async () => {
	if (!editableTenant.value.name) {
		toastStore.show({ message: '请输入店铺名称', type: 'error' });
		return;
	}
	isSubmitting.value = true;
	try {
		if (isEditing.value) {
			await updateTenant(editableTenant.value.id!, {
				name: editableTenant.value.name,
				status: editableTenant.value.status
			});
			toastStore.show({ message: '店铺信息更新成功', type: 'success' });
		} else {
			await createTenant({ name: editableTenant.value.name });
			await userStore.fetchUserInfo();
			toastStore.show({ message: '店铺创建成功', type: 'success' });
		}
		showEditModal.value = false;
		await fetchTenants();
	} catch (error) {
		console.error('保存店铺失败:', error);
	} finally {
		isSubmitting.value = false;
	}
};

const handleLongPress = (tenant: Tenant) => {
	if (!canManageTenant(tenant.id)) return;
	selectedTenant.value = tenant;
	showTenantActionsModal.value = true;
};

const handleEditFromMenu = () => {
	if (!selectedTenant.value) return;
	openEditModal(selectedTenant.value);
	showTenantActionsModal.value = false;
	selectedTenant.value = null;
};

</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
@include list-item-content-style;
@include list-item-option-style;
@include form-control-styles;

.page-wrapper {
	display: flex;
	flex-direction: column;
	height: 100vh;
}

// [UI改进] 新增店铺图标容器样式
.store-icon-wrapper {
	width: 40px;
	height: 40px;
	border-radius: 50%; // 圆形背景
	background-color: #f5efe6; // 与应用色系匹配的浅色背景
	display: flex;
	justify-content: center;
	align-items: center;
	margin-right: 12px;
	flex-shrink: 0;
}

// [UI改进] 调整图标本身的大小
.store-icon {
	width: 22px;
	height: 22px;
}

.tenant-details {
	display: flex;
	align-items: center;
	flex: 1;
	.main-info {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
}

.creation-date {
	font-size: 12px;
	color: var(--text-secondary);
}

.status-active {
	color: #28a745;
}

.status-inactive {
	color: #dc3545;
}

</style>
