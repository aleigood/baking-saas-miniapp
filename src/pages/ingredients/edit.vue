<template>
	<view class="page-container">
		<view class="page-header">
			<view class="detail-header" style="width: 100%;">
				<view class="back-btn" @click="navigateBack">&#10094;</view>
				<h2 class="detail-title">新建原料</h2>
			</view>
		</view>
		<view class="page-content">
			<!-- 原料品类信息 -->
			<view class="card">
				<view class="card-title">原料品类</view>
				<view class="form-item">
					<label>原料名称</label>
					<input class="input-field" v-model="ingredientForm.name" placeholder="例如：高筋粉" />
				</view>
			</view>

			<!-- SKU 信息 -->
			<view class="card">
				<view class="card-title">首个SKU（具体商品）</view>
				<view class="form-item">
					<label>品牌</label>
					<input class="input-field" v-model="skuForm.brand" placeholder="例如：王后" />
				</view>
				<view class="form-item">
					<label>规格名称</label>
					<input class="input-field" v-model="skuForm.specName" placeholder="例如：1kg袋装" />
				</view>
				<view class="form-item">
					<label>规格重量 (g)</label>
					<input class="input-field" type="number" v-model.number="skuForm.specWeightInGrams"
						placeholder="例如：1000" />
				</view>
			</view>

			<!-- 首次采购记录 -->
			<view class="card">
				<view class="card-title">首次采购入库</view>
				<view class="form-item">
					<label>采购包数</label>
					<input class="input-field" type="number" v-model.number="procurementForm.packagesPurchased"
						placeholder="例如：10" />
				</view>
				<view class="form-item">
					<label>每包单价 (元)</label>
					<input class="input-field" type="number" v-model.number="procurementForm.pricePerPackage"
						placeholder="例如：25.5" />
				</view>
			</view>

			<button class="btn-save-full" @click="handleSubmit" :loading="isSubmitting">
				{{ isSubmitting ? '保存中...' : '保存并入库' }}
			</button>
		</view>
	</view>
</template>

<script setup lang="ts">
	import { ref } from 'vue';
	import { createIngredient, createSku, createProcurement } from '@/api/ingredients';
	import { useDataStore } from '@/store/data';

	const dataStore = useDataStore();
	const isSubmitting = ref(false);

	const ingredientForm = ref({
		name: '',
		type: 'STANDARD' as 'STANDARD' | 'UNTRACKED',
	});

	const skuForm = ref({
		brand: '',
		specName: '',
		specWeightInGrams: 0,
	});

	const procurementForm = ref({
		packagesPurchased: 0,
		pricePerPackage: 0,
	});

	const navigateBack = () => {
		uni.navigateBack();
	};

	const handleSubmit = async () => {
		// 表单校验
		if (!ingredientForm.value.name || !skuForm.value.specName || skuForm.value.specWeightInGrams <= 0 || procurementForm.value.packagesPurchased <= 0 || procurementForm.value.pricePerPackage <= 0) {
			uni.showToast({ title: '请填写所有必填项', icon: 'none' });
			return;
		}

		isSubmitting.value = true;
		try {
			// 步骤1: 创建原料品类
			const ingredientRes = await createIngredient(ingredientForm.value);
			const ingredientId = ingredientRes.id;

			// 步骤2: 创建SKU
			const skuRes = await createSku(ingredientId, skuForm.value);
			const skuId = skuRes.id;

			// 步骤3: 创建采购记录
			await createProcurement({
				skuId,
				...procurementForm.value,
			});

			uni.showToast({ title: '原料创建并入库成功', icon: 'success' });

			// 刷新列表数据并返回
			await dataStore.loadDataForCurrentTenant();
			uni.navigateBack();
		} catch (error) {
			console.error("Failed to create ingredient:", error);
			uni.showToast({ title: '创建失败，请重试', icon: 'none' });
		} finally {
			isSubmitting.value = false;
		}
	};
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	.page-header {
		padding-bottom: 10px;
	}

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
	}

	.form-item {
		margin-bottom: 20px;
	}

	.form-item label {
		display: block;
		margin-bottom: 8px;
		font-size: 14px;
		color: #606266;
	}

	.btn-save-full {
		width: 100%;
		padding: 14px;
		border: none;
		border-radius: 12px;
		background-color: var(--primary-color);
		color: white;
		font-size: 16px;
		margin-top: 30px;
		font-weight: 500;
	}
</style>