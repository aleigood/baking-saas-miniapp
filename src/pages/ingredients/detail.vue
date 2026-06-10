<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader :title="ingredient?.name || '加载中...'" />

		<DetailPageLayout @scroll="handleScroll">
			<view class="page-content page-content-with-fab animated-content" :class="{ 'is-revealed': !isLoading }" v-if="ingredient">
				<view class="card">
					<view class="meta-grid-container" v-if="ingredient.type !== 'UNTRACKED'">
						<view class="meta-item">
							<view class="label">{{ ingredient.type === 'SELF_MADE' ? '保质期' : '品牌' }}</view>
							<view class="value">
								{{
									ingredient.type === 'SELF_MADE'
										? ingredient.shelfLife > 0
											? ingredient.shelfLife + '小时'
											: '未设置'
										: ingredient.activeSku?.brand || '未设置'
								}}
							</view>
						</view>
						<view class="meta-divider"></view>
						<view class="meta-item">
							<view class="label">单价</view>
							<view class="value">{{ ingredientPricePerKg }}</view>
						</view>
						<view class="meta-divider"></view>
						<view class="meta-item">
							<view class="label">本月消耗</view>
							<view class="value">{{ formatWeight(ingredient.monthlyConsumptionInGrams || 0) }}</view>
						</view>
					</view>

					<view :class="{ 'chart-wrapper': ingredient.type !== 'UNTRACKED' }">
						<AnimatedTabs v-model="detailChartTab" :tabs="visibleChartTabs" />
						<LineChart v-if="detailChartTab === 'price'" :chart-data="costHistory" />
						<LineChart v-if="detailChartTab === 'usage'" :chart-data="usageHistory" unit-prefix="" unit-suffix="kg" />
					</view>
				</view>

				<template v-if="ingredient.type === 'STANDARD' || ingredient.type === 'NON_INVENTORIED'">
					<IngredientSkuList
						:ingredient="ingredient"
						:selected-sku-id="selectedSkuId"
						@select="handleSkuClick"
						@longpress-sku="handleSkuLongPressAction"
						@add="openAddSkuModal"
					/>
					<IngredientPriceRecordList :selected-sku="selectedSku" @longpress="handlePriceRecordLongPress" />
				</template>

			</view>

			<view v-if="isLoading" class="page-content page-content-with-fab skeleton-overlay">
				<SkeletonDetail :meta-count="3" :show-chart="true" :list-count="2" :table-groups="0" />
			</view>

			<EmptyState
				v-if="!isLoading && !ingredient"
				:full-page="true"
				icon="/static/icons/network-error.svg"
				title="加载失败"
				subtitle="请检查网络连接后重试"
				:showAction="true"
				actionText="重新加载"
				@action="ingredientId && loadIngredientData(ingredientId)"
			/>
		</DetailPageLayout>

		<ExpandingFab :actions="fabActions" :no-tab-bar="true" :visible="isFabVisible" />

		<AppModal v-model:visible="showEditModal" title="编辑原料属性">
			<FormItem label="原料名称">
				<input
					class="input-field"
					v-model="ingredientForm.name"
					placeholder="输入原料名称"
					:disabled="ingredient?.type === 'SELF_MADE'"
					:class="{ 'is-disabled': ingredient?.type === 'SELF_MADE' }"
				/>
			</FormItem>
			<FormItem label="原料类型">
				<picker mode="selector" :range="availableTypes.map((t) => t.label)" @change="onTypeChange" :disabled="ingredient?.type === 'SELF_MADE'">
					<view class="picker" :class="{ 'is-disabled': ingredient?.type === 'SELF_MADE' }">
						{{ currentTypeLabel }}
						<view class="arrow-down"></view>
					</view>
				</picker>
			</FormItem>

			<template v-if="ingredientForm.type === 'SELF_MADE'">
				<FormItem label="保质期 (小时)">
					<input class="input-field" type="number" v-model="ingredientForm.shelfLife" placeholder="例如: 24" />
				</FormItem>
			</template>

			<view class="form-row">
				<label class="form-row-label">是否为面粉</label>
				<switch :checked="ingredientForm.isFlour" @change="onIsFlourChange" color="#8c5a3b" :disabled="ingredient?.type === 'SELF_MADE'" />
			</view>
			<view class="form-row">
				<label class="form-row-label">含水量 (%)</label>
				<input
					class="input-field"
					type="digit"
					v-model="ingredientForm.waterContent"
					placeholder="例如: 75"
					:disabled="ingredient?.type === 'SELF_MADE'"
					:class="{ 'is-disabled': ingredient?.type === 'SELF_MADE' }"
				/>
			</view>

			<view class="modal-actions">
				<AppButton type="secondary" @click="showEditModal = false">取消</AppButton>
				<AppButton type="primary" @click="handleUpdateIngredient" :loading="isSubmitting">
					{{ isSubmitting ? '保存中...' : '确认保存' }}
				</AppButton>
			</view>
		</AppModal>

		<AppModal v-model:visible="showAddSkuModal" title="新增品牌规格">
			<FormItem label="品牌">
				<input class="input-field" v-model="newSkuForm.brand" placeholder="例如：王后" />
			</FormItem>
			<FormItem label="规格名称">
				<input class="input-field" v-model="newSkuForm.specName" placeholder="例如：1kg袋装" />
			</FormItem>

			<FormItem label="常用密度">
				<picker mode="selector" :range="densityOptions.map((t) => t.label)" @change="onNewSkuDensityChange">
					<view class="picker">
						{{ newSkuDensityLabel }}
						<view class="arrow-down"></view>
					</view>
				</picker>
			</FormItem>
			<FormItem v-if="newSkuForm.density" label="规格体积 (mL)">
				<input class="input-field" type="digit" v-model="newSkuForm.volumeInML" placeholder="例如：1000" />
			</FormItem>
			<FormItem label="规格重量 (g)">
				<input
					class="input-field"
					type="digit"
					v-model="newSkuForm.specWeightInGrams"
					:readonly="isNewSkuWeightReadOnly"
					:placeholder="isNewSkuWeightReadOnly ? '自动计算' : '例如：1000'"
				/>
			</FormItem>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showAddSkuModal = false">取消</AppButton>
				<AppButton type="primary" @click="handleCreateSku" :loading="isSubmitting">
					{{ isSubmitting ? '创建中...' : '确认创建' }}
				</AppButton>
			</view>
		</AppModal>

		<AppModal v-model:visible="showEditSkuModal" title="修改品牌规格">
			<FormItem label="品牌">
				<input class="input-field" v-model="editSkuForm.brand" placeholder="例如：王后" />
			</FormItem>
			<FormItem label="规格名称">
				<input class="input-field" v-model="editSkuForm.specName" placeholder="例如：1kg袋装" />
			</FormItem>

			<FormItem label="常用密度">
				<picker mode="selector" :range="densityOptions.map((t) => t.label)" :disabled="hasPriceRecords" @change="onEditSkuDensityChange">
					<view class="picker" :class="{ 'is-disabled': hasPriceRecords }">
						{{ editSkuDensityLabel }}
						<view class="arrow-down"></view>
					</view>
				</picker>
			</FormItem>
			<FormItem v-if="editSkuForm.density" label="规格体积 (mL)">
				<input
					class="input-field"
					:class="{ 'is-disabled': hasPriceRecords }"
					type="digit"
					v-model="editSkuForm.volumeInML"
					placeholder="例如：1000"
					:disabled="hasPriceRecords"
				/>
			</FormItem>
			<FormItem label="规格重量 (g)">
				<input
					class="input-field"
					:class="{ 'is-disabled': hasPriceRecords }"
					type="digit"
					v-model="editSkuForm.specWeightInGrams"
					:readonly="isEditSkuWeightReadOnly"
					:disabled="hasPriceRecords"
					:placeholder="isEditSkuWeightReadOnly ? '自动计算' : '例如：1000'"
				/>
			</FormItem>
			<view class="modal-warning-text" v-if="hasPriceRecords">此规格已有价格记录，无法修改规格重量。</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showEditSkuModal = false">取消</AppButton>
				<AppButton type="primary" @click="handleUpdateSku" :loading="isSubmitting">
					{{ isSubmitting ? '保存中...' : '确认保存' }}
				</AppButton>
			</view>
		</AppModal>

		<AppModal v-model:visible="showPriceRecordModal" title="新增价格记录">
			<FormItem label="商品规格">
				<input class="input-field" :value="activeSkuName" readonly disabled />
			</FormItem>
			<FormItem label="数量">
				<input class="input-field" type="number" v-model="priceRecordForm.packageCount" placeholder="例如：10包" />
			</FormItem>
			<FormItem label="总价 (元)">
				<input class="input-field" type="digit" v-model="priceRecordForm.totalPrice" placeholder="例如：255" />
			</FormItem>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showPriceRecordModal = false">取消</AppButton>
				<AppButton type="primary" @click="handleCreatePriceRecord" :loading="isSubmitting">
					{{ isSubmitting ? '保存中...' : '确认保存' }}
				</AppButton>
			</view>
		</AppModal>

		<AppModal v-model:visible="showSkuOptionsModal" title="品牌与规格" :no-header-line="true">
			<view class="options-list">
				<ListItem class="option-item" @click="handleEditSkuOption" :bleed="true">
					<view class="main-info">
						<view class="name">修改品牌规格</view>
					</view>
				</ListItem>
				<ListItem class="option-item" @click="handleActivateSkuOption" :bleed="true" v-if="selectedSkuForAction?.id !== ingredient?.activeSku?.id">
					<view class="main-info">
						<view class="name">设为使用中</view>
					</view>
				</ListItem>
				<ListItem class="option-item" @click="handleDeleteSkuOption" :bleed="true" v-if="selectedSkuForAction?.id !== ingredient?.activeSku?.id">
					<view class="main-info">
						<view class="name">删除此品牌</view>
					</view>
				</ListItem>
			</view>
		</AppModal>

		<AppModal v-model:visible="showActivateSkuConfirmModal" title="设为使用中">
			<view class="modal-prompt-text">要将此规格设为当前使用的吗？</view>
			<view class="modal-warning-text">后续价格记录和成本计算将默认使用此规格。</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showActivateSkuConfirmModal = false">取消</AppButton>
				<AppButton type="primary" @click="handleActivateFromModal" :loading="isSubmitting">
					{{ isSubmitting ? '设置中...' : '确认设置' }}
				</AppButton>
			</view>
		</AppModal>

		<AppModal v-model:visible="showDeleteSkuConfirmModal" title="确认删除">
			<view class="modal-prompt-text">确定要删除这个品牌规格吗？</view>
			<view class="modal-warning-text">存在价格记录的品牌规格无法删除，此操作不可撤销。</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showDeleteSkuConfirmModal = false">取消</AppButton>
				<AppButton type="danger" @click="handleConfirmDeleteSku" :loading="isSubmitting">
					{{ isSubmitting ? '删除中...' : '确认删除' }}
				</AppButton>
			</view>
		</AppModal>

		<AppModal v-model:visible="showPriceRecordActionsModal" title="价格记录" :no-header-line="true">
			<view class="options-list">
				<ListItem class="option-item" @click="handleEditPriceRecordOption" :bleed="true">
					<view class="main-info">
						<view class="name">修改价格记录</view>
					</view>
				</ListItem>
			</view>
		</AppModal>

		<AppModal v-model:visible="showEditPriceRecordModal" title="编辑价格记录">
			<FormItem label="商品规格">
				<input class="input-field" :value="editedPriceRecordSkuName" readonly disabled />
			</FormItem>
			<FormItem label="数量">
				<input class="input-field" :value="`${editPriceRecordForm.packageCount} 包`" readonly disabled />
			</FormItem>
			<FormItem label="总价 (元)">
				<input class="input-field" type="digit" v-model="editPriceRecordForm.totalPrice" placeholder="输入总价" />
			</FormItem>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showEditPriceRecordModal = false">取消</AppButton>
				<AppButton type="primary" @click="handleUpdatePriceRecord" :loading="isSubmitting">
					{{ isSubmitting ? '保存中...' : '确认保存' }}
				</AppButton>
			</view>
		</AppModal>

	</view>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { useDataStore } from '@/store/data';
import { useUserStore } from '@/store/user';
import { useToastStore } from '@/store/toast';
import type { Ingredient, IngredientSKU, PriceRecord } from '@/types/api';
import {
	getIngredient,
	createSku,
	createPriceRecord,
	setActiveSku,
	updateIngredient,
	deleteSku,
	updatePriceRecord,
	updateSku
} from '@/api/ingredients';
import { getIngredientCostHistory, getIngredientUsageHistory } from '@/api/costing';
import AppModal from '@/components/AppModal.vue';
import FormItem from '@/components/FormItem.vue';
import ExpandingFab from '@/components/ExpandingFab.vue';
import LineChart from '@/components/LineChart.vue';
import ListItem from '@/components/ListItem.vue';
import AppButton from '@/components/AppButton.vue';
import AnimatedTabs from '@/components/AnimatedTabs.vue';
import IngredientSkuList from '@/components/IngredientSkuList.vue';
import IngredientPriceRecordList from '@/components/IngredientPriceRecordList.vue';
import DetailHeader from '@/components/DetailHeader.vue';
import DetailPageLayout from '@/components/DetailPageLayout.vue';
import { formatWeight, multiply, formatMoney } from '@/utils/format';
// [新增] 引入骨架屏和空状态组件
import SkeletonDetail from '@/components/SkeletonDetail.vue';
import EmptyState from '@/components/EmptyState.vue';

const densityOptions = [
	{ label: '手动输入重量(g)', value: null },
	{ label: '水 (1.0 g/mL)', value: 1.0 },
	{ label: '牛奶 (1.03 g/mL)', value: 1.03 },
	{ label: '淡奶油 (0.99 g/mL)', value: 0.99 },
	{ label: '食用油 (0.92 g/mL)', value: 0.92 }
];

defineOptions({
	inheritAttrs: false
});

const dataStore = useDataStore();
const userStore = useUserStore();
const toastStore = useToastStore();
const isLoading = ref(true);
const isSubmitting = ref(false);
const ingredient = ref<Ingredient | null>(null);
const ingredientId = ref<string | null>(null);
const detailChartTab = ref<'price' | 'usage'>('price');
const chartTabs = ref([
	{ key: 'price', label: '价格走势' },
	{ key: 'usage', label: '用量走势' }
]);
const showAddSkuModal = ref(false);
const newSkuForm = ref<{
	brand: string;
	specName: string;
	specWeightInGrams: number | null;
	volumeInML: number | null;
	density: number | null;
}>({
	brand: '',
	specName: '',
	specWeightInGrams: null,
	volumeInML: null,
	density: null
});

const showEditSkuModal = ref(false);
const editSkuForm = ref<{
	id: string;
	brand: string;
	specName: string;
	specWeightInGrams: number | null;
	volumeInML: number | null;
	density: number | null;
}>({
	id: '',
	brand: '',
	specName: '',
	specWeightInGrams: null,
	volumeInML: null,
	density: null
});

const hasPriceRecords = ref(false);

const showPriceRecordModal = ref(false);
const priceRecordForm = ref<{
	skuId: string;
	packageCount: number | null;
	totalPrice: number | null;
}>({
	skuId: '',
	packageCount: null,
	totalPrice: null
});

const costHistory = ref<{ cost: number }[]>([]);
const usageHistory = ref<{ cost: number; label?: string }[]>([]);
const showActivateSkuConfirmModal = ref(false);
const showSkuOptionsModal = ref(false);
const showDeleteSkuConfirmModal = ref(false);
const selectedSkuForAction = ref<IngredientSKU | null>(null);
const selectedSkuId = ref<string | null>(null);
const selectedPriceRecordForAction = ref<PriceRecord | null>(null);

const showEditModal = ref(false);
const showPriceRecordActionsModal = ref(false);

const isFabVisible = ref(true);
const lastScrollTop = ref(0);
const scrollThreshold = 5;

const isNewSkuWeightReadOnly = computed(() => !!newSkuForm.value.density);
const newSkuDensityLabel = computed(() => {
	return densityOptions.find((t) => t.value === newSkuForm.value.density)?.label || '手动输入重量(g)';
});

const isEditSkuWeightReadOnly = computed(() => !!editSkuForm.value.density || hasPriceRecords.value);
const editSkuDensityLabel = computed(() => {
	return densityOptions.find((t) => t.value === editSkuForm.value.density)?.label || '手动输入重量(g)';
});

const ingredientForm = reactive<{
	name: string;
	type: 'STANDARD' | 'UNTRACKED' | 'NON_INVENTORIED' | 'SELF_MADE';
	isFlour: boolean;
	waterContent: number | null;
	shelfLife: number | null;
}>({
	name: '',
	type: 'STANDARD',
	isFlour: false,
	waterContent: null,
	shelfLife: null
});

const showEditPriceRecordModal = ref(false);
const editPriceRecordForm = reactive<{
	id: string;
	packageCount: number;
	pricePerPackage: number;
	totalPrice: number | null;
}>({
	id: '',
	packageCount: 0,
	pricePerPackage: 0,
	totalPrice: null
});

const visibleChartTabs = computed(() => {
	if (ingredient.value?.type === 'UNTRACKED') {
		return [{ key: 'usage', label: '用量走势' }];
	}
	return chartTabs.value;
});

const fabActions = computed(() => {
	if (!ingredient.value) return [];
	const actions = [];

	if (ingredient.value.type === 'STANDARD' || ingredient.value.type === 'NON_INVENTORIED') {
		actions.push({ icon: '/static/icons/add.svg', text: '记录价格', action: () => openPriceRecordModal() });
	}

	actions.push({ icon: '/static/icons/log.svg', text: '消耗流水', action: () => navigateToConsumptionLedger() });

	if (ingredient.value.type === 'SELF_MADE') {
		actions.push({ icon: '/static/icons/property.svg', text: '配方详情', action: () => navigateToRecipeDetail() });
	} else {
		actions.push({ icon: '/static/icons/property.svg', text: '编辑属性', action: () => openEditModal() });
	}

	return actions;
});

const navigateToConsumptionLedger = () => {
	if (!ingredient.value) return;
	uni.navigateTo({
		url: `/pages/ingredients/consumption-ledger?ingredientId=${ingredient.value.id}&name=${encodeURIComponent(ingredient.value.name)}`
	});
};

const navigateToRecipeDetail = () => {
	if (!ingredient.value?.recipeFamily?.id) {
		toastStore.show({ message: '未找到关联的配方', type: 'error' });
		return;
	}
	uni.navigateTo({
		url: `/pages/recipes/detail?familyId=${ingredient.value.recipeFamily.id}`
	});
};

watch(
	() => [newSkuForm.value.volumeInML, newSkuForm.value.density],
	([volume, density]) => {
		if (volume && density) {
			newSkuForm.value.specWeightInGrams = Number((volume * density).toFixed(1));
		}
	}
);

watch(
	() => [editSkuForm.value.volumeInML, editSkuForm.value.density],
	([volume, density]) => {
		if (volume && density) {
			editSkuForm.value.specWeightInGrams = Number((volume * density).toFixed(1));
		}
	}
);

const onNewSkuDensityChange = (e: any) => {
	const selectedIndex = e.detail.value;
	newSkuForm.value.density = densityOptions[selectedIndex].value;
	if (!newSkuForm.value.density) {
		newSkuForm.value.specWeightInGrams = null;
		newSkuForm.value.volumeInML = null;
	}
};

const onEditSkuDensityChange = (e: any) => {
	const selectedIndex = e.detail.value;
	editSkuForm.value.density = densityOptions[selectedIndex].value;
	if (!editSkuForm.value.density) {
		editSkuForm.value.specWeightInGrams = null;
		editSkuForm.value.volumeInML = null;
	}
};

const onTypeChange = (e: any) => {
	const selectedIndex = e.detail.value;
	if (availableTypes.value && availableTypes.value[selectedIndex]) {
		ingredientForm.type = availableTypes.value[selectedIndex].value as any;
	}
};

onLoad(async (options) => {
	ingredientId.value = options?.ingredientId || null;
	if (ingredientId.value) {
		await loadIngredientData(ingredientId.value);
	} else {
		toastStore.show({ message: '无效的原料ID', type: 'error' });
		isLoading.value = false;
	}
});

onShow(async () => {
	if (ingredientId.value && dataStore.dataStale.ingredients) {
		await loadIngredientData(ingredientId.value);
	}
});

const handleScroll = (event?: any) => {
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

const loadIngredientData = async (id: string) => {
	isLoading.value = true;
	try {
		const [ingredientData, historyData, usageData] = await Promise.all([
			getIngredient(id),
			getIngredientCostHistory(id),
			getIngredientUsageHistory(id, 'month').then((data) => data.map((item) => ({ cost: item.cost / 1000, label: item.label })))
		]);
		ingredient.value = ingredientData;
		costHistory.value = historyData;
		usageHistory.value = usageData;

		ingredientForm.name = ingredientData.name;
		ingredientForm.type = ingredientData.type;
		ingredientForm.isFlour = ingredientData.isFlour;
		ingredientForm.waterContent = ingredientData.waterContent * 100;
		ingredientForm.shelfLife = ingredientData.shelfLife || null;

		if (ingredientData.type === 'UNTRACKED') {
			detailChartTab.value = 'usage';
		}

		if (ingredientData.activeSku?.id) {
			const currentSelectionIsValid = ingredientData.skus.some((sku) => sku.id === selectedSkuId.value);
			if (!currentSelectionIsValid) {
				selectedSkuId.value = ingredientData.activeSku.id;
			}
		} else if (ingredientData.skus.length > 0) {
			selectedSkuId.value = ingredientData.skus[0].id;
		} else {
			selectedSkuId.value = null;
		}
	} catch (error) {
		console.error('Failed to load ingredient data:', error);
		ingredient.value = null; // [修改] 出错时置空数据，触发底部的 EmptyState
	} finally {
		// [修改] 给排版留出渲染时间
		setTimeout(() => {
			isLoading.value = false;
		}, 200);
	}
};

const loadUsageHistory = async (id: string) => {
	const data = await getIngredientUsageHistory(id, 'month');
	usageHistory.value = data.map((item) => ({ cost: item.cost / 1000, label: item.label }));
};

const openEditModal = () => {
	if (ingredient.value) {
		ingredientForm.name = ingredient.value.name;
		ingredientForm.type = ingredient.value.type;
		ingredientForm.isFlour = ingredient.value.isFlour;
		ingredientForm.waterContent = ingredient.value.waterContent * 100;
		ingredientForm.shelfLife = ingredient.value.shelfLife || null;
	}
	showEditModal.value = true;
};

const availableTypes = ref([
	{ label: '计入成本原料', value: 'STANDARD' },
	{ label: '即时采购原料', value: 'NON_INVENTORIED' },
	{ label: '不计成本原料 (水/冰等)', value: 'UNTRACKED' },
	{ label: '自制原料 (由配方产出)', value: 'SELF_MADE' }
]);

const currentTypeLabel = computed(() => {
	return availableTypes.value.find((t) => t.value === ingredientForm.type)?.label || '未知类型';
});

const ingredientPricePerKg = computed(() => {
	const ing = ingredient.value;
	if (!ing || ing.type === 'UNTRACKED') return '¥0.00/kg';

	if (ing.activeSku && ing.currentPricePerPackage && ing.activeSku.specWeightInGrams) {
		const pricePerGram = Number(ing.currentPricePerPackage) / ing.activeSku.specWeightInGrams;
		const price = multiply(pricePerGram, 1000);
		return `¥${formatMoney(price)}/kg`;
	}

	return '¥0.00/kg';
});

const openAddSkuModal = () => {
	newSkuForm.value = {
		brand: '',
		specName: '',
		specWeightInGrams: null,
		volumeInML: null,
		density: null
	};
	showAddSkuModal.value = true;
};

const handleCreateSku = async () => {
	if (!ingredient.value) return;
	if (!newSkuForm.value.specName || !newSkuForm.value.specWeightInGrams) {
		toastStore.show({ message: '请填写规格名称和重量', type: 'error' });
		return;
	}
	isSubmitting.value = true;
	try {
		const skuRes = await createSku(ingredient.value.id, {
			...newSkuForm.value,
			specWeightInGrams: Number(newSkuForm.value.specWeightInGrams)
		});
		const skuId = skuRes.id;

		if (ingredient.value.skus.length === 0) {
			await setActiveSku(ingredient.value.id, skuId);
		}

		toastStore.show({ message: '创建成功', type: 'success' });
		showAddSkuModal.value = false;
		dataStore.markIngredientsAsStale();
		await loadIngredientData(ingredient.value.id);
	} finally {
		isSubmitting.value = false;
	}
};

const handleUpdateSku = async () => {
	if (!editSkuForm.value.id || !ingredient.value) return;
	if (!editSkuForm.value.specName || !editSkuForm.value.specWeightInGrams) {
		toastStore.show({ message: '请填写规格名称和重量', type: 'error' });
		return;
	}
	isSubmitting.value = true;
	try {
		await updateSku(editSkuForm.value.id, {
			brand: editSkuForm.value.brand,
			specName: editSkuForm.value.specName,
			specWeightInGrams: Number(editSkuForm.value.specWeightInGrams)
		});
		toastStore.show({ message: '更新成功', type: 'success' });
		showEditSkuModal.value = false;
		dataStore.markIngredientsAsStale();
		await loadIngredientData(ingredient.value.id);
	} catch (error) {
		console.error('Failed to update SKU:', error);
	} finally {
		isSubmitting.value = false;
	}
};

const activeSkuName = computed(() => {
	if (!ingredient.value?.activeSku) return '无激活SKU';
	const sku = ingredient.value.activeSku;
	return `${sku.brand || '无品牌'} (${sku.specName})`;
});

const editedPriceRecordSkuName = computed(() => {
	if (!selectedSku.value) return '加载中...';
	return `${selectedSku.value.brand || '无品牌'} (${selectedSku.value.specName})`;
});

const openPriceRecordModal = () => {
	if (!ingredient.value?.activeSku?.id) {
		toastStore.show({ message: '请先激活一个规格才能记录价格', type: 'error' });
		return;
	}
	priceRecordForm.value = {
		skuId: ingredient.value.activeSku.id,
		packageCount: null,
		totalPrice: null
	};
	showPriceRecordModal.value = true;
};

const handleCreatePriceRecord = async () => {
	if (
		!priceRecordForm.value.skuId ||
		!priceRecordForm.value.packageCount ||
		priceRecordForm.value.packageCount <= 0 ||
		!priceRecordForm.value.totalPrice ||
		priceRecordForm.value.totalPrice <= 0
	) {
		toastStore.show({ message: '请填写有效的价格记录', type: 'error' });
		return;
	}
	isSubmitting.value = true;
	try {
		const packageCount = Number(priceRecordForm.value.packageCount);
		const totalPrice = Number(priceRecordForm.value.totalPrice);
		const pricePerPackage = totalPrice / packageCount;

		const payload = {
			skuId: priceRecordForm.value.skuId,
			packageCount,
			pricePerPackage
		};

		await createPriceRecord(payload);
		toastStore.show({ message: '价格记录成功', type: 'success' });
		showPriceRecordModal.value = false;
		dataStore.markIngredientsAsStale();
		await loadIngredientData(ingredient.value!.id);
	} finally {
		isSubmitting.value = false;
	}
};

const handleSkuClick = (sku: IngredientSKU) => {
	selectedSkuId.value = sku.id;
};

const handleSkuLongPressAction = (sku: IngredientSKU) => {
	selectedSkuForAction.value = sku;
	showSkuOptionsModal.value = true;
};

const handleActivateSkuOption = () => {
	showSkuOptionsModal.value = false;
	if (selectedSkuForAction.value?.id !== ingredient.value?.activeSku?.id) {
		showActivateSkuConfirmModal.value = true;
	} else {
		toastStore.show({ message: '该规格已在使用中', type: 'info' });
	}
};

const handleEditSkuOption = () => {
	if (!selectedSkuForAction.value) return;

	const skuData = ingredient.value?.skus.find((s) => s.id === selectedSkuForAction.value!.id);
	hasPriceRecords.value = (skuData?.priceRecords?.length || 0) > 0;

	editSkuForm.value = {
		id: selectedSkuForAction.value.id,
		brand: selectedSkuForAction.value.brand || '',
		specName: selectedSkuForAction.value.specName,
		specWeightInGrams: selectedSkuForAction.value.specWeightInGrams,
		volumeInML: null,
		density: null
	};
	showSkuOptionsModal.value = false;
	showEditSkuModal.value = true;
};

const handleDeleteSkuOption = () => {
	showSkuOptionsModal.value = false;
	showDeleteSkuConfirmModal.value = true;
};

const handleConfirmDeleteSku = async () => {
	if (!selectedSkuForAction.value || !ingredient.value) return;
	isSubmitting.value = true;
	try {
		await deleteSku(selectedSkuForAction.value.id);
		toastStore.show({ message: '删除成功', type: 'success' });
		showDeleteSkuConfirmModal.value = false;
		selectedSkuForAction.value = null;
		dataStore.markIngredientsAsStale();
		await loadIngredientData(ingredient.value.id);
	} catch (error) {
		showDeleteSkuConfirmModal.value = false;
	} finally {
		isSubmitting.value = false;
	}
};

const handleActivateFromModal = async () => {
	if (!selectedSkuForAction.value || !ingredient.value) return;
	const sku = selectedSkuForAction.value;
	isSubmitting.value = true;
	try {
		await setActiveSku(ingredient.value.id, sku.id);
		toastStore.show({ message: '设置成功', type: 'success' });
		dataStore.markIngredientsAsStale();
		await loadIngredientData(ingredient.value.id);
	} catch (error) {
		console.error('Failed to activate SKU:', error);
	} finally {
		isSubmitting.value = false;
		showActivateSkuConfirmModal.value = false;
	}
};

const selectedSku = computed(() => {
	if (!ingredient.value || !selectedSkuId.value) return null;
	return ingredient.value.skus.find((s) => s.id === selectedSkuId.value) || null;
});

const onIsFlourChange = (e: any) => {
	ingredientForm.isFlour = e.detail.value;
};

const handleUpdateIngredient = async () => {
	if (!ingredientForm.name || !ingredientForm.name.trim()) {
		toastStore.show({ message: '原料名称不能为空', type: 'error' });
		return;
	}
	if (!ingredient.value) return;
	isSubmitting.value = true;
	try {
		await updateIngredient(ingredient.value.id, {
			name: ingredientForm.name,
			type: ingredientForm.type,
			isFlour: ingredientForm.isFlour,
			waterContent: (Number(ingredientForm.waterContent) || 0) / 100,
			shelfLife: ingredientForm.shelfLife ? Number(ingredientForm.shelfLife) : 0
		});
		toastStore.show({ message: '保存成功', type: 'success' });
		showEditModal.value = false;
		dataStore.markIngredientsAsStale();
		await loadIngredientData(ingredient.value.id);
	} catch (error) {
		console.error('Failed to update ingredient properties:', error);
	} finally {
		isSubmitting.value = false;
	}
};

const handlePriceRecordLongPress = (record: PriceRecord) => {
	selectedPriceRecordForAction.value = record;
	showPriceRecordActionsModal.value = true;
};

const handleEditPriceRecordOption = () => {
	showPriceRecordActionsModal.value = false;
	if (selectedPriceRecordForAction.value) {
		const record = selectedPriceRecordForAction.value;
		editPriceRecordForm.id = record.id;
		editPriceRecordForm.packageCount = record.packageCount;
		editPriceRecordForm.totalPrice = Number(record.pricePerPackage) * record.packageCount;
		showEditPriceRecordModal.value = true;
	}
};

const handleUpdatePriceRecord = async () => {
	if (!editPriceRecordForm.id || !ingredient.value) return;
	isSubmitting.value = true;
	try {
		const pricePerPackage = Number(editPriceRecordForm.totalPrice) / editPriceRecordForm.packageCount;
		if (isNaN(pricePerPackage) || pricePerPackage <= 0) {
			toastStore.show({ message: '请输入有效的总价', type: 'error' });
			isSubmitting.value = false;
			return;
		}
		const payload = {
			pricePerPackage: Number(pricePerPackage.toFixed(2))
		};
		await updatePriceRecord(editPriceRecordForm.id, payload);
		toastStore.show({ message: '更新成功', type: 'success' });
		showEditPriceRecordModal.value = false;
		dataStore.markIngredientsAsStale();
		await loadIngredientData(ingredient.value.id);
	} catch (error) {
		console.error('Failed to update price record:', error);
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

.page-wrapper {
	display: flex;
	flex-direction: column;
	height: 100vh;
}

.header-icon {
	width: 24px;
	height: 24px;
}

.meta-grid-container {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 18px 10px;
	border-radius: 12px;
	margin-bottom: 15px;
	border: none;
}

.meta-item {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6px;
}

.meta-divider {
	width: 1px;
	height: 24px;
	background-color: #e6dccd;
	opacity: 0.6;
}

.meta-item .label {
	font-size: 13px;
	color: var(--text-secondary);
	font-weight: 400;
}

.meta-item .value {
	font-size: 16px;
	font-weight: 600;
	color: var(--primary-color);
	font-family: -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif;
	letter-spacing: -0.5px;
	white-space: nowrap;
}

.chart-wrapper {
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

.header-action {
	font-size: 13px;
	color: var(--text-secondary);
}

.empty-state-sm {
	font-size: 13px;
	color: var(--text-secondary);
	margin-top: 5px;
}

.nav-item-content {
	display: flex;
	align-items: center;
	width: 100%;
	padding: 8px 0;
}

.nav-icon-wrapper {
	width: 36px;
	height: 36px;
	border-radius: 8px;
	background-color: #f5f7fa;
	display: flex;
	justify-content: center;
	align-items: center;
	margin-right: 12px;
	flex-shrink: 0;
}

.nav-icon {
	width: 20px;
	height: 20px;
	opacity: 0.7;
}

.arrow-icon {
	color: #ccc;
	font-size: 14px;
	margin-left: 8px;
}

.card.no-padding {
	padding: 0;
	overflow: hidden;
}
</style>
