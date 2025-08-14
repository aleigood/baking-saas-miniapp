<template>
	<view class="page-container">
		<view class="page-header">
			<view class="detail-header">
				<view class="back-btn" @click="navigateBack">&#10094;</view>
				<h2 class="detail-title">{{ recipeFamily?.name || '加载中...' }}</h2>
			</view>
		</view>
		<view class="page-content" v-if="!isLoading && recipeFamily">
			<view class="detail-page">
				<!-- 版本列表组件 -->
				<RecipeVersionList :versions="recipeVersions" :selected-version-id="displayedVersionId"
					:can-edit="canEditRecipe" @select-version="handleVersionClick" @create-version="handleCreateVersion"
					@longpress-version="handleVersionLongPressAction" />

				<!-- 根据配方类型动态渲染详情组件 -->
				<MainRecipeDetail v-if="recipeFamily.type === 'MAIN'" :version="displayedVersion" />
				<SimpleRecipeDetail v-else :version="displayedVersion" />
			</view>
		</view>
		<view class="loading-spinner" v-else>
			<text>加载中...</text>
		</view>

		<!-- [新增] 版本操作选项对话框 -->
		<AppModal v-model:visible="showVersionOptionsModal" title="配方版本" :no-header-line="true">
			<view class="options-list">
				<ListItem class="option-item" @click="handleActivateVersionOption">
					<view class="main-info">
						<view class="name">设为使用中</view>
					</view>
				</ListItem>
				<ListItem class="option-item" @click="handleDeleteVersionOption">
					<view class="main-info">
						<view class="name">删除配方版本</view>
					</view>
				</ListItem>
			</view>
		</AppModal>

		<!-- [修改] “设为使用中”的确认对话框 -->
		<AppModal v-model:visible="showActivateVersionConfirmModal" title="设为使用中">
			<view class="modal-prompt-text">
				要将这个版本设为当前使用的配方吗？
			</view>
			<view class="modal-warning-text">
				后续创建生产任务时将默认使用此版本配方。
			</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showActivateVersionConfirmModal = false">取消</AppButton>
				<AppButton type="primary" @click="handleConfirmActivateVersion" :loading="isSubmitting">
					{{ isSubmitting ? '设置中...' : '确认设置' }}
				</AppButton>
			</view>
		</AppModal>

		<!-- [新增] 删除配方版本的确认对话框 -->
		<AppModal v-model:visible="showDeleteVersionConfirmModal" title="确认删除">
			<view class="modal-prompt-text">
				确定要删除这个配方版本吗？
			</view>
			<view class="modal-warning-text">
				此操作不可撤销。
			</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showDeleteVersionConfirmModal = false">取消</AppButton>
				<AppButton type="danger" @click="handleConfirmDeleteVersion" :loading="isSubmitting">
					{{ isSubmitting ? '删除中...' : '确认删除' }}
				</AppButton>
			</view>
		</AppModal>
	</view>
</template>

<script setup lang="ts">
	import { ref, computed } from 'vue';
	import { onLoad, onShow } from '@dcloudio/uni-app';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import type { RecipeFamily, RecipeVersion } from '@/types/api';
	import { getRecipeFamily, activateRecipeVersion, deleteRecipeVersion } from '@/api/recipes'; // [修改] 引入 deleteRecipeVersion

	// 引入子组件
	import RecipeVersionList from '@/components/RecipeVersionList.vue';
	import MainRecipeDetail from '@/components/MainRecipeDetail.vue';
	import SimpleRecipeDetail from '@/components/SimpleRecipeDetail.vue';

	// 引入通用组件
	import AppModal from '@/components/AppModal.vue';
	import AppButton from '@/components/AppButton.vue';
	import ListItem from '@/components/ListItem.vue'; // [新增] 引入ListItem组件

	const userStore = useUserStore();
	const dataStore = useDataStore();
	const isLoading = ref(true);
	const isSubmitting = ref(false);
	const recipeFamily = ref<RecipeFamily | null>(null);
	const recipeVersions = ref<RecipeVersion[]>([]);

	// 状态管理
	const familyId = ref<string | null>(null);
	const displayedVersionId = ref<string | null>(null);
	const showActivateVersionConfirmModal = ref(false); // [修改] 变量名
	const showVersionOptionsModal = ref(false); // [新增] 版本操作选项对话框
	const showDeleteVersionConfirmModal = ref(false); // [新增] 删除版本确认对话框
	const selectedVersionForAction = ref<RecipeVersion | null>(null);

	onLoad(async (options) => {
		if (options?.familyId) {
			familyId.value = options.familyId;
			await loadRecipeData(familyId.value);
		}
	});

	onShow(async () => {
		if (familyId.value && !isLoading.value) {
			await dataStore.fetchIngredientsData(); // 确保原料数据是最新的，用于计算单价
			await loadRecipeData(familyId.value);
		}
	});

	const loadRecipeData = async (id : string) => {
		isLoading.value = true;
		try {
			const fullFamilyData = await getRecipeFamily(id);
			recipeFamily.value = fullFamilyData;
			recipeVersions.value = fullFamilyData.versions.sort((a, b) => b.version - a.version);

			// 决定默认显示的配方版本
			const currentActiveVersion = recipeVersions.value.find(v => v.isActive);
			let versionToShow = currentActiveVersion || (recipeVersions.value.length > 0 ? recipeVersions.value[0] : null);

			if (versionToShow) {
				// 只有当 displayedVersionId 无效时才更新它，以保持用户当前的选择
				if (!displayedVersionId.value || !recipeVersions.value.some(v => v.id === displayedVersionId.value)) {
					displayedVersionId.value = versionToShow.id;
				}
			} else {
				displayedVersionId.value = null;
			}
		} catch (error) {
			console.error('Failed to fetch recipe details:', error);
			uni.showToast({ title: '获取配方详情失败', icon: 'none' });
		} finally {
			isLoading.value = false;
		}
	};

	// --- Computed Properties ---
	const displayedVersion = computed(() => {
		return recipeVersions.value.find(v => v.id === displayedVersionId.value) || null;
	});

	const currentUserRoleInTenant = computed(
		() => userStore.userInfo?.tenants.find(t => t.tenant.id === dataStore.currentTenantId)?.role
	);

	const canEditRecipe = computed(() => {
		return currentUserRoleInTenant.value === 'OWNER' || currentUserRoleInTenant.value === 'ADMIN';
	});

	// --- Methods ---
	const navigateBack = () => {
		uni.navigateBack();
	};

	const navigateToEditPage = (familyId : string | null) => {
		if (!familyId) return;
		if (displayedVersion.value) {
			uni.setStorageSync('source_recipe_version', JSON.stringify(displayedVersion.value));
		}
		uni.navigateTo({
			url: `/pages/recipes/edit?familyId=${familyId}`
		});
	};

	// --- Event Handlers ---
	const handleCreateVersion = () => {
		if (recipeFamily.value) navigateToEditPage(recipeFamily.value.id);
	};

	const handleVersionClick = (versionToDisplay : RecipeVersion) => {
		displayedVersionId.value = versionToDisplay.id;
	};

	const handleVersionLongPressAction = (version : RecipeVersion) => {
		// [修改] 仅当长按的版本不是当前使用中的版本时，才弹出操作菜单
		if (!canEditRecipe.value || version.isActive || !recipeFamily.value) return;
		selectedVersionForAction.value = version;
		showVersionOptionsModal.value = true;
	};

	// [新增] 处理从选项对话框中点击“设为使用中”
	const handleActivateVersionOption = () => {
		showVersionOptionsModal.value = false;
		showActivateVersionConfirmModal.value = true;
	};

	// [新增] 处理从选项对话框中点击“删除配方版本”
	const handleDeleteVersionOption = () => {
		showVersionOptionsModal.value = false;
		showDeleteVersionConfirmModal.value = true;
	};

	const handleConfirmActivateVersion = () => { // [修改] 方法名
		if (selectedVersionForAction.value) {
			activateVersionAction(selectedVersionForAction.value);
		}
	};

	const activateVersionAction = async (versionToActivate : RecipeVersion) => {
		if (!recipeFamily.value) return;
		isSubmitting.value = true;
		try {
			await activateRecipeVersion(recipeFamily.value.id, versionToActivate.id);
			uni.showToast({ title: '设置成功', icon: 'success' });
			await loadRecipeData(recipeFamily.value.id);
			dataStore.fetchRecipesData(); // 刷新列表页的数据
		} catch (error) {
			console.error('Failed to activate version:', error);
			uni.showToast({ title: '设置失败，请重试', icon: 'none' });
		} finally {
			isSubmitting.value = false;
			showActivateVersionConfirmModal.value = false; // [修改] 关闭正确的对话框
		}
	};

	// [新增] 确认删除配方版本的逻辑
	const handleConfirmDeleteVersion = async () => {
		if (!selectedVersionForAction.value || !familyId.value) return;
		isSubmitting.value = true;
		try {
			await deleteRecipeVersion(familyId.value, selectedVersionForAction.value.id);
			uni.showToast({ title: '删除成功', icon: 'success' });
			await loadRecipeData(familyId.value);
			await dataStore.fetchRecipesData(); // 刷新列表页的数据
		} catch (error) {
			console.error('Failed to delete recipe version:', error);
			uni.showToast({ title: '删除失败，请重试', icon: 'none' });
		} finally {
			isSubmitting.value = false;
			showDeleteVersionConfirmModal.value = false;
			selectedVersionForAction.value = null;
		}
	};
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	/* 页面级容器的特定样式 */
	.detail-page {
		/* 可以添加一些页面特有的布局样式 */
	}

	/* 模态框内部的特定样式 */
	.modal-prompt-text {
		font-size: 16px;
		color: var(--text-primary);
		text-align: center;
		margin-bottom: 10px;
	}

	.modal-warning-text {
		font-size: 13px;
		color: var(--text-secondary);
		text-align: center;
		margin-bottom: 20px;
		line-height: 1.5;
	}

	/* [修改] 选项对话框样式 */
	.options-list {
		.option-item {
			padding: 15px 0;
			text-align: center;
			cursor: pointer;

			&:not(:last-child)::after {
				left: 0;
				right: 0;
			}

			&:active {
				background-color: #f9f9f9;
			}

			:deep(.main-info) {
				width: 100%;
				justify-content: center;
			}

			:deep(.name) {
				font-size: 18px;
				font-weight: 500;
			}

			:deep(.desc) {
				display: none;
			}
		}
	}
</style>