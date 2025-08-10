<template>
	<view class="page-container page-with-custom-tabbar">
		<ProductionPage v-show="uiStore.activeTab === 'production'" />
		<IngredientsPage v-show="uiStore.activeTab === 'ingredients'" />
		<RecipesPage v-show="uiStore.activeTab === 'recipes'" />
		<PersonnelPage v-show="uiStore.activeTab === 'personnel'" />

		<CustomTabBar />

		<AppModal v-model:visible="uiStore.showStoreModal" title="选择门店">
			<ListItem v-for="tenant in dataStore.tenants" :key="tenant.id" @click="handleSelectTenant(tenant.id)">{{
        tenant.name }}</ListItem>
		</AppModal>

		<AppModal v-model:visible="uiStore.showUserMenu" title="退出登录">
			<view class="modal-prompt-text">
				您确定要退出登录吗？
			</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="uiStore.closeModal('userMenu')">取消</AppButton>
				<AppButton type="danger" @click="handleLogout">确认退出</AppButton>
			</view>
		</AppModal>

		<AppModal v-model:visible="uiStore.showInviteModal" title="邀请新成员">
			<FormItem label="被邀请人手机号">
				<input class="input-field" type="tel" v-model="inviteePhone" placeholder="请输入手机号" />
			</FormItem>
			<view class="modal-actions">
				<!-- [核心修改] 替换为 AppButton 组件 -->
				<AppButton type="secondary" @click="uiStore.closeModal('invite')">
					取消
				</AppButton>
				<AppButton type="primary" @click="handleInvite" :disabled="isCreatingInvite"
					:loading="isCreatingInvite">
					{{ isCreatingInvite ? '' : '确认邀请' }}
				</AppButton>
			</view>
		</AppModal>

	</view>
</template>

<script setup lang="ts">
	import { ref } from 'vue';
	import { useUiStore } from '@/store/ui';
	import { useDataStore } from '@/store/data';
	import { useUserStore } from '@/store/user';
	import { createInvitation } from '@/api/invitations';

	import CustomTabBar from '@/components/CustomTabBar.vue';
	import AppModal from '@/components/AppModal.vue';
	import FormItem from '@/components/FormItem.vue';
	import ListItem from '@/components/ListItem.vue';
	import AppButton from '@/components/AppButton.vue';

	// 引入四个页面级组件
	import ProductionPage from '@/pages/production/production.vue';
	import IngredientsPage from '@/pages/ingredients/ingredients.vue';
	import RecipesPage from '@/pages/recipes/recipes.vue';
	import PersonnelPage from '@/pages/personnel/personnel.vue';

	const uiStore = useUiStore();
	const dataStore = useDataStore();
	const userStore = useUserStore();

	const isCreatingInvite = ref(false);
	const inviteePhone = ref('');

	const handleSelectTenant = async (tenantId : string) => {
		if (dataStore.currentTenantId === tenantId) {
			uiStore.closeModal('store');
			return;
		}
		await dataStore.selectTenant(tenantId);
		uiStore.closeModal('store');
		if (uiStore.activeTab === 'production') await dataStore.fetchProductionData();
		if (uiStore.activeTab === 'ingredients') await dataStore.fetchIngredientsData();
		if (uiStore.activeTab === 'recipes') await dataStore.fetchRecipesData();
		if (uiStore.activeTab === 'personnel') await dataStore.fetchMembersData();
	};

	const handleLogout = () => {
		userStore.logout();
		uiStore.closeModal('userMenu');
	};

	const handleInvite = async () => {
		if (!inviteePhone.value) {
			uni.showToast({ title: '请输入手机号', icon: 'none' });
			return;
		}
		isCreatingInvite.value = true;
		try {
			await createInvitation(inviteePhone.value);
			uni.showToast({ title: '邀请已发送', icon: 'success' });
			uiStore.closeModal('invite');
			inviteePhone.value = '';
		} catch (error) {
			console.error('Failed to create invitation:', error);
		} finally {
			isCreatingInvite.value = false;
		}
	};
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

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

	.modal-prompt-text {
		font-size: 16px;
		color: var(--text-primary);
		text-align: center;
		margin-bottom: 25px;
	}
</style>