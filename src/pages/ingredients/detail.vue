<template>
	<view class="page-container">
		<!-- [核心重构] 详情页现在拥有独立的页面结构 -->
		<!-- [修改] 统一使用 page-header 作为顶部容器 -->
		<view class="page-header">
			<view class="detail-header">
				<view class="back-btn" @click="navigateBack">&#10094;</view>
				<h2 class="detail-title">{{ selectedIngredient?.name || '加载中...' }}</h2>
			</view>
		</view>

		<view class="page-content" v-if="!isLoading && selectedIngredient">
			<view class="detail-page">
				<!-- 1. 页面顶部：核心信息区 -->
				<view class="tag-group">
					<span class="tag">品牌: {{ selectedIngredient.activeSku?.brand || '未设置' }}</span>
					<span class="tag">单价: ¥{{ getPricePerKg(selectedIngredient.activeSku) }}/kg</span>
				</view>

				<!-- 2. 页面中部：数据洞察区 -->
				<view class="card">
					<view class="filter-tabs" style="margin-bottom: 20px; justify-content: center;">
						<view class="filter-tab" :class="{ active: detailChartTab === 'price' }"
							@click="detailChartTab = 'price'">
							价格曲线
						</view>
						<view class="filter-tab" :class="{ active: detailChartTab === 'usage' }"
							@click="detailChartTab = 'usage'">
							历史用量
						</view>
					</view>
					<view v-if="detailChartTab === 'price'" class="mock-chart">
						模拟价格曲线图表区域
					</view>
					<view v-if="detailChartTab === 'usage'" class="mock-chart">
						模拟历史用量图表区域
					</view>
				</view>

				<!-- 3. 页面下部：品牌与库存管理区 -->
				<view class="card">
					<view class="card-title">品牌与库存管理 (SKU)</view>
					<view v-for="sku in selectedIngredient.skus" :key="sku.id" class="list-item sku-item"
						@click="handleActivateSku(sku)">
						<view class="main-info">
							<view class="name">{{ sku.brand || '无品牌' }} - {{ sku.specName }}</view>
							<view class="desc">库存: {{ (sku.currentStockInGrams / 1000).toFixed(2) }} kg | 单价: ¥{{
                    getPricePerKg(sku) }}/kg</view>
						</view>
						<view class="side-info">
							<span v-if="sku.id === selectedIngredient.activeSkuId" class="status-tag active">当前激活</span>
							<span v-else class="arrow">&#10095;</span>
						</view>
					</view>
					<button class="btn-add-sm" @click="openAddSkuModal">+ 新增品牌规格</button>
				</view>
			</view>
		</view>
		<view class="loading-spinner" v-else>
			<text>加载中...</text>
		</view>

		<!-- FAB按钮用于“新增采购” -->
		<view class="fab" @click="openProcurementModal">+</view>

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
				<button class="btn-cancel" @click="showAddSkuModal = false">取消</button>
				<button class="btn-confirm" @click="handleCreateSku" :loading="isSubmitting">
					{{ isSubmitting ? '创建中...' : '确认创建' }}
				</button>
			</view>
		</AppModal>

		<AppModal v-model:visible="showProcurementModal" title="新增采购">
			<FormItem label="选择SKU">
				<picker mode="selector" :range="procurementSkuOptions" range-key="name"
					@change="onProcurementSkuChange">
					<view class="picker">
						{{ selectedProcurementSkuName || '请选择采购的商品' }}
					</view>
				</picker>
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
				<button class="btn-cancel" @click="showProcurementModal = false">取消</button>
				<button class="btn-confirm" @click="handleCreateProcurement" :loading="isSubmitting">
					{{ isSubmitting ? '入库中...' : '确认入库' }}
				</button>
			</view>
		</AppModal>
	</view>
</template>

<script setup lang="ts">
	import { ref, computed } from 'vue';
	import { onLoad } from '@dcloudio/uni-app';
	import { useDataStore } from '@/store/data';
	import type { Ingredient, IngredientSKU } from '@/types/api';
	import { createSku, createProcurement, setActiveSku } from '@/api/ingredients';
	import AppModal from '@/components/AppModal.vue';
	import FormItem from '@/components/FormItem.vue';

	const dataStore = useDataStore();
	const isLoading = ref(true);
	const isSubmitting = ref(false);
	const selectedIngredient = ref<Ingredient | null>(null);
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

	// 页面加载时，从路由参数获取ingredientId并加载数据
	onLoad(async (options) => {
		const ingredientId = options?.ingredientId;
		if (ingredientId) {
			// 从 Pinia store 中查找数据，如果不存在则发起API请求（此处简化为直接从store获取）
			const ingredientFromStore = dataStore.ingredients.find(i => i.id === ingredientId);
			if (ingredientFromStore) {
				selectedIngredient.value = JSON.parse(JSON.stringify(ingredientFromStore)); // 深拷贝以避免直接修改store
			} else {
				// 如果store中没有，可以考虑发起一个API请求获取单个原料详情
				console.warn("Ingredient not found in store, consider fetching from API.");
			}
		}
		isLoading.value = false;
	});

	const getPricePerKg = (sku : IngredientSKU | null) => {
		if (!sku || !sku.specWeightInGrams || !sku.currentPricePerPackage) {
			return '0.00';
		}
		return ((Number(sku.currentPricePerPackage) / sku.specWeightInGrams) * 1000).toFixed(2);
	};

	const navigateBack = () => {
		uni.navigateBack();
	};

	const openAddSkuModal = () => {
		newSkuForm.value = {
			brand: '',
			specName: '',
			specWeightInGrams: 0,
		};
		showAddSkuModal.value = true;
	};

	const handleCreateSku = async () => {
		if (!selectedIngredient.value) return;
		if (!newSkuForm.value.specName || !newSkuForm.value.specWeightInGrams) {
			uni.showToast({ title: '请填写规格名称和重量', icon: 'none' });
			return;
		}
		isSubmitting.value = true;
		try {
			await createSku(selectedIngredient.value.id, newSkuForm.value);
			uni.showToast({ title: '创建成功', icon: 'success' });
			showAddSkuModal.value = false;
			await dataStore.fetchIngredientsData();
			const updatedIngredient = dataStore.ingredients.find(i => i.id === selectedIngredient.value!.id);
			if (updatedIngredient) {
				selectedIngredient.value = updatedIngredient;
			}
		} finally {
			isSubmitting.value = false;
		}
	};

	const procurementSkuOptions = computed(() => {
		if (!selectedIngredient.value) return [];
		return selectedIngredient.value.skus.map(sku => ({
			id: sku.id,
			name: `${sku.brand || '无品牌'} (${sku.specName})`
		}));
	});

	const selectedProcurementSkuName = computed(() => {
		return procurementSkuOptions.value.find(o => o.id === procurementForm.value.skuId)?.name || '';
	});

	const openProcurementModal = () => {
		procurementForm.value = {
			skuId: '',
			packagesPurchased: 0,
			pricePerPackage: 0,
			purchaseDate: new Date().toISOString(),
		};
		if (selectedIngredient.value && selectedIngredient.value.activeSkuId) {
			procurementForm.value.skuId = selectedIngredient.value.activeSkuId;
		}
		showProcurementModal.value = true;
	};

	const onProcurementSkuChange = (e : any) => {
		procurementForm.value.skuId = procurementSkuOptions.value[e.detail.value].id;
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
			await dataStore.fetchIngredientsData();
			const updatedIngredient = dataStore.ingredients.find(i => i.id === selectedIngredient.value!.id);
			if (updatedIngredient) {
				selectedIngredient.value = updatedIngredient;
			}
		} finally {
			isSubmitting.value = false;
		}
	};

	const handleActivateSku = (sku : IngredientSKU) => {
		if (!selectedIngredient.value || sku.id === selectedIngredient.value.activeSkuId) {
			return;
		}
		uni.showModal({
			title: '确认操作',
			content: `确定要将 "${sku.brand} - ${sku.specName}" 设为当前激活的采购和计价单位吗？`,
			success: async (res) => {
				if (res.confirm) {
					uni.showLoading({ title: '正在激活...' });
					try {
						await setActiveSku(selectedIngredient.value!.id, sku.id);
						uni.hideLoading();
						uni.showToast({ title: '激活成功', icon: 'success' });
						await dataStore.fetchIngredientsData();
						const updatedIngredient = dataStore.ingredients.find(i => i.id === selectedIngredient.value!.id);
						if (updatedIngredient) {
							selectedIngredient.value = updatedIngredient;
						}
					} catch (error) {
						uni.hideLoading();
					}
				}
			}
		});
	};
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	/* [新增] 详情页独有样式 */
	.page-container {
		/* 详情页不需要为底部导航留出空间 */
		padding-bottom: 20px;
	}

	.detail-page .tag-group {
		margin-bottom: 20px;
		padding: 0 20px;
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

	.arrow {
		color: var(--text-secondary);
		font-size: 18px;
	}

	.btn-add-sm {
		width: 100%;
		padding: 10px;
		border: 1px dashed var(--primary-color);
		color: var(--primary-color);
		background: transparent;
		border-radius: 10px;
		margin-top: 10px;
		font-size: 14px;
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

	.modal-actions {
		display: flex;
		gap: 10px;
		margin-top: 30px;
	}

	.modal-actions button {
		flex: 1;
		padding: 12px;
		border: none;
		border-radius: 12px;
		font-size: 16px;
		font-weight: 500;
	}

	.btn-cancel {
		background-color: #f3e9e3;
		color: var(--text-secondary);
	}

	.btn-confirm {
		background-color: var(--primary-color);
		color: white;
	}

	/* [修改] 将 filter-tabs 样式移到这里，因为它现在在两个地方使用 */
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
</style>