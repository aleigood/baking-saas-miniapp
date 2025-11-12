<template>
	<view class="full-height-container">
		<RefreshableLayout ref="refreshableLayout" @refresh="handleRefresh" @scroll="handleScroll" class="full-height-wrapper">
			<view class="page-content page-content-with-tabbar-fab no-horizontal-padding">
				<view class="filter-bar">
					<FilterTabs v-model="ingredientFilter" :tabs="ingredientFilterTabs" />
					<IconButton @click="navigateToLedger">
						<image class="header-icon" src="/static/icons/log.svg" />
					</IconButton>
				</view>

				<view class="list-wrapper">
					<template v-if="ingredientFilter === 'all'">
						<view v-if="dataStore.ingredients.allIngredients.length > 0" :key="listAnimationKey + '-all'">
							<ListItem
								v-for="(ing, index) in dataStore.ingredients.allIngredients"
								:key="ing.id"
								@click="navigateToDetail(ing.id)"
								@longpress="openIngredientActions(ing)"
								:vibrate-on-long-press="canEdit"
								:bleed="true"
								:divider="index < dataStore.ingredients.allIngredients.length - 1"
								:animate-on-mount="triggerListAnimation"
								:animation-index="index"
							>
								<view class="main-info">
									<view class="name">{{ ing.name }}</view>
									<view class="desc">
										<template v-if="ing.type === 'STANDARD'">品牌: {{ ing.activeSku?.brand || '未设置' }}</template>
										<template v-else>{{ getIngredientTypeLabel(ing.type) }}</template>
									</view>
								</view>
								<view class="side-info">
									<view class="value">
										<template v-if="ing.type === 'STANDARD'">{{ formatWeight(ing.currentStockInGrams) }}</template>
										<template v-else>∞</template>
									</view>
									<view v-if="ing.totalConsumptionInGrams > 0 && ing.type !== 'UNTRACKED'" class="desc consumption">
										已消耗: {{ formatWeight(ing.totalConsumptionInGrams) }}
									</view>
								</view>
							</ListItem>
						</view>
						<view v-else class="empty-state">
							<text>暂无原料信息</text>
						</view>
					</template>

					<template v-if="ingredientFilter === 'low'">
						<view v-if="dataStore.ingredients.lowStockIngredients.length > 0" :key="listAnimationKey + '-low'">
							<ListItem
								v-for="(ing, index) in dataStore.ingredients.lowStockIngredients"
								:key="ing.id"
								@click="navigateToDetail(ing.id)"
								@longpress="openIngredientActions(ing)"
								:vibrate-on-long-press="canEdit"
								:bleed="true"
								:divider="index < dataStore.ingredients.lowStockIngredients.length - 1"
								:animate-on-mount="triggerListAnimation"
								:animation-index="index"
							>
								<view class="main-info">
									<view class="name">{{ ing.name }}</view>
									<view class="desc">品牌: {{ ing.activeSku?.brand || '未设置' }}</view>
								</view>
								<view class="side-info">
									<view class="value-tag" :class="getStockStatusClass(ing.daysOfSupply)">
										{{ getDaysOfSupplyText(ing.daysOfSupply) }}
									</view>
									<view class="desc">库存: {{ formatWeight(ing.currentStockInGrams) }}</view>
								</view>
							</ListItem>
						</view>
						<view v-else class="empty-state">
							<text>暂无库存紧张的原料</text>
						</view>
					</template>
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
// [核心修改] 导入 watch
import { ref, computed, reactive, watch } from 'vue';
// [核心修复] 移除了 @dcloud-io- 里的破折号
import { onShow } from '@dcloudio/uni-app';
import { useUserStore } from '@/store/user';
import { useDataStore } from '@/store/data';
import { useToastStore } from '@/store/toast';
// [核心新增] 导入 uiStore
import { useUiStore } from '@/store/ui';
import { createIngredient, deleteIngredient } from '@/api/ingredients';
import type { Ingredient } from '@/types/api';
import ExpandingFab from '@/components/ExpandingFab.vue'; // [核心修改] 更改导入
import ListItem from '@/components/ListItem.vue';
import FilterTabs from '@/components/FilterTabs.vue';
import AppModal from '@/components/AppModal.vue';
import AppButton from '@/components/AppButton.vue';
import IconButton from '@/components/IconButton.vue';
import FormItem from '@/components/FormItem.vue';
import RefreshableLayout from '@/components/RefreshableLayout.vue';
import { formatWeight, formatNumber } from '@/utils/format';

const userStore = useUserStore();
const dataStore = useDataStore();
const toastStore = useToastStore();
// [核心新增] 获取 uiStore 实例
const uiStore = useUiStore();

const ingredientFilter = ref('all');
const isSubmitting = ref(false);
const selectedIngredient = ref<Ingredient | null>(null);
// [核心修改] 移除了 touchStartX 和 touchStartY
const ingredientFilterTabs = ref([
	{ key: 'all', label: '全部' },
	{ key: 'low', label: '库存紧张' }
]);
const refreshableLayout = ref<InstanceType<typeof RefreshableLayout> | null>(null);
const showIngredientActionsModal = ref(false);
const showDeleteIngredientConfirmModal = ref(false);
const showCreateIngredientModal = ref(false);
const isNavigating = ref(false);

const isFabVisible = ref(true);
const lastScrollTop = ref(0);
const scrollThreshold = 5;

// [核心新增] 动画相关状态
const listAnimationKey = ref(Date.now());
const triggerListAnimation = ref(false);
const isFirstLoad = ref(true);

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

const currentTypeLabel = computed(() => {
	return availableTypes.value.find((t) => t.value === newIngredientForm.type)?.label || '未知类型';
});

// [核心新增] 动画辅助函数
const triggerListAnimationWithKeyUpdate = (playAnimation: boolean) => {
	listAnimationKey.value = Date.now();
	triggerListAnimation.value = playAnimation;
};

// [核心新增] 监听 Tab 切换
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
	let didFetch = false; // [中文注释] 动画标志

	if (dataStore.dataStale.ingredients || !dataStore.dataLoaded.ingredients) {
		await dataStore.fetchIngredientsData();
		didFetch = true; // [中文注释] 标记已获取数据
	}

	// [核心新增] 动画状态逻辑
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
		await dataStore.fetchIngredientsData();
	} finally {
		// 1. 告诉 spinner "开始" 隐藏
		refreshableLayout.value?.finishRefresh();

		// 2. [核心修复] 延迟 300毫秒 (等待 spinner 隐藏动画结束)
		setTimeout(() => {
			// 3. 真正开始播放列表动画
			triggerListAnimationWithKeyUpdate(true);
		}, 700); // (这个 300ms 是估计值, 你可以根据 RefreshableLayout 的实际动画时长调整)
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

// [核心修改] 移除了 handleTouchStart 和 handleTouchEnd 两个函数

const currentUserRoleInTenant = computed(() => userStore.userInfo?.tenants.find((t) => t.tenant.id === dataStore.currentTenantId)?.role);

const canEdit = computed(() => {
	return currentUserRoleInTenant.value === 'OWNER' || currentUserRoleInTenant.value === 'ADMIN';
});

// [核心新增] 新增一个辅助函数，用于将原料类型映射为简短的中文标签
const getIngredientTypeLabel = (type: Ingredient['type']) => {
	switch (type) {
		case 'UNTRACKED':
			return '非追踪原料';
		case 'NON_INVENTORIED':
			return '即时采购';
		default:
			return '标准原料'; // 作为备用
	}
};

const getDaysOfSupplyText = (days: number) => {
	if (!isFinite(days) || days > 365) return '充足';
	if (days < 1 && days > 0) return '不足1天';
	if (days <= 0) return '已用尽';
	return `约剩 ${Math.floor(days)} 天`;
};

const getStockStatusClass = (days: number) => {
	if (days <= 0) return 'stock-danger';
	if (days < 7) return 'stock-warning';
	return '';
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
		triggerListAnimationWithKeyUpdate(true); // [中文注释] 操作后播放动画
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
		triggerListAnimationWithKeyUpdate(true); // [中文注释] 操作后播放动画
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

.side-info .consumption {
	margin-top: 2px;
}

.value-tag {
	font-size: 12px;
	font-weight: 500;
	padding: 3px 8px;
	border-radius: 6px;
	color: var(--text-secondary);
	background-color: #f3f4f6;
	display: inline-block;
}

.value-tag.stock-warning {
	background-color: #fef3c7;
	color: #92400e;
}

.value-tag.stock-danger {
	background-color: #fee2e2;
	color: #991b1b;
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
</style>
