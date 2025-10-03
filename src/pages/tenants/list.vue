<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader title="店铺管理" />
		<DetailPageLayout>
			<view class="page-content no-horizontal-padding page-content-with-fab">
				<template v-if="tenants.length > 0">
					<ListItem v-for="(tenant, index) in tenants" :key="tenant.id" @click="openEditModal(tenant)" :bleed="true" :divider="index < tenants.length - 1">
						<view class="tenant-details">
							<view class="main-info">
								<view class="name">{{ tenant.name }}</view>
							</view>
						</view>
						<view class="side-info">
							<view class="value" :class="tenant.status === 'ACTIVE' ? 'status-active' : 'status-inactive'">
								{{ tenant.status === 'ACTIVE' ? '营业中' : '已停用' }}
							</view>
						</view>
					</ListItem>
				</template>
				<view v-else class="empty-state">
					<text>暂无店铺信息</text>
				</view>
			</view>
		</DetailPageLayout>

		<ExpandingFab :actions="fabActions" :no-tab-bar="true" />

		<AppModal v-model:visible="showEditModal" :title="isEditing ? '修改店铺' : '新增店铺'">
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

		<AppModal v-model:visible="showImportModal" title="批量导入配方">
			<FormItem label="选择店铺">
				<picker mode="selector" :range="tenantPickerOptions" range-key="name" @change="onTenantSelect">
					<view class="picker">
						{{ selectedTenantOption.name }}
						<view class="arrow-down"></view>
					</view>
				</picker>
			</FormItem>
			<FormItem label="选择配方文件">
				<view class="import-instructions">请先将 .json 配方文件发送到微信任意聊天窗口（例如发送给自己或文件传输助手），然后点击下方按钮从聊天记录中选择。</view>
				<view class="file-picker-wrapper" @click="handleChooseFile">
					<view class="file-picker-placeholder" v-if="!selectedFile">点击从聊天记录中选择 .json 文件</view>
					<view class="file-picker-info" v-else>
						<image class="file-icon" src="/static/icons/file.svg" />
						<text class="file-name">{{ selectedFile.name }}</text>
					</view>
				</view>
			</FormItem>
			<view v-if="importResult" class="import-result-wrapper">
				<view class="result-title">导入结果</view>
				<view class="result-item">
					<text>成功导入：</text>
					<text class="result-value success">{{ importResult.importedCount }} / {{ importResult.totalCount }}</text>
				</view>
				<view class="result-item">
					<text>跳过 (已存在或失败)：</text>
					<text class="result-value skipped">{{ importResult.skippedCount }}</text>
				</view>
				<view v-if="importResult.skippedCount > 0 && importResult.skippedRecipes.length > 0" class="skipped-list">
					<view class="skipped-title">跳过详情:</view>
					<view v-for="(name, index) in importResult.skippedRecipes" :key="index" class="skipped-item">{{ name }}</view>
				</view>
			</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="closeImportModal">取消</AppButton>
				<AppButton type="primary" @click="handleConfirmImport" :disabled="isImporting" :loading="isImporting">
					{{ isImporting ? '导入中...' : '开始导入' }}
				</AppButton>
			</view>
		</AppModal>
	</view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useToastStore } from '@/store/toast';
import { useUserStore } from '@/store/user';
import { getTenants, createTenant, updateTenant } from '@/api/tenants';
import { batchImportRecipes } from '@/api/recipes';
import type { Tenant, BatchImportResult } from '@/types/api';
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

const showImportModal = ref(false);
const isImporting = ref(false);
const selectedTenantIds = ref<string[]>([]);
const selectedFile = ref<{ name: string; path: string } | null>(null);
const importResult = ref<BatchImportResult | null>(null);
const tenantPickerIndex = ref(0);

const fabActions = computed(() => {
	const actions = [
		{
			icon: '/static/icons/add.svg',
			text: '新增店铺',
			action: openAddModal
		}
	];
	if (userStore.userInfo?.role === 'OWNER') {
		actions.push({
			icon: '/static/icons/upload.svg',
			text: '批量导入配方',
			action: openImportModal
		});
	}
	return actions;
});

const statusOptions = ref([
	{ text: '营业中', value: 'ACTIVE' },
	{ text: '已停用', value: 'INACTIVE' }
]);

const selectedStatusText = computed(() => {
	return editableTenant.value.status === 'ACTIVE' ? '营业中' : '已停用';
});

const tenantPickerOptions = computed(() => {
	return [{ id: 'all', name: '全部店铺' }, ...tenants.value];
});

const selectedTenantOption = computed(() => {
	return tenantPickerOptions.value[tenantPickerIndex.value];
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

const openImportModal = () => {
	closeImportModal();
	showImportModal.value = true;
};

const closeImportModal = () => {
	showImportModal.value = false;
	isImporting.value = false;
	selectedFile.value = null;
	importResult.value = null;
	tenantPickerIndex.value = 0;
	selectedTenantIds.value = [];
};

const onTenantSelect = (e: any) => {
	tenantPickerIndex.value = e.detail.value;
	const selection = tenantPickerOptions.value[e.detail.value];
	if (selection.id === 'all') {
		selectedTenantIds.value = tenants.value.map((t) => t.id);
	} else {
		selectedTenantIds.value = [selection.id];
	}
};

const handleChooseFile = () => {
	// #ifdef MP-WEIXIN
	wx.chooseMessageFile({
		count: 1,
		type: 'file',
		// [修复] 将 extension 的值从字符串 'json' 修改为数组 ['json']
		extension: ['json'],
		success: (res) => {
			const file = res.tempFiles[0];
			selectedFile.value = { name: file.name, path: file.path };
		},
		fail: (err) => {
			if (err.errMsg !== 'chooseMessageFile:fail cancel') {
				toastStore.show({ message: '选择文件失败', type: 'error' });
			}
		}
	});
	// #endif

	// #ifndef MP-WEIXIN
	uni.chooseFile({
		count: 1,
		type: 'all',
		extension: ['json'],
		success: (res) => {
			const file = res.tempFiles[0] as unknown as UniApp.ChooseFileSuccessCallbackResultFile;
			selectedFile.value = { name: file.name, path: file.path };
		},
		fail: (err) => {
			if (err.errMsg !== 'chooseFile:fail cancel') {
				toastStore.show({ message: '选择文件失败', type: 'error' });
			}
		}
	});
	// #endif
};

const handleConfirmImport = async () => {
	if (!selectedFile.value) {
		toastStore.show({ message: '请选择要导入的配方文件', type: 'error' });
		return;
	}

	isImporting.value = true;
	importResult.value = null;

	const finalTenantIds = selectedTenantIds.value.length > 0 ? selectedTenantIds.value : tenants.value.map((t) => t.id);

	try {
		const result = await batchImportRecipes(selectedFile.value.path, finalTenantIds);
		importResult.value = result;
		const dataStore = (await import('@/store/data')).useDataStore();
		dataStore.markRecipesAsStale();
		dataStore.markIngredientsAsStale();
	} catch (error) {
		console.error('导入失败:', error);
	} finally {
		isImporting.value = false;
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

.tenant-details {
	display: flex;
	align-items: center;
	flex: 1;
}

.status-active {
	color: #28a745;
}

.status-inactive {
	color: #dc3545;
}

// --- [新增] 导入模态框样式 ---
.import-instructions {
	font-size: 12px;
	color: var(--text-secondary);
	background-color: #f7f7f7;
	padding: 8px 12px;
	border-radius: 6px;
	line-height: 1.6;
	margin-bottom: 10px;
}

.file-picker-wrapper {
	width: 100%;
	height: 80px;
	border: 1px dashed var(--border-color);
	border-radius: 8px;
	display: flex;
	justify-content: center;
	align-items: center;
	background-color: #fcfcfc;
}

.file-picker-placeholder {
	color: var(--text-secondary);
	font-size: 14px;
}

.file-picker-info {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
}

.file-icon {
	width: 24px;
	height: 24px;
}

.file-name {
	font-size: 13px;
	color: var(--text-primary);
	max-width: 200px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.import-result-wrapper {
	margin-top: 20px;
	padding-top: 15px;
	border-top: 1px solid var(--border-color);
}

.result-title {
	font-size: 15px;
	font-weight: 500;
	margin-bottom: 10px;
	color: var(--text-primary);
}

.result-item {
	display: flex;
	justify-content: space-between;
	font-size: 14px;
	color: var(--text-secondary);
	margin-bottom: 5px;
}

.result-value {
	font-weight: 500;
	&.success {
		color: #28a745;
	}
	&.skipped {
		color: #ffc107;
	}
}

.skipped-list {
	margin-top: 10px;
	font-size: 12px;
	color: var(--text-secondary);
	max-height: 100px;
	overflow-y: auto;
	background-color: #f7f7f7;
	border-radius: 4px;
	padding: 8px;
}

.skipped-title {
	font-weight: 500;
	margin-bottom: 5px;
}

.skipped-item {
	line-height: 1.5;
}
</style>
