<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper" @click="hidePopover">
		<DetailHeader :title="recipeFamily?.name || '加载中...'" />
		<DetailPageLayout @scroll="handleScroll">
			<view class="page-content page-content-with-fab animated-content" :class="{ 'is-revealed': !isLoading }" v-if="recipeFamily" :key="'recipe-detail-content'">
				<view
					v-if="canEditRecipe && (pendingDependencyUpgradePlan?.dependencies.length || dependencyUpgradePlan?.affectedRecipes.length)"
					class="dependency-update-band"
					@click="showDependencyUpgradeModal = true"
				>
					<view class="dependency-update-copy">
						<text class="dependency-update-title">{{ pendingDependencyUpgradePlan?.dependencies.length ? '当前配方依赖可更新' : '关联配方可更新' }}</text>
						<text class="dependency-update-desc">
							{{ pendingDependencyUpgradePlan?.dependencies.length
								? `${pendingDependencyUpgradePlan.dependencies.length} 个自制原料已有新版本`
								: `${dependencyUpgradePlan?.affectedRecipes.length || 0} 个上游配方仍在使用旧依赖版本` }}
						</text>
					</view>
					<text class="dependency-update-action">查看</text>
				</view>

				<RecipeVersionList
					:recipe-name="recipeFamily?.name || ''"
					:versions="recipeVersions"
					:selected-version-id="displayedVersionId"
					:can-edit="canEditRecipe"
					:is-discontinued="recipeFamily.deletedAt !== null"
					@select-version="handleVersionClick"
					@longpress-version="handleVersionLongPressAction"
					@create-version="handleCreateVersion"
				/>

				<view
					class="recipe-detail-animated-container"
					v-if="renderedVersion"
					:key="'recipe-version-details-' + renderedVersionId"
					:class="{ 'is-fading-out': isFadingOutVersion }"
				>
					<MainRecipeDetail v-if="recipeFamily.type === 'MAIN'" :key="'main-detail'" :version="renderedVersion" @show-popover="handleShowPopover" />
					<SimpleRecipeDetail v-else :key="'simple-detail'" :version="renderedVersion" :usage-count="recipeFamily.usageCount || 0" @show-popover="handleShowPopover" />
				</view>
			</view>

			<view v-if="isLoading" class="page-content page-content-with-fab skeleton-overlay" :key="'skeleton-detail'">
				<SkeletonDetail :show-tabs="true" :meta-count="4" :show-chart="true" :list-count="0" :table-groups="2" :show-notes="true" />
			</view>

			<EmptyState
				v-if="!isLoading && !recipeFamily"
				:key="'empty-state-error'"
				icon="/static/icons/network-error.svg"
				title="加载失败"
				subtitle="请检查网络连接后重试"
				:showAction="true"
				:full-page="true"
				actionText="重新加载"
				@action="familyId && loadRecipeData(familyId)"
			/>
		</DetailPageLayout>

		<AppModal ref="versionOptionsModalRef" v-model:visible="showVersionOptionsModal" :key="'version-options-modal'" title="配方版本" :no-header-line="true">
			<view class="options-list">
				<ListItem v-if="!selectedVersionForAction?.isActive" class="option-item" @click="handleActivateVersionOption" :bleed="true">
					<view class="main-info">
						<view class="name">设为使用中</view>
					</view>
				</ListItem>
				<ListItem class="option-item" @click="handleEditVersionNotesOption" :bleed="true">
					<view class="main-info">
						<view class="name">修改版本说明</view>
					</view>
				</ListItem>
			</view>
		</AppModal>

		<AppModal v-model:visible="showEditVersionNotesModal" :key="'edit-version-notes-modal'" title="修改版本说明">
			<FormItem label="版本说明">
				<input class="input-field" v-model="versionNotesDraft" maxlength="100" placeholder="请输入版本说明" />
			</FormItem>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showEditVersionNotesModal = false" :disabled="isSubmitting">取消</AppButton>
				<AppButton type="primary" @click="handleSaveVersionNotes" :loading="isSubmitting" :disabled="!versionNotesDraft.trim()">保存</AppButton>
			</view>
		</AppModal>

		<AppModal v-model:visible="showActivateVersionConfirmModal" :key="'activate-confirm-modal'" title="设为使用中">
			<view class="modal-prompt-text">要将这个版本设为当前使用的配方吗？</view>
			<view class="modal-warning-text">后续创建生产任务时将默认使用此版本配方。</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showActivateVersionConfirmModal = false">取消</AppButton>
				<AppButton type="primary" @click="handleConfirmActivateVersion" :loading="isSubmitting">
					{{ isSubmitting ? '设置中...' : '确认设置' }}
				</AppButton>
			</view>
		</AppModal>

		<AppModal v-model:visible="showDependencyUpgradeModal" :key="'dependency-upgrade-modal'" title="更新关联配方">
			<view class="dependency-modal-intro">
				系统将基于各配方的最新版本创建并使用新版本，原版本和已有任务不会改变。
			</view>
			<scroll-view :scroll-y="true" class="dependency-upgrade-scroll">
				<view v-if="pendingDependencyUpgradePlan?.dependencies.length" class="dependency-upgrade-list">
					<view v-for="item in pendingDependencyUpgradePlan.dependencies" :key="item.familyId" class="dependency-upgrade-row">
						<view class="dependency-recipe-copy">
							<text class="dependency-recipe-name">{{ item.familyName }}</text>
							<text class="dependency-recipe-type">自制原料</text>
						</view>
						<text class="dependency-update-state">有新版本</text>
					</view>
				</view>
				<view v-else class="dependency-upgrade-list">
					<view v-for="item in dependencyUpgradePlan?.affectedRecipes || []" :key="item.familyId" class="dependency-upgrade-row">
						<view class="dependency-recipe-copy">
							<text class="dependency-recipe-name">{{ item.familyName }}</text>
							<text class="dependency-recipe-type">{{ getRecipeTypeLabel(item.type) }}</text>
						</view>
						<text class="dependency-update-state">将更新</text>
					</view>
				</view>
			</scroll-view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showDependencyUpgradeModal = false" :disabled="isSubmitting">暂不更新</AppButton>
				<AppButton type="primary" @click="handleApplyDependencyUpgrades" :loading="isSubmitting">更新并使用</AppButton>
			</view>
		</AppModal>

		<AppModal v-model:visible="showOperationLogsModal" :key="'recipe-operation-logs-modal'" title="配方操作日志">
			<scroll-view :scroll-y="true" class="operation-log-scroll">
				<view v-if="isLoadingOperationLogs" class="operation-log-empty">正在加载...</view>
				<view v-else-if="operationLogs.length === 0" class="operation-log-empty">暂无操作记录</view>
				<view v-else class="operation-timeline">
					<view v-for="log in operationLogs" :key="log.id" class="operation-log-item">
						<view class="operation-marker"></view>
						<view class="operation-log-content">
							<view class="operation-log-head">
								<text class="operation-description">{{ log.description }}</text>
							</view>
							<!-- 修改摘要展示为有颜色的标签 -->
							<view v-if="parseOperationLogTags(log).length > 0" class="log-change-tags">
								<view 
									v-for="(tag, idx) in parseOperationLogTags(log)" 
									:key="idx" 
									class="log-change-tag"
									:class="tag.type"
								>
									<text>{{ tag.name }}</text>
								</view>
							</view>
							<view class="operation-meta">
								<text class="operation-actor">{{ log.actor?.name || log.actor?.phone || '系统' }}</text>
								<text class="operation-meta-separator">·</text>
								<text class="operation-time">{{ formatOperationTime(log.createdAt) }}</text>
							</view>
						</view>
					</view>
				</view>
			</scroll-view>
		</AppModal>

		<AppPopover :visible="popover.visible" :content="popover.content" :target-rect="popover.targetRect" placement="right" :offsetY="0" />

		<ExpandingFab v-if="recipeFamily" :actions="recipeFabActions" :no-tab-bar="true" :visible="isFabVisible" />
	</view>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { useUserStore } from '@/store/user';
import { useDataStore } from '@/store/data';
import { useToastStore } from '@/store/toast';
import { useUiStore } from '@/store/ui';
import type { DependencyUpgradePlan, PendingDependencyUpgradePlan, RecipeFamily, RecipeOperationLog, RecipeType, RecipeVersion } from '@/types/api';
import {
	applyDependencyUpgrades,
	applyPendingDependencyUpgrades,
	getDependencyUpgradePlan,
	getPendingDependencyUpgrades,
	getRecipeFamily,
	activateRecipeVersion,
	getRecipeVersionFormTemplate,
	getRecipeOperationLogs,
	updateRecipeVersionNotes
} from '@/api/recipes';
import { formatRecipeChangeSummary, formatChangeItem } from '@/utils/recipe-version';

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
// [新增] 引入骨架屏和空状态组件
import SkeletonDetail from '@/components/SkeletonDetail.vue';
import EmptyState from '@/components/EmptyState.vue';
import FormItem from '@/components/FormItem.vue';

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
const renderedVersionId = ref<string | null>(null);
const isFadingOutVersion = ref(false);
const showActivateVersionConfirmModal = ref(false);
const showVersionOptionsModal = ref(false);
const showDependencyUpgradeModal = ref(false);
const showEditVersionNotesModal = ref(false);
const showOperationLogsModal = ref(false);
const versionNotesDraft = ref('');
const operationLogs = ref<RecipeOperationLog[]>([]);
const isLoadingOperationLogs = ref(false);
const selectedVersionForAction = ref<RecipeVersion | null>(null);
const dependencyUpgradePlan = ref<DependencyUpgradePlan | null>(null);
const pendingDependencyUpgradePlan = ref<PendingDependencyUpgradePlan | null>(null);

const versionOptionsModalRef = ref<InstanceType<typeof AppModal> | null>(null);

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

		// 拿到数据立刻赋值，触发底层 DOM 创建
		recipeFamily.value = fullFamilyData;
		recipeVersions.value = fullFamilyData.versions.sort((a, b) => b.version - a.version);

		const currentActiveVersion = recipeVersions.value.find((v) => v.isActive);
		let versionToShow = currentActiveVersion || (recipeVersions.value.length > 0 ? recipeVersions.value[0] : null);

		if (versionToShow) {
			if (!displayedVersionId.value || !recipeVersions.value.some((v) => v.id === displayedVersionId.value)) {
				displayedVersionId.value = versionToShow.id;
				renderedVersionId.value = versionToShow.id;
			}
		} else {
			displayedVersionId.value = null;
			renderedVersionId.value = null;
		}

		await Promise.all([
			loadDependencyUpgradePlan(id, currentActiveVersion?.id, fullFamilyData.deletedAt),
			loadPendingDependencyUpgradePlan(id, fullFamilyData.deletedAt)
		]);
	} catch (error) {
		console.error('Failed to fetch recipe details:', error);
		// 出现错误时，不再使用 toastStore 弹窗，而是置空数据，展示 EmptyState 兜底页面
		recipeFamily.value = null;
	} finally {
		// 预留 200ms 排版时间，等 CPU 闲下来再揭开骨架屏幕布
		setTimeout(() => {
			isLoading.value = false;
		}, 200);
	}
};

const loadPendingDependencyUpgradePlan = async (id: string, deletedAt?: string | null) => {
	pendingDependencyUpgradePlan.value = null;
	if (deletedAt) return;
	try {
		const plan = await getPendingDependencyUpgrades(id);
		pendingDependencyUpgradePlan.value = plan.dependencies.length > 0 ? plan : null;
	} catch (error) {
		console.error('Failed to load pending dependency upgrades:', error);
	}
};

const loadDependencyUpgradePlan = async (id: string, versionId?: string, deletedAt?: string | null) => {
	dependencyUpgradePlan.value = null;
	if (!versionId || deletedAt) return;
	try {
		const plan = await getDependencyUpgradePlan(id, versionId);
		dependencyUpgradePlan.value = plan.affectedRecipes.length > 0 ? plan : null;
	} catch (error) {
		console.error('Failed to load dependency upgrade plan:', error);
	}
};

const getRecipeTypeLabel = (type: RecipeType) => {
	if (type === 'MAIN') return '产品配方';
	if (type === 'PRE_DOUGH') return '面种配方';
	return '附加配方';
};

const displayedVersion = computed(() => {
	return recipeVersions.value.find((v) => v.id === displayedVersionId.value) || null;
});

const renderedVersion = computed(() => {
	return recipeVersions.value.find((v) => v.id === renderedVersionId.value) || null;
});

watch(displayedVersionId, (newId) => {
	if (!newId) return;
	if (newId === renderedVersionId.value) {
		return;
	}
	if (!renderedVersionId.value) {
		renderedVersionId.value = newId;
		return;
	}
	isFadingOutVersion.value = true;
	setTimeout(() => {
		renderedVersionId.value = newId;
		isFadingOutVersion.value = false;
	}, 150);
});

const currentUserRoleInTenant = computed(() => userStore.userInfo?.tenants.find((t) => t.tenant.id === dataStore.currentTenantId)?.role);

const canEditRecipe = computed(() => {
	return (currentUserRoleInTenant.value === 'OWNER' || currentUserRoleInTenant.value === 'ADMIN') && recipeFamily.value?.freeTierEnabled !== false;
});

const recipeFabActions = computed(() => {
	return [{
		icon: '/static/icons/op_log.svg',
		text: '操作日志',
		action: openOperationLogs
	}];
});

const navigateToEditPage = async (familyId: string | null, versionId: string) => {
	if (!familyId || !recipeFamily.value) return;

	try {
		const formTemplate = await getRecipeVersionFormTemplate(familyId, versionId);
		uni.setStorageSync('source_recipe_version_form', JSON.stringify(formTemplate));

		const baseUrl = '/pages/recipes/edit';
		const url = `${baseUrl}?familyId=${familyId}&mode=edit&versionId=${versionId}`;

		uni.navigateTo({ url });
	} catch (error) {
		console.error('准备编辑/新版本数据失败:', error);
		toastStore.show({
			message: '加载配方数据失败',
			type: 'error'
		});
	}
};

const handleShowPopover = (payload: { info: string; rect: any }) => {
	const { info, rect } = payload;

	if (!info || !rect) {
		hidePopover();
		return;
	}

	if (popover.visible && popover.content === info) {
		hidePopover();
		return;
	}

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
	const latestVersion = recipeVersions.value[0];
	if (recipeFamily.value && latestVersion) {
		navigateToEditPage(recipeFamily.value.id, latestVersion.id);
	}
};

const handleVersionClick = (versionToDisplay: RecipeVersion) => {
	displayedVersionId.value = versionToDisplay.id;
};

const handleVersionLongPressAction = (version: RecipeVersion) => {
	if (!canEditRecipe.value || !recipeFamily.value) return;
	selectedVersionForAction.value = version;
	showVersionOptionsModal.value = true;
};

const handleEditVersionNotesOption = () => {
	if (!selectedVersionForAction.value) return;
	const openEditor = () => {
		versionNotesDraft.value = selectedVersionForAction.value?.notes || '';
		showEditVersionNotesModal.value = true;
	};
	if (versionOptionsModalRef.value) {
		versionOptionsModalRef.value.closeAndRun(openEditor);
	} else {
		showVersionOptionsModal.value = false;
		openEditor();
	}
};

const handleSaveVersionNotes = async () => {
	if (!recipeFamily.value || !selectedVersionForAction.value || !versionNotesDraft.value.trim()) return;
	isSubmitting.value = true;
	try {
		await updateRecipeVersionNotes(
			recipeFamily.value.id,
			selectedVersionForAction.value.id,
			versionNotesDraft.value.trim()
		);
		showEditVersionNotesModal.value = false;
		toastStore.show({ message: '版本说明已更新', type: 'success' });
		dataStore.markRecipesAsStale();
		await loadRecipeData(recipeFamily.value.id);
	} catch (error) {
		console.error('Failed to update recipe version notes:', error);
	} finally {
		isSubmitting.value = false;
	}
};

const openOperationLogs = async () => {
	if (!recipeFamily.value) return;
	showOperationLogsModal.value = true;
	isLoadingOperationLogs.value = true;
	try {
		operationLogs.value = await getRecipeOperationLogs(recipeFamily.value.id);
	} catch (error) {
		console.error('Failed to load recipe operation logs:', error);
		operationLogs.value = [];
	} finally {
		isLoadingOperationLogs.value = false;
	}
};

const getOperationChangeSummary = (log: RecipeOperationLog) =>
	formatRecipeChangeSummary(log.metadata?.changeSummary);

const parseOperationLogTags = (log: RecipeOperationLog) => {
	const tags: Array<{ name: string; type: 'up' | 'down' | 'neutral' }> = [];
	
	if (log.action === 'VERSION_NOTES_UPDATED') {
		const before = log.metadata?.before || '无';
		const after = log.metadata?.after || '无';
		tags.push({
			name: `说明: “${before}” → “${after}”`,
			type: 'neutral'
		});
	} else if (log.metadata?.changeSummary?.items?.length) {
		log.metadata.changeSummary.items.forEach(item => {
			const text = formatChangeItem(item);
			if (text) {
				let direction: 'up' | 'down' | 'neutral' = 'neutral';
				if (text.includes('↑') || text.includes('新增')) {
					direction = 'up';
				} else if (text.includes('↓') || text.includes('移除')) {
					direction = 'down';
				}
				tags.push({ name: text, type: direction });
			}
		});
	}
	
	return tags;
};

const formatOperationTime = (dateInput: string) => {
	const date = new Date(dateInput);
	if (Number.isNaN(date.getTime())) return '';
	return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const handleActivateVersionOption = () => {
	showVersionOptionsModal.value = false;
	showActivateVersionConfirmModal.value = true;
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

const handleApplyDependencyUpgrades = async () => {
	if (!recipeFamily.value) return;
	isSubmitting.value = true;
	try {
		const result = pendingDependencyUpgradePlan.value
			? await applyPendingDependencyUpgrades(recipeFamily.value.id)
			: dependencyUpgradePlan.value
				? await applyDependencyUpgrades(
					dependencyUpgradePlan.value.sourceFamilyId,
					dependencyUpgradePlan.value.sourceVersionId
				)
				: null;
		if (!result) return;
		showDependencyUpgradeModal.value = false;
		dataStore.markRecipesAsStale();
		dataStore.markProductionAsStale();
		dataStore.markProductsForTaskCreationAsStale();
		toastStore.show({
			message: `已更新 ${result.upgradedRecipes.length} 个关联配方`,
			type: 'success'
		});
		await loadRecipeData(recipeFamily.value.id);
	} catch (error) {
		console.error('Failed to apply dependency upgrades:', error);
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

.dependency-update-band {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	margin: 0 2px 18px;
	padding: 12px 14px;
	border-left: 4px solid #c97a2b;
	border-top: 1px solid #f5dfc6;
	border-right: 1px solid #f5dfc6;
	border-bottom: 1px solid #f5dfc6;
	border-radius: 8px;
	background: #fff6eb; /* 调深了一点，比页面背景 #fdf8f2 更具暖杏色区分度 */
	overflow: hidden;
}

.dependency-update-copy {
	display: flex;
	flex-direction: column;
	gap: 3px;
	min-width: 0;
}

.dependency-update-title {
	font-size: 14px;
	font-weight: 600;
	color: #744216;
}

.dependency-update-desc,
.dependency-modal-intro {
	font-size: 13px;
	line-height: 1.55;
	color: var(--text-secondary);
}

.dependency-update-action {
	font-size: 13px;
	font-weight: 600;
	color: var(--primary-color);
	flex-shrink: 0;
}

.dependency-upgrade-scroll {
	max-height: 320px;
	margin-top: 14px;
}

.dependency-upgrade-list {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.dependency-upgrade-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 12px;
	border: 1px solid var(--border-color);
	border-radius: 8px;
	background: #faf8f5;
}

.dependency-recipe-copy {
	display: flex;
	flex-direction: column;
	gap: 3px;
	min-width: 0;
}

.dependency-recipe-name {
	font-size: 14px;
	font-weight: 600;
	color: var(--text-primary);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.dependency-recipe-type {
	font-size: 12px;
	color: var(--text-secondary);
}

.dependency-update-state {
	padding: 3px 7px;
	border-radius: 6px;
	background: #e5f2e8;
	font-size: 12px;
	font-weight: 600;
	color: #2f6b43;
	flex-shrink: 0;
}

.recipe-detail-animated-container {
	animation: fadeInClean 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;

	&.is-fading-out {
		animation: fadeOutClean 0.15s ease forwards;
	}
}

@include form-control-styles;

.operation-log-scroll {
	max-height: 430px;
}

.operation-log-empty {
	padding: 34px 0;
	text-align: center;
	font-size: 13px;
	color: var(--text-secondary);
}

.operation-timeline {
	position: relative;
	padding-left: 20px;
}

.operation-timeline::before {
	content: '';
	position: absolute;
	top: 10px;
	bottom: 10px;
	left: 6px;
	width: 1px;
	background: #efebe9; /* 更加温暖淡雅的轴线颜色 */
}

.operation-log-item {
	position: relative;
	display: flex;
	padding-bottom: 22px;
}

.operation-log-item:last-child {
	padding-bottom: 0;
}

.operation-marker {
	position: absolute;
	top: 6px;
	left: -17px;
	width: 7px;
	height: 7px;
	border-radius: 50%;
	background: #ab9d88; /* 默认灰褐色 */
	border: 2px solid var(--card-bg);
	box-shadow: 0 0 0 2px rgba(171, 157, 136, 0.15); /* 外围微弱漫反射光圈 */
	transition: all 0.3s ease;
}

.operation-log-item:first-child .operation-marker {
	background: var(--primary-color); /* 最新的一条为主题暖褐色高亮 */
	box-shadow: 0 0 0 3px rgba(140, 90, 59, 0.25); /* 更显著的外发光波纹 */
}

.operation-log-content {
	min-width: 0;
	width: 100%;
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.operation-log-head {
	display: flex;
	align-items: center;
}

.operation-description {
	font-size: 14px;
	font-weight: 600;
	line-height: 1.4;
	color: var(--text-primary);
}

.log-change-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin-top: 2px;
}

.log-change-tag {
	display: inline-flex;
	align-items: center;
	padding: 2px 6px;
	border-radius: 4px;
	font-size: 11px;
	font-weight: 500;
	line-height: 1.2;

	&.up {
		background-color: #e6f4ea;
		color: #137333;
	}

	&.down {
		background-color: #fce8e6;
		color: #c5221f;
	}

	&.neutral {
		background-color: #f5f0eb; /* 淡灰褐色底 */
		color: #ab9d88; /* 柔和辅助文字色 */
	}
}

.operation-meta {
	display: flex;
	align-items: center;
	gap: 6px;
	margin-top: 2px;
}

.operation-actor,
.operation-time,
.operation-meta-separator {
	font-size: 11px;
	color: var(--text-secondary);
}
</style>

<style lang="scss">
@keyframes fadeInClean {
	from {
		opacity: 0;
		transform: translateY(5px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

@keyframes fadeOutClean {
	to {
		opacity: 0;
		transform: translateY(-5px);
	}
}
</style>
