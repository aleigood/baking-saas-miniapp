<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper" @click="hidePopover">
		<DetailHeader :title="recipeFamily?.name || '加载中...'" />
		<DetailPageLayout @scroll="handleScroll">
			<view class="page-content page-content-with-fab" v-if="!isLoading && recipeFamily">
				<RecipeVersionList
					:versions="recipeVersions"
					:selected-version-id="displayedVersionId"
					:can-edit="canEditRecipe"
					:is-discontinued="recipeFamily.deletedAt !== null"
					@select-version="handleVersionClick"
					@create-version="handleCreateVersion"
					@longpress-version="handleVersionLongPressAction"
				/>

				<MainRecipeDetail v-if="recipeFamily.type === 'MAIN'" :version="displayedVersion" @show-popover="handleShowPopover" />
				<SimpleRecipeDetail v-else :version="displayedVersion" @show-popover="handleShowPopover" />
			</view>
			<view class="loading-spinner" v-else>
				<text>加载中...</text>
			</view>
		</DetailPageLayout>

		<AppModal v-model:visible="showVersionOptionsModal" title="配方版本" :no-header-line="true">
			<view class="options-list">
				<ListItem v-if="!selectedVersionForAction?.isActive" class="option-item" @click="handleActivateVersionOption" :bleed="true">
					<view class="main-info">
						<view class="name">设为使用中</view>
					</view>
				</ListItem>
				<ListItem class="option-item" @click="handleEditVersionOption" :bleed="true">
					<view class="main-info">
						<view class="name">修改配方</view>
					</view>
				</ListItem>
				<ListItem v-if="!selectedVersionForAction?.isActive" class="option-item" @click="handleDeleteVersionOption" :bleed="true">
					<view class="main-info">
						<view class="name">删除配方版本</view>
					</view>
				</ListItem>
			</view>
		</AppModal>

		<AppModal v-model:visible="showActivateVersionConfirmModal" title="设为使用中">
			<view class="modal-prompt-text">要将这个版本设为当前使用的配方吗？</view>
			<view class="modal-warning-text">后续创建生产任务时将默认使用此版本配方。</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showActivateVersionConfirmModal = false">取消</AppButton>
				<AppButton type="primary" @click="handleConfirmActivateVersion" :loading="isSubmitting">
					{{ isSubmitting ? '设置中...' : '确认设置' }}
				</AppButton>
			</view>
		</AppModal>

		<AppModal v-model:visible="showDeleteVersionConfirmModal" title="确认删除">
			<view class="modal-prompt-text">确定要删除这个配方版本吗？</view>
			<view class="modal-warning-text">已被生产任务使用的配方无法删除，此操作不可撤销。</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showDeleteVersionConfirmModal = false">取消</AppButton>
				<AppButton type="danger" @click="handleConfirmDeleteVersion" :loading="isSubmitting">
					{{ isSubmitting ? '删除中...' : '确认删除' }}
				</AppButton>
			</view>
		</AppModal>

		<AppPopover :visible="popover.visible" :content="popover.content" :target-rect="popover.targetRect" placement="right" :offsetY="0" />

		<ExpandingFab v-if="canEditRecipe" :no-tab-bar="true" :icon="'/static/icons/edit.svg'" @click="handleEditSelectedVersion" :visible="isFabVisible" />
	</view>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'; // [核心移除] 不再需要 nextTick
import { onLoad, onShow } from '@dcloudio/uni-app';
import { useUserStore } from '@/store/user';
import { useDataStore } from '@/store/data';
import { useToastStore } from '@/store/toast';
import { useUiStore } from '@/store/ui';
import type { RecipeFamily, RecipeVersion } from '@/types/api';
import { getRecipeFamily, activateRecipeVersion, deleteRecipeVersion, getRecipeVersionFormTemplate } from '@/api/recipes';

import RecipeVersionList from '@/components/RecipeVersionList.vue';
import MainRecipeDetail from '@/components/MainRecipeDetail.vue';
import SimpleRecipeDetail from '@/components/SimpleRecipeDetail.vue';
import AppModal from '@/components/AppModal.vue';
import AppButton from '@/components/AppButton.vue';
import ListItem from '@/components/ListItem.vue';
import DetailHeader from '@/components/DetailHeader.vue';
import DetailPageLayout from '@/components/DetailPageLayout.vue';
import AppPopover from '@/components/AppPopover.vue';
import ExpandingFab from '@/components/ExpandingFab.vue';

defineOptions({
	inheritAttrs: false
});

const userStore = useUserStore();
const dataStore = useDataStore();
const toastStore = useToastStore();
const uiStore = useUiStore();
const isLoading = ref(true);
const isSubmitting = ref(false);
const recipeFamily = ref<RecipeFamily | null>(null);
const recipeVersions = ref<RecipeVersion[]>([]);

const familyId = ref<string | null>(null);
const displayedVersionId = ref<string | null>(null);
const showActivateVersionConfirmModal = ref(false);
const showVersionOptionsModal = ref(false);
const showDeleteVersionConfirmModal = ref(false);
const selectedVersionForAction = ref<RecipeVersion | null>(null);

const isFabVisible = ref(true);
const lastScrollTop = ref(0);
const scrollThreshold = 5;

const popover = reactive<{
	visible: boolean;
	content: string;
	targetRect: {
		left: number;
		top: number;
		width: number;
		height: number;
	} | null;
}>({
	visible: false,
	content: '',
	targetRect: null
});

onLoad(async (options) => {
	if (options?.familyId) {
		familyId.value = options.familyId;
		await loadRecipeData(familyId.value);
	}
});

onShow(async () => {
	if (familyId.value) {
		const currentPageRoute = `/pages/recipes/detail?familyId=${familyId.value}`;
		const toastMessage = uiStore.consumeNextPageToast(currentPageRoute);
		if (toastMessage) {
			toastStore.show(toastMessage);
		}
	}

	if (familyId.value && dataStore.dataStale.recipes) {
		await loadRecipeData(familyId.value);
	}
});

const handleScroll = (event?: any) => {
	if (popover.visible) {
		popover.visible = false;
	}

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

const loadRecipeData = async (id: string) => {
	isLoading.value = true;
	try {
		const fullFamilyData = await getRecipeFamily(id);
		recipeFamily.value = fullFamilyData;
		recipeVersions.value = fullFamilyData.versions.sort((a, b) => b.version - a.version);

		const currentActiveVersion = recipeVersions.value.find((v) => v.isActive);
		let versionToShow = currentActiveVersion || (recipeVersions.value.length > 0 ? recipeVersions.value[0] : null);

		if (versionToShow) {
			if (!displayedVersionId.value || !recipeVersions.value.some((v) => v.id === displayedVersionId.value)) {
				displayedVersionId.value = versionToShow.id;
			}
		} else {
			displayedVersionId.value = null;
		}
		dataStore.dataStale.recipes = false;
	} catch (error) {
		console.error('Failed to fetch recipe details:', error);
		toastStore.show({
			message: '获取配方详情失败',
			type: 'error'
		});
	} finally {
		isLoading.value = false;
	}
};

const displayedVersion = computed(() => {
	return recipeVersions.value.find((v) => v.id === displayedVersionId.value) || null;
});

const currentUserRoleInTenant = computed(() => userStore.userInfo?.tenants.find((t) => t.tenant.id === dataStore.currentTenantId)?.role);

const canEditRecipe = computed(() => {
	return currentUserRoleInTenant.value === 'OWNER' || currentUserRoleInTenant.value === 'ADMIN';
});

const navigateToEditPage = async (familyId: string | null, mode: 'edit' | 'newVersion', versionId?: string) => {
	if (!familyId || !displayedVersion.value || !recipeFamily.value) return;

	try {
		const sourceVersionId = versionId || displayedVersion.value.id;
		const formTemplate = await getRecipeVersionFormTemplate(familyId, sourceVersionId);
		uni.setStorageSync('source_recipe_version_form', JSON.stringify(formTemplate));

		const baseUrl = '/pages/recipes/edit';
		let url = `${baseUrl}?familyId=${familyId}&mode=${mode}`;
		if (versionId) {
			url += `&versionId=${versionId}`;
		}

		uni.navigateTo({ url });
	} catch (error) {
		console.error('准备新版本数据失败:', error);
		toastStore.show({
			message: '准备新版本数据失败',
			type: 'error'
		});
	}
};

// [核心改造] 优化 handleShowPopover 函数以解决闪烁问题
const handleShowPopover = (payload: { info: string; rect: any }) => {
	const { info, rect } = payload;

	if (!info || !rect) {
		hidePopover();
		return;
	}

	// 如果点击的是同一个已经显示的弹窗，则关闭它
	if (popover.visible && popover.content === info) {
		hidePopover();
		return;
	}

	// 否则，直接更新内容和位置并显示。Vue 的响应式系统会处理更新，无需先关闭再打开
	popover.content = info;
	popover.targetRect = {
		left: rect.left,
		top: rect.top,
		width: rect.width,
		height: rect.height
	};
	popover.visible = true;
};

const hidePopover = () => {
	popover.visible = false;
};

const handleCreateVersion = () => {
	if (recipeFamily.value) navigateToEditPage(recipeFamily.value.id, 'newVersion', displayedVersion.value?.id);
};

const handleEditSelectedVersion = () => {
	if (recipeFamily.value) navigateToEditPage(recipeFamily.value.id, 'edit', displayedVersion.value?.id);
};

const handleVersionClick = (versionToDisplay: RecipeVersion) => {
	displayedVersionId.value = versionToDisplay.id;
};

// [修改] 移除对 isActive 的检查，允许对使用中的版本进行操作
const handleVersionLongPressAction = (version: RecipeVersion) => {
	if (!canEditRecipe.value || !recipeFamily.value) return;
	selectedVersionForAction.value = version;
	showVersionOptionsModal.value = true;
};

// [新增] “修改配方”选项的处理器
const handleEditVersionOption = () => {
	showVersionOptionsModal.value = false;
	if (recipeFamily.value && selectedVersionForAction.value) {
		navigateToEditPage(recipeFamily.value.id, 'edit', selectedVersionForAction.value.id);
	}
};

const handleActivateVersionOption = () => {
	showVersionOptionsModal.value = false;
	showActivateVersionConfirmModal.value = true;
};

const handleDeleteVersionOption = () => {
	showVersionOptionsModal.value = false;
	showDeleteVersionConfirmModal.value = true;
};

const handleConfirmActivateVersion = () => {
	if (selectedVersionForAction.value) {
		activateVersionAction(selectedVersionForAction.value);
	}
};

const activateVersionAction = async (versionToActivate: RecipeVersion) => {
	if (!recipeFamily.value) return;
	isSubmitting.value = true;
	try {
		await activateRecipeVersion(recipeFamily.value.id, versionToActivate.id);
		toastStore.show({
			message: '设置成功',
			type: 'success'
		});
		dataStore.markRecipesAsStale();
		await loadRecipeData(recipeFamily.value.id);
	} catch (error) {
		console.error('Failed to activate version:', error);
	} finally {
		isSubmitting.value = false;
		showActivateVersionConfirmModal.value = false;
	}
};

const handleConfirmDeleteVersion = async () => {
	if (!selectedVersionForAction.value || !familyId.value) return;
	isSubmitting.value = true;
	try {
		await deleteRecipeVersion(familyId.value, selectedVersionForAction.value.id);
		toastStore.show({
			message: '删除成功',
			type: 'success'
		});
		showDeleteVersionConfirmModal.value = false;
		selectedVersionForAction.value = null;
		dataStore.markRecipesAsStale();
		await loadRecipeData(familyId.value);
	} catch (error) {
		showDeleteVersionConfirmModal.value = false;
	} finally {
		isSubmitting.value = false;
	}
};
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
@include list-item-option-style;

.page-wrapper {
	display: flex;
	flex-direction: column;
	height: 100vh;
}

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
</style>
