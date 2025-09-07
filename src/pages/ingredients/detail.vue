<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader :title="ingredient?.name || '加载中...'" />

		<DetailPageLayout>
			<view class="page-content page-content-with-fab" v-if="!isLoading && ingredient">
				<view class="top-info-bar">
					<view class="tag-group">
						<span class="tag">品牌: {{ ingredient.activeSku?.brand || '未设置' }}</span>
						<span class="tag">单价: {{ ingredientPricePerKg }}</span>
						<span class="tag">库存: {{ formatWeight(ingredient.currentStockInGrams) }}</span>
					</view>
				</view>


				<view class="card">
					<AnimatedTabs v-model="detailChartTab" :tabs="chartTabs" />
					<LineChart v-if="detailChartTab === 'price'" :chart-data="costHistory" />
					<LineChart v-if="detailChartTab === 'usage'" :chart-data="usageHistory" unit-prefix=""
						unit-suffix="kg" />
				</view>


				<IngredientSkuList :ingredient="ingredient" :selected-sku-id="selectedSkuId" @select="handleSkuClick"
					@longpress-sku="handleSkuLongPressAction" @add="openAddSkuModal" />

				<IngredientProcurementList :selected-sku="selectedSku" @longpress="handleProcurementLongPress" />
			</view>
			<view class="loading-spinner" v-else>
				<text>加载中...</text>
			</view>
		</DetailPageLayout>

		<ExpandingFab :actions="fabActions" :no-tab-bar="true" />

		<AppModal v-model:visible="showEditModal" title="编辑原料属性">
			<FormItem label="原料名称">
				<input class="input-field" v-model="ingredientForm.name" placeholder="输入原料名称" />
			</FormItem>
			<FormItem label="原料类型">
				<picker mode="selector" :range="availableTypes.map(t => t.label)" @change="onTypeChange">
					<view class="picker">{{ currentTypeLabel }}
						<view class="arrow-down"></view>
					</view>
				</picker>
			</FormItem>
			<view class="form-row">
				<label class="form-row-label">是否为面粉</label>
				<switch :checked="ingredientForm.isFlour" @change="onIsFlourChange" color="#8c5a3b" />
			</view>
			<view class="form-row">
				<label class="form-row-label">含水量 (%)</label>
				<input class="input-field" type="number" v-model.number="ingredientForm.waterContent"
					placeholder="例如: 75" />
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
			<FormItem label="规格重量 (g)">
				<input class="input-field" type="number" v-model="newSkuForm.specWeightInGrams" placeholder="例如：1000" />
			</FormItem>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showAddSkuModal = false">取消</AppButton>
				<AppButton type="primary" @click="handleCreateSku" :loading="isSubmitting">
					{{ isSubmitting ? '创建中...' : '确认创建' }}
				</AppButton>
			</view>
		</AppModal>

		<AppModal v-model:visible="showProcurementModal" title="新增采购">
			<FormItem label="采购商品">
				<input class="input-field" :value="activeSkuName" readonly disabled />
			</FormItem>
			<FormItem label="采购数量">
				<input class="input-field" type="number" v-model="procurementForm.packagesPurchased"
					placeholder="例如：10包" />
			</FormItem>
			<FormItem label="采购总价 (元)">
				<input class="input-field" type="number" v-model="procurementForm.totalPrice" placeholder="例如：255" />
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
				<ListItem class="option-item" @click="handleActivateSkuOption" :bleed="true">
					<view class="main-info">
						<view class="name">设为使用中</view>
					</view>
				</ListItem>
				<ListItem class="option-item" @click="handleDeleteSkuOption" :bleed="true">
					<view class="main-info">
						<view class="name">删除此品牌</view>
					</view>
				</ListItem>
			</view>
		</AppModal>

		<AppModal v-model:visible="showActivateSkuConfirmModal" title="设为使用中">
			<view class="modal-prompt-text">
				要将此规格设为当前使用的吗？
			</view>
			<view class="modal-warning-text">
				后续的采购和成本计算将默认使用此规格。
			</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showActivateSkuConfirmModal = false">取消</AppButton>
				<AppButton type="primary" @click="handleActivateFromModal" :loading="isSubmitting">
					{{ isSubmitting ? '设置中...' : '确认设置' }}
				</AppButton>
			</view>
		</AppModal>

		<AppModal v-model:visible="showDeleteSkuConfirmModal" title="确认删除">
			<view class="modal-prompt-text">
				确定要删除这个品牌规格吗？
			</view>
			<view class="modal-warning-text">
				存在采购记录的品牌规格无法删除，此操作不可撤销。
			</view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showDeleteSkuConfirmModal = false">取消</AppButton>
				<AppButton type="danger" @click="handleConfirmDeleteSku" :loading="isSubmitting">
					{{ isSubmitting ? '删除中...' : '确认删除' }}
				</AppButton>
			</view>
		</AppModal>

		<AppModal :visible="uiStore.showProcurementActionsModal"
			@update:visible="uiStore.closeModal(MODAL_KEYS.PROCUREMENT_ACTIONS)" title="采购记录" :no-header-line="true">
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
				<input class="input-field" type="number" v-model.number="editProcurementForm.totalPrice"
					placeholder="输入总价" />
			</FormItem>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showEditProcurementModal = false">取消</AppButton>
				<AppButton type="primary" @click="handleUpdateProcurement" :loading="isSubmitting">
					{{ isSubmitting ? '保存中...' : '确认保存' }}
				</AppButton>
			</view>
		</AppModal>

		<AppModal :visible="uiStore.showUpdateStockConfirmModal"
			@update:visible="uiStore.closeModal(MODAL_KEYS.UPDATE_STOCK_CONFIRM)" title="库存调整">
			<FormItem label="库存变化量 (kg)">
				<input class="input-field" type="digit" v-model.number="stockAdjustment.changeInKg"
					placeholder="正数代表盘盈，负数代表损耗" />
			</FormItem>
			<FormItem v-if="isInitialStockEntry" label="期初单价 (元/kg)">
				<input class="input-field" type="digit" v-model.number="stockAdjustment.initialCostPerKg"
					placeholder="输入估算单价" />
			</FormItem>
			<FormItem label="调整原因 (可选)">
				<view class="reason-tags">
					<FilterTabs v-model="stockAdjustment.reason" :tabs="presetReasonTabs" />
				</view>
				<input class="input-field" v-model="stockAdjustment.reason" placeholder="或手动输入原因" />
			</FormItem>
			<view class="modal-actions">
				<AppButton type="secondary" @click="uiStore.closeModal(MODAL_KEYS.UPDATE_STOCK_CONFIRM)">取消</AppButton>
				<AppButton type="primary" @click="handleConfirmUpdateStock" :loading="isSubmitting">
					{{ isSubmitting ? '保存中...' : '确认调整' }}
				</AppButton>
			</view>
		</AppModal>
	</view>
</template>

<script setup lang="ts">
	import { ref, computed, reactive, watch } from 'vue';
	import { onLoad } from '@dcloudio/uni-app';
	import { useDataStore } from '@/store/data';
	import { useUiStore } from '@/store/ui';
	import { useUserStore } from '@/store/user';
	import { useToastStore } from '@/store/toast';
	import type { Ingredient, IngredientSKU, ProcurementRecord, IngredientLedgerEntry } from '@/types/api';
	import { getIngredient, createSku, createProcurement, setActiveSku, updateIngredient, deleteSku, updateProcurement, adjustStock, getIngredientLedger } from
		'@/api/ingredients';
	import { getIngredientCostHistory, getIngredientUsageHistory } from '@/api/costing';
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
	import { MODAL_KEYS } from '@/constants/modalKeys';
	import { formatChineseDate, formatDateTime, formatNumber, formatWeight } from '@/utils/format';

	defineOptions({
		inheritAttrs: false
	});

	const dataStore = useDataStore();
	const uiStore = useUiStore();
	const userStore = useUserStore();
	const toastStore = useToastStore();
	const isLoading = ref(true);
	const isSubmitting = ref(false);
	const ingredient = ref<Ingredient | null>(null);
	const detailChartTab = ref<'price' | 'usage'>('price');
	const chartTabs = ref([
		{ key: 'price', label: '价格走势' },
		{ key: 'usage', label: '用量走势' },
	]);
	const showAddSkuModal = ref(false);
	const newSkuForm = ref<{
		brand : string;
		specName : string;
		specWeightInGrams : number | null;
	}>({
		brand: '',
		specName: '',
		specWeightInGrams: null,
	});
	const showProcurementModal = ref(false);
	// [核心改造] 移除 procurementForm 中的 purchaseDate
	const procurementForm = ref<{
		skuId : string;
		packagesPurchased : number | null;
		totalPrice : number | null;
	}>({
		skuId: '',
		packagesPurchased: null,
		totalPrice: null,
	});

	// [核心改造] 移除 isBackEntry

	const costHistory = ref<{ cost : number }[]>([]);
	const usageHistory = ref<{ cost : number }[]>([]);
	const showActivateSkuConfirmModal = ref(false);
	const showSkuOptionsModal = ref(false);
	const showDeleteSkuConfirmModal = ref(false);
	const selectedSkuForAction = ref<IngredientSKU | null>(null);
	const selectedSkuId = ref<string | null>(null);
	const selectedProcurementForAction = ref<ProcurementRecord | null>(null);

	const showEditModal = ref(false);

	const ingredientForm = reactive({
		name: '',
		type: 'STANDARD' as 'STANDARD' | 'UNTRACKED',
		isFlour: false,
		waterContent: 0,
	});

	const showEditProcurementModal = ref(false);
	const editProcurementForm = reactive({
		id: '',
		packagesPurchased: 0,
		pricePerPackage: 0,
		purchaseDate: '',
		totalPrice: 0,
	});

	// [核心改造] 为库存调整对象增加 initialCostPerKg 字段
	const stockAdjustment = reactive<{
		changeInKg : number | null;
		reason : string;
		initialCostPerKg ?: number | null; // 期初单价 (元/kg)
	}>({
		changeInKg: null,
		reason: '',
		initialCostPerKg: null,
	});


	const presetReasonTabs = computed(() => {
		const reasons = ['盘点损耗', '盘点盈余', '过期损耗', '包装破损'];
		return reasons.map(reason => ({
			key: reason,
			label: reason
		}));
	});

	// [核心改造] 新增计算属性，判断当前是否为期初库存录入场景
	const isInitialStockEntry = computed(() => {
		return ingredient.value?.currentStockInGrams === 0 && (stockAdjustment.changeInKg || 0) > 0;
	});


	const fabActions = computed(() => {
		const currentUserRole = userStore.userInfo?.tenants.find(t => t.tenant.id === dataStore.currentTenantId)?.role;
		const actions = [
			{ icon: '/static/icons/add.svg', text: '增加采购', action: () => openProcurementModal() },
			{ icon: '/static/icons/property.svg', text: '编辑属性', action: () => openEditModal() }
		];

		if (currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') {
			actions.splice(2, 0, { icon: '/static/icons/adjust.svg', text: '库存调整', action: () => openUpdateStockModal() });
		}

		return actions;
	});

	onLoad(async (options) => {
		const ingredientId = options?.ingredientId;
		if (ingredientId) {
			await loadIngredientData(ingredientId);
		} else {
			toastStore.show({ message: '无效的原料ID', type: 'error' });
			isLoading.value = false;
		}
	});

	const loadIngredientData = async (id : string) => {
		isLoading.value = true;
		try {
			const [ingredientData, historyData, usageData] = await Promise.all([
				getIngredient(id),
				getIngredientCostHistory(id),
				getIngredientUsageHistory(id).then(data => data.map(item => ({ cost: item.cost / 1000 }))),
			]);
			ingredient.value = ingredientData;
			costHistory.value = historyData;
			usageHistory.value = usageData;

			ingredientForm.name = ingredientData.name;
			ingredientForm.type = ingredientData.type;
			ingredientForm.isFlour = ingredientData.isFlour;
			ingredientForm.waterContent = ingredientData.waterContent * 100;


			if (ingredientData.activeSku?.id) {
				selectedSkuId.value = ingredientData.activeSku.id;
			} else if (ingredientData.skus.length > 0) {
				selectedSkuId.value = ingredientData.skus[0].id;
			}
		} catch (error) {
			console.error("Failed to load ingredient data:", error);
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
		}
		showEditModal.value = true;
	};


	const availableTypes = ref([
		{ label: '标准原料 (追踪库存)', value: 'STANDARD' },
		{ label: '非追踪原料 (不计库存)', value: 'UNTRACKED' },
	]);

	const currentTypeLabel = computed(() => {
		return availableTypes.value.find(t => t.value === ingredientForm.type)?.label || '未知类型';
	});

	const onTypeChange = (e : any) => {
		ingredientForm.type = availableTypes.value[e.detail.value].value as 'STANDARD' | 'UNTRACKED';
	};

	const ingredientPricePerKg = computed(() => {
		const ing = ingredient.value;
		if (!ing || !ing.activeSku || !ing.currentPricePerPackage || !ing.activeSku.specWeightInGrams) {
			return '¥0/kg';
		}
		const price = ((Number(ing.currentPricePerPackage) / ing.activeSku.specWeightInGrams) * 1000);
		return `¥${formatNumber(price)}/kg`;
	});

	const openAddSkuModal = () => {
		newSkuForm.value = { brand: '', specName: '', specWeightInGrams: null };
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
			await loadIngredientData(ingredient.value.id);
			await dataStore.fetchIngredientsData();
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
			totalPrice: null,
		};
		showProcurementModal.value = true;
	};

	// [核心改造] 移除 onBackEntryChange 和 onNewProcurementDateChange

	const handleCreateProcurement = async () => {
		if (!procurementForm.value.skuId || !procurementForm.value.packagesPurchased || procurementForm.value.packagesPurchased <= 0 || !procurementForm.value.totalPrice || procurementForm.value.totalPrice <= 0) {
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
				// [核心改造] 采购日期始终为当前时间
				purchaseDate: new Date().toISOString(),
			};

			await createProcurement(payload);
			toastStore.show({ message: '入库成功', type: 'success' });
			showProcurementModal.value = false;
			await loadIngredientData(ingredient.value!.id);
			await dataStore.fetchIngredientsData();
		} finally {
			isSubmitting.value = false;
		}
	};

	const handleSkuClick = (sku : IngredientSKU) => {
		selectedSkuId.value = sku.id;
	};

	const handleSkuLongPressAction = (sku : IngredientSKU) => {
		if (sku.id === ingredient.value?.activeSku?.id) {
			return;
		}
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
			await loadIngredientData(ingredient.value.id);
			await dataStore.fetchIngredientsData();
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
			await loadIngredientData(ingredient.value.id);
			await dataStore.fetchIngredientsData();
		} catch (error) {
			console.error('Failed to activate SKU:', error);
		} finally {
			isSubmitting.value = false;
			showActivateSkuConfirmModal.value = false;
		}
	};

	const selectedSku = computed(() => {
		if (!ingredient.value || !selectedSkuId.value) return null;
		return ingredient.value.skus.find(s => s.id === selectedSkuId.value) || null;
	});

	const onIsFlourChange = (e : any) => {
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
			});
			toastStore.show({ message: '保存成功', type: 'success' });
			showEditModal.value = false;
			await loadIngredientData(ingredient.value.id);
			await dataStore.fetchIngredientsData();
		} catch (error) {
			console.error("Failed to update ingredient properties:", error);
		} finally {
			isSubmitting.value = false;
		}
	};

	const handleProcurementLongPress = (record : ProcurementRecord) => {
		selectedProcurementForAction.value = record;
		uiStore.openModal(MODAL_KEYS.PROCUREMENT_ACTIONS);
	};

	const handleEditProcurementOption = () => {
		uiStore.closeModal(MODAL_KEYS.PROCUREMENT_ACTIONS);
		if (selectedProcurementForAction.value) {
			const record = selectedProcurementForAction.value;
			editProcurementForm.id = record.id;
			editProcurementForm.packagesPurchased = record.packagesPurchased;
			editProcurementForm.totalPrice = Number(record.pricePerPackage) * record.packagesPurchased;
			editProcurementForm.purchaseDate = new Date(record.purchaseDate).toISOString().split('T')[0];
			showEditProcurementModal.value = true;
		}
	};

	const handleUpdateProcurement = async () => {
		if (!editProcurementForm.id || !ingredient.value) return;
		isSubmitting.value = true;
		try {
			const pricePerPackage = editProcurementForm.totalPrice / editProcurementForm.packagesPurchased;
			if (isNaN(pricePerPackage) || pricePerPackage <= 0) {
				toastStore.show({ message: '请输入有效的采购总价', type: 'error' });
				isSubmitting.value = false;
				return;
			}
			const payload = {
				pricePerPackage: Number(pricePerPackage.toFixed(2)),
			};
			await updateProcurement(editProcurementForm.id, payload);
			toastStore.show({ message: '更新成功', type: 'success' });
			showEditProcurementModal.value = false;
			await loadIngredientData(ingredient.value.id);
			await dataStore.fetchIngredientsData();
		} catch (error) {
			console.error("Failed to update procurement:", error);
		} finally {
			isSubmitting.value = false;
		}
	};

	const openUpdateStockModal = () => {
		if (ingredient.value) {
			stockAdjustment.changeInKg = null;
			stockAdjustment.reason = '';
			// [核心改造] 重置期初单价字段
			stockAdjustment.initialCostPerKg = null;
			uiStore.openModal(MODAL_KEYS.UPDATE_STOCK_CONFIRM);
		}
	};

	const handleConfirmUpdateStock = async () => {
		if (!ingredient.value) return;
		if (stockAdjustment.changeInKg === 0 || stockAdjustment.changeInKg === null) {
			toastStore.show({ message: '请输入有效的库存变化量', type: 'error' });
			return;
		}
		// [核心改造] 增加对期初单价的校验
		if (isInitialStockEntry.value && (!stockAdjustment.initialCostPerKg || stockAdjustment.initialCostPerKg <= 0)) {
			toastStore.show({ message: '期初库存录入必须填写有效的单价', type: 'error' });
			return;
		}

		isSubmitting.value = true;
		try {
			const changeInGrams = stockAdjustment.changeInKg * 1000;
			// [核心改造] 构建包含期初单价的 payload
			const payload : {
				changeInGrams : number;
				reason ?: string;
				initialCostPerKg ?: number;
			} = {
					changeInGrams: changeInGrams,
					reason: stockAdjustment.reason || undefined,
				};

			if (isInitialStockEntry.value) {
				payload.initialCostPerKg = stockAdjustment.initialCostPerKg!;
			}


			await adjustStock(ingredient.value.id, payload);
			toastStore.show({ message: '库存调整成功', type: 'success' });
			uiStore.closeModal(MODAL_KEYS.UPDATE_STOCK_CONFIRM);
			await loadIngredientData(ingredient.value.id);
			await dataStore.fetchIngredientsData();
		} catch (error) {
			console.error("Failed to adjust stock:", error);
		} finally {
			isSubmitting.value = false;
		}
	};
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	@include list-item-option-style;
	// [核心新增] 引入 Mixin
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

	// [核心修改] 删除本地重复的样式

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

	.reason-tags {
		padding: 10px 0px;
		margin-bottom: 5px;
	}

	.tab-text {
		font-size: 14px;
	}
</style>