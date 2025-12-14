<template>
	<view class="full-height-container">
		<RefreshableLayout ref="refreshableLayout" @refresh="handleRefresh" @scroll="handleScroll" class="full-height-wrapper">
			<view class="page-content page-content-with-tabbar-fab no-horizontal-padding">
				<view class="filter-bar">
					<FilterTabs v-model="activeFilter" :tabs="ingredientFilterTabs" />
					<IconButton @click="navigateToLedger">
						<image class="header-icon" src="/static/icons/log.svg" />
					</IconButton>
				</view>

				<view class="search-sort-bar">
					<view class="search-box">
						<image class="search-icon" src="/static/icons/search.svg" mode="aspectFit" />
						<input
							class="search-input"
							v-model="filterKeyword"
							placeholder="搜索原料名称或品牌"
							confirm-type="search"
							placeholder-style="color: #a98467; opacity: 0.5; font-size: 13px;"
						/>
						<view v-if="filterKeyword" class="clear-btn" @click="filterKeyword = ''">
							<text class="clear-icon">×</text>
						</view>
					</view>
					<view class="sort-btn" @click="toggleSort">
						<image class="sort-icon" src="/static/icons/sort.svg" />
						<text class="sort-label">{{ currentSortLabel }}</text>
					</view>
				</view>

				<view class="list-wrapper">
					<view v-if="filteredIngredients.length > 0" :key="listAnimationKey">
						<ListItem
							v-for="(ing, index) in filteredIngredients"
							:key="ing.id"
							@click="navigateToDetail(ing.id)"
							@longpress="openIngredientActions(ing)"
							:vibrate-on-long-press="canEdit"
							:bleed="true"
							:divider="index < filteredIngredients.length - 1"
							:animate-on-mount="triggerListAnimation"
							:animation-index="index"
						>
							<template v-if="ing.type === 'SELF_MADE'">
								<view class="main-info">
									<view class="name">{{ ing.name }}</view>
									<view class="desc">{{ getRecipeIngredientCount(ing) }} 种原料</view>
								</view>
								<view class="side-info">
									<view class="value">{{ formatWeight(ing.currentStockInGrams) }}</view>
									<view class="desc" :class="getExpiryClass(ing)">{{ getExpiryText(ing) }}</view>
								</view>
							</template>

							<template v-else>
								<view class="main-info">
									<view class="name">{{ ing.name }}</view>
									<view class="desc">
										<template v-if="ing.type === 'STANDARD'">品牌: {{ ing.activeSku?.brand || '未设置' }}</template>
										<template v-else>{{ getIngredientTypeLabel(ing.type) }}</template>
									</view>
								</view>
								<view class="side-info">
									<view class="value">
										<template v-if="ing.type === 'STANDARD' || ing.type === 'NON_INVENTORIED'">{{ formatWeight(ing.currentStockInGrams) }}</template>
										<template v-else>∞</template>
									</view>
									<view v-if="ing.totalConsumptionInGrams > 0 && ing.type !== 'UNTRACKED'" class="desc consumption">
										已消耗: {{ formatWeight(ing.totalConsumptionInGrams) }}
									</view>
								</view>
							</template>
						</ListItem>
					</view>
					<view v-else class="empty-state">
						<text>暂无符合条件的原料</text>
					</view>
				</view>
			</view>
		</RefreshableLayout>

		<ExpandingFab @click="openCreateIngredientModal" :visible="isFabVisible" />
		<AppModal v-model:visible="showIngredientActionsModal" title="原料操作" :no-header-line="true">
			<view class="options-list">
				<ListItem class="option-item" @click="handleDeleteIngredient" :bleed="true">
					<view class="main-info">
						<view class="name">删除原料</view>
					</view>
				</ListItem>
			</view>
		</AppModal>
		<AppModal v-model:visible="showDeleteIngredientConfirmModal" title="确认删除">
			<view class="modal-prompt-text">确定要删除 “{{ selectedIngredient?.name }}” 吗？</view>
			<view class="modal-warning-text">已被配方使用的原料将无法被删除。</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showDeleteIngredientConfirmModal = false">取消</AppButton>
				<AppButton type="danger" @click="confirmDeleteIngredient" :loading="isSubmitting">
					{{ isSubmitting ? '' : '确认删除' }}
				</AppButton>
			</view>
		</AppModal>
		<AppModal v-model:visible="showCreateIngredientModal" title="新增原料">
			<FormItem label="原料名称">
				<input class="input-field" v-model="newIngredientForm.name" placeholder="输入原料名称" />
			</FormItem>
			<FormItem label="原料类型">
				<picker mode="selector" :range="availableTypes.map((t) => t.label)" @change="onTypeChange">
					<view class="picker">
						{{ currentTypeLabel }}
						<view class="arrow-down"></view>
					</view>
				</picker>
			</FormItem>
			<view class="form-row">
				<label class="form-row-label">是否为面粉</label>
				<switch :checked="newIngredientForm.isFlour" @change="onIsFlourChange" color="#8c5a3b" />
			</view>
			<view class="form-row">
				<label class="form-row-label">含水量 (%)</label>
				<input class="input-field" type="digit" v-model="newIngredientForm.waterContent" placeholder="例如: 75" />
			</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showCreateIngredientModal = false">取消</AppButton>
				<AppButton type="primary" @click="handleCreateIngredient" :loading="isSubmitting">
					{{ isSubmitting ? '保存中...' : '确认保存' }}
				</AppButton>
			</view>
		</AppModal>
	</view>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useUserStore } from '@/store/user';
import { useDataStore } from '@/store/data';
import { useToastStore } from '@/store/toast';
import { useUiStore } from '@/store/ui';
import { createIngredient, deleteIngredient } from '@/api/ingredients';
import type { Ingredient } from '@/types/api';
import ExpandingFab from '@/components/ExpandingFab.vue';
import ListItem from '@/components/ListItem.vue';
import FilterTabs from '@/components/FilterTabs.vue';
import AppModal from '@/components/AppModal.vue';
import AppButton from '@/components/AppButton.vue';
import IconButton from '@/components/IconButton.vue';
import FormItem from '@/components/FormItem.vue';
import RefreshableLayout from '@/components/RefreshableLayout.vue';
import { formatWeight, formatDuration } from '@/utils/format';

const userStore = useUserStore();
const dataStore = useDataStore();
const toastStore = useToastStore();
const uiStore = useUiStore();

const activeFilter = ref('standard');
const ingredientFilterTabs = ref([
	{ key: 'standard', label: '标准' },
	{ key: 'self_made', label: '自制' },
	{ key: 'all', label: '全部' }
]);

const isSubmitting = ref(false);
const selectedIngredient = ref<Ingredient | null>(null);

const refreshableLayout = ref<InstanceType<typeof RefreshableLayout> | null>(null);
const showIngredientActionsModal = ref(false);
const showDeleteIngredientConfirmModal = ref(false);
const showCreateIngredientModal = ref(false);
const isNavigating = ref(false);

const isFabVisible = ref(true);
const lastScrollTop = ref(0);
const scrollThreshold = 5;

const listAnimationKey = ref(Date.now());
const triggerListAnimation = ref(false);
const isFirstLoad = ref(true);

const filterKeyword = ref('');
const sortMode = ref<'name_asc' | 'stock_desc' | 'stock_asc'>('name_asc');

const newIngredientForm = reactive<{
	name: string;
	type: 'STANDARD' | 'UNTRACKED' | 'NON_INVENTORIED';
	isFlour: boolean;
	waterContent: number | null;
}>({
	name: '',
	type: 'STANDARD',
	isFlour: false,
	waterContent: 0
});

const availableTypes = ref([
	{ label: '标准原料 (追踪库存和成本)', value: 'STANDARD' },
	{ label: '即时采购 (仅追踪成本)', value: 'NON_INVENTORIED' },
	{ label: '非追踪原料 (水/冰等)', value: 'UNTRACKED' }
]);

const toggleSort = () => {
	if (sortMode.value === 'name_asc') {
		sortMode.value = 'stock_desc';
		toastStore.show({ message: '按库存从高到低排序', type: 'success' });
	} else if (sortMode.value === 'stock_desc') {
		sortMode.value = 'stock_asc';
		toastStore.show({ message: '按库存从低到高排序', type: 'success' });
	} else {
		sortMode.value = 'name_asc';
		toastStore.show({ message: '按名称排序', type: 'success' });
	}
	triggerListAnimationWithKeyUpdate(true);
};

const currentSortLabel = computed(() => {
	switch (sortMode.value) {
		case 'stock_desc':
			return '库存↓';
		case 'stock_asc':
			return '库存↑';
		default:
			return '名称';
	}
});

const getRecipeIngredientCount = (ing: Ingredient) => {
	const allRecipes = [...dataStore.recipes.preDoughs, ...dataStore.recipes.extras];
	const family = allRecipes.find((r) => r.id === ing.recipeFamilyId) || allRecipes.find((r) => r.name === ing.name);
	return family?.ingredientCount || 0;
};

const getExpiryText = (ing: Ingredient) => {
	if (ing.currentStockInGrams <= 0) return '无库存';
	if (!ing.shelfLife || ing.shelfLife <= 0) return '长期有效';

	const productionTime = new Date(ing.updatedAt).getTime();
	const expiryTime = productionTime + ing.shelfLife * 3600 * 1000;
	const diff = expiryTime - Date.now();

	if (diff <= 0) return '已过期';
	return `有效期: ${formatDuration(diff)}`;
};

const getExpiryClass = (ing: Ingredient) => {
	if (ing.currentStockInGrams <= 0) return '';
	if (!ing.shelfLife || ing.shelfLife <= 0) return 'stock-safe';

	const productionTime = new Date(ing.updatedAt).getTime();
	const expiryTime = productionTime + ing.shelfLife * 3600 * 1000;
	const diff = expiryTime - Date.now();

	if (diff <= 0) return 'stock-danger';
	if (diff < 24 * 3600 * 1000) return 'stock-warning';
	return 'stock-safe';
};

const filteredIngredients = computed(() => {
	let list = [...dataStore.ingredients.allIngredients];

	if (activeFilter.value === 'standard') {
		list = list.filter((i) => i.type === 'STANDARD' || i.type === 'NON_INVENTORIED' || i.type === 'UNTRACKED');
	} else if (activeFilter.value === 'self_made') {
		list = list.filter((i) => i.type === 'SELF_MADE');
	}

	if (filterKeyword.value) {
		const kw = filterKeyword.value.toLowerCase();
		list = list.filter((i) => {
			const matchName = i.name.toLowerCase().includes(kw);
			const matchBrand = i.activeSku?.brand?.toLowerCase().includes(kw);
			return matchName || matchBrand;
		});
	}

	return list.sort((a, b) => {
		if (sortMode.value === 'name_asc') {
			return a.name.localeCompare(b.name, 'zh-Hans-CN');
		} else if (sortMode.value === 'stock_desc') {
			return b.currentStockInGrams - a.currentStockInGrams;
		} else if (sortMode.value === 'stock_asc') {
			return a.currentStockInGrams - b.currentStockInGrams;
		}
		return 0;
	});
});

const currentTypeLabel = computed(() => {
	return availableTypes.value.find((t) => t.value === newIngredientForm.type)?.label || '未知类型';
});

const triggerListAnimationWithKeyUpdate = (playAnimation: boolean) => {
	listAnimationKey.value = Date.now();
	triggerListAnimation.value = playAnimation;
};

watch(
	() => uiStore.activeTab,
	(newTab, oldTab) => {
		if (oldTab === 'ingredients' && newTab !== 'ingredients') {
			triggerListAnimation.value = false;
		}
	}
);

onShow(async () => {
	isNavigating.value = false;
	let didFetch = false;

	if (dataStore.dataStale.ingredients || !dataStore.dataLoaded.ingredients) {
		await dataStore.fetchIngredientsData();
		didFetch = true;
	}
	if (dataStore.dataStale.recipes || !dataStore.dataLoaded.recipes) {
		await dataStore.fetchRecipesData();
	}

	if (didFetch) {
		if (isFirstLoad.value) {
			triggerListAnimationWithKeyUpdate(true);
			isFirstLoad.value = false;
		} else {
			triggerListAnimationWithKeyUpdate(false);
		}
	} else {
		triggerListAnimation.value = false;
	}
});

const handleRefresh = async () => {
	try {
		dataStore.markIngredientsAsStale();
		dataStore.markRecipesAsStale();
		await Promise.all([dataStore.fetchIngredientsData(), dataStore.fetchRecipesData()]);
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

const currentUserRoleInTenant = computed(() => userStore.userInfo?.tenants.find((t) => t.tenant.id === dataStore.currentTenantId)?.role);

const canEdit = computed(() => {
	return currentUserRoleInTenant.value === 'OWNER' || currentUserRoleInTenant.value === 'ADMIN';
});

const getIngredientTypeLabel = (type: Ingredient['type']) => {
	switch (type) {
		case 'UNTRACKED':
			return '非追踪';
		case 'NON_INVENTORIED':
			return '即时采购';
		case 'SELF_MADE':
			return '自制';
		default:
			return '标准';
	}
};

const navigateToDetail = (ingredientId: string) => {
	if (isNavigating.value) return;
	isNavigating.value = true;
	uni.navigateTo({
		url: `/pages/ingredients/detail?ingredientId=${ingredientId}`
	});
};

const navigateToLedger = () => {
	if (isNavigating.value) return;
	isNavigating.value = true;
	uni.navigateTo({
		url: '/pages/ingredients/ledger'
	});
};

const openIngredientActions = (ingredient: Ingredient) => {
	if (!canEdit.value) return;
	selectedIngredient.value = ingredient;
	showIngredientActionsModal.value = true;
};

const handleDeleteIngredient = () => {
	showIngredientActionsModal.value = false;
	showDeleteIngredientConfirmModal.value = true;
};

const confirmDeleteIngredient = async () => {
	if (!selectedIngredient.value) return;
	isSubmitting.value = true;
	try {
		await deleteIngredient(selectedIngredient.value.id);
		toastStore.show({ message: '删除成功', type: 'success' });
		dataStore.markIngredientsAsStale();
		await dataStore.fetchIngredientsData();
		triggerListAnimationWithKeyUpdate(true);
	} catch (error) {
		console.error('Failed to delete ingredient:', error);
	} finally {
		isSubmitting.value = false;
		showDeleteIngredientConfirmModal.value = false;
		selectedIngredient.value = null;
	}
};

const openCreateIngredientModal = () => {
	newIngredientForm.name = '';
	newIngredientForm.type = 'STANDARD';
	newIngredientForm.isFlour = false;
	newIngredientForm.waterContent = 0;
	showCreateIngredientModal.value = true;
};

const onTypeChange = (e: any) => {
	newIngredientForm.type = availableTypes.value[e.detail.value].value as 'STANDARD' | 'UNTRACKED' | 'NON_INVENTORIED';
};

const onIsFlourChange = (e: any) => {
	newIngredientForm.isFlour = e.detail.value;
};

const handleCreateIngredient = async () => {
	if (!newIngredientForm.name.trim()) {
		toastStore.show({ message: '原料名称不能为空', type: 'error' });
		return;
	}
	isSubmitting.value = true;
	try {
		await createIngredient({
			name: newIngredientForm.name,
			type: newIngredientForm.type,
			isFlour: newIngredientForm.isFlour,
			waterContent: (Number(newIngredientForm.waterContent) || 0) / 100
		});
		toastStore.show({ message: '创建成功，请继续添加SKU和采购', type: 'success', duration: 3000 });
		showCreateIngredientModal.value = false;
		dataStore.markIngredientsAsStale();
		await dataStore.fetchIngredientsData();
		triggerListAnimationWithKeyUpdate(true);
	} catch (error) {
		console.error('Failed to create ingredient:', error);
	} finally {
		isSubmitting.value = false;
	}
};
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
@include list-item-content-style;
@include list-item-option-style;
@include form-control-styles;
@include checkbox-style;

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

.filter-bar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 10px 15px;
}

.header-icon {
	width: 24px;
	height: 24px;
}

/* [样式重构] 搜索和排序栏 - 风格更暖、更融合 */
.search-sort-bar {
	display: flex;
	align-items: center;
	padding: 0 15px 15px 15px;
	gap: 12px;
}

.search-box {
	flex: 1;
	height: 38px;
	background-color: #ffffff; /* 纯白背景 */
	border: 1px solid #f3e9e3; /* 主题浅边框 (淡粉棕) */
	border-radius: 19px; /* 半圆角 */
	display: flex;
	align-items: center;
	padding: 0 12px;
	box-sizing: border-box;
	/* 阴影让它浮起一点，更精致 */
	box-shadow: 0 2px 6px rgba(140, 90, 59, 0.05);
}

.search-icon {
	width: 16px;
	height: 16px;
	margin-right: 8px;
}

.search-input {
	flex: 1;
	font-size: 13px;
	color: var(--text-primary);
	height: 100%;
}

.clear-btn {
	width: 18px;
	height: 18px;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: #f3e9e3;
	border-radius: 50%;
	margin-left: 5px;
}

.clear-icon {
	color: var(--text-secondary);
	font-size: 12px;
	line-height: 1;
	margin-top: -2px;
}

.sort-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: #ffffff;
	padding: 0 15px;
	border-radius: 19px; /* 半圆角 */
	border: 1px solid #f3e9e3;
	height: 38px;
	box-sizing: border-box;
	min-width: 80px;
	box-shadow: 0 2px 6px rgba(140, 90, 59, 0.05);
	transition: background-color 0.2s;
}

.sort-btn:active {
	background-color: #faf8f5;
}

.sort-icon {
	width: 16px;
	height: 16px;
	margin-right: 4px;
}

.sort-label {
	font-size: 13px;
	color: var(--text-secondary); /* 使用次要文字颜色，更柔和 */
	white-space: nowrap;
	font-weight: 500;
}

.side-info .consumption {
	margin-top: 2px;
}

.stock-safe {
	color: var(--text-secondary);
}

.stock-warning {
	color: #d97706; /* Amber-600 */
	font-weight: 500;
}

.stock-danger {
	color: var(--danger-color);
	font-weight: 500;
}

.form-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 10px 0;
}

.form-row-label {
	font-size: 15px;
	color: var(--text-primary);
}

.form-row .input-field {
	width: 120px;
	text-align: right;
}

.empty-state-sub {
	font-size: 13px;
	color: var(--text-secondary);
	margin-top: 5px;
}
</style>
}
