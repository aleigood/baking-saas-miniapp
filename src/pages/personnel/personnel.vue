<template>
	<view class="page-container">
		<!-- 页面头部 -->
		<view class="page-header">
			<view class="store-selector" @click="showStoreModal = true">{{ dataStore.currentTenant?.name }} &#9662;
			</view>
			<view class="user-avatar" @click="showUserMenu = true">{{ userStore.userInfo?.name[0] || '管' }}</view>
		</view>

		<!-- 页面内容 -->
		<view class="page-content">
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
						<view class="form-item"><label>姓名</label><input type="text" :value="selectedMember.name"
								readonly></view>
						<view class="form-item"><label>加入日期</label><input type="text" :value="selectedMember.joinDate"
								readonly></view>
						<view class="form-item">
							<label>角色</label>
							<picker mode="selector" :range="availableRoles" @change="onRoleChange"
								:disabled="!canEditRole">
								<view class="picker" :class="{disabled: !canEditRole}">{{ editableMemberRole }}</view>
							</picker>
						</view>
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
		</view>

		<!-- 店铺选择模态框 -->
		<view v-if="showStoreModal" class="modal-overlay" @click="showStoreModal = false">
			<view class="modal-content" @click.stop>
				<view class="card-title" style="margin-bottom: 10px;">选择门店</view>
				<view v-for="tenant in dataStore.tenants" :key="tenant.id" class="list-item"
					@click="handleSelectTenant(tenant.id)">{{ tenant.name }}</view>
			</view>
		</view>

		<!-- 用户菜单模态框 -->
		<view v-if="showUserMenu" class="modal-overlay" @click="showUserMenu = false">
			<view class="modal-content" @click.stop
				style="width: auto; position: absolute; top: 85px; right: 15px; padding: 5px;">
				<view class="list-item" style="border: none; padding: 10px 15px;" @click="userStore.logout()">退出登录
				</view>
			</view>
		</view>
	</view>
</template>

<script setup lang="ts">
	import { ref, computed, watch } from 'vue';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import type { Member } from '@/types/api';
	// [核心更新] 引入新的API方法
	import { updateMemberRole, removeMember } from '@/api/members';

	const userStore = useUserStore();
	const dataStore = useDataStore();

	const selectedMember = ref<Member | null>(null);
	const editableMemberRole = ref<Member['role']>('BAKER');
	const isSubmitting = ref(false);

	const showStoreModal = ref(false);
	const showUserMenu = ref(false);

	// --- [核心更新] 权限计算 ---
	const currentUserRole = computed(() => dataStore.members.find(m => m.id === userStore.userInfo?.id)?.role);

	// 当前用户是否有权限编辑所选中的成员
	const canEditRole = computed(() => {
		if (!currentUserRole.value || !selectedMember.value || selectedMember.value.id === userStore.userInfo?.id) {
			return false; // 不能编辑自己
		}
		if (currentUserRole.value === 'OWNER') {
			return true; // 老板可以编辑任何人
		}
		if (currentUserRole.value === 'MANAGER') {
			// 主管只能编辑面包师
			return selectedMember.value.role === 'BAKER';
		}
		return false;
	});

	// 当前用户是否有权限删除所选中的成员
	const canRemoveMember = computed(() => {
		if (!currentUserRole.value || !selectedMember.value || selectedMember.value.id === userStore.userInfo?.id) {
			return false; // 不能删除自己
		}
		if (currentUserRole.value === 'OWNER') {
			return true; // 老板可以删除任何人
		}
		if (currentUserRole.value === 'MANAGER') {
			// 主管只能删除面包师
			return selectedMember.value.role === 'BAKER';
		}
		return false;
	});

	// 根据当前用户角色，决定picker中可选的角色范围
	const availableRoles = computed(() => {
		if (currentUserRole.value === 'OWNER') {
			return ['OWNER', 'MANAGER', 'BAKER'];
		}
		if (currentUserRole.value === 'MANAGER') {
			return ['BAKER']; // 主管只能将人设置为面包师
		}
		return [];
	});

	// --- 页面逻辑 ---

	const selectMember = (member : Member) => {
		selectedMember.value = { ...member };
		editableMemberRole.value = member.role;
	};

	const onRoleChange = (e : any) => {
		editableMemberRole.value = availableRoles.value[e.detail.value];
	};

	// [核心更新] 对接后端API来更新角色
	const handleUpdateMemberRole = async () => {
		if (!selectedMember.value || !canEditRole.value) return;

		isSubmitting.value = true;
		try {
			await updateMemberRole(selectedMember.value.id, editableMemberRole.value);
			uni.showToast({ title: '角色更新成功', icon: 'success' });
			// 成功后返回列表页并刷新数据
			selectedMember.value = null;
			await dataStore.loadDataForCurrentTenant();
		} catch (error : any) {
			console.error("Failed to update role:", error);
			uni.showToast({ title: error.data?.message || '操作失败，请重试', icon: 'none' });
		} finally {
			isSubmitting.value = false;
		}
	};

	// [新增] 对接后端API来删除成员
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
						await dataStore.loadDataForCurrentTenant();
					} catch (error : any) {
						console.error("Failed to remove member:", error);
						uni.showToast({ title: error.data?.message || '删除失败，请重试', icon: 'none' });
					} finally {
						isSubmitting.value = false;
					}
				}
			}
		});
	};

	const handleSelectTenant = async (tenantId : string) => {
		await dataStore.selectTenant(tenantId);
		showStoreModal.value = false;
	};

	watch(() => dataStore.currentTenantId, () => {
		selectedMember.value = null;
	});
</script>

<style scoped lang="scss">
	// 引入通用样式
	@import '@/styles/common.scss';

	.form-item {
		margin-bottom: 20px;
	}

	.form-item label {
		display: block;
		margin-bottom: 8px;
		font-size: 14px;
		color: #606266;
	}

	.form-item input,
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
		margin-top: 10px;
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