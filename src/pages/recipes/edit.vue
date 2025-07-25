<template>
	<view class="page-container">
		<view class="page-header">
			<view class="detail-header" style="width: 100%;">
				<view class="back-btn" @click="navigateBack">&#10094;</view>
				<h2 class="detail-title">新建配方</h2>
			</view>
		</view>
		<view class="page-content">
			<view class="card">
				<!-- [核心重构] 使用 FormItem 组件 -->
				<FormItem label="配方家族名称">
					<input class="input-field" v-model="form.name" placeholder="例如：贝果" />
				</FormItem>
			</view>

			<!-- 面团部分 -->
			<view v-for="(dough, doughIndex) in form.doughs" :key="doughIndex" class="card">
				<view class="card-title-wrapper">
					<span class="card-title">面团 {{ doughIndex + 1 }}</span>
					<button class="btn-danger-sm" @click="removeDough(doughIndex)">删除面团</button>
				</view>
				<FormItem label="面团名称">
					<input class="input-field" v-model="dough.name" placeholder="例如：主面团" />
				</FormItem>
				<!-- 面团原料 -->
				<view v-for="(ing, ingIndex) in dough.ingredients" :key="ingIndex" class="ingredient-row">
					<input class="input-field" v-model="ing.name" placeholder="原料名" />
					<input class="input-field" type="number" v-model.number="ing.ratio" placeholder="比例%" />
					<checkbox :checked="ing.isFlour" @click="ing.isFlour = !ing.isFlour">总粉</checkbox>
					<button class="btn-danger-xs" @click="removeIngredient(doughIndex, ingIndex)">-</button>
				</view>
				<button class="btn-add-sm" @click="addIngredient(doughIndex)">+ 添加原料</button>
			</view>
			<button class="btn-add" @click="addDough">+ 添加面团</button>

			<!-- 最终产品部分 -->
			<view v-for="(product, prodIndex) in form.products" :key="prodIndex" class="card">
				<view class="card-title-wrapper">
					<span class="card-title">最终产品 {{ prodIndex + 1 }}</span>
					<button class="btn-danger-sm" @click="removeProduct(prodIndex)">删除产品</button>
				</view>
				<FormItem label="产品名称">
					<input class="input-field" v-model="product.name" placeholder="例如：原味贝果" />
				</FormItem>
				<FormItem label="产品克重 (g)">
					<input class="input-field" type="number" v-model.number="product.weight" placeholder="例如：100" />
				</FormItem>
			</view>
			<button class="btn-add" @click="addProduct">+ 添加最终产品</button>

			<button class="btn-save-full" @click="handleSubmit" :loading="isSubmitting">
				{{ isSubmitting ? '保存中...' : '保存配方' }}
			</button>
		</view>
	</view>
</template>

<script setup lang="ts">
	import { ref } from 'vue';
	import { createRecipe } from '@/api/recipes';
	import { useDataStore } from '@/store/data';
	import FormItem from '@/components/FormItem.vue'; // [核心重构] 引入可复用组件

	const dataStore = useDataStore();
	const isSubmitting = ref(false);

	const form = ref({
		name: '',
		doughs: [
			{
				name: '主面团',
				isPreDough: false,
				targetTemp: 26,
				ingredients: [
					{ name: '高筋粉', ratio: 100, isFlour: true },
					{ name: '水', ratio: 60, isFlour: false },
					{ name: '酵母', ratio: 1, isFlour: false },
					{ name: '盐', ratio: 2, isFlour: false },
				],
			},
		],
		products: [
			{
				name: '原味',
				weight: 100,
				mixIns: [],
				addOns: [],
				procedures: [],
			},
		],
		procedures: [],
	});

	const addDough = () => {
		form.value.doughs.push({
			name: '',
			isPreDough: false,
			targetTemp: 0,
			ingredients: [{ name: '', ratio: 0, isFlour: false }],
		});
	};

	const removeDough = (index : number) => {
		form.value.doughs.splice(index, 1);
	};

	const addIngredient = (doughIndex : number) => {
		form.value.doughs[doughIndex].ingredients.push({ name: '', ratio: 0, isFlour: false });
	};

	const removeIngredient = (doughIndex : number, ingIndex : number) => {
		form.value.doughs[doughIndex].ingredients.splice(ingIndex, 1);
	};

	const addProduct = () => {
		form.value.products.push({
			name: '',
			weight: 0,
			mixIns: [],
			addOns: [],
			procedures: [],
		});
	};

	const removeProduct = (index : number) => {
		form.value.products.splice(index, 1);
	};

	const navigateBack = () => {
		uni.navigateBack();
	};

	const handleSubmit = async () => {
		isSubmitting.value = true;
		try {
			await createRecipe(form.value);
			uni.showToast({ title: '配方创建成功', icon: 'success' });
			// 刷新列表数据并返回
			await dataStore.loadDataForCurrentTenant();
			uni.navigateBack();
		} catch (error) {
			console.error("Failed to create recipe:", error);
			uni.showToast({ title: '创建失败，请检查数据', icon: 'none' });
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

	.ingredient-row {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 10px;

		.input-field {
			flex: 1;
		}

		checkbox {
			transform: scale(0.8);
		}
	}

	.btn-add,
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

	.btn-add {
		margin-bottom: 20px;
	}

	.btn-danger-sm,
	.btn-danger-xs {
		background-color: #fdecea;
		color: var(--danger-color);
		border: none;
		border-radius: 8px;
		font-size: 12px;
		padding: 5px 10px;
		line-height: 1.5;
	}

	.btn-danger-xs {
		padding: 4px 8px;
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