<template>
	<view class="full-height-container">
		<RefreshableLayout ref="refreshableLayout" @refresh="handleRefresh" @scroll="handleScroll" class="full-height-wrapper">
			<view
				class="page-content page-content-with-tabbar-fab no-horizontal-padding animated-content"
				:class="{ 'is-revealed': !isLoading && hasBeenActivated }"
				v-if="hasBeenActivated"
				:key="'ingredients-content'"
			>
				<view class="tools-bar">
					<view class="filter-capsule" id="filter-capsule-btn" @touchstart="handleTouchStart($event, 'filter')" @click="showFilterSelector = true">
						<span v-for="ripple in ripples['filter']" :key="ripple.id" class="ripple" :style="ripple.style"></span>
						<view class="capsule-content">
							<text>{{ currentFilterLabel }}</text>
							<view class="arrow-down"></view>
						</view>
					</view>

					<view class="filter-capsule" id="sort-capsule-btn" @touchstart="handleTouchStart($event, 'sort')" @click="toggleSort">
						<span v-for="ripple in ripples['sort']" :key="ripple.id" class="ripple" :style="ripple.style"></span>
						<view class="capsule-content">
							<text>{{ currentSortLabel }}</text>
							<image class="sort-icon-mini" :src="sortIconSrc" />
						</view>
					</view>

					<view class="search-box-compact">
						<image class="search-icon" src="/static/icons/search.svg" mode="aspectFit" />
						<input
							class="search-input"
							v-model="filterKeyword"
							placeholder="搜索名称或品牌"
							confirm-type="search"
							placeholder-style="color: #a98467; opacity: 0.6; font-size: 14px;"
						/>
						<view v-if="filterKeyword" class="clear-btn" @click="filterKeyword = ''">
							<image class="clear-icon-svg" src="/static/icons/close.svg" mode="aspectFit" />
						</view>
					</view>
				</view>

				<view class="list-wrapper">
					<view v-if="filteredIngredients.length > 0" :key="'ingredients-list'">
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
									<view class="value">{{ getSelfMadeProductionCount(ing) }} 次</view>
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
										<template v-if="ing.type === 'STANDARD' || ing.type === 'NON_INVENTORIED'">{{ getIngredientUnitPriceLabel(ing) }}</template>
										<template v-else>不计成本</template>
									</view>
								</view>
							</template>
						</ListItem>
					</view>
					<EmptyState v-else-if="isInitialFetchDone" :key="'ingredients-empty'" icon="/static/icons/empty-list.svg" title="暂无原料" subtitle="暂无符合条件的原料" />
				</view>
			</view>

			<view
				v-if="isLoading && uiStore.activeTab === 'ingredients'"
				:key="'ingredients-skeleton'"
				class="page-content page-content-with-tabbar-fab no-horizontal-padding skeleton-overlay"
			>
				<view class="tools-bar" style="margin-bottom: 4px">
					<view class="skeleton-block shimmer" style="width: 70px; height: 32px; border-radius: 16px"></view>
					<view class="skeleton-block shimmer" style="width: 70px; height: 32px; border-radius: 16px"></view>
					<view class="skeleton-block shimmer" style="flex: 1; height: 32px; border-radius: 16px"></view>
				</view>

				<view class="list-wrapper">
					<SkeletonListItem v-for="i in 8" :key="i" :bleed="true" :divider="i < 8" />
				</view>
			</view>
		</RefreshableLayout>

		<ExpandingFab :actions="fabActions" :visible="isFabVisible" />

		<AppModal :visible="showFilterSelector" :key="'filter-selector-modal'" @update:visible="showFilterSelector = false" title="选择原料类型" :no-header-line="true">
			<view class="options-list">
				<ListItem v-for="option in filterOptions" :key="option.key" @click="handleFilterSelect(option.key)" class="option-item" :bleed="true">
					<view class="main-info">
						<view class="name">{{ option.label }}</view>
					</view>
					<view class="side-info" v-if="activeFilter === option.key">
						<view class="value checkmark-icon">✓</view>
					</view>
				</ListItem>
			</view>
		</AppModal>

		<AppModal v-model:visible="showIngredientActionsModal" :key="'ingredient-actions-modal'" title="原料操作" :no-header-line="true">
			<view class="options-list">
				<ListItem class="option-item" @click="handleDeleteIngredient" :bleed="true">
					<view class="main-info">
						<view class="name">删除原料</view>
					</view>
				</ListItem>
			</view>
		</AppModal>
		<AppModal v-model:visible="showDeleteIngredientConfirmModal" :key="'delete-ingredient-modal'" title="确认删除">
			<view class="modal-prompt-text">确定要删除 “{{ selectedIngredient?.name }}” 吗？</view>
			<view class="modal-warning-text">已被配方使用的原料将无法被删除。</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showDeleteIngredientConfirmModal = false">取消</AppButton>
				<AppButton type="danger" @click="confirmDeleteIngredient" :loading="isSubmitting">
					{{ isSubmitting ? '' : '确认删除' }}
				</AppButton>
			</view>
		</AppModal>
		<AppModal v-model:visible="showCreateIngredientModal" :key="'create-ingredient-modal'" title="新增原料">
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
import { ref, computed, reactive, watch, getCurrentInstance } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useUserStore } from '@/store/user';
import { useDataStore } from '@/store/data';
import { useToastStore } from '@/store/toast';
import { useUiStore } from '@/store/ui';
import { createIngredient, deleteIngredient } from '@/api/ingredients';
import type { Ingredient } from '@/types/api';
import ExpandingFab from '@/components/ExpandingFab.vue';
import ListItem from '@/components/ListItem.vue';
import AppModal from '@/components/AppModal.vue';
import AppButton from '@/components/AppButton.vue';
import FormItem from '@/components/FormItem.vue';
import RefreshableLayout from '@/components/RefreshableLayout.vue';
import { formatMoney, multiply } from '@/utils/format';
import EmptyState from '@/components/EmptyState.vue';

// 修改：引入新的组件
import SkeletonListItem from '@/components/SkeletonListItem.vue';

const userStore = useUserStore();
const dataStore = useDataStore();
const toastStore = useToastStore();
const uiStore = useUiStore();

const isLoading = ref(false);
const hasBeenActivated = ref(false);
const isInitialFetchDone = ref(false);

const instance = getCurrentInstance();
const ripples = reactive<Record<string, any[]>>({});

const activeFilter = ref('standard');
const showFilterSelector = ref(false);

const filterOptions = [
	{ key: 'standard', label: '标准' },
	{ key: 'self_made', label: '自制' }
];

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
type SortMode = 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'production_asc' | 'production_desc';
const sortMode = ref<SortMode>('name_asc');
const standardSortModes: SortMode[] = ['name_asc', 'name_desc', 'price_asc', 'price_desc'];
const selfMadeSortModes: SortMode[] = ['name_asc', 'name_desc', 'production_asc', 'production_desc'];

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
	{ label: '计入成本原料', value: 'STANDARD' },
	{ label: '即时采购原料', value: 'NON_INVENTORIED' },
	{ label: '不计成本原料 (水/冰等)', value: 'UNTRACKED' }
]);

const fabActions = computed(() => [
	{
		icon: '/static/icons/add.svg',
		text: '新增原料',
		action: () => openCreateIngredientModal()
	},
	{
		icon: '/static/icons/history.svg',
		text: '消耗流水',
		action: () => {
			uni.navigateTo({
				url: '/pages/ingredients/consumption-ledger'
			});
		}
	}
]);

const handleTouchStart = (event: any, key: string) => {
	if (!ripples[key]) ripples[key] = [];
	const touch = event.touches[0];
	const targetId = event.currentTarget.id;

	if (!targetId) return;

	const query = uni.createSelectorQuery().in(instance);
	query
		.select('#' + targetId)
		.boundingClientRect((rect) => {
			if (rect) {
				const x = touch.clientX - rect.left;
				const y = touch.clientY - rect.top;
				const size = Math.max(rect.width, rect.height) * 2;
				ripples[key].push({
					id: Date.now(),
					style: {
						width: `${size}px`,
						height: `${size}px`,
						top: `${y - size / 2}px`,
						left: `${x - size / 2}px`
					}
				});
				setTimeout(() => {
					if (ripples[key] && ripples[key].length > 0) ripples[key].shift();
				}, 600);
			}
		})
		.exec();
};

const handleFilterSelect = (key: string) => {
	activeFilter.value = key;
	showFilterSelector.value = false;
	sortMode.value = 'name_asc';
	triggerListAnimationWithKeyUpdate(true);
};

const currentFilterLabel = computed(() => {
	const option = filterOptions.find((o) => o.key === activeFilter.value);
	return option ? option.label : '筛选';
});

const toggleSort = () => {
	const modes = activeFilter.value === 'self_made' ? selfMadeSortModes : standardSortModes;
	const currentIndex = modes.indexOf(sortMode.value);
	sortMode.value = modes[(currentIndex + 1) % modes.length];
	triggerListAnimationWithKeyUpdate(true);
};

const currentSortLabel = computed(() => {
	const labels: Record<SortMode, string> = {
		name_asc: '名称',
		name_desc: '名称',
		price_asc: '单价',
		price_desc: '单价',
		production_asc: '制作',
		production_desc: '制作'
	};
	return labels[sortMode.value];
});

const currentSortDirection = computed(() => (sortMode.value.endsWith('_asc') ? 'up' : 'down'));

const sortIconSrc = computed(() => {
	return currentSortDirection.value === 'up' ? '/static/icons/sort-up.svg' : '/static/icons/sort-down.svg';
});

const getSelfMadeRecipeFamily = (ing: Ingredient) => {
	const allRecipes = [...dataStore.recipes.preDoughs, ...dataStore.recipes.extras];
	return allRecipes.find((r) => r.id === ing.recipeFamilyId) || allRecipes.find((r) => r.name === ing.name);
};

const getRecipeIngredientCount = (ing: Ingredient) => {
	const family = getSelfMadeRecipeFamily(ing);
	return family?.ingredientCount || 0;
};

const getSelfMadeProductionCount = (ing: Ingredient) => {
	const family = getSelfMadeRecipeFamily(ing);
	return family?.productionTaskCount || 0;
};

const getIngredientUnitPrice = (ing: Ingredient) => {
	if (!ing.activeSku || !ing.currentPricePerPackage || !ing.activeSku.specWeightInGrams) {
		return 0;
	}

	const pricePerGram = Number(ing.currentPricePerPackage) / ing.activeSku.specWeightInGrams;
	return multiply(pricePerGram, 1000);
};

const getIngredientUnitPriceLabel = (ing: Ingredient) => {
	const price = getIngredientUnitPrice(ing);
	return price > 0 ? `¥${formatMoney(price)}/kg` : '¥0.00';
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
		switch (sortMode.value) {
			case 'name_desc':
				return b.name.localeCompare(a.name, 'zh-Hans-CN');
			case 'price_asc':
				return getIngredientUnitPrice(a) - getIngredientUnitPrice(b);
			case 'price_desc':
				return getIngredientUnitPrice(b) - getIngredientUnitPrice(a);
			case 'production_asc':
				return getSelfMadeProductionCount(a) - getSelfMadeProductionCount(b);
			case 'production_desc':
				return getSelfMadeProductionCount(b) - getSelfMadeProductionCount(a);
			case 'name_asc':
			default:
				return a.name.localeCompare(b.name, 'zh-Hans-CN');
		}
	});
});

watch(activeFilter, () => {
	const modes = activeFilter.value === 'self_made' ? selfMadeSortModes : standardSortModes;
	if (!modes.includes(sortMode.value)) {
		sortMode.value = 'name_asc';
	}
});

const currentTypeLabel = computed(() => {
	return availableTypes.value.find((t) => t.value === newIngredientForm.type)?.label || '未知类型';
});

const triggerListAnimationWithKeyUpdate = (playAnimation: boolean) => {
	listAnimationKey.value = Date.now();
	triggerListAnimation.value = playAnimation;
};

const loadDataIfNeeded = async () => {
	if (uiStore.activeTab !== 'ingredients') return;

	const isFirstTimeOpening = !hasBeenActivated.value;
	const needsFetch = dataStore.dataStale.ingredients || !dataStore.dataLoaded.ingredients || dataStore.dataStale.recipes || !dataStore.dataLoaded.recipes;

	if (isFirstTimeOpening) {
		hasBeenActivated.value = true;
		isLoading.value = true;
	}

	try {
		let didFetch = false;
		if (dataStore.dataStale.ingredients || !dataStore.dataLoaded.ingredients) {
			await dataStore.fetchIngredientsData();
			didFetch = true;
		}
		if (dataStore.dataStale.recipes || !dataStore.dataLoaded.recipes) {
			await dataStore.fetchRecipesData();
			didFetch = true;
		}
		isInitialFetchDone.value = true;
	} catch (error) {
		console.error('Failed to load ingredients data:', error);
		isInitialFetchDone.value = true;
	} finally {
		if (isFirstTimeOpening || needsFetch) {
			setTimeout(() => {
				isLoading.value = false;
				if (isFirstLoad.value) {
					triggerListAnimationWithKeyUpdate(false);
					isFirstLoad.value = false;
				} else {
					triggerListAnimationWithKeyUpdate(false);
				}
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
		if (newTab === 'ingredients') {
			loadDataIfNeeded();
		} else if (oldTab === 'ingredients') {
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
		toastStore.show({ message: '创建成功，请继续添加规格和价格', type: 'success', duration: 3000 });
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

.tools-bar {
	display: flex;
	align-items: center;
	padding: 10px 15px;
	gap: 10px;
}

.filter-capsule {
	position: relative;
	overflow: hidden;
	transform: translateZ(0);
	display: flex;
	height: 32px;
	align-items: center;
	justify-content: center;
	background-color: #f3e9e3;
	padding: 6px 12px;
	border-radius: 16px;
	min-width: 70px;
	box-sizing: border-box;
	font-size: 14px;
	color: var(--text-secondary);
	font-weight: 500;
	cursor: pointer;
	-webkit-tap-highlight-color: transparent;

	.capsule-content {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.arrow-down {
		width: 0;
		height: 0;
		border-left: 4px solid transparent;
		border-right: 4px solid transparent;
		border-top: 4px solid #8d6e63;
		margin-left: 6px;
		opacity: 0.8;
	}

	.sort-icon-mini {
		width: 14px;
		height: 14px;
		margin-left: 4px;
		opacity: 0.7;
	}
}

.search-box-compact {
	flex: 1;
	height: 32px;
	background-color: #f3e9e3;
	border-radius: 16px;
	display: flex;
	align-items: center;
	padding: 6px 12px;
	box-sizing: border-box;
}

.search-icon {
	width: 14px;
	height: 14px;
	margin-right: 6px;
	opacity: 0.6;
}

.search-input {
	flex: 1;
	font-size: 14px;
	color: var(--text-primary);
	height: 100%;
}

.clear-btn {
	width: 18px;
	height: 18px;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: rgba(140, 90, 59, 0.1);
	border-radius: 50%;
	margin-left: 5px;
	padding: 3px;
	box-sizing: border-box;
}

.clear-icon-svg {
	width: 100%;
	height: 100%;
	opacity: 0.6;
}

.side-info .consumption {
	margin-top: 2px;
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

.checkmark-icon {
	color: var(--primary-color);
	font-weight: bold;
	font-size: 16px;
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
</style>
