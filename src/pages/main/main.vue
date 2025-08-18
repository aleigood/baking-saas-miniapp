<template>
	<page-meta page-style="overflow: hidden;"></page-meta>
	<view class="main-page-container" :class="{ 'personnel-active-bg': uiStore.activeTab === 'personnel' }">
		<MainHeader :transparent="uiStore.activeTab === 'personnel'" />

		<scroll-view :scroll-y="true" :show-scrollbar="false" class="scroll-area" enhanced>

			<ProductionPage v-show="uiStore.activeTab === 'production'" />
			<IngredientsPage v-show="uiStore.activeTab === 'ingredients'" />
			<RecipesPage v-show="uiStore.activeTab === 'recipes'" />
			<PersonnelPage v-show="uiStore.activeTab === 'personnel'" />

		</scroll-view>

		<CustomTabBar />

		<AppModal :visible="uiStore.showStoreModal" @update:visible="uiStore.closeModal(MODAL_KEYS.STORE)" title="选择门店"
			:no-header-line="true">
			<view class="options-list">
				<ListItem v-for="tenant in dataStore.tenants" :key="tenant.id" @click="handleSelectTenant(tenant.id)"
					class="option-item" :bleed="true">
					<view class="main-info">
						<view class="name">{{ tenant.name }}</view>
					</view>
					<view class="side-info" v-if="dataStore.currentTenant?.id === tenant.id">
						<view class="value checkmark-icon">✓</view>
					</view>
				</ListItem>
			</view>
		</AppModal>

		<AppModal :visible="uiStore.showInviteModal" @update:visible="uiStore.closeModal(MODAL_KEYS.INVITE)"
			title="邀请新成员">
			<FormItem label="被邀请人手机号">
				<input class="input-field" type="tel" v-model="inviteePhone" placeholder="请输入手机号" />
			</FormItem>
			<view class="modal-actions">
				<AppButton type="secondary" @click="uiStore.closeModal(MODAL_KEYS.INVITE)">
					取消
				</AppButton>
				<AppButton type="primary" @click="handleInvite" :disabled="isCreatingInvite"
					:loading="isCreatingInvite">
					{{ isCreatingInvite ? '' : '确认邀请' }}
				</AppButton>
			</view>
		</AppModal>

		<Toast />
	</view>
</template>

<script setup lang="ts">
	import { ref } from 'vue';
	import { useUiStore } from '@/store/ui';
	import { useDataStore } from '@/store/data';
	import { useUserStore } from '@/store/user';
	import { useToastStore } from '@/store/toast';
	import { createInvitation } from '@/api/invitations';
	import { MODAL_KEYS } from '@/constants/modalKeys';

	import CustomTabBar from '@/components/CustomTabBar.vue';
	import MainHeader from '@/components/MainHeader.vue';
	import AppModal from '@/components/AppModal.vue';
	import FormItem from '@/components/FormItem.vue';
	import ListItem from '@/components/ListItem.vue';
	import AppButton from '@/components/AppButton.vue';
	import Toast from '@/components/Toast.vue';

	// 引入四个页面级组件
	import ProductionPage from '@/pages/production/production.vue';
	import IngredientsPage from '@/pages/ingredients/ingredients.vue';
	import RecipesPage from '@/pages/recipes/recipes.vue';
	import PersonnelPage from '@/pages/personnel/personnel.vue';

	const uiStore = useUiStore();
	const dataStore = useDataStore();
	const userStore = useUserStore();
	const toastStore = useToastStore();

	const isCreatingInvite = ref(false);
	const inviteePhone = ref('');

	const handleSelectTenant = async (tenantId : string) => {
		if (dataStore.currentTenantId === tenantId) {
			uiStore.closeModal(MODAL_KEYS.STORE);
			return;
		}
		try {
			await dataStore.selectTenant(tenantId);
			uiStore.closeModal(MODAL_KEYS.STORE);
			if (uiStore.activeTab === 'production') await dataStore.fetchProductionData();
			if (uiStore.activeTab === 'ingredients') await dataStore.fetchIngredientsData();
			if (uiStore.activeTab === 'recipes') await dataStore.fetchRecipesData();
			if (uiStore.activeTab === 'personnel') await dataStore.fetchMembersData();
		} catch (error) {
			console.error("Failed to select tenant:", error);
		}
	};

	const handleInvite = async () => {
		if (!inviteePhone.value) {
			toastStore.show({ message: '请输入手机号', type: 'error' });
			return;
		}
		isCreatingInvite.value = true;
		try {
			await createInvitation(inviteePhone.value);
			toastStore.show({ message: '邀请已发送', type: 'success' });
			uiStore.closeModal(MODAL_KEYS.INVITE);
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

	/* [兼容性修复] 引入 Mixin，确保模态框中的列表项样式正确 */
	@include list-item-content-style;
	/* [兼容性修复] 引入新增的 Mixin */
	@include list-item-option-style;

	.main-page-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		width: 100%;
		overflow: hidden;
		/* 直接使用颜色的硬编码值，确保在小程序中稳定生效 */
		background-color: #fdf8f2;
		/* [新增] 默认过渡效果，让背景切换更平滑 */
		transition: background-color 0.3s ease;
	}

	/* [新增] “我的”页面激活时的通体背景样式 */
	.main-page-container.personnel-active-bg {
		background-color: transparent;
		/* * [核心修改] 在这里设置您想要的背景颜色或渐变
		 * 例如，单色背景：background-color: #eff3f8;
		 * 或者使用您图片中的渐变效果：
		 */
		background-image: linear-gradient(to bottom, #eff3f8 0%, #ffffff 50%);
	}


	.scroll-area {
		flex: 1;
		/* 关键：让滚动区域占据所有剩余空间 */
		min-height: 0;
		/* 关键：在 flex 布局中，防止内容溢出导致父容器被撑开 */
		width: 100%;
		box-sizing: border-box;
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

	.modal-prompt-text {
		font-size: 16px;
		color: var(--text-primary);
		text-align: center;
		margin-bottom: 25px;
	}

	.options-list {
		.option-item {
			text-align: left;

			:deep(.main-info) {
				justify-content: flex-start;
			}

			:deep(.desc) {
				display: block;
			}

			.checkmark-icon {
				color: var(--primary-color);
				font-weight: bold;
				font-size: 18px;
			}
		}
	}
</style>