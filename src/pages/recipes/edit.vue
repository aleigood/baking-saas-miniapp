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
							<view class="card-delete-btn-wrapper">
								<IconButton @click="removeDough(doughIndex)">
									<image class="remove-icon" src="/static/icons/close-x.svg" />
								</IconButton>
							</view>
						</view>
						<view v-for="ing in dough.ingredients" :key="ing.name" class="info-row">
							<text class="info-label">{{ ing.name }}</text>
							<text class="info-value">{{ formatNumber(ing.ratio) }}%</text>
						</view>
						<view v-if="dough.procedure && dough.procedure.length > 0" class="procedure-notes-read-only">
							<text class="notes-title">制作要点:</text>
							<text v-for="(step, stepIndex) in dough.procedure" :key="stepIndex" class="note-item">
								{{ stepIndex + 1 }}. {{ step }}
							</text>
						</view>
					</view>
				</template>
				<view class="add-button-container">
					<AppButton type="dashed" full-width size="md" @click="openAddPreDoughModal">+ 添加面种
					</AppButton>
				</view>

				<view class="card">
					<view class="card-title-wrapper">
						<span class="card-title">主面团</span>
					</view>
					<FormItem label="面团出缸温度 (°C)">
						<input class="input-field" type="number" v-model.number="form.targetTemp"
							placeholder="例如: 26" />
					</FormItem>
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
						<picker mode="selector" :range="filteredAvailableIngredients" range-key="name"
							@change="onIngredientChange($event, ingIndex)">
							<view class="picker" :class="{ placeholder: !ing.id }">
								{{ getIngredientName(ing.id) }}
								<view class="arrow-down"></view>
							</view>
						</picker>
						<input class="input-field ratio-input" type="number" v-model.number="ing.ratio"
							placeholder="%" />
						<IconButton variant="field" @click="removeIngredient(ingIndex)">
							<image class="remove-icon" src="/static/icons/trash.svg" />
						</IconButton>
					</view>
					<AppButton type="dashed" full-width size="md" @click="addIngredient" class="add-button">+ 添加原料
					</AppButton>

					<view class="procedure-notes">
						<text class="notes-title">制作要点:</text>
						<view v-for="(step, stepIndex) in mainDough.procedure" :key="stepIndex" class="procedure-item">
							<input class="input-field" v-model="mainDough.procedure[stepIndex]" placeholder="输入制作步骤" />
							<IconButton variant="field" @click="removeProcedureStep(mainDough, stepIndex)">
								<image class="remove-icon" src="/static/icons/trash.svg" />
							</IconButton>
						</view>
						<AppButton type="dashed" full-width size="md" @click="addProcedureStep(mainDough)">+ 添加要点
						</AppButton>
					</view>
				</view>
				<view class="product-tabs-wrapper">
					<FilterTabs v-model="activeProductTab" :tabs="productTabs" class="product-tabs" editable
						@add="addProduct" />
				</view>

				<view v-for="(product, prodIndex) in form.products" :key="prodIndex">
					<view class="card" v-show="activeProductTab === prodIndex">
						<view class="card-title-wrapper">
							<span class="card-title">{{ product.name || `产品${prodIndex + 1}` }}</span>
							<view class="card-delete-btn-wrapper">
								<IconButton @click="removeProduct(prodIndex)">
									<image class="remove-icon" src="/static/icons/close-x.svg" />
								</IconButton>
							</view>
						</view>
						<FormItem label="产品名称">
							<input class="input-field" v-model="product.name" :placeholder="`产品${prodIndex + 1}`" />
						</FormItem>
						<FormItem label="基础面团克重 (g)">
							<input class="input-field" type="number" v-model.number="product.baseDoughWeight"
								placeholder="例如: 100" />
						</FormItem>

						<view class="sub-group">
							<view class="sub-group-title">辅料 (Mix-ins)</view>
							<view v-for="(ing, ingIndex) in product.mixIns" :key="ingIndex" class="ingredient-row">
								<picker mode="selector" :range="availableSubIngredients" range-key="name"
									@change="onSubIngredientChange($event, prodIndex, 'mixIns', ingIndex)">
									<view class="picker" :class="{ placeholder: !ing.id }">
										{{ getIngredientName(ing.id) }}
										<view class="arrow-down"></view>
									</view>
								</picker>
								<input class="input-field ratio-input" type="number" v-model.number="ing.ratio"
									placeholder="%" />
								<IconButton variant="field" @click="removeSubIngredient(prodIndex, 'mixIns', ingIndex)">
									<image class="remove-icon" src="/static/icons/trash.svg" />
								</IconButton>
							</view>
							<AppButton type="dashed" full-width size="md"
								@click="addSubIngredient(prodIndex, 'mixIns')">+ 添加辅料</AppButton>
						</view>

						<view class="sub-group">
							<view class="sub-group-title">馅料 (Fillings)</view>
							<view v-for="(ing, ingIndex) in product.fillings" :key="ingIndex" class="ingredient-row">
								<picker mode="selector" :range="availableSubIngredients" range-key="name"
									@change="onSubIngredientChange($event, prodIndex, 'fillings', ingIndex)">
									<view class="picker" :class="{ placeholder: !ing.id }">
										{{ getIngredientName(ing.id) }}
										<view class="arrow-down"></view>
									</view>
								</picker>
								<input class="input-field ratio-input" type="number" v-model.number="ing.weightInGrams"
									placeholder="g/个" />
								<IconButton variant="field"
									@click="removeSubIngredient(prodIndex, 'fillings', ingIndex)">
									<image class="remove-icon" src="/static/icons/trash.svg" />
								</IconButton>
							</view>
							<AppButton type="dashed" full-width size="md"
								@click="addSubIngredient(prodIndex, 'fillings')">+ 添加馅料</AppButton>
						</view>

						<view class="sub-group">
							<view class="sub-group-title">表面装饰 (Toppings)</view>
							<view v-for="(ing, ingIndex) in product.toppings" :key="ingIndex" class="ingredient-row">
								<picker mode="selector" :range="availableSubIngredients" range-key="name"
									@change="onSubIngredientChange($event, prodIndex, 'toppings', ingIndex)">
									<view class="picker" :class="{ placeholder: !ing.id }">
										{{ getIngredientName(ing.id) }}
										<view class="arrow-down"></view>
									</view>
								</picker>
								<input class="input-field ratio-input" type="number" v-model.number="ing.weightInGrams"
									placeholder="g/个" />
								<IconButton variant="field"
									@click="removeSubIngredient(prodIndex, 'toppings', ingIndex)">
									<image class="remove-icon" src="/static/icons/trash.svg" />
								</IconButton>
							</view>
							<AppButton type="dashed" full-width size="md"
								@click="addSubIngredient(prodIndex, 'toppings')">+ 添加表面装饰</AppButton>
						</view>

						<view class="procedure-notes">
							<text class="notes-title">制作要点:</text>
							<view v-for="(step, stepIndex) in product.procedure" :key="stepIndex"
								class="procedure-item">
								<input class="input-field" v-model="product.procedure[stepIndex]"
									placeholder="输入制作步骤" />
								<IconButton variant="field" @click="removeProcedureStep(product, stepIndex)">
									<image class="remove-icon" src="/static/icons/trash.svg" />
								</IconButton>
							</view>
							<AppButton type="dashed" full-width size="md" @click="addProcedureStep(product)">+ 添加要点
							</AppButton>
						</view>
					</view>
				</view>
				<view class="bottom-actions-container">
					<AppButton type="primary" full-width @click="handleSubmit" :loading="isSubmitting"
						class="save-button">
						{{ isSubmitting ? '' : '保存配方' }}
					</AppButton>
				</view>
			</view>
		</DetailPageLayout>

		<AppModal :visible="showAddPreDoughModal" @update:visible="showAddPreDoughModal = false" title="添加面种">
			<FormItem label="选择面种配方">
				<picker mode="selector" :range="availablePreDoughs" range-key="name" @change="onPreDoughSelect">
					<view class="picker" :class="{ placeholder: !selectedPreDough }">
						{{ selectedPreDough?.name || '请选择' }}
						<view class="arrow-down"></view>
					</view>
				</picker>
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
	</view>
</template>

<script setup lang="ts">
	import { ref, computed, onMounted, nextTick, watch } from 'vue';
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
	import FilterTabs from '@/components/FilterTabs.vue';
	import type { RecipeFamily, RecipeFormTemplate } from '@/types/api';
	import { formatNumber, toDecimal } from '@/utils/format';


	defineOptions({
		inheritAttrs: false
	});

	type SubIngredientRatio = { id : string | null; ratio : number | null; weightInGrams ?: number | null };
	type SubIngredientWeight = { id : string | null; ratio ?: number | null; weightInGrams : number | null };

	const dataStore = useDataStore();
	const toastStore = useToastStore();
	const isSubmitting = ref(false);
	const isEditing = ref(false);
	const familyId = ref<string | null>(null);

	// [核心修改] 将新建配方的默认结构作为 ref 的初始值。
	// 这样可以确保 mainDough 计算属性在组件首次渲染时不会因 doughs 为空而返回 undefined，从而修复小程序端的报错。
	const form = ref<RecipeFormTemplate & { targetTemp ?: number }>({
		name: '',
		type: 'MAIN',
		notes: '',
		targetTemp: undefined,
		doughs: [{
			id: `main_${Date.now()}`,
			name: '主面团',
			type: 'MAIN_DOUGH',
			lossRatio: 0,
			ingredients: [{ id: null, name: '', ratio: null }],
			procedure: [''],
		}],
		products: [],
	});

	const showAddPreDoughModal = ref(false);
	const selectedPreDough = ref<RecipeFamily | null>(null);
	const preDoughFlourRatio = ref<number | null>(null);
	const isAddingPreDough = ref(false);

	const activeProductTab = ref(0);

	const mainDough = computed(() => form.value.doughs!.find(d => d.type === 'MAIN_DOUGH')!);

	const productTabs = computed(() => {
		return form.value.products!.map((p, index) => ({
			key: index,
			label: p.name || `产品${index + 1}`
		}));
	});

	const availablePreDoughs = computed(() => dataStore.recipes.otherRecipes.filter(r => r.type === 'PRE_DOUGH' && !r.deletedAt));

	const filteredAvailableIngredients = computed(() => {
		const preDoughNames = availablePreDoughs.value.map(r => r.name);
		return dataStore.allIngredients.filter(ing => !preDoughNames.includes(ing.name));
	});

	const availableSubIngredients = computed(() => {
		const extras = dataStore.recipes.otherRecipes.filter(r => r.type === 'EXTRA' && !r.deletedAt);
		const combined = [
			...dataStore.allIngredients.map(i => ({ id: i.id, name: i.name })),
			...extras.map(e => ({ id: e.id, name: e.name })),
		];
		return combined.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
	});

	onLoad(async (options) => {
		if (!dataStore.dataLoaded.ingredients) await dataStore.fetchIngredientsData();
		if (!dataStore.dataLoaded.recipes) await dataStore.fetchRecipesData();

		// [核心修改] 新建配方的逻辑已移至 ref 初始化，此处仅处理编辑情况
		if (options && options.familyId) {
			isEditing.value = true;
			familyId.value = options.familyId;

			const sourceFormJson = uni.getStorageSync('source_recipe_version_form');
			if (sourceFormJson) {
				try {
					const sourceForm = JSON.parse(sourceFormJson) as RecipeFormTemplate;
					form.value = sourceForm;
					if (form.value.products && form.value.products.length > 0) {
						activeProductTab.value = 0;
					}
				} catch (e) {
					toastStore.show({ message: '加载配方模板失败', type: 'error' });
				}
			}
		}
		// [核心修改] 移除 else 块，因为初始状态已经是新建状态
	});

	onUnload(() => {
		uni.removeStorageSync('source_recipe_version_form');
	});

	const getIngredientName = (id : string | null) => {
		if (!id) return '请选择原料';
		const ingredient = dataStore.allIngredients.find(i => i.id === id);
		if (ingredient) return ingredient.name;
		const recipe = dataStore.allRecipes.find(r => r.id === id);
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
		form.value.doughs!.splice(doughIndex, 1);
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
			const activeVersion = fullPreDoughData.versions?.find(v => v.isActive) || fullPreDoughData.versions?.sort((a,
				b) => b.version - a.version)[0];

			if (!activeVersion || !activeVersion.doughs || activeVersion.doughs.length === 0) {
				toastStore.show({ message: '所选面种没有有效的配方版本', type: 'error' });
				return;
			}
			const preDoughRecipe = activeVersion.doughs[0];
			const ingredients = preDoughRecipe.ingredients;

			// [核心修复] 对面种中的原料比例进行换算，以在UI上正确显示
			// 1. 计算面种配方本身的总面粉比例 (通常是1，即100%)
			const preDoughInternalFlourRatio = ingredients
				.filter(i => i.ingredient?.isFlour)
				.reduce((sum, i) => sum + i.ratio, 0);

			// 2. 健壮性检查：如果面种里没有面粉，则无法进行换算
			if (preDoughInternalFlourRatio <= 0) {
				toastStore.show({ message: '所选面种配方中不含面粉，无法添加', type: 'error' });
				return;
			}

			// 3. 获取用户输入的目标面粉占比 (例如: 20% -> 0.2)
			const targetFlourRatioInMainDoughDecimal = toDecimal(preDoughFlourRatio.value);

			// 4. 计算换算比例因子。
			// 意义：为了让面种里的面粉量达到用户期望的占比，面种里所有原料的原始比例都需要乘以这个因子。
			const scalingFactor = targetFlourRatioInMainDoughDecimal / preDoughInternalFlourRatio;

			// 5. 根据换算因子，计算出用于UI展示的新原料列表
			const displayIngredients = ingredients.map(i => ({
				id: i.ingredient!.id,
				name: i.ingredient!.name,
				// 将原始比例乘以换算因子，再乘以100，得到相对于主面团总面粉的百分比数值
				ratio: i.ratio * scalingFactor * 100,
			}));

			form.value.doughs!.push({
				id: activeVersion.familyId,
				name: fullPreDoughData.name,
				type: 'PRE_DOUGH',
				// 这里依然存储用户输入的原始百分比，用于最终提交给后端
				flourRatioInMainDough: preDoughFlourRatio.value,
				// 使用换算后的原料列表，以在UI上正确显示
				ingredients: displayIngredients,
				procedure: preDoughRecipe.procedure,
			});

			showAddPreDoughModal.value = false;
		} catch (error) {
			toastStore.show({ message: '添加面种失败，请稍后再试', type: 'error' });
			console.error("Failed to add pre-dough:", error);
		} finally {
			isAddingPreDough.value = false;
		}
	};


	const addProduct = () => {
		if (!form.value.products) form.value.products = [];
		form.value.products.push({
			name: '',
			baseDoughWeight: 100,
			mixIns: [],
			fillings: [],
			toppings: [],
			procedure: [''],
		});
		nextTick(() => {
			activeProductTab.value = form.value.products!.length - 1;
		});
	};

	const removeProduct = (index : number) => {
		form.value.products!.splice(index, 1);
		if (activeProductTab.value >= form.value.products!.length) {
			activeProductTab.value = Math.max(0, form.value.products!.length - 1);
		}
	};

	const addSubIngredient = (productIndex : number, type : 'mixIns' | 'fillings' | 'toppings') => {
		const product = form.value.products![productIndex];
		if (type === 'mixIns') {
			if (!product.mixIns) product.mixIns = [];
			product.mixIns.push({ id: null, ratio: null, weightInGrams: null });
		} else {
			if (!product[type]) product[type] = [];
			product[type]!.push({ id: null, ratio: null, weightInGrams: null });
		}
	};

	const removeSubIngredient = (productIndex : number, type : 'mixIns' | 'fillings' | 'toppings', ingIndex : number) => {
		form.value.products![productIndex][type]!.splice(ingIndex, 1);
	};

	const onSubIngredientChange = (e : any, productIndex : number, type : 'mixIns' | 'fillings' | 'toppings', ingIndex : number) => {
		const selected = availableSubIngredients.value[e.detail.value];
		form.value.products![productIndex][type]![ingIndex].id = selected.id;
	};

	const addProcedureStep = (itemWithProcedure : { procedure ?: string[] }) => {
		if (!itemWithProcedure.procedure) {
			itemWithProcedure.procedure = [];
		}
		itemWithProcedure.procedure.push('');
	};

	const removeProcedureStep = (itemWithProcedure : { procedure : string[] }, index : number) => {
		itemWithProcedure.procedure.splice(index, 1);
	};

	const handleSubmit = async () => {
		if (!form.value.name.trim()) {
			toastStore.show({ message: '请输入配方名称', type: 'error' });
			return;
		}
		if (form.value.products && form.value.products.some(p => !p.name.trim())) {
			toastStore.show({ message: '所有产品都必须填写名称', type: 'error' });
			return;
		}

		isSubmitting.value = true;
		try {
			const mainDoughFromForm = form.value.doughs!.find(d => d.type === 'MAIN_DOUGH');
			if (!mainDoughFromForm) {
				toastStore.show({ message: '主面团数据丢失，无法保存', type: 'error' });
				isSubmitting.value = false;
				return;
			}
			const allIngredientsMap = new Map(dataStore.allIngredients.map(i => [i.id, i]));

			const ingredientsPayload = [
				// 主面团中的普通原料
				...mainDoughFromForm.ingredients
					.filter(ing => ing.id && (ing.ratio !== null && ing.ratio > 0))
					.map(ing => {
						const details = allIngredientsMap.get(ing.id!);
						return {
							ingredientId: ing.id,
							name: details?.name || ing.name,
							ratio: toDecimal(ing.ratio),
							isFlour: details?.isFlour || false,
							waterContent: details?.waterContent || 0,
						};
					}),
				// 添加的预制面团
				...form.value.doughs!
					.filter(d => d.type === 'PRE_DOUGH')
					.map(d => ({
						name: d.name,
						flourRatio: toDecimal(d.flourRatioInMainDough),
					})),
			];

			const processSubIngredients = (subIngredients : (SubIngredientWeight | SubIngredientRatio)[], type :
				'MIX_IN' | 'FILLING' | 'TOPPING') => {
				return subIngredients
					.filter(i => i.id && (('ratio' in i && i.ratio !== null && i.ratio > 0) || ('weightInGrams' in i && i
						.weightInGrams !== null && i.weightInGrams > 0)))
					.map(i => {
						const item = availableSubIngredients.value.find(s => s.id === i.id);
						if (!item) return null;

						const base : { name : string, type : string, ingredientId ?: string, ratio ?: number, weightInGrams ?: number } = { name: item.name, type };
						const ingredient = dataStore.allIngredients.find(ing => ing.id === i.id);
						if (ingredient) {
							base.ingredientId = ingredient.id;
						}

						if ('ratio' in i && i.ratio !== null) {
							base.ratio = toDecimal(i.ratio);
						}
						if ('weightInGrams' in i && i.weightInGrams !== null) {
							base.weightInGrams = i.weightInGrams;
						}
						return base;
					}).filter(Boolean);
			};

			// [核心修改] 在提交的数据中包含 notes 和 targetTemp
			const payload = {
				name: form.value.name,
				type: form.value.type,
				notes: form.value.notes,
				targetTemp: form.value.targetTemp, // 新增
				lossRatio: toDecimal(mainDoughFromForm.lossRatio),
				procedure: mainDoughFromForm.procedure.filter(p => p && p.trim()),
				ingredients: ingredientsPayload,
				products: form.value.products!.map(p => ({
					name: p.name,
					weight: p.baseDoughWeight,
					procedure: p.procedure.filter(step => step && step.trim()),
					mixIn: processSubIngredients(p.mixIns, 'MIX_IN'),
					fillings: processSubIngredients(p.fillings, 'FILLING'),
					toppings: processSubIngredients(p.toppings, 'TOPPING'),
				})),
			};

			let createdOrUpdatedRecipe : RecipeVersion | null = null;
			if (isEditing.value && familyId.value) {
				createdOrUpdatedRecipe = await createRecipeVersion(familyId.value, payload);
			} else {
				createdOrUpdatedRecipe = await createRecipe(payload);
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
	// [核心新增] 引入 Mixin
	@include form-control-styles;

	.page-wrapper {
		display: flex;
		flex-direction: column;
		height: 100vh;
	}

	// [核心修改] 删除本地重复的 .input-field 和 .picker 相关样式
	// 并调整 .ratio-input 的样式以继承 .input-field
	.input-field.ratio-input {
		width: 80px;
		text-align: center;
		flex-shrink: 0;
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

		// [核心修改] 让 picker 在 flex 布局中正确伸展
		picker {
			flex: 1;
			min-width: 0;
		}
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

	/* [样式修复] 增加外层容器来控制按钮的上下外边距 */
	.add-button-container {
		padding: 0 15px;
		margin: 30px 0px;
	}

	.add-button {
		/* [样式修复] 移除按钮自身的 margin-bottom */
		margin-bottom: 0;
		min-height: 46px;
	}

	.modal-scroll-view {
		max-height: 60vh;
	}

	.sub-group {
		margin-top: 20px;
		border-top: 1px solid var(--border-color);
		padding-top: 20px;
	}

	.sub-group-title {
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary);
		margin-bottom: 15px;
	}

	.procedure-notes {
		margin-top: 20px;
		border-top: 1px solid var(--border-color);
		padding-top: 20px;
		padding-bottom: 15px;

		.notes-title {
			display: block;
			margin-bottom: 8px;
			font-size: 14px;
			color: #606266;
		}

		.procedure-item {
			display: flex;
			align-items: center;
			gap: 10px;
			margin-bottom: 10px;
		}

		.note-item {
			font-size: 14px;
			color: var(--text-secondary);
			line-height: 1.6;
		}
	}

	.procedure-notes-read-only {
		margin-top: 25px;
		font-size: 12px;
		color: var(--text-secondary);
		line-height: 1.6;

		.notes-title {
			font-weight: 600;
			display: block;
			margin-bottom: 5px;
		}

		.note-item {
			display: block;
		}
	}

	.product-tabs-wrapper {
		margin: 25px 0px;
	}

	/* [样式修复] 使用 wrapper 容器来解决小程序中的样式问题 */
	.card-delete-btn-wrapper {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		/* 设置一个背景色以确保在小程序中渲染正确 */
		background-color: #fcf7f1;
		/* 让内部的 IconButton 组件可以完美对齐 */
		display: flex;
		justify-content: center;
		align-items: center;
	}
</style>