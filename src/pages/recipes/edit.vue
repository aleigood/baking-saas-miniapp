<template>
	<view class="page-container">
		<!-- [修改] 统一使用 page-header 作为顶部容器 -->
		<view class="page-header">
			<view class="detail-header">
				<view class="back-btn" @click="navigateBack">&#10094;</view>
				<!-- [重构] 动态标题 -->
				<h2 class="detail-title">{{ isEditing ? '创建新版本' : '新建配方' }}</h2>
			</view>
		</view>
		<view class="page-content">
			<view class="card">
				<FormItem label="配方家族名称">
					<!-- [重构] 如果是创建新版本，名称不可编辑 -->
					<input class="input-field" v-model="form.name" placeholder="例如：贝果" :disabled="isEditing" />
				</FormItem>
			</view>

			<!-- 面团部分 -->
			<view v-for="(dough, doughIndex) in form.doughs" :key="doughIndex" class="card">
				<view class="card-title-wrapper">
					<span class="card-title">面团 {{ doughIndex + 1 }}</span>
					<button v-if="form.doughs.length > 1" class="btn btn-danger btn-sm"
						@click="removeDough(doughIndex)">删除面团</button>
				</view>
				<FormItem label="面团名称">
					<input class="input-field" v-model="dough.name" placeholder="例如：主面团" />
				</FormItem>
				<!-- 面团原料 -->
				<view v-for="(ing, ingIndex) in dough.ingredients" :key="ingIndex" class="ingredient-row">
					<input class="input-field" v-model="ing.name" placeholder="原料名" />
					<input class="input-field" type="number" v-model.number="ing.ratio" placeholder="比例%" />
					<checkbox :checked="ing.isFlour" @click="ing.isFlour = !ing.isFlour">总粉</checkbox>
					<button class="btn btn-danger btn-xs" @click="removeIngredient(doughIndex, ingIndex)">-</button>
				</view>
				<button class="btn btn-dashed btn-full-width" @click="addIngredient(doughIndex)">+ 添加原料</button>
			</view>
			<button class="btn btn-dashed btn-full-width" @click="addDough">+ 添加面团</button>

			<!-- 最终产品部分 -->
			<view v-for="(product, prodIndex) in form.products" :key="prodIndex" class="card">
				<view class="card-title-wrapper">
					<span class="card-title">最终产品 {{ prodIndex + 1 }}</span>
					<button v-if="form.products.length > 1" class="btn btn-danger btn-sm"
						@click="removeProduct(prodIndex)">删除产品</button>
				</view>
				<FormItem label="产品名称">
					<input class="input-field" v-model="product.name" placeholder="例如：原味贝果" />
				</FormItem>
				<FormItem label="产品克重 (g)">
					<input class="input-field" type="number" v-model.number="product.weight" placeholder="例如：100" />
				</FormItem>
			</view>
			<button class="btn btn-dashed btn-full-width" @click="addProduct">+ 添加最终产品</button>

			<button class="btn btn-primary btn-full-width" @click="handleSubmit" :loading="isSubmitting">
				{{ isSubmitting ? '保存中...' : '保存配方' }}
			</button>
		</view>
	</view>
</template>

<script setup lang="ts">
	import { ref } from 'vue';
	// [新增] 引入 onLoad
	import { onLoad } from '@dcloudio/uni-app';
	import { createRecipe, getRecipeFamily } from '@/api/recipes';
	import { useDataStore } from '@/store/data';
	import FormItem from '@/components/FormItem.vue';

	const dataStore = useDataStore();
	const isSubmitting = ref(false);
	const isEditing = ref(false); // [新增] 标记是否为编辑（创建新版本）模式
	const familyId = ref<string | null>(null);

	const form = ref({
		name: '',
		type: 'MAIN' as const,
		doughs: [
			{
				name: '主面团',
				targetTemp: 26,
				lossRatio: 0,
				procedure: [],
				ingredients: [
					{ name: '高筋粉', ratio: 100, isFlour: true, waterContent: 0 },
					{ name: '水', ratio: 60, isFlour: false, waterContent: 100 },
					{ name: '酵母', ratio: 1, isFlour: false, waterContent: 0 },
					{ name: '盐', ratio: 2, isFlour: false, waterContent: 0 },
				],
			},
		],
		products: [
			{
				name: '原味',
				weight: 100,
				mixIn: [],
				fillings: [],
				toppings: [],
				procedure: [],
			},
		],
		procedure: [],
	});

	// [新增] onLoad生命周期钩子，用于处理创建新版本的逻辑
	onLoad(async (options) => {
		if (options && options.familyId) {
			isEditing.value = true;
			familyId.value = options.familyId;
			uni.showLoading({ title: '加载配方中...' });
			try {
				const familyData = await getRecipeFamily(familyId.value);
				const activeVersion = familyData.versions.find(v => v.isActive);
				if (activeVersion) {
					// 使用激活版本的数据预填充表单
					// 注意：这里的映射逻辑需要根据您后端返回的具体数据结构进行调整
					form.value.name = familyData.name;
					form.value.type = familyData.type;
					// ... 其他字段的映射
				}
			} catch (error) {
				console.error('Failed to load recipe for editing:', error);
				uni.showToast({ title: '加载配方失败', icon: 'none' });
			} finally {
				uni.hideLoading();
			}
		}
	});


	const addDough = () => {
		form.value.doughs.push({
			name: '',
			targetTemp: 0,
			lossRatio: 0,
			procedure: [],
			ingredients: [{ name: '', ratio: 0, isFlour: false, waterContent: 0 }],
		});
	};

	const removeDough = (index : number) => {
		form.value.doughs.splice(index, 1);
	};

	const addIngredient = (doughIndex : number) => {
		form.value.doughs[doughIndex].ingredients.push({ name: '', ratio: 0, isFlour: false, waterContent: 0 });
	};

	const removeIngredient = (doughIndex : number, ingIndex : number) => {
		form.value.doughs[doughIndex].ingredients.splice(ingIndex, 1);
	};

	const addProduct = () => {
		form.value.products.push({
			name: '',
			weight: 0,
			mixIn: [],
			fillings: [],
			toppings: [],
			procedure: [],
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
			// 后端 `create` 接口会处理同名配方，自动创建新版本
			await createRecipe(form.value);
			uni.showToast({ title: '配方保存成功', icon: 'success' });
			// 刷新列表数据并返回
			await dataStore.fetchRecipesData();
			uni.navigateBack();
		} catch (error) {
			console.error("Failed to create recipe:", error);
		} finally {
			isSubmitting.value = false;
		}
	};
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	/* [修改] page-header 现在由 common.scss 控制，移除这里的局部样式 */

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

		&[disabled] {
			background-color: #e9ecef;
			color: #6c757d;
		}
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

	/* [修改] 移除旧的、分散的按钮样式，它们现在由 common.scss 全局控制 */
</style>