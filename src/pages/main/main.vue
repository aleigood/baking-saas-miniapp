<template>
	<view class="page-container page-with-custom-tabbar">
		<ProductionPage v-show="uiStore.activeTab === 'production'" />
		<IngredientsPage v-show="uiStore.activeTab === 'ingredients'" />
		<RecipesPage v-show="uiStore.activeTab === 'recipes'" />
		<PersonnelPage v-show="uiStore.activeTab === 'personnel'" />

		<CustomTabBar />

		<AppModal v-model:visible="uiStore.showStoreModal" title="选择门店">
			<!-- [核心修改] 使用 ListItem 组件来包裹列表项 -->
			<ListItem v-for="tenant in dataStore.tenants" :key="tenant.id" @click="handleSelectTenant(tenant.id)">{{
        tenant.name }}</ListItem>
		</AppModal>

		<AppModal v-model:visible="uiStore.showUserMenu">
			<!-- [核心修改] 使用 ListItem 组件来包裹列表项 -->
			<ListItem style="border: none; padding: 10px 15px" @click="handleLogout">退出登录
			</ListItem>
		</AppModal>

		<AppModal v-model:visible="uiStore.showInviteModal" title="邀请新成员">
			<FormItem label="被邀请人手机号">
				<input class="input-field" type="tel" v-model="inviteePhone" placeholder="请输入手机号" />
			</FormItem>
			<view class="modal-actions">
				<button class="btn btn-secondary" @click="uiStore.closeModal('invite')">
					取消
				</button>
				<button class="btn btn-primary" @click="handleInvite" :disabled="isCreatingInvite"
					:loading="isCreatingInvite">
					{{ isCreatingInvite ? '发送中...' : '确认邀请' }}
				</button>
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
	import ListItem from '@/components/ListItem.vue'; // 导入 ListItem 组件

	// 引入四个页面级组件
	import ProductionPage from '@/pages/production/production.vue';
	import IngredientsPage from '@/pages/ingredients/ingredients.vue';
	import RecipesPage from '@/pages/recipes/recipes.vue';
	import PersonnelPage from '@/pages/personnel/personnel.vue';

	const uiStore = useUiStore();
	const dataStore = useDataStore();
	const userStore = useUserStore();

	// [核心新增] 将原本分散在各个页面的逻辑提升到顶层
	const isCreatingInvite = ref(false);
	const inviteePhone = ref('');

	// 处理选择门店的逻辑
	const handleSelectTenant = async (tenantId : string) => {
		if (dataStore.currentTenantId === tenantId) {
			uiStore.closeModal('store');
			return;
		}
		// 此处可以添加 loading 状态
		await dataStore.selectTenant(tenantId);
		uiStore.closeModal('store');
		// 切换店铺后，需要刷新当前页面的数据
		// 这里的实现可以更优雅，比如通过 watch 监听 currentTenantId 变化
		if (uiStore.activeTab === 'production') await dataStore.fetchProductionData();
		if (uiStore.activeTab === 'ingredients') await dataStore.fetchIngredientsData();
		if (uiStore.activeTab === 'recipes') await dataStore.fetchRecipesData();
		if (uiStore.activeTab === 'personnel') await dataStore.fetchMembersData();
	};

	// 处理退出登录
	const handleLogout = () => {
		userStore.logout();
		uiStore.closeModal('userMenu');
	};

	// 处理邀请成员
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
	// 继承全局样式
	@import '@/styles/common.scss';

	/* [核心新增] 为提升后的模态框组件提供样式 */
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