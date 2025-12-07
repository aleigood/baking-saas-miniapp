<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader :title="ingredient?.name || '加载中...'" />

		<DetailPageLayout @scroll="handleScroll">
			<view class="page-content page-content-with-fab" v-if="!isLoading && ingredient">
				<view class="top-info-bar" v-if="ingredient.type !== 'UNTRACKED'">
					<view class="tag-group">
						<template v-if="ingredient.type === 'SELF_MADE'">
							<span class="tag">保质期: {{ ingredient.shelfLife > 0 ? ingredient.shelfLife + '小时' : '未设置' }}</span>
						</template>
						<template v-else>
							<span class="tag">品牌: {{ ingredient.activeSku?.brand || '未设置' }}</span>
						</template>
						<span class="tag">单价: {{ ingredientPricePerKg }}</span>
						<span class="tag" v-if="ingredient.type === 'STANDARD' || ingredient.type === 'SELF_MADE'">库存: {{ formatWeight(ingredient.currentStockInGrams) }}</span>
					</view>
				</view>

				<view class="card">
					<AnimatedTabs v-model="detailChartTab" :tabs="visibleChartTabs" />
					<LineChart v-if="detailChartTab === 'price'" :chart-data="costHistory" />
					<LineChart v-if="detailChartTab === 'usage'" :chart-data="usageHistory" unit-prefix="" unit-suffix="kg" />
				</view>

				<template v-if="ingredient.type === 'STANDARD' || ingredient.type === 'NON_INVENTORIED'">
					<IngredientSkuList
						:ingredient="ingredient"
						:selected-sku-id="selectedSkuId"
						@select="handleSkuClick"
						@longpress-sku="handleSkuLongPressAction"
						@add="openAddSkuModal"
					/>
					<IngredientProcurementList :selected-sku="selectedSku" @longpress="handleProcurementLongPress" />
				</template>

				<template v-if="ingredient.type === 'SELF_MADE'">
					<view class="card no-padding">
						<ListItem @click="navigateToLedger" :bleed="true">
							<view class="nav-item-content">
								<view class="nav-icon-wrapper">
									<image class="nav-icon" src="/static/icons/log.svg" />
								</view>
								<view class="main-info">
									<view class="name">生产与库存记录</view>
									<view class="desc">查看入库、消耗与损耗明细</view>
								</view>
								<view class="arrow-icon">&#10095;</view>
							</view>
						</ListItem>
					</view>
				</template>
			</view>
			<view class="loading-spinner" v-else>
				<text>加载中...</text>
			</view>
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

			<view v-if="ingredient?.type === 'SELF_MADE'" class="modal-warning-text" style="margin-top: 10px">注：自制原料的名称、含水量由配方自动同步，无需手动修改。</view>

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
			<FormItem v-if="newSkuForm.density" label="采购体积 (mL)">
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
				<picker mode="selector" :range="densityOptions.map((t) => t.label)" :disabled="hasProcurementRecords" @change="onEditSkuDensityChange">
					<view class="picker" :class="{ 'is-disabled': hasProcurementRecords }">
						{{ editSkuDensityLabel }}
						<view class="arrow-down"></view>
					</view>
				</picker>
			</FormItem>
			<FormItem v-if="editSkuForm.density" label="采购体积 (mL)">
				<input
					class="input-field"
					:class="{ 'is-disabled': hasProcurementRecords }"
					type="digit"
					v-model="editSkuForm.volumeInML"
					placeholder="例如：1000"
					:disabled="hasProcurementRecords"
				/>
			</FormItem>
			<FormItem label="规格重量 (g)">
				<input
					class="input-field"
					:class="{ 'is-disabled': hasProcurementRecords }"
					type="digit"
					v-model="editSkuForm.specWeightInGrams"
					:readonly="isEditSkuWeightReadOnly"
					:disabled="hasProcurementRecords"
					:placeholder="isEditSkuWeightReadOnly ? '自动计算' : '例如：1000'"
				/>
			</FormItem>
			<view class="modal-warning-text" v-if="hasProcurementRecords">此SKU已有采购记录，无法修改规格重量。</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showEditSkuModal = false">取消</AppButton>
				<AppButton type="primary" @click="handleUpdateSku" :loading="isSubmitting">
					{{ isSubmitting ? '保存中...' : '确认保存' }}
				</AppButton>
			</view>
		</AppModal>

		<AppModal v-model:visible="showProcurementModal" title="新增采购">
			<FormItem label="采购商品">
				<input class="input-field" :value="activeSkuName" readonly disabled />
			</FormItem>
			<FormItem label="采购数量">
				<input class="input-field" type="number" v-model="procurementForm.packagesPurchased" placeholder="例如：10包" />
			</FormItem>
			<FormItem label="采购总价 (元)">
				<input class="input-field" type="digit" v-model="procurementForm.totalPrice" placeholder="例如：255" />
			</FormItem>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showProcurementModal = false">取消</AppButton>
				<AppButton type="primary" @click="handleCreateProcurement" :loading="isSubmitting">
					{{ isSubmitting ? '入库中...' : '确认入库' }}
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
			<view class="modal-warning-text">后续的采购和成本计算将默认使用此规格。</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showActivateSkuConfirmModal = false">取消</AppButton>
				<AppButton type="primary" @click="handleActivateFromModal" :loading="isSubmitting">
					{{ isSubmitting ? '设置中...' : '确认设置' }}
				</AppButton>
			</view>
		</AppModal>

		<AppModal v-model:visible="showDeleteSkuConfirmModal" title="确认删除">
			<view class="modal-prompt-text">确定要删除这个品牌规格吗？</view>
			<view class="modal-warning-text">存在采购记录的品牌规格无法删除，此操作不可撤销。</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showDeleteSkuConfirmModal = false">取消</AppButton>
				<AppButton type="danger" @click="handleConfirmDeleteSku" :loading="isSubmitting">
					{{ isSubmitting ? '删除中...' : '确认删除' }}
				</AppButton>
			</view>
		</AppModal>

		<AppModal v-model:visible="showProcurementActionsModal" title="采购记录" :no-header-line="true">
			<view class="options-list">
				<ListItem class="option-item" @click="handleEditProcurementOption" :bleed="true">
					<view class="main-info">
						<view class="name">修改采购记录</view>
					</view>
				</ListItem>
			</view>
		</AppModal>

		<AppModal v-model:visible="showEditProcurementModal" title="编辑采购记录">
			<FormItem label="采购商品">
				<input class="input-field" :value="editedProcurementSkuName" readonly disabled />
			</FormItem>
			<FormItem label="采购数量">
				<input class="input-field" :value="`${editProcurementForm.packagesPurchased} 包`" readonly disabled />
			</FormItem>
			<FormItem label="采购总价 (元)">
				<input class="input-field" type="digit" v-model="editProcurementForm.totalPrice" placeholder="输入总价" />
			</FormItem>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showEditProcurementModal = false">取消</AppButton>
				<AppButton type="primary" @click="handleUpdateProcurement" :loading="isSubmitting">
					{{ isSubmitting ? '保存中...' : '确认保存' }}
				</AppButton>
			</view>
		</AppModal>

		<AppModal v-model:visible="showUpdateStockConfirmModal" title="库存调整">
			<FormItem label="库存变化量 (kg)">
				<input class="input-field" type="digit" v-model="stockAdjustment.changeInKg" placeholder="正数代表盘盈，负数代表损耗" />
			</FormItem>
			<FormItem label="调整原因">
				<picker mode="selector" :range="adjustmentReasons" @change="onReasonChange">
					<view class="picker">
						{{ stockAdjustment.reason || '请选择原因' }}
						<view class="arrow-down"></view>
					</view>
				</picker>
			</FormItem>
			<FormItem v-if="stockAdjustment.reason === '其他'" label=" ">
				<input class="input-field" v-model="stockAdjustment.customReason" placeholder="请输入具体原因" />
			</FormItem>
			<FormItem v-if="stockAdjustment.reason === '初次录入'" label="初期单价 (元/kg)">
				<input class="input-field" type="digit" v-model="stockAdjustment.initialCostPerKg" placeholder="输入估算单价" />
			</FormItem>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showUpdateStockConfirmModal = false">取消</AppButton>
				<AppButton type="primary" @click="handleConfirmUpdateStock" :loading="isSubmitting">
					{{ isSubmitting ? '保存中...' : '确认调整' }}
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
import type { Ingredient, IngredientSKU, ProcurementRecord, IngredientLedgerEntry } from '@/types/api';
import {
	getIngredient,
	createSku,
	createProcurement,
	setActiveSku,
	updateIngredient,
	deleteSku,
	updateProcurement,
	adjustStock,
	getIngredientLedger,
	updateSku
} from '@/api/ingredients';
import { getIngredientCostHistory, getIngredientUsageHistory } from '@/api/costing';
import { getLocalDate } from '@/utils/format';
import AppModal from '@/components/AppModal.vue';
import FormItem from '@/components/FormItem.vue';
import ExpandingFab from '@/components/ExpandingFab.vue';
import LineChart from '@/components/LineChart.vue';
import ListItem from '@/components/ListItem.vue';
import IconButton from '@/components/IconButton.vue';
import AppButton from '@/components/AppButton.vue';
import AnimatedTabs from '@/components/AnimatedTabs.vue';
import IngredientSkuList from '@/components/IngredientSkuList.vue';
import IngredientProcurementList from '@/components/IngredientProcurementList.vue';
import DetailHeader from '@/components/DetailHeader.vue';
import DetailPageLayout from '@/components/DetailPageLayout.vue';
import FilterTabs from '@/components/FilterTabs.vue';
import { formatChineseDate, formatDateTime, formatNumber, formatWeight, multiply, formatMoney } from '@/utils/format';

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

const hasProcurementRecords = ref(false);

const showProcurementModal = ref(false);
const procurementForm = ref<{
	skuId: string;
	packagesPurchased: number | null;
	totalPrice: number | null;
}>({
	skuId: '',
	packagesPurchased: null,
	totalPrice: null
});

const costHistory = ref<{ cost: number }[]>([]);
const usageHistory = ref<{ cost: number }[]>([]);
const showActivateSkuConfirmModal = ref(false);
const showSkuOptionsModal = ref(false);
const showDeleteSkuConfirmModal = ref(false);
const selectedSkuForAction = ref<IngredientSKU | null>(null);
const selectedSkuId = ref<string | null>(null);
const selectedProcurementForAction = ref<ProcurementRecord | null>(null);

const showEditModal = ref(false);
const showProcurementActionsModal = ref(false);
const showUpdateStockConfirmModal = ref(false);

const isFabVisible = ref(true);
const lastScrollTop = ref(0);
const scrollThreshold = 5;

const isNewSkuWeightReadOnly = computed(() => !!newSkuForm.value.density);
const newSkuDensityLabel = computed(() => {
	return densityOptions.find((t) => t.value === newSkuForm.value.density)?.label || '手动输入重量(g)';
});

const isEditSkuWeightReadOnly = computed(() => !!editSkuForm.value.density || hasProcurementRecords.value);
const editSkuDensityLabel = computed(() => {
	return densityOptions.find((t) => t.value === editSkuForm.value.density)?.label || '手动输入重量(g)';
});

const ingredientForm = reactive<{
	name: string;
	type: 'STANDARD' | 'UNTRACKED' | 'NON_INVENTORIED' | 'SELF_MADE';
	isFlour: boolean;
	waterContent: number | null;
	shelfLife: number | null; // [核心新增]
}>({
	name: '',
	type: 'STANDARD',
	isFlour: false,
	waterContent: null,
	shelfLife: null
});

const showEditProcurementModal = ref(false);
const editProcurementForm = reactive<{
	id: string;
	packagesPurchased: number;
	pricePerPackage: number;
	purchaseDate: string;
	totalPrice: number | null;
}>({
	id: '',
	packagesPurchased: 0,
	pricePerPackage: 0,
	purchaseDate: '',
	totalPrice: null
});

const stockAdjustment = reactive<{
	changeInKg: number | null;
	reason: string;
	customReason: string;
	initialCostPerKg?: number | null;
}>({
	changeInKg: null,
	reason: '',
	customReason: '',
	initialCostPerKg: null
});

const adjustmentReasons = ['初次录入', '盘盈', '盘亏', '过期损耗', '其他'];

const visibleChartTabs = computed(() => {
	if (ingredient.value?.type === 'UNTRACKED') {
		return [{ key: 'usage', label: '用量走势' }];
	}
	return chartTabs.value;
});

const fabActions = computed(() => {
	if (!ingredient.value) return [];
	const currentUserRole = userStore.userInfo?.tenants.find((t) => t.tenant.id === dataStore.currentTenantId)?.role;
	const actions = [];

	if (ingredient.value.type === 'STANDARD' || ingredient.value.type === 'NON_INVENTORIED') {
		actions.push({ icon: '/static/icons/add.svg', text: '增加采购', action: () => openProcurementModal() });
	}

	actions.push({ icon: '/static/icons/property.svg', text: '编辑属性', action: () => openEditModal() });

	// [核心修改] 自制原料也允许调整库存（如报损、盘点）
	if ((ingredient.value.type === 'STANDARD' || ingredient.value.type === 'SELF_MADE') && (currentUserRole === 'OWNER' || currentUserRole === 'ADMIN')) {
		actions.push({ icon: '/static/icons/adjust.svg', text: '库存调整', action: () => openUpdateStockModal() });
	}

	return actions;
});

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
			getIngredientUsageHistory(id).then((data) => data.map((item) => ({ cost: item.cost / 1000 })))
		]);
		ingredient.value = ingredientData;
		costHistory.value = historyData;
		usageHistory.value = usageData;

		ingredientForm.name = ingredientData.name;
		ingredientForm.type = ingredientData.type;
		ingredientForm.isFlour = ingredientData.isFlour;
		ingredientForm.waterContent = ingredientData.waterContent * 100;
		// [核心新增] 初始化保质期
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
	} finally {
		isLoading.value = false;
	}
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
	{ label: '标准原料 (追踪库存和成本)', value: 'STANDARD' },
	{ label: '即时采购 (仅追踪成本)', value: 'NON_INVENTORIED' },
	{ label: '非追踪原料 (水/冰等)', value: 'UNTRACKED' },
	{ label: '自制原料 (由配方产出)', value: 'SELF_MADE' } // [核心新增]
]);

const currentTypeLabel = computed(() => {
	return availableTypes.value.find((t) => t.value === ingredientForm.type)?.label || '未知类型';
});

const onTypeChange = (e: any) => {
	ingredientForm.type = availableTypes.value[e.detail.value].value as any;
};

const ingredientPricePerKg = computed(() => {
	const ing = ingredient.value;
	if (!ing) return '¥0.00/kg';

	// [核心修改] 对于标准原料和自制原料，优先使用当前库存价值计算单价
	if (ing.type === 'STANDARD' || ing.type === 'SELF_MADE') {
		if (ing.currentStockInGrams > 0) {
			const pricePerGram = ing.currentStockValue / ing.currentStockInGrams;
			const price = multiply(pricePerGram, 1000);
			return `¥${formatMoney(price)}/kg`;
		}
		// 如果没有库存，尝试显示上次成本（自制原料可能没有 SKU，所以这里可能显示 0）
		if (ing.type === 'SELF_MADE') return '¥0.00/kg';
	}

	// 对于采购原料，如果没有库存，尝试用上次采购价
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

const editedProcurementSkuName = computed(() => {
	if (!selectedSku.value) return '加载中...';
	return `${selectedSku.value.brand || '无品牌'} (${selectedSku.value.specName})`;
});

const openProcurementModal = () => {
	if (!ingredient.value?.activeSku?.id) {
		toastStore.show({ message: '请先激活一个SKU才能进行采购', type: 'error' });
		return;
	}
	procurementForm.value = {
		skuId: ingredient.value.activeSku.id,
		packagesPurchased: null,
		totalPrice: null
	};
	showProcurementModal.value = true;
};

const handleCreateProcurement = async () => {
	if (
		!procurementForm.value.skuId ||
		!procurementForm.value.packagesPurchased ||
		procurementForm.value.packagesPurchased <= 0 ||
		!procurementForm.value.totalPrice ||
		procurementForm.value.totalPrice <= 0
	) {
		toastStore.show({ message: '请填写所有有效的采购信息', type: 'error' });
		return;
	}
	isSubmitting.value = true;
	try {
		const packagesPurchased = Number(procurementForm.value.packagesPurchased);
		const totalPrice = Number(procurementForm.value.totalPrice);
		const pricePerPackage = totalPrice / packagesPurchased;

		const payload = {
			skuId: procurementForm.value.skuId,
			packagesPurchased: packagesPurchased,
			pricePerPackage: pricePerPackage,
			purchaseDate: new Date().toISOString()
		};

		await createProcurement(payload);
		toastStore.show({ message: '入库成功', type: 'success' });
		showProcurementModal.value = false;
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
	hasProcurementRecords.value = (skuData?.procurementRecords?.length || 0) > 0;

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
			shelfLife: ingredientForm.shelfLife ? Number(ingredientForm.shelfLife) : 0 // [核心新增]
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

const handleProcurementLongPress = (record: ProcurementRecord) => {
	selectedProcurementForAction.value = record;
	showProcurementActionsModal.value = true;
};

const handleEditProcurementOption = () => {
	showProcurementActionsModal.value = false;
	if (selectedProcurementForAction.value) {
		const record = selectedProcurementForAction.value;
		editProcurementForm.id = record.id;
		editProcurementForm.packagesPurchased = record.packagesPurchased;
		editProcurementForm.totalPrice = Number(record.pricePerPackage) * record.packagesPurchased;
		editProcurementForm.purchaseDate = getLocalDate(new Date(record.purchaseDate));
		showEditProcurementModal.value = true;
	}
};

const handleUpdateProcurement = async () => {
	if (!editProcurementForm.id || !ingredient.value) return;
	isSubmitting.value = true;
	try {
		const pricePerPackage = Number(editProcurementForm.totalPrice) / editProcurementForm.packagesPurchased;
		if (isNaN(pricePerPackage) || pricePerPackage <= 0) {
			toastStore.show({ message: '请输入有效的采购总价', type: 'error' });
			isSubmitting.value = false;
			return;
		}
		const payload = {
			pricePerPackage: Number(pricePerPackage.toFixed(2))
		};
		await updateProcurement(editProcurementForm.id, payload);
		toastStore.show({ message: '更新成功', type: 'success' });
		showEditProcurementModal.value = false;
		dataStore.markIngredientsAsStale();
		await loadIngredientData(ingredient.value.id);
	} catch (error) {
		console.error('Failed to update procurement:', error);
	} finally {
		isSubmitting.value = false;
	}
};

const openUpdateStockModal = () => {
	if (ingredient.value) {
		stockAdjustment.changeInKg = null;
		stockAdjustment.reason = '';
		stockAdjustment.customReason = '';
		stockAdjustment.initialCostPerKg = null;
		showUpdateStockConfirmModal.value = true;
	}
};

const onReasonChange = (e: any) => {
	const selectedIndex = e.detail.value;
	stockAdjustment.reason = adjustmentReasons[selectedIndex];
};

const handleConfirmUpdateStock = async () => {
	if (!ingredient.value) return;
	if (stockAdjustment.changeInKg === 0 || stockAdjustment.changeInKg === null) {
		toastStore.show({ message: '请输入有效的库存变化量', type: 'error' });
		return;
	}

	let finalReason = stockAdjustment.reason;
	if (stockAdjustment.reason === '其他') {
		finalReason = stockAdjustment.customReason.trim();
	}
	if (!finalReason) {
		toastStore.show({ message: '请选择或输入一个调整原因', type: 'error' });
		return;
	}

	if (stockAdjustment.reason === '初次录入' && (!stockAdjustment.initialCostPerKg || stockAdjustment.initialCostPerKg <= 0)) {
		toastStore.show({ message: '初次录入必须填写有效的单价', type: 'error' });
		return;
	}

	isSubmitting.value = true;
	try {
		const changeInGrams = Number(stockAdjustment.changeInKg) * 1000;
		const payload: {
			changeInGrams: number;
			reason: string;
			initialCostPerKg?: number;
		} = {
			changeInGrams: changeInGrams,
			reason: finalReason
		};

		if (stockAdjustment.reason === '初次录入') {
			payload.initialCostPerKg = stockAdjustment.initialCostPerKg!;
		}

		await adjustStock(ingredient.value.id, payload);
		toastStore.show({ message: '库存调整成功', type: 'success' });
		showUpdateStockConfirmModal.value = false;
		dataStore.markIngredientsAsStale();
		await loadIngredientData(ingredient.value.id);
	} catch (error) {
		console.error('Failed to adjust stock:', error);
	} finally {
		isSubmitting.value = false;
	}
};

const navigateToLedger = () => {
	if (!ingredient.value) return;
	uni.navigateTo({
		url: `/pages/ingredients/ledger?ingredientId=${ingredient.value.id}`
	});
};
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';

@include list-item-content-style; // [核心新增] 确保内部内容样式正确应用
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

.top-info-bar {
	display: flex;
	justify-content: space-between;
	align-items: start;
	margin-bottom: 20px;
	gap: 10px;
}

.tag-group {
	flex: 1;
	margin-bottom: 0;
	padding: 0;
	display: flex;
	flex-wrap: wrap;
	gap: 5px;
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

/* [核心新增] 列表导航样式，复用 list-item-content-style */
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

/* 确保 card no-padding 能正确移除内边距 */
.card.no-padding {
	padding: 0;
	overflow: hidden; /* 确保圆角裁剪 */
}
</style>
