<template>
	<view class="page-container">
		<!-- 页面头部 -->
		<view class="page-header">
			<view class="detail-header">
				<view class="back-btn" @click="navigateBack">&#10094;</view>
				<h2 class="detail-title">{{ ingredient?.name || '加载中...' }}</h2>
			</view>
		</view>

		<view class="page-content" v-if="!isLoading && ingredient">
			<view class="detail-page">
				<!-- 1. 核心信息区 -->
				<view class="tag-group">
					<span class="tag">品牌: {{ ingredient.activeSku?.brand || '未设置' }}</span>
					<span class="tag">单价: ¥{{ getIngredientPricePerKg(ingredient) }}/kg</span>
					<span class="tag">库存: {{ (ingredient.currentStockInGrams / 1000).toFixed(2) }} kg</span>
				</view>

				<!-- 2. 数据洞察区 -->
				<view class="card">
					<!-- [核心修改] 更新图表标签文本 -->
					<view class="filter-tabs" style="margin-bottom: 20px; justify-content: center;">
						<view class="filter-tab" :class="{ active: detailChartTab === 'price' }"
							@click="detailChartTab = 'price'">
							价格走势
						</view>
						<view class="filter-tab" :class="{ active: detailChartTab === 'usage' }"
							@click="detailChartTab = 'usage'">
							用量走势
						</view>
					</view>
					<LineChart v-if="detailChartTab === 'price'" :chart-data="costHistory" unit-suffix="/kg" />
					<view v-if="detailChartTab === 'usage'" class="mock-chart">
						模拟历史用量图表区域
					</view>
				</view>

				<!-- 3. 品牌与库存管理区 -->
				<view class="card card-full-bleed-list">
					<view class="card-title-wrapper">
						<span class="card-title">品牌与库存管理 (SKU)</span>
					</view>
					<view v-for="sku in ingredient.skus" :key="sku.id" class="list-item sku-item"
						:class="{ 'item-selected': selectedSkuId === sku.id }" hover-class="item-hover"
						@click="handleSkuClick(sku)" @longpress="handleSkuLongPress(sku)">
						<view class="main-info">
							<view class="name">{{ sku.brand || '无品牌' }} - {{ sku.specName }}</view>
							<view class="desc">添加于: {{ new Date(sku.createdAt).toLocaleDateString() }}</view>
						</view>
						<view class="side-info">
							<span v-if="sku.id === ingredient.activeSkuId" class="status-tag active">使用中</span>
						</view>
					</view>
					<button class="btn-add-sm" @click="openAddSkuModal">+ 新增品牌规格</button>
				</view>

				<!-- 4. [核心新增] 采购记录卡片 -->
				<view class="card" v-if="selectedSku">
					<view class="card-title">{{ selectedSku.brand || '无品牌' }} - {{ selectedSku.specName }} 的采购记录
					</view>
					<view v-if="selectedSku.procurementRecords && selectedSku.procurementRecords.length > 0">
						<view v-for="record in selectedSku.procurementRecords" :key="record.id"
							class="procurement-item">
							<text>{{ new Date(record.purchaseDate).toLocaleDateString() }}</text>
							<text>{{ record.packagesPurchased }} 包 x ¥{{ Number(record.pricePerPackage).toFixed(2)
							}}</text>
						</view>
					</view>
					<view v-else class="procurement-item empty">
						无采购记录
					</view>
				</view>
			</view>
		</view>
		<view class="loading-spinner" v-else>
			<text>加载中...</text>
		</view>

		<AppFab @click="openProcurementModal" class="fab-no-tab-bar" />

		<!-- 模态框 -->
		<AppModal v-model:visible="showAddSkuModal" title="新增品牌规格">
			<FormItem label="品牌">
				<input class="input-field" v-model="newSkuForm.brand" placeholder="例如：王后" />
			</FormItem>
			<FormItem label="规格名称">
				<input class="input-field" v-model="newSkuForm.specName" placeholder="例如：1kg袋装" />
			</FormItem>
			<FormItem label="规格重量 (g)">
				<input class="input-field" type="number" v-model.number="newSkuForm.specWeightInGrams"
					placeholder="例如：1000" />
			</FormItem>
			<view class="modal-actions">
				<button class="btn btn-secondary" @click="showAddSkuModal = false">取消</button>
				<button class="btn btn-primary" @click="handleCreateSku" :loading="isSubmitting">
					{{ isSubmitting ? '创建中...' : '确认创建' }}
				</button>
			</view>
		</AppModal>

		<AppModal v-model:visible="showProcurementModal" title="新增采购">
			<FormItem label="采购商品">
				<input class="input-field" :value="activeSkuName" readonly disabled />
			</FormItem>
			<FormItem label="采购包数">
				<input class="input-field" type="number" v-model.number="procurementForm.packagesPurchased"
					placeholder="例如：10" />
			</FormItem>
			<FormItem label="每包单价 (元)">
				<input class="input-field" type="number" v-model.number="procurementForm.pricePerPackage"
					placeholder="例如：25.5" />
			</FormItem>
			<view class="modal-actions">
				<button class="btn btn-secondary" @click="showProcurementModal = false">取消</button>
				<button class="btn btn-primary" @click="handleCreateProcurement" :loading="isSubmitting">
					{{ isSubmitting ? '入库中...' : '确认入库' }}
				</button>
			</view>
		</AppModal>

		<AppModal v-model:visible="showSkuActionsModal" title="SKU 操作">
			<view class="list-item" hover-class="item-hover" @click="handleActivateFromModal">
				设为使用中
			</view>
		</AppModal>
	</view>
</template>

<script setup lang="ts">
	import { ref, computed } from 'vue';
	import { onLoad } from '@dcloudio/uni-app';
	import { useDataStore } from '@/store/data';
	import type { Ingredient, IngredientSKU } from '@/types/api';
	import { getIngredient, createSku, createProcurement, setActiveSku } from '@/api/ingredients';
	import { getIngredientCostHistory } from '@/api/costing';
	import AppModal from '@/components/AppModal.vue';
	import FormItem from '@/components/FormItem.vue';
	import AppFab from '@/components/AppFab.vue';
	import LineChart from '@/components/LineChart.vue';

	const dataStore = useDataStore();
	const isLoading = ref(true);
	const isSubmitting = ref(false);
	const ingredient = ref<Ingredient | null>(null);
	const detailChartTab = ref<'price' | 'usage'>('price');
	const showAddSkuModal = ref(false);
	const newSkuForm = ref({
		brand: '',
		specName: '',
		specWeightInGrams: 0,
	});
	const showProcurementModal = ref(false);
	const procurementForm = ref({
		skuId: '',
		packagesPurchased: 0,
		pricePerPackage: 0,
		purchaseDate: new Date().toISOString(),
	});

	const costHistory = ref<{ cost : number }[]>([]);
	const showSkuActionsModal = ref(false);
	const selectedSkuForAction = ref<IngredientSKU | null>(null);
	const selectedSkuId = ref<string | null>(null);

	onLoad(async (options) => {
		const ingredientId = options?.ingredientId;
		if (ingredientId) {
			await loadIngredientData(ingredientId);
		} else {
			uni.showToast({ title: '无效的原料ID', icon: 'none' });
			isLoading.value = false;
		}
	});

	const loadIngredientData = async (id : string) => {
		isLoading.value = true;
		try {
			const [ingredientData, historyData] = await Promise.all([
				getIngredient(id),
				getIngredientCostHistory(id)
			]);
			ingredient.value = ingredientData;
			costHistory.value = historyData;
			if (ingredientData.activeSkuId) {
				selectedSkuId.value = ingredientData.activeSkuId;
			} else if (ingredientData.skus.length > 0) {
				selectedSkuId.value = ingredientData.skus[0].id;
			}
		} catch (error) {
			console.error("Failed to load ingredient data:", error);
			uni.showToast({ title: '数据加载失败', icon: 'none' });
		} finally {
			isLoading.value = false;
		}
	};

	const getIngredientPricePerKg = (ing : Ingredient | null) => {
		if (!ing || !ing.activeSku || !ing.currentPricePerPackage || !ing.activeSku.specWeightInGrams) {
			return '0.00';
		}
		return ((Number(ing.currentPricePerPackage) / ing.activeSku.specWeightInGrams) * 1000).toFixed(2);
	};

	const getSkuPricePerKg = (sku : IngredientSKU) => {
		const latestRecord = sku.procurementRecords?.[0];
		if (!latestRecord || !sku.specWeightInGrams) {
			return 'N/A';
		}
		return ((Number(latestRecord.pricePerPackage) / sku.specWeightInGrams) * 1000).toFixed(2);
	};

	const navigateBack = () => {
		uni.navigateBack();
	};

	const openAddSkuModal = () => {
		newSkuForm.value = { brand: '', specName: '', specWeightInGrams: 0 };
		showAddSkuModal.value = true;
	};

	const handleCreateSku = async () => {
		if (!ingredient.value) return;
		if (!newSkuForm.value.specName || !newSkuForm.value.specWeightInGrams) {
			uni.showToast({ title: '请填写规格名称和重量', icon: 'none' });
			return;
		}
		isSubmitting.value = true;
		try {
			await createSku(ingredient.value.id, newSkuForm.value);
			uni.showToast({ title: '创建成功', icon: 'success' });
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

	const openProcurementModal = () => {
		if (!ingredient.value?.activeSkuId) {
			uni.showToast({ title: '请先激活一个SKU才能进行采购', icon: 'none' });
			return;
		}
		procurementForm.value = {
			skuId: ingredient.value.activeSkuId,
			packagesPurchased: 0,
			pricePerPackage: 0,
			purchaseDate: new Date().toISOString(),
		};
		showProcurementModal.value = true;
	};

	const handleCreateProcurement = async () => {
		if (!procurementForm.value.skuId || !procurementForm.value.packagesPurchased || !procurementForm.value.pricePerPackage) {
			uni.showToast({ title: '请填写所有采购信息', icon: 'none' });
			return;
		}
		isSubmitting.value = true;
		try {
			await createProcurement(procurementForm.value);
			uni.showToast({ title: '入库成功', icon: 'success' });
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

	const handleSkuLongPress = (sku : IngredientSKU) => {
		if (!ingredient.value || sku.id === ingredient.value.activeSkuId) {
			return;
		}
		selectedSkuForAction.value = sku;
		showSkuActionsModal.value = true;
	};

	const handleActivateFromModal = async () => {
		if (!selectedSkuForAction.value || !ingredient.value) return;
		const sku = selectedSkuForAction.value;
		showSkuActionsModal.value = false;

		uni.showLoading({ title: '正在激活...' });
		try {
			await setActiveSku(ingredient.value.id, sku.id);
			uni.hideLoading();
			uni.showToast({ title: '激活成功', icon: 'success' });
			await loadIngredientData(ingredient.value.id);
			await dataStore.fetchIngredientsData();
		} catch (error) {
			uni.hideLoading();
		}
	};

	const selectedSku = computed(() => {
		if (!ingredient.value || !selectedSkuId.value) return null;
		return ingredient.value.skus.find(s => s.id === selectedSkuId.value) || null;
	});
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	.page-container {
		padding-bottom: 80px;
	}

	.detail-page .tag-group {
		margin-bottom: 20px;
		padding: 0 5px;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.sku-item .side-info {
		display: flex;
		align-items: center;
	}

	.status-tag {
		padding: 4px 12px;
		border-radius: 15px;
		font-size: 13px;
		color: white;
		font-weight: 500;

		&.active {
			background-color: #5ac725;
		}
	}

	.btn-add-sm {
		width: 100%;
		padding: 8px;
		border: none;
		color: var(--primary-color);
		background: transparent;
		border-radius: 10px;
		margin-top: 10px;
		font-size: 14px;

		&::after {
			border: none;
		}
	}

	.picker,
	.input-field {
		width: 100%;
		height: 44px;
		line-height: 44px;
		padding: 0 12px;
		border: 1px solid var(--border-color);
		border-radius: 10px;
		font-size: 14px;
		background-color: #f8f9fa;
		box-sizing: border-box;
		text-align: left;
	}

	.input-field[disabled] {
		background-color: #e9ecef;
		color: #6c757d;
	}

	.filter-tabs {
		display: flex;
		gap: 10px;
	}

	.filter-tab {
		padding: 8px 18px;
		border-radius: 20px;
		background: #f3e9e3;
		color: var(--text-secondary);
		font-size: 14px;
	}

	.filter-tab.active {
		background: var(--primary-color);
		color: white;
	}

	.procurement-item {
		display: flex;
		justify-content: space-between;
		font-size: 13px;
		color: var(--text-secondary);
		padding: 8px 5px;
		border-bottom: 1px solid var(--border-color);

		&:last-child {
			border-bottom: none;
		}

		&.empty {
			justify-content: center;
			color: #b0a8a2;
			border-bottom: none;
		}
	}

	.list-item {
		position: relative;
		/* #ifdef H5 */
		cursor: pointer;
		/* #endif */
		transition: background-color 0.2s ease;
	}

	.item-hover {
		background-color: #f9f9f9;
	}

	.list-item.item-selected {
		background-color: transparent;
	}

	.list-item.item-selected::before {
		content: '';
		position: absolute;
		left: 0;
		top: 50%;
		transform: translateY(-50%);
		width: 4px;
		height: 50%;
		background-color: var(--primary-color);
		border-radius: 0 4px 4px 0;
	}

	.card-full-bleed-list {
		padding-left: 0;
		padding-right: 0;
	}

	.card-full-bleed-list .card-title-wrapper {
		padding-left: 20px;
		padding-right: 20px;
	}

	.card-full-bleed-list .list-item {
		padding-left: 20px;
		padding-right: 20px;
	}
</style>