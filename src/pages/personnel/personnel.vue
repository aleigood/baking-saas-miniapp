<template>
	<view class="page-container">
		<view class="page-header">
			<view class="store-selector" @click="showStoreModal = true">{{ dataStore.currentTenant?.name }} &#9662;
			</view>
			<view class="user-avatar" @click="showUserMenu = true">{{ userStore.userInfo?.name[0] || '管' }}</view>
		</view>
		<view class="page-content">
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
							<picker mode="selector" :range="roles" @change="onRoleChange">
								<view class="picker">{{ editableMemberRole }}</view>
							</picker>
						</view>
						<button class="btn-save" @click="updateMemberRole">保存修改</button>
					</view>
				</view>
			</view>
		</view>

		<!-- Modals -->
		<view v-if="showStoreModal" class="modal-overlay" @click="showStoreModal = false">
			<view class="modal-content" @click.stop>
				<view class="card-title" style="margin-bottom: 10px;">选择门店</view>
				<view v-for="tenant in dataStore.tenants" :key="tenant.id" class="list-item"
					@click="handleSelectTenant(tenant.id)">{{ tenant.name }}</view>
			</view>
		</view>
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
	import { ref, watch } from 'vue';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import type { Member } from '@/types/api';

	const userStore = useUserStore();
	const dataStore = useDataStore();
	const selectedMember = ref<Member | null>(null);
	const editableMemberRole = ref('');
	const roles = ['主管', '面包师'];
	const showStoreModal = ref(false);
	const showUserMenu = ref(false);

	const selectMember = (member : Member) => {
		selectedMember.value = { ...member };
		editableMemberRole.value = member.role;
	};
	const onRoleChange = (e : any) => {
		editableMemberRole.value = roles[e.detail.value];
	};
	const updateMemberRole = () => {
		if (!selectedMember.value) return;
		const memberInList = dataStore.members.find(m => m.id === selectedMember.value!.id);
		if (memberInList) {
			memberInList.role = editableMemberRole.value;
		}
		uni.showToast({ title: `已修改 ${selectedMember.value.name} 的角色`, icon: 'none' });
		selectedMember.value = null;
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
</style>