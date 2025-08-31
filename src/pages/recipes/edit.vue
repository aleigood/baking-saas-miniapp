<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader :title="isEditing ? '创建新版本' : '新建配方'" />
		<DetailPageLayout>
			<view class="page-content">
				<view class="card">
					<FormItem label="配方名称">
						<input class="input-field" v-model="form.name" placeholder="例如：法式长棍" :disabled="isEditing" />
					</FormItem>
					<FormItem v-if="isEditing" label="版本说明">
						<input class="input-field" v-model="form.notes" placeholder="例如：夏季版本，减少水量" />
					</FormItem>
				</view>

				<template v-for="(dough, doughIndex) in form.doughs" :key="dough.id">
					<view class="card" v-if="dough.type === 'PRE_DOUGH'">
						<view class="card-title-wrapper">
							<span class="card-title">{{ dough.name }}</span>
							<IconButton @click="removeDough(doughIndex)">
								<image class="remove-icon" src="/static/icons/close-x.svg" />
							</IconButton>
						</view>
						<view v-for="ing in dough.ingredients" :key="ing.name" class="info-row">
							<text class="info-label">{{ ing.name }}</text>
							<text class="info-value">{{ formatNumber(ing.ratio) }}%</text>
						</view>
					</view>
				</template>
				<AppButton type="dashed" full-width size="md" @click="openAddPreDoughModal" class="add-button">+ 添加面种
				</AppButton>


				<view class="card">
					<view class="card-title-wrapper">
						<span class="card-title">主面团</span>
					</view>
					<FormItem label="工艺损耗率 (%)">
						<input class="input-field" type="number" v-model.number="mainDough.lossRatio"
							placeholder="例如: 2" />
					</FormItem>
					<view class="ingredient-header">
						<text class="col-name">原料名称</text>
						<text class="col-ratio">比例%</text>
						<text class="col-action"></text>
					</view>
					<view v-for="(ing, ingIndex) in mainDough.ingredients" :key="ingIndex" class="ingredient-row">
						<view class="picker-wrapper">
							<picker class="ingredient-picker" mode="selector" :range="filteredAvailableIngredients"
								range-key="name" @change="onIngredientChange($event, ingIndex)">
								<view class="picker-display" :class="{ placeholder: !ing.id }">
									{{ getIngredientName(ing.id) }}
								</view>
							</picker>
						</view>
						<input class="input-field ratio-input" type="number" v-model.number="ing.ratio"
							placeholder="%" />
						<IconButton @click="removeIngredient(ingIndex)">
							<image class="remove-icon" src="/static/icons/close-x.svg" />
						</IconButton>
					</view>
					<AppButton type="dashed" full-width size="md" @click="addIngredient" class="add-button">+ 添加原料
					</AppButton>
				</view>

				<view v-for="(product, prodIndex) in form.products" :key="prodIndex" class="card">
					<view class="card-title-wrapper">
						<span class="card-title">{{ product.name }}</span>
						<IconButton @click="removeProduct(prodIndex)">
							<image class="remove-icon" src="/static/icons/close-x.svg" />
						</IconButton>
					</view>
					<view class="info-row">
						<text class="info-label">基础面团克重</text>
						<text class="info-value">{{ product.baseDoughWeight }}g</text>
					</view>
					<template v-if="product.mixIns.length > 0">
						<view class="product-sub-group-title">辅料</view>
						<view v-for="ing in product.mixIns" :key="ing.id" class="info-row">
							<text class="info-label">{{ getIngredientName(ing.id) }}</text>
							<text class="info-value">{{ formatNumber(ing.ratio) }}%</text>
						</view>
					</template>
					<template v-if="product.fillings.length > 0">
						<view class="product-sub-group-title">馅料</view>
						<view v-for="ing in product.fillings" :key="ing.id" class="info-row">
							<text class="info-label">{{ getIngredientName(ing.id) }}</text>
							<text class="info-value">{{ ing.weightInGrams }}g/个</text>
						</view>
					</template>
				</view>
				<AppButton type="dashed" full-width size="md" @click="openAddProductModal" class="add-button">+ 添加最终产品
				</AppButton>

				<AppButton type="primary" full-width @click="handleSubmit" :loading="isSubmitting" class="save-button">
					{{ isSubmitting ? '' : '保存配方' }}
				</AppButton>
			</view>
		</DetailPageLayout>

		<AppModal :visible="showAddPreDoughModal" @update:visible="showAddPreDoughModal = false" title="添加面种">
			<FormItem label="选择面种配方">
				<view class="picker-wrapper">
					<picker mode="selector" :range="availablePreDoughs" range-key="name" @change="onPreDoughSelect">
						<view class="picker-display" :class="{ placeholder: !selectedPreDough }">
							{{ selectedPreDough?.name || '请选择' }}
						</view>
					</picker>
				</view>
			</FormItem>
			<FormItem label="面种中面粉占总面粉的百分比 (%)">
				<input class="input-field" type="number" v-model.number="preDoughFlourRatio" placeholder="例如：20" />
			</FormItem>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showAddPreDoughModal = false">取消</AppButton>
				<AppButton type="primary" @click="confirmAddPreDough" :loading="isAddingPreDough">
					{{ isAddingPreDough ? '...' : '确认' }}
				</AppButton>
			</view>
		</AppModal>

		<AppModal :visible="showAddProductModal" @update:visible="showAddProductModal = false" title="添加最终产品">
			<scroll-view scroll-y class="modal-scroll-view">
				<FormItem label="产品名称">
					<input class="input-field" v-model="newProduct.name" placeholder="例如：原味贝果" />
				</FormItem>
				<FormItem label="基础面团克重 (g)">
					<input class="input-field" type="number" v-model.number="newProduct.baseDoughWeight"
						placeholder="例如：100" />
				</FormItem>

				<view class="sub-group">
					<view v-for="(ing, ingIndex) in newProduct.mixIns" :key="ingIndex" class="ingredient-row">
						<view class="picker-wrapper">
							<picker mode="selector" :range="filteredAvailableIngredients" range-key="name"
								@change="onSubIngredientChange($event, 'mixIns', ingIndex)">
								<view class="picker-display" :class="{ placeholder: !ing.id }">
									{{ getIngredientName(ing.id) }}
								</view>
							</picker>
						</view>
						<input class="input-field ratio-input" type="number" v-model.number="ing.ratio"
							placeholder="%" />
						<IconButton @click="removeSubIngredient('mixIns', ingIndex)">
							<image class="remove-icon" src="/static/icons/close-x.svg" />
						</IconButton>
					</view>
					<AppButton type="dashed" full-width size="md" @click="addSubIngredient('mixIns')">+ 添加辅料</AppButton>
				</view>

				<view class="sub-group">
					<view v-for="(ing, ingIndex) in newProduct.fillings" :key="ingIndex" class="ingredient-row">
						<view class="picker-wrapper">
							<picker mode="selector" :range="filteredAvailableIngredients" range-key="name"
								@change="onSubIngredientChange($event, 'fillings', ingIndex)">
								<view class="picker-display" :class="{ placeholder: !ing.id }">
									{{ getIngredientName(ing.id) }}
								</view>
							</picker>
						</view>
						<input class="input-field ratio-input" type="number" v-model.number="ing.weightInGrams"
							placeholder="g/个" />
						<IconButton @click="removeSubIngredient('fillings', ingIndex)">
							<image class="remove-icon" src="/static/icons/close-x.svg" />
						</IconButton>
					</view>
					<AppButton type="dashed" full-width size="md" @click="addSubIngredient('fillings')">+ 添加馅料
					</AppButton>
				</view>
			</scroll-view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showAddProductModal = false">取消</AppButton>
				<AppButton type="primary" @click="confirmAddProduct">确认</AppButton>
			</view>
		</AppModal>
	</view>
</template>

<script setup lang="ts">
	import { ref, computed, onMounted } from 'vue';
	import { onLoad, onUnload } from '@dcloudio/uni-app';
	import { createRecipe, createRecipeVersion, getRecipeFamily } from '@/api/recipes';
	import { useDataStore } from '@/store/data';
	import { useToastStore } from '@/store/toast';
	import FormItem from '@/components/FormItem.vue';
	import AppButton from '@/components/AppButton.vue';
	import DetailHeader from '@/components/DetailHeader.vue';
	import DetailPageLayout from '@/components/DetailPageLayout.vue';
	import AppModal from '@/components/AppModal.vue';
	import IconButton from '@/components/IconButton.vue';
	import type { RecipeVersion, RecipeFamily, DoughIngredient, Ingredient } from '@/types/api';
	import { formatNumber, toDecimal, toPercentage } from '@/utils/format';

	defineOptions({
		inheritAttrs: false
	});

	type SubIngredientRatio = { id : string | null; ratio : number | null };
	type SubIngredientWeight = { id : string | null; weightInGrams : number | null };

	const dataStore = useDataStore();
	const toastStore = useToastStore();
	const isSubmitting = ref(false);
	const isEditing = ref(false);
	const familyId = ref<string | null>(null);

	const form = ref({
		name: '',
		type: 'MAIN' as const,
		notes: '',
		doughs: [
			{
				id: `main_${Date.now()}`,
				name: '主面团',
				type: 'MAIN_DOUGH',
				lossRatio: 0,
				ingredients: [
					{ id: null as string | null, name: '', ratio: null as number | null },
				],
			},
		],
		products: [] as {
			name : string;
			baseDoughWeight : number;
			mixIns : SubIngredientRatio[];
			fillings : SubIngredientWeight[];
		}[],
	});

	const showAddPreDoughModal = ref(false);
	const showAddProductModal = ref(false);
	const selectedPreDough = ref<RecipeFamily | null>(null);
	const preDoughFlourRatio = ref<number | null>(null);
	const newProduct = ref({
		name: '',
		baseDoughWeight: 100,
		mixIns: [] as SubIngredientRatio[],
		fillings: [] as SubIngredientWeight[],
	});
	const isAddingPreDough = ref(false);

	const mainDough = computed(() => form.value.doughs.find(d => d.type === 'MAIN_DOUGH')!);

	const availablePreDoughs = computed(() => dataStore.recipes.filter(r => r.type === 'PRE_DOUGH' && !r.deletedAt));

	const filteredAvailableIngredients = computed(() => {
		const preDoughNames = availablePreDoughs.value.map(r => r.name);
		return dataStore.ingredients.filter(ing => !preDoughNames.includes(ing.name));
	});

	onLoad(async (options) => {
		if (!dataStore.dataLoaded.ingredients) await dataStore.fetchIngredientsData();
		if (!dataStore.dataLoaded.recipes) await dataStore.fetchRecipesData();

		if (options && options.familyId) {
			isEditing.value = true;
			familyId.value = options.familyId;

			// [核心改造] 优先读取为新版本准备的完整表单数据
			const sourceFormJson = uni.getStorageSync('source_recipe_version_form');
			if (sourceFormJson) {
				try {
					const sourceForm = JSON.parse(sourceFormJson);
					form.value = sourceForm;
				} catch (e) {
					toastStore.show({ message: '加载配方模板失败', type: 'error' });
				}
			}
		}
	});

	onUnload(() => {
		uni.removeStorageSync('source_recipe_version_form');
	});

	// [核心改造] getIngredientName 现在也能识别配方名称了
	const getIngredientName = (id : string | null) => {
		if (!id) return '请选择原料';
		// 优先在纯原料列表中查找
		const ingredient = dataStore.ingredients.find(i => i.id === id);
		if (ingredient) return ingredient.name;
		// 如果找不到，再去配方列表里找（适用于面种、馅料等）
		const recipe = dataStore.recipes.find(r => r.id === id);
		if (recipe) return recipe.name;
		return '未知原料';
	};

	const onIngredientChange = (e : any, ingIndex : number) => {
		const selected = filteredAvailableIngredients.value[e.detail.value];
		mainDough.value.ingredients[ingIndex].id = selected.id;
		mainDough.value.ingredients[ingIndex].name = selected.name;
	};

	const addIngredient = () => {
		mainDough.value.ingredients.push({ id: null, name: '', ratio: null });
	};

	const removeIngredient = (ingIndex : number) => {
		mainDough.value.ingredients.splice(ingIndex, 1);
	};

	const removeDough = (doughIndex : number) => {
		form.value.doughs.splice(doughIndex, 1);
	};

	const openAddPreDoughModal = () => {
		selectedPreDough.value = null;
		preDoughFlourRatio.value = null;
		showAddPreDoughModal.value = true;
	};

	const onPreDoughSelect = (e : any) => {
		selectedPreDough.value = availablePreDoughs.value[e.detail.value];
	};

	const confirmAddPreDough = async () => {
		if (!selectedPreDough.value || !preDoughFlourRatio.value || preDoughFlourRatio.value <= 0) {
			toastStore.show({ message: '请选择面种并填写有效的面粉占比', type: 'error' });
			return;
		}
		isAddingPreDough.value = true;
		try {
			const fullPreDoughData = await getRecipeFamily(selectedPreDough.value.id);
			const activeVersion = fullPreDoughData.versions?.find(v => v.isActive) || fullPreDoughData.versions?.sort((a, b) => b.version - a.version)[0];
			const ingredients = activeVersion?.doughs?.[0]?.ingredients;

			if (!ingredients) {
				toastStore.show({ message: '所选面种没有有效的配方版本', type: 'error' });
				return;
			}

			const flourIngredient = ingredients.find(i => i.ingredient.isFlour);
			const baseRatio = flourIngredient ? flourIngredient.ratio : 1;

			const calculatedIngredients = ingredients.map(i => {
				const newRatio = (i.ratio / baseRatio) * preDoughFlourRatio.value!;
				return {
					id: i.ingredient.id,
					name: i.ingredient.name,
					ratio: newRatio,
				}
			});

			form.value.doughs.push({
				// @ts-ignore
				id: activeVersion.familyId,
				name: fullPreDoughData.name,
				type: 'PRE_DOUGH',
				// @ts-ignore
				flourRatioInMainDough: preDoughFlourRatio.value,
				ingredients: calculatedIngredients,
			});

			showAddPreDoughModal.value = false;
		} catch (error) {
			toastStore.show({ message: '添加面种失败，请稍后再试', type: 'error' });
			console.error("Failed to add pre-dough:", error);
		} finally {
			isAddingPreDough.value = false;
		}
	};

	const openAddProductModal = () => {
		newProduct.value = {
			name: '',
			baseDoughWeight: 100,
			mixIns: [],
			fillings: [],
		};
		showAddProductModal.value = true;
	};

	const confirmAddProduct = () => {
		if (!newProduct.value.name || newProduct.value.baseDoughWeight <= 0) {
			toastStore.show({ message: '请输入有效的产品名称和克重', type: 'error' });
			return;
		}
		form.value.products.push({ ...newProduct.value });
		showAddProductModal.value = false;
	};

	const removeProduct = (index : number) => {
		form.value.products.splice(index, 1);
	};

	const addSubIngredient = (type : 'mixIns' | 'fillings') => {
		if (type === 'mixIns') {
			newProduct.value.mixIns.push({ id: null, ratio: null });
		} else {
			newProduct.value.fillings.push({ id: null, weightInGrams: null });
		}
	};

	const removeSubIngredient = (type : 'mixIns' | 'fillings', index : number) => {
		newProduct.value[type].splice(index, 1);
	};

	const onSubIngredientChange = (e : any, type : 'mixIns' | 'fillings', index : number) => {
		const selected = filteredAvailableIngredients.value[e.detail.value];
		newProduct.value[type][index].id = selected.id;
	};

	const handleSubmit = async () => {
		if (!form.value.name.trim()) {
			toastStore.show({ message: '请输入配方名称', type: 'error' });
			return;
		}

		const validMainIngredients = mainDough.value.ingredients.filter(ing => ing.id && (ing.ratio !== null && ing.ratio > 0));
		if (validMainIngredients.length === 0) {
			toastStore.show({ message: '主面团中至少需要一个有效原料', type: 'error' });
			return;
		}

		let totalFlourPercentage = 0;
		const allIngredientsMap = new Map(dataStore.ingredients.map(i => [i.id, i]));

		for (const dough of form.value.doughs) {
			for (const ing of dough.ingredients) {
				if (ing.id && allIngredientsMap.get(ing.id)?.isFlour) {
					totalFlourPercentage += Number(ing.ratio) || 0;
				}
			}
		}

		if (Math.abs(totalFlourPercentage - 100) > 0.01) {
			toastStore.show({ message: `所有面粉类原料的比例之和必须为100%，当前为${formatNumber(totalFlourPercentage)}%`, type: 'error', duration: 4000 });
			return;
		}

		isSubmitting.value = true;
		try {
			const payload = {
				name: form.value.name,
				type: form.value.type,
				notes: form.value.notes,
				doughs: form.value.doughs.map(d => ({
					// @ts-ignore
					id: d.type === 'MAIN_DOUGH' ? undefined : d.id,
					name: d.name,
					type: d.type,
					lossRatio: toDecimal(d.lossRatio),
					// @ts-ignore
					flourRatioInMainDough: toDecimal(d.flourRatioInMainDough),
					ingredients: d.ingredients
						.filter(ing => ing.id && (ing.ratio !== null && ing.ratio > 0))
						.map(ing => ({
							ingredientId: ing.id,
							ratio: toDecimal(ing.ratio),
						})),
				})),
				products: form.value.products.map(p => ({
					name: p.name,
					baseDoughWeight: p.baseDoughWeight,
					mixIns: p.mixIns
						.filter(i => i.id && (i.ratio !== null && i.ratio > 0))
						.map(i => ({ ingredientId: i.id, ratio: toDecimal(i.ratio) })),
					fillings: p.fillings
						.filter(i => i.id && (i.weightInGrams !== null && i.weightInGrams > 0))
						.map(i => ({ ingredientId: i.id, weightInGrams: i.weightInGrams })),
				})),
			};

			if (isEditing.value && familyId.value) {
				await createRecipeVersion(familyId.value, payload);
			} else {
				await createRecipe(payload);
			}

			toastStore.show({ message: '配方保存成功', type: 'success' });
			await dataStore.fetchRecipesData();
			uni.navigateBack();
		} catch (error) {
			console.error("Failed to save recipe:", error);
		} finally {
			isSubmitting.value = false;
		}
	};
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	.page-wrapper {
		display: flex;
		flex-direction: column;
		height: 100vh;
	}

	.input-field {
		width: 100%;
		height: 40px;
		line-height: 40px;
		padding: 0 12px;
		border: 1px solid var(--border-color);
		border-radius: 10px;
		font-size: 14px;
		background-color: #f8f9fa;
		box-sizing: border-box;
	}

	.picker-wrapper {
		flex: 1;
		width: 100%;
		height: 40px;
		border: 1px solid var(--border-color);
		border-radius: 10px;
		background-color: #f8f9fa;
		position: relative;
	}

	.ingredient-picker {
		width: 100%;
		height: 100%;
	}

	.picker-display {
		padding: 0 12px;
		width: 100%;
		height: 100%;
		line-height: 40px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: var(--text-primary);
		font-size: 14px;
	}

	.picker-display.placeholder {
		color: #999;
	}

	.app-modal .picker-wrapper {
		border: none;
	}

	.input-field[disabled] {
		background-color: #e9ecef;
		color: #6c757d;
	}

	.ingredient-header {
		display: flex;
		color: var(--text-secondary);
		font-size: 13px;
		padding: 0 5px;
		margin-top: 15px;
		margin-bottom: 8px;
	}

	.col-name {
		flex: 1;
	}

	.col-ratio {
		width: 60px;
		text-align: center;
		margin-left: 10px;
	}

	.col-action {
		width: 40px;
		text-align: right;
	}

	.ingredient-row {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 10px;
	}

	.ratio-input {
		width: 60px;
		text-align: center;
		flex-shrink: 0;
	}

	.remove-icon {
		width: 20px;
		height: 20px;
	}

	.save-button {
		margin-top: 30px;
	}

	.info-row {
		display: flex;
		justify-content: space-between;
		font-size: 14px;
		padding: 8px 5px;
		border-bottom: 1px solid var(--border-color);
	}

	.info-row:last-child {
		border-bottom: none;
	}

	.info-label {
		color: var(--text-secondary);
	}

	.info-value {
		color: var(--text-primary);
	}

	.add-button {
		margin-bottom: 20px;
		min-height: 46px;
	}

	.modal-scroll-view {
		max-height: 60vh;
	}

	.sub-group {
		margin-top: 20px;
	}

	.product-sub-group-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--text-secondary);
		padding: 8px 5px 0;
		margin-top: 8px;
		text-align: center;
	}
</style>