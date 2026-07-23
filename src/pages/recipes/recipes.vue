<template>
	<view class="full-height-container">
		<RefreshableLayout ref="refreshableLayout" @refresh="handleRefresh" @scroll="handleScroll" class="full-height-wrapper">
			<view
				class="page-content page-content-with-tabbar-fab no-horizontal-padding animated-content"
				:class="{ 'is-revealed': !isLoading && hasBeenActivated }"
				v-if="hasBeenActivated"
			>
				<view class="content-padding">
					<view class="card">
						<view class="card-title"><span>本月产品制作排行</span></view>
						<view v-if="recipeStatsForChart.length > 0" :key="'stats-ranking'" class="ranking-list">
							<view v-for="(item, index) in recipeStatsForChart.slice(0, 10)" :key="item.name" class="ranking-item">
								<text class="rank">{{ index + 1 }}</text>
								<text class="name">{{ item.name }}</text>
								<text class="count">{{ item.value }} 个</text>
							</view>
						</view>
						<view v-else :key="'stats-empty'" class="empty-state">
							<text>暂无排行信息</text>
						</view>
					</view>
					<view v-if="filterTabs.length > 0" :key="'filter-tabs'" class="filter-wrapper">
						<FilterTabs v-model="activeFilter" :tabs="filterTabs" />
					</view>
				</view>

				<view class="list-wrapper">
					<template v-if="hasAnyRecipe">
						<view class="recipe-list-animated-container" :key="'recipes-list-' + renderedFilter" :class="{ 'is-fading-out': isFadingOutList }">
							<view v-if="renderedRecipes.length > 0">
								<ListItem
									v-for="(family, index) in renderedRecipes"
									:key="family.id"
									@click="navigateToDetail(family.id)"
									@longpress="openRecipeActions(family)"
									:vibrate-on-long-press="canEditRecipe"
									:bleed="true"
									:divider="index < renderedRecipes.length - 1"
									:discontinued="!!family.deletedAt"
									:animate-on-mount="triggerListAnimation"
									:animation-index="index"
								>
									<template v-if="family.type === 'MAIN'">
										<view class="main-info">
											<view>
												<view class="name">
													<text class="name-text">{{ family.name }}</text>
													<text v-if="family.deletedAt" class="status-tag discontinued">已停用</text>
													<text v-else-if="family.readOnly" class="status-tag read-only">使用受限</text>
												</view>
												<view class="desc">共 {{ family.versionCount || 0 }} 个版本</view>
											</view>
										</view>
										<view class="side-info">
											<text v-if="family.activeVersion" class="version-tag">
												V{{ family.activeVersion.version }} {{ family.activeVersion.notes || '当前' }}
											</text>
											<view v-else class="version-pill-empty">暂无版本</view>
										</view>
									</template>
									<template v-else>
										<view class="main-info">
											<view>
												<view class="name">
													<text class="name-text">{{ family.name }}</text>
													<text v-if="family.deletedAt" class="status-tag discontinued">已停用</text>
												</view>
												<view class="desc">共 {{ family.versionCount || 0 }} 个版本</view>
											</view>
										</view>
										<view class="side-info">
											<text v-if="family.activeVersion" class="version-tag">
												V{{ family.activeVersion.version }} {{ family.activeVersion.notes || '当前' }}
											</text>
											<view v-else class="version-pill-empty">暂无版本</view>
										</view>
									</template>
								</ListItem>
							</view>
							<EmptyState
								v-else-if="isInitialFetchDone"
								:key="'recipes-empty-filtered'"
								icon="/static/icons/empty-list.svg"
								title="暂无配方"
								subtitle="该分类下暂无配方"
							/>
						</view>
					</template>
					<EmptyState
						v-else-if="isInitialFetchDone"
						:key="'recipes-empty-all'"
						icon="/static/icons/empty-list.svg"
						title="暂无配方"
						subtitle="暂无任何配方，快去创建吧！"
					/>
				</view>
			</view>

			<view
				v-if="isLoading && uiStore.activeTab === 'recipes'"
				:key="'recipes-skeleton'"
				class="page-content page-content-with-tabbar-fab no-horizontal-padding skeleton-overlay"
			>
				<view class="content-padding">
					<SkeletonCard mode="ranking" />
					<view class="skeleton-block shimmer" style="height: 36px; margin-top: 10px; margin-bottom: 20px; border-radius: 18px; width: 60%"></view>
				</view>
				<view class="list-wrapper">
					<SkeletonListItem v-for="i in 5" :key="i" :bleed="true" :divider="i < 5" />
				</view>
			</view>
		</RefreshableLayout>

		<ExpandingFab v-if="canEditRecipe" :actions="fabActions" :visible="isFabVisible" />

		<AppModal v-model:visible="showRecipeActionsModal" :key="'recipe-actions-modal'" title="配方操作" :no-header-line="true">
			<view class="options-list">
				<ListItem v-if="selectedRecipe?.readOnly" class="option-item" @click="handleUnrestrictRecipe" :bleed="true">
					<view class="main-info">
						<view class="name">解除受限</view>
					</view>
				</ListItem>
				<template v-if="!selectedRecipe?.deletedAt">
					<ListItem class="option-item" @click="handleDiscontinueRecipe" :bleed="true">
						<view class="main-info">
							<view class="name">停用配方</view>
						</view>
					</ListItem>
				</template>
				<template v-else>
					<ListItem class="option-item" @click="handleRestoreRecipe" :bleed="true">
						<view class="main-info">
							<view class="name">恢复配方</view>
						</view>
					</ListItem>
				</template>
				<ListItem class="option-item" @click="handleDeleteRecipe" :bleed="true">
					<view class="main-info">
						<view class="name">删除配方</view>
					</view>
				</ListItem>
			</view>
		</AppModal>

		<AppModal v-model:visible="showDeleteRecipeConfirmModal" :key="'delete-recipe-modal'" title="确认删除">
			<view class="modal-prompt-text">确定要删除 “{{ selectedRecipe?.name }}” 吗？</view>
			<view class="modal-warning-text">已被生产任务使用的配方将无法被删除。此操作不可撤销。</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showDeleteRecipeConfirmModal = false">取消</AppButton>
				<AppButton type="danger" @click="confirmDeleteRecipe" :loading="isSubmitting">
					{{ isSubmitting ? '' : '确认删除' }}
				</AppButton>
			</view>
		</AppModal>

		<AppModal v-model:visible="showDiscontinueRecipeConfirmModal" :key="'discontinue-recipe-modal'" title="确认停用">
			<view class="modal-prompt-text">确定要停用 “{{ selectedRecipe?.name }}” 吗？</view>
			<view class="modal-warning-text">停用后，此配方将无法用于新的生产任务。</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showDiscontinueRecipeConfirmModal = false">取消</AppButton>
				<AppButton type="danger" @click="confirmDiscontinueRecipe" :loading="isSubmitting">
					{{ isSubmitting ? '' : '确认停用' }}
				</AppButton>
			</view>
		</AppModal>

		<AppModal v-model:visible="showRestoreRecipeConfirmModal" :key="'restore-recipe-modal'" title="确认恢复">
			<view class="modal-prompt-text">确定要恢复 “{{ selectedRecipe?.name }}” 吗？</view>
			<view class="modal-warning-text">恢复后，此配方将可以重新用于生产任务。</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showRestoreRecipeConfirmModal = false">取消</AppButton>
				<AppButton type="primary" @click="confirmRestoreRecipe" :loading="isSubmitting">
					{{ isSubmitting ? '' : '确认恢复' }}
				</AppButton>
			</view>
		</AppModal>
	</view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useUserStore } from '@/store/user';
import { useDataStore } from '@/store/data';
import { useToastStore } from '@/store/toast';
import { useUiStore } from '@/store/ui';
import { discontinueRecipe, restoreRecipe, deleteRecipe } from '@/api/recipes';
import { unrestrictFreeTierRecipe } from '@/api/billing';
import type { RecipeFamily } from '@/types/api';
import ExpandingFab from '@/components/ExpandingFab.vue';
import ListItem from '@/components/ListItem.vue';
import FilterTabs from '@/components/FilterTabs.vue';
import AppModal from '@/components/AppModal.vue';
import AppButton from '@/components/AppButton.vue';
import RefreshableLayout from '@/components/RefreshableLayout.vue';
import EmptyState from '@/components/EmptyState.vue';

// 修改：引入新的骨架屏组件，移除 SkeletonList
import SkeletonCard from '@/components/SkeletonCard.vue';
import SkeletonListItem from '@/components/SkeletonListItem.vue';

const userStore = useUserStore();
const dataStore = useDataStore();
const toastStore = useToastStore();
const uiStore = useUiStore();

const isLoading = ref(false);
const hasBeenActivated = ref(false);
const isInitialFetchDone = ref(false);

const activeFilter = ref('BREAD');
const renderedFilter = ref('BREAD');
const isFadingOutList = ref(false);
const isSubmitting = ref(false);
const selectedRecipe = ref<RecipeFamily | null>(null);

const listAnimationKey = ref(Date.now());
const triggerListAnimation = ref(false);

watch(activeFilter, (newFilter) => {
	if (!newFilter) return;
	if (newFilter === renderedFilter.value) {
		return;
	}
	if (!renderedFilter.value || isLoading.value || !hasBeenActivated.value) {
		renderedFilter.value = newFilter;
		return;
	}
	isFadingOutList.value = true;
	setTimeout(() => {
		renderedFilter.value = newFilter;
		isFadingOutList.value = false;
	}, 150);
});

const recipeTypeMap = {
	MAIN: '面团',
	PRE_DOUGH: '面种',
	EXTRA: '自制原料'
};

const formatRecipeNames = (names: string[] | undefined, fallback: string) => (names && names.length > 0 ? names.join('，') : fallback);

const formatActiveVersion = (family: RecipeFamily) => {
	const activeVersion = family.activeVersion;
	if (!activeVersion) return '暂无版本';
	return `${activeVersion.notes || '当前版本'} · V${activeVersion.version}`;
};

const categoryMap: Record<string, string> = {
	BREAD: '面包',
	PASTRY: '西点',
	DESSERT: '甜品',
	DRINK: '饮品'
};

const filterTabs = computed(() => {
	const categories = new Set(dataStore.recipes.mainRecipes.map((r) => r.category));
	const categoryTabs = Array.from(categories).map((cat) => ({
		key: cat,
		label: categoryMap[cat] || cat
	}));

	const otherTabs = [];
	if (dataStore.recipes.preDoughs && dataStore.recipes.preDoughs.length > 0) {
		otherTabs.push({ key: 'PRE_DOUGH', label: '面种' });
	}
	if (dataStore.recipes.extras && dataStore.recipes.extras.length > 0) {
		otherTabs.push({ key: 'EXTRA', label: '自制原料' });
	}

	if (categoryTabs.length === 0 && otherTabs.length === 0) {
		return [];
	}

	return [...categoryTabs, ...otherTabs];
});

const hasAnyRecipe = computed(() => {
	return dataStore.recipes.mainRecipes.length > 0 || dataStore.recipes.preDoughs.length > 0 || dataStore.recipes.extras.length > 0;
});

const filteredRecipes = computed(() => {
	const filterKey = activeFilter.value;

	if (filterKey === 'PRE_DOUGH') {
		return dataStore.recipes.preDoughs || [];
	}
	if (filterKey === 'EXTRA') {
		return dataStore.recipes.extras || [];
	}

	return dataStore.recipes.mainRecipes.filter((r) => r.category === filterKey);
});

const renderedRecipes = computed(() => {
	const filterKey = renderedFilter.value;

	if (filterKey === 'PRE_DOUGH') {
		return dataStore.recipes.preDoughs || [];
	}
	if (filterKey === 'EXTRA') {
		return dataStore.recipes.extras || [];
	}

	return dataStore.recipes.mainRecipes.filter((r) => r.category === filterKey);
});

const refreshableLayout = ref<InstanceType<typeof RefreshableLayout> | null>(null);
const isNavigating = ref(false);
const showRecipeActionsModal = ref(false);
const showDeleteRecipeConfirmModal = ref(false);
const showDiscontinueRecipeConfirmModal = ref(false);
const showRestoreRecipeConfirmModal = ref(false);

const isFabVisible = ref(true);
const lastScrollTop = ref(0);
const scrollThreshold = 5;

const fabActions = computed(() => {
	return [
		{
			icon: '/static/icons/add.svg',
			text: '产品配方',
			action: () => navigateToEditPage('MAIN')
		},
		{
			icon: '/static/icons/add.svg',
			text: '面种',
			action: () => navigateToEditPage('PRE_DOUGH')
		},
		{
			icon: '/static/icons/add.svg',
			text: '自制原料',
			action: () => navigateToEditPage('EXTRA')
		}
	];
});

const triggerListAnimationWithKeyUpdate = (playAnimation: boolean) => {
	listAnimationKey.value = Date.now();
	triggerListAnimation.value = playAnimation;
};

const loadDataIfNeeded = async () => {
	if (uiStore.activeTab !== 'recipes') return;

	const isFirstTimeOpening = !hasBeenActivated.value;
	const needsFetch = dataStore.dataStale.recipes || !dataStore.dataLoaded.recipes;

	if (isFirstTimeOpening) {
		hasBeenActivated.value = true;
		isLoading.value = true;
	}

	try {
		if (needsFetch) {
			await dataStore.fetchRecipesData();
			if (filterTabs.value.length > 0 && !filterTabs.value.some((t) => t.key === activeFilter.value)) {
				activeFilter.value = filterTabs.value[0].key;
			}
		}
		isInitialFetchDone.value = true;
	} catch (error) {
		console.error('Failed to load recipes data:', error);
		isInitialFetchDone.value = true;
	} finally {
		if (isFirstTimeOpening || needsFetch) {
			setTimeout(() => {
				isLoading.value = false;
				triggerListAnimationWithKeyUpdate(false);
			}, 200);
		} else {
			isLoading.value = false;
			triggerListAnimationWithKeyUpdate(false);
		}
	}
};

watch(
	() => uiStore.activeTab,
	(newTab, oldTab) => {
		if (newTab === 'recipes') {
			loadDataIfNeeded();
		} else if (oldTab === 'recipes') {
			triggerListAnimation.value = false;
		}
	},
	{ immediate: true }
);

onShow(() => {
	isNavigating.value = false;
	loadDataIfNeeded();
});

const handleRefresh = async () => {
	try {
		dataStore.markRecipesAsStale();
		await dataStore.fetchRecipesData();
	} finally {
		refreshableLayout.value?.finishRefresh();
		setTimeout(() => {
			triggerListAnimationWithKeyUpdate(true);
		}, 700);
	}
};

const handleScroll = (event: any) => {
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

const recipeStatsForChart = computed(() => {
	return dataStore.recipeStats
		.map((item) => ({
			name: item.name,
			value: item.count
		}))
		.sort((a, b) => b.value - a.value);
});

const getRecipeTypeDisplay = (type: 'MAIN' | 'PRE_DOUGH' | 'EXTRA') => {
	return recipeTypeMap[type] || type;
};

const currentUserRoleInTenant = computed(() => userStore.userInfo?.tenants.find((t) => t.tenant.id === dataStore.currentTenantId)?.role);

const canEditRecipe = computed(() => {
	return currentUserRoleInTenant.value === 'OWNER' || currentUserRoleInTenant.value === 'ADMIN';
});

const navigateToEditPage = (type: 'MAIN' | 'PRE_DOUGH' | 'EXTRA') => {
	if (isNavigating.value) return;
	isNavigating.value = true;
	const url = `/pages/recipes/edit?type=${type}`;
	uni.navigateTo({ url });
};

const navigateToDetail = (familyId: string) => {
	if (isNavigating.value) return;
	isNavigating.value = true;
	uni.navigateTo({
		url: `/pages/recipes/detail?familyId=${familyId}`
	});
};

const openRecipeActions = (recipe: RecipeFamily) => {
	if (!canEditRecipe.value) return;
	selectedRecipe.value = recipe;
	showRecipeActionsModal.value = true;
};

const handleUnrestrictRecipe = async () => {
	if (!selectedRecipe.value || isSubmitting.value) return;
	isSubmitting.value = true;
	try {
		const result = await unrestrictFreeTierRecipe(selectedRecipe.value.id);
		const message = result.remaining === null
			? '配方已解除受限'
			: result.remaining > 0
				? `配方已解除受限，还可启用 ${result.remaining} 个配方`
				: '配方已解除受限，免费版名额已用完';
		toastStore.show({ message, type: 'success' });
		dataStore.markRecipesAsStale();
		dataStore.markProductsForTaskCreationAsStale();
		await dataStore.fetchRecipesData();
		triggerListAnimationWithKeyUpdate(true);
	} catch (error) {
		console.error('Failed to unrestrict recipe:', error);
	} finally {
		isSubmitting.value = false;
		showRecipeActionsModal.value = false;
		selectedRecipe.value = null;
	}
};

const handleDiscontinueRecipe = () => {
	showRecipeActionsModal.value = false;
	showDiscontinueRecipeConfirmModal.value = true;
};

const handleRestoreRecipe = () => {
	showRecipeActionsModal.value = false;
	showRestoreRecipeConfirmModal.value = true;
};

const handleDeleteRecipe = () => {
	showRecipeActionsModal.value = false;
	showDeleteRecipeConfirmModal.value = true;
};

const confirmDiscontinueRecipe = async () => {
	if (!selectedRecipe.value) return;
	isSubmitting.value = true;
	try {
		await discontinueRecipe(selectedRecipe.value.id);
		toastStore.show({ message: '配方已停用', type: 'success' });
		dataStore.markRecipesAsStale();
		dataStore.markProductsForTaskCreationAsStale();
		await dataStore.fetchRecipesData();
		triggerListAnimationWithKeyUpdate(true);
	} catch (error) {
		console.error('Failed to discontinue recipe:', error);
	} finally {
		isSubmitting.value = false;
		showDiscontinueRecipeConfirmModal.value = false;
		selectedRecipe.value = null;
	}
};

const confirmRestoreRecipe = async () => {
	if (!selectedRecipe.value) return;
	isSubmitting.value = true;
	try {
		await restoreRecipe(selectedRecipe.value.id);
		toastStore.show({ message: '配方已恢复', type: 'success' });
		dataStore.markRecipesAsStale();
		dataStore.markProductsForTaskCreationAsStale();
		await dataStore.fetchRecipesData();
		triggerListAnimationWithKeyUpdate(true);
	} catch (error) {
		console.error('Failed to restore recipe:', error);
	} finally {
		isSubmitting.value = false;
		showRestoreRecipeConfirmModal.value = false;
		selectedRecipe.value = null;
	}
};

const confirmDeleteRecipe = async () => {
	if (!selectedRecipe.value) return;
	isSubmitting.value = true;
	try {
		await deleteRecipe(selectedRecipe.value.id);
		toastStore.show({ message: '删除成功', type: 'success' });
		dataStore.markRecipesAsStale();
		await dataStore.fetchRecipesData();
		triggerListAnimationWithKeyUpdate(true);
	} catch (error) {
		console.error('Failed to delete recipe:', error);
	} finally {
		isSubmitting.value = false;
		showDeleteRecipeConfirmModal.value = false;
		selectedRecipe.value = null;
	}
};
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
@include list-item-content-style;
@include list-item-option-style;

.full-height-container {
	height: 100%;
	display: flex;
	flex-direction: column;
}

.full-height-wrapper {
	height: 100%;
	display: flex;
	flex-direction: column;
}

.main-info {
	flex: 1;
	min-width: 0;
}

.content-padding {
	padding: 0 15px;
}

.side-info {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	justify-content: center;
	gap: 6px;
	flex-shrink: 0;
}

/* 极简无边框版本标签 */
.version-tag {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 4px 8px;
	border-radius: 6px;
	font-size: 11px;
	font-weight: 600;
	background-color: #f4ede2; /* 精致淡燕麦色背景 */
	color: #8d6e63; /* 优雅暖焦糖字色 */
	line-height: 1;
	box-sizing: border-box;
	max-width: 130px; /* 限制最大宽度，防止挤占侧边布局，且留有足够长度展示说明 */
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* 暂无版本样式 */
.version-pill-empty {
	font-size: 10px;
	color: #ab9d88;
	background-color: #f6f0e5; /* 奶油黄底色 */
	padding: 2px 6px;
	border-radius: 4px;
	font-weight: 500;
}

.recipe-relations {
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.ranking-list {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 15px 25px;
	padding-top: 10px;
}

.ranking-item {
	display: flex;
	align-items: center;
	font-size: 14px;

	.name {
		flex-grow: 1;
		margin: 0 8px 0 4px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: var(--text-primary);
	}
}

.name {
	display: flex;
	align-items: center;
	gap: 8px;
}

.name-text {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	flex-shrink: 1;
	min-width: 0;
}

.rank {
	font-style: italic;
	font-weight: bold;
	width: 12px;
	color: var(--accent-color);
}

.count {
	color: var(--text-secondary);
	font-size: 13px;
	flex-shrink: 0;
}

.status-tag {
	font-size: 11px;
	font-weight: 500;
	padding: 2px 6px;
	border-radius: 6px;
	display: inline-block;
	vertical-align: middle;
	flex-shrink: 0;
}

.status-tag.discontinued {
	background-color: #fee2e2;
	color: #991b1b;
}

.status-tag.read-only {
	background-color: #f4eadf;
	color: #805c43;
}

.filter-wrapper {
	padding: 10px 0px;
}

.category-filter-wrapper {
	padding: 0px 15px 15px;
	border-bottom: 1px solid var(--border-color);
}

/* --- 新增：页面内联骨架屏相关的通用样式 --- */
.skeleton-block {
	background-color: #f0f2f5;
}

.shimmer {
	position: relative;
	overflow: hidden;
}

.shimmer::after {
	content: '';
	position: absolute;
	top: 0;
	left: -100%;
	width: 200%;
	height: 100%;
	background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0, rgba(255, 255, 255, 0.6) 50%, rgba(255, 255, 255, 0) 100%);
	animation: shimmer-sweep 1.5s infinite linear;
}

@keyframes shimmer-sweep {
	100% {
		transform: translateX(100%);
	}
}

.recipe-list-animated-container {
	animation: fadeInClean 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;

	&.is-fading-out {
		animation: fadeOutClean 0.15s ease forwards;
	}
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
