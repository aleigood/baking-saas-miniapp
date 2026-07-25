<template>
	<view class="full-height-container">
		<RefreshableLayout ref="refreshableLayout" @refresh="handleRefresh" @scroll="handleScroll" class="full-height-wrapper">
			<view
				class="page-content page-content-with-tabbar-fab no-horizontal-padding animated-content"
				:class="{ 'is-revealed': !isLoading && hasBeenActivated }"
				v-if="hasBeenActivated"
				:key="'ingredients-content'"
			>
				<view class="content-padding">
					<view class="card">
						<view class="card-title"><span>本月原料消耗排行</span></view>
						<view v-if="ingredientConsumptionRanking.length > 0" class="ranking-list">
							<view v-for="(item, index) in ingredientConsumptionRanking.slice(0, 10)" :key="item.id" class="ranking-item">
								<text class="rank">{{ index + 1 }}</text>
								<text class="name">{{ item.name }}</text>
								<text class="count">{{ formatConsumption(item.monthlyConsumptionInGrams || 0) }}</text>
							</view>
						</view>
						<view v-else :key="'stats-empty'" class="empty-state">
							<text>暂无排行信息</text>
						</view>
					</view>
				</view>

				<view class="tools-bar">
					<view class="filter-capsule" id="name-sort-capsule-btn" @touchstart="handleTouchStart($event, 'name')" @click="toggleSort('name')">
						<span v-for="ripple in ripples['name']" :key="ripple.id" class="ripple" :style="ripple.style"></span>
						<view class="capsule-content">
							<text>名称</text>
							<image class="sort-icon-mini" :src="getSortIcon('name')" />
						</view>
					</view>

					<view class="filter-capsule" id="price-sort-capsule-btn" @touchstart="handleTouchStart($event, 'price')" @click="toggleSort('price')">
						<span v-for="ripple in ripples['price']" :key="ripple.id" class="ripple" :style="ripple.style"></span>
						<view class="capsule-content">
							<text>单价</text>
							<image class="sort-icon-mini" :src="getSortIcon('price')" />
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
							<view class="main-info">
								<view class="name-row">
									<text class="name-text">{{ ing.name }}</text>
									<text class="ing-tag flour-tag" v-if="ing.isFlour">面粉</text>
									<text class="ing-tag water-tag" v-if="ing.waterContent && ing.waterContent > 0">含水 {{ Math.round(ing.waterContent * 100) }}%</text>
								</view>
								<view class="desc" v-if="ing.type !== 'STANDARD' || ing.activeSku?.brand">
									<template v-if="ing.type === 'STANDARD'">{{ ing.activeSku?.brand }}</template>
									<template v-else>{{ getIngredientTypeLabel(ing.type) }}</template>
								</view>
							</view>
							<view class="side-info">
								<view class="value">
									<template v-if="ing.type === 'STANDARD' || ing.type === 'NON_INVENTORIED'">
										<text class="price-amount">
											<text class="currency">¥</text>
											{{ formatMoney(ing.unitPricePerGram || 0) }}
										</text>
										<text class="price-unit">/g</text>
									</template>
									<template v-else><text style="color: var(--text-secondary); font-size: 13px">不计入</text></template>
								</view>
							</view>
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
				<view class="content-padding">
					<SkeletonCard mode="ranking" />
				</view>
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
import SkeletonCard from '@/components/SkeletonCard.vue';

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
type SortField = 'name' | 'price';
const sorts = reactive<{ name: 'none' | 'asc' | 'desc'; price: 'none' | 'asc' | 'desc' }>({
	name: 'asc',
	price: 'none'
});
const sortPriority = ref<SortField[]>(['name']);

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

const toggleSort = (field: SortField) => {
	if (sorts[field] === 'none') {
		sorts[field] = 'asc';
	} else if (sorts[field] === 'asc') {
		sorts[field] = 'desc';
	} else {
		sorts[field] = 'none';
	}

	if (sorts[field] !== 'none') {
		sortPriority.value = [field, ...sortPriority.value.filter((f) => f !== field)];
	} else {
		sortPriority.value = sortPriority.value.filter((f) => f !== field);
	}
	triggerListAnimationWithKeyUpdate(true);
};

const getSortIcon = (field: SortField) => (sorts[field] === 'desc' ? '/static/icons/sort-down.svg' : '/static/icons/sort-up.svg');

const getIngredientUnitPrice = (ing: Ingredient) => {
	return ing.unitPricePerGram || 0;
};

const basicIngredients = computed(() => dataStore.ingredients.allIngredients.filter((ingredient) => ingredient.type !== 'SELF_MADE'));

const ingredientConsumptionRanking = computed(() =>
	[...basicIngredients.value]
		.filter((ingredient) => (ingredient.monthlyConsumptionInGrams || 0) > 0)
		.sort((a, b) => (b.monthlyConsumptionInGrams || 0) - (a.monthlyConsumptionInGrams || 0))
);

const formatConsumption = (grams: number) => {
	if (grams >= 1000) return `${Number((grams / 1000).toFixed(2))} kg`;
	return `${Number(grams.toFixed(1))} g`;
};

const compareIngredientNames = (a: string, b: string) => {
	const normalizedA = a.trim();
	const normalizedB = b.trim();
	return normalizedA.localeCompare(normalizedB, 'zh-Hans-CN');
};

const filteredIngredients = computed(() => {
	let list = [...basicIngredients.value];

	if (filterKeyword.value) {
		const kw = filterKeyword.value.toLowerCase();
		list = list.filter((i) => {
			const matchName = i.name.toLowerCase().includes(kw);
			const matchBrand = i.activeSku?.brand?.toLowerCase().includes(kw);
			return matchName || matchBrand;
		});
	}

	return list.sort((a, b) => {
		for (const field of sortPriority.value) {
			if (field === 'price') {
				const diff = getIngredientUnitPrice(a) - getIngredientUnitPrice(b);
				if (diff !== 0) {
					return sorts.price === 'asc' ? diff : -diff;
				}
			} else if (field === 'name') {
				const diff = compareIngredientNames(a.name, b.name);
				if (diff !== 0) {
					return sorts.name === 'asc' ? diff : -diff;
				}
			}
		}
		return compareIngredientNames(a.name, b.name);
	});
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
	const needsFetch = dataStore.dataStale.ingredients || !dataStore.dataLoaded.ingredients;

	if (isFirstTimeOpening) {
		hasBeenActivated.value = true;
		isLoading.value = true;
	}

	try {
		if (dataStore.dataStale.ingredients || !dataStore.dataLoaded.ingredients) {
			await dataStore.fetchIngredientsData();
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
		dataStore.markIngredientMutationStale();
		await dataStore.fetchIngredientsData();
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
			return '基础';
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
		dataStore.markIngredientMutationStale();
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
		dataStore.markIngredientMutationStale();
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

.content-padding {
	padding: 0 15px;
}

.tools-bar {
	display: flex;
	align-items: center;
	padding: 10px 15px;
	gap: 10px;
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
	min-width: 0;
	font-size: 14px;

	.name {
		flex: 1;
		min-width: 0;
		margin: 0 8px 0 4px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--text-primary);
	}
}

.rank {
	width: 12px;
	flex-shrink: 0;
	font-style: italic;
	font-weight: 700;
	color: var(--accent-color);
}

.count {
	flex-shrink: 0;
	font-size: 13px;
	color: var(--text-secondary);
}

.name-row {
	display: flex;
	align-items: center;
	gap: 6px;
	margin-bottom: 2px;
}

.name-text {
	font-weight: 500;
	color: var(--text-primary);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	flex-shrink: 1;
	min-width: 0;
}

.ing-tag {
	font-size: 10px;
	font-weight: 600;
	padding: 2px 5px;
	border-radius: 4px;
	flex-shrink: 0;
	line-height: 1.2;
}

.flour-tag {
	background-color: #f4ede2;
	color: #8d6e63;
}

.water-tag {
	background-color: #eaf2f8;
	color: #2980b9;
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
	transition: background-color 0.2s ease, color 0.2s ease;

	&.active {
		background-color: #eadbd1;
		color: var(--primary-color);
	}

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

.side-info .value {
	display: flex;
	align-items: baseline;
	justify-content: flex-end;
	color: var(--primary-color);
	font-weight: 600;
	font-size: 15px;
}

.price-amount {
	display: inline-flex;
	align-items: baseline;
}

.currency {
	font-size: 11px;
	font-weight: 500;
	margin-right: 1px;
}

.price-unit {
	color: var(--text-secondary);
	font-size: 11px;
	font-weight: 400;
	margin-left: 1px;
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
