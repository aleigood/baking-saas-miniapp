<template>
	<view class="full-height-container">
		<RefreshableLayout ref="refreshableLayout" @refresh="handleRefresh" @scroll="handleScroll" class="full-height-wrapper">
			<view class="page-content page-content-with-tabbar-fab no-horizontal-padding">
				<view class="content-padding">
					<view class="card">
						<view class="card-title"><span>本周制作排行</span></view>
						<view v-if="recipeStatsForChart.length > 0" class="ranking-list">
							<view v-for="(item, index) in recipeStatsForChart.slice(0, 10)" :key="item.name" class="ranking-item">
								<text class="rank">{{ index + 1 }}</text>
								<text class="name">{{ item.name }}</text>
								<text class="count">{{ item.value }} 个</text>
							</view>
						</view>
						<view v-else class="empty-state">
							<text>暂无排行信息</text>
						</view>
					</view>
					<view class="filter-wrapper">
						<FilterTabs v-model="activeFilter" :tabs="filterTabs" />
					</view>
				</view>

				<view class="list-wrapper">
					<template v-if="activeFilter !== 'OTHER'">
						<template v-if="filteredRecipes.length > 0">
							<ListItem
								v-for="(family, index) in filteredRecipes"
								:key="family.id"
								@click="navigateToDetail(family.id)"
								@longpress="openRecipeActions(family)"
								:vibrate-on-long-press="canEditRecipe"
								:bleed="true"
								:divider="index < filteredRecipes.length - 1"
							>
								<view class="main-info">
									<view>
										<view class="name">{{ family.name }}</view>
										<view class="desc">{{ family.productCount }} 种产品</view>
									</view>
									<text v-if="family.deletedAt" class="status-tag discontinued">已停用</text>
								</view>
								<view class="side-info">
									<view class="rating">★ {{ getRating(family.productionTaskCount || 0) }}</view>
									<view class="desc">{{ family.productionTaskCount || 0 }} 次制作</view>
								</view>
							</ListItem>
						</template>
						<view v-else class="empty-state">
							<text>该品类下暂无产品配方</text>
						</view>
					</template>

					<template v-else>
						<template v-if="dataStore.recipes.otherRecipes.length > 0">
							<ListItem
								v-for="(family, index) in dataStore.recipes.otherRecipes"
								:key="family.id"
								@click="navigateToDetail(family.id)"
								@longpress="openRecipeActions(family)"
								:vibrate-on-long-press="canEditRecipe"
								:bleed="true"
								:divider="index < dataStore.recipes.otherRecipes.length - 1"
							>
								<view class="main-info">
									<view>
										<view class="name">{{ family.name }}</view>
										<view class="desc">类型: {{ getRecipeTypeDisplay(family.type) }}</view>
									</view>
									<text v-if="family.deletedAt" class="status-tag discontinued">已停用</text>
								</view>
								<view class="side-info">
									<view class="desc">{{ family.ingredientCount }} 种原料</view>
								</view>
							</ListItem>
						</template>
						<view v-else class="empty-state">
							<text>暂无其他配方信息</text>
						</view>
					</template>
				</view>
			</view>
		</RefreshableLayout>

		<ExpandingFab v-if="canEditRecipe" :actions="fabActions" :visible="isFabVisible" />

		<AppModal v-model:visible="showRecipeActionsModal" title="配方操作" :no-header-line="true">
			<view class="options-list">
				<template v-if="selectedRecipe?.deletedAt === null">
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

		<AppModal v-model:visible="showDeleteRecipeConfirmModal" title="确认删除">
			<view class="modal-prompt-text">确定要删除 “{{ selectedRecipe?.name }}” 吗？</view>
			<view class="modal-warning-text">已被生产任务使用的配方将无法被删除。此操作不可撤销。</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showDeleteRecipeConfirmModal = false">取消</AppButton>
				<AppButton type="danger" @click="confirmDeleteRecipe" :loading="isSubmitting">
					{{ isSubmitting ? '' : '确认删除' }}
				</AppButton>
			</view>
		</AppModal>

		<AppModal v-model:visible="showDiscontinueRecipeConfirmModal" title="确认停用">
			<view class="modal-prompt-text">确定要停用 “{{ selectedRecipe?.name }}” 吗？</view>
			<view class="modal-warning-text">停用后，此配方将无法用于新的生产任务。</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showDiscontinueRecipeConfirmModal = false">取消</AppButton>
				<AppButton type="danger" @click="confirmDiscontinueRecipe" :loading="isSubmitting">
					{{ isSubmitting ? '' : '确认停用' }}
				</AppButton>
			</view>
		</AppModal>

		<AppModal v-model:visible="showRestoreRecipeConfirmModal" title="确认恢复">
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
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useUserStore } from '@/store/user';
import { useDataStore } from '@/store/data';
import { useToastStore } from '@/store/toast';
// [核心新增] 导入 uiStore
import { useUiStore } from '@/store/ui';
import { discontinueRecipe, restoreRecipe, deleteRecipe } from '@/api/recipes';
import type { RecipeFamily } from '@/types/api';
import ExpandingFab from '@/components/ExpandingFab.vue';
import ListItem from '@/components/ListItem.vue';
import FilterTabs from '@/components/FilterTabs.vue';
import AppModal from '@/components/AppModal.vue';
import AppButton from '@/components/AppButton.vue';
import RefreshableLayout from '@/components/RefreshableLayout.vue';

const userStore = useUserStore();
const dataStore = useDataStore();
const toastStore = useToastStore();
// [核心新增] 获取 uiStore 实例
const uiStore = useUiStore();

// [核心改造] 使用单一的 activeFilter 来控制当前筛选状态，默认为第一个品类
const activeFilter = ref('BREAD');

const isSubmitting = ref(false);
const selectedRecipe = ref<RecipeFamily | null>(null);

const recipeTypeMap = {
	MAIN: '面团',
	PRE_DOUGH: '面种',
	EXTRA: '馅料'
};

// [核心新增] 定义品类 key 到中文显示名的映射
const categoryMap = {
	BREAD: '面包',
	PASTRY: '西点',
	DESSERT: '甜品',
	DRINK: '饮品',
	OTHER: '其他'
};

// [核心改造] 动态生成筛选标签，逻辑如下：
// 1. 获取所有产品配方 (`mainRecipes`) 中出现过的品类。
// 2. 为每个品类创建一个标签。
// 3. 在最后固定加上一个“其他配方”标签。
const filterTabs = computed(() => {
	const categories = new Set(dataStore.recipes.mainRecipes.map((r) => r.category));
	const categoryTabs = Array.from(categories).map((cat) => ({
		key: cat,
		label: categoryMap[cat] || cat
	}));
	// [核心修正] 如果没有任何产品配方，则默认显示面包品类，并添加一个其他配方标签
	if (categoryTabs.length === 0) {
		return [
			{ key: 'BREAD', label: '面包' },
			{ key: 'OTHER', label: '其他' } // [核心用语] 组件配方 -> 其他配方
		];
	}
	return [...categoryTabs, { key: 'OTHER', label: '其他' }]; // [核心用语] 组件配方 -> 其他配方
});

// [核心改造] 根据当前激活的筛选器 (activeFilter) 来决定显示哪个列表
const filteredRecipes = computed(() => {
	// 如果筛选的不是 'OTHER'，就从主配方列表中筛选出对应品类的配方
	return dataStore.recipes.mainRecipes.filter((r) => r.category === activeFilter.value);
});

const refreshableLayout = ref<InstanceType<typeof RefreshableLayout> | null>(null);
const isNavigating = ref(false);
// [核心改造] 新增本地 ref 用于控制弹窗
const showRecipeActionsModal = ref(false);
const showDeleteRecipeConfirmModal = ref(false);
const showDiscontinueRecipeConfirmModal = ref(false);
const showRestoreRecipeConfirmModal = ref(false);

// [核心新增] FAB 按钮可见性控制
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
			text: '其他配方', // [核心用语] 组件配方 -> 其他配方
			action: () => navigateToEditPage('EXTRA')
		}
	];
});

onShow(async () => {
	isNavigating.value = false;
	// [核心修改] 移除此处的 Toast 消费逻辑，统一由 main.vue 处理
	if (dataStore.dataStale.recipes || !dataStore.dataLoaded.recipes) {
		await dataStore.fetchRecipesData();
		// [核心新增] 数据加载后，如果当前激活的筛选器不存在，则重置为第一个
		if (filterTabs.value.length > 0 && !filterTabs.value.some((t) => t.key === activeFilter.value)) {
			activeFilter.value = filterTabs.value[0].key;
		}
	}
});

const handleRefresh = async () => {
	try {
		dataStore.markRecipesAsStale();
		await dataStore.fetchRecipesData();
	} finally {
		refreshableLayout.value?.finishRefresh();
	}
};

// [核心新增] 滚动事件处理函数
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

const getRating = (count: number) => {
	if (count > 20) return '4.9';
	if (count > 10) return '4.8';
	if (count > 3) return '4.7';
	return '4.5';
};

const currentUserRoleInTenant = computed(() => userStore.userInfo?.tenants.find((t) => t.tenant.id === dataStore.currentTenantId)?.role);

const canEditRecipe = computed(() => {
	return currentUserRoleInTenant.value === 'OWNER' || currentUserRoleInTenant.value === 'ADMIN';
});

// [核心改造] 更新导航函数，使其更通用
const navigateToEditPage = (type: 'MAIN' | 'EXTRA') => {
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
		await dataStore.fetchRecipesData();
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
		await dataStore.fetchRecipesData();
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

:deep(.main-info) {
	display: flex;
	align-items: center;
	gap: 10px;
	flex: 1;
}

.content-padding {
	padding: 0 15px;
}

.rating {
	color: var(--accent-color);
	font-weight: bold;
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
	font-size: 12px;
	font-weight: 500;
	padding: 3px 8px;
	border-radius: 6px;
	display: inline-block;
	vertical-align: middle;
	flex-shrink: 0;
}

.status-tag.discontinued {
	background-color: #fee2e2;
	color: #991b1b;
}

.filter-wrapper {
	padding: 10px 0px;
}

// [核心新增] 品类筛选标签的样式
.category-filter-wrapper {
	padding: 0px 15px 15px;
	border-bottom: 1px solid var(--border-color);
}
</style>
