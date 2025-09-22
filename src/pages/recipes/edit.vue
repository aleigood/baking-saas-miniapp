<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper" @click="handlePageClick">
		<DetailHeader :title="pageTitle" />
		<DetailPageLayout @scroll="handleScroll">
			<view class="page-content page-content-with-fab">
				<view class="card">
					<FormItem label="配方名称">
						<input class="input-field" v-model="form.name" placeholder="例如：法式长棍" :disabled="isEditing" :class="{ 'is-disabled': isEditing }" />
					</FormItem>
					<FormItem v-if="form.type === 'MAIN'" label="配方品类">
						<picker mode="selector" :range="recipeCategories" range-key="label" @change="onCategoryChange" :disabled="isEditing">
							<view class="picker" :class="{ 'is-disabled': isEditing }">
								{{ currentCategoryLabel }}
								<view class="arrow-down"></view>
							</view>
						</picker>
					</FormItem>
					<FormItem v-if="form.type !== 'MAIN'" label="配方类型">
						<picker mode="selector" :range="recipeTypes" range-key="label" @change="onTypeChange" :disabled="isEditing">
							<view class="picker" :class="{ 'is-disabled': isEditing }">
								{{ currentTypeLabel }}
								<view class="arrow-down"></view>
							</view>
						</picker>
					</FormItem>
					<FormItem v-if="isEditing" label="版本说明">
						<input class="input-field" v-model="form.notes" placeholder="例如：夏季版本，减少水量" />
					</FormItem>
				</view>

				<template v-if="form.category === 'BREAD'">
					<template v-for="(component, componentIndex) in form.components" :key="component.id">
						<view class="card" v-if="component.type === 'PRE_DOUGH'">
							<view class="card-title-wrapper">
								<span class="card-title">{{ component.name }}</span>
								<view class="card-delete-btn-wrapper">
									<IconButton @click="removeComponent(componentIndex)">
										<image class="remove-icon" src="/static/icons/close-x.svg" />
									</IconButton>
								</view>
							</view>
							<view v-for="ing in component.ingredients" :key="ing.name" class="info-row">
								<text class="info-label">{{ ing.name }}</text>
								<text class="info-value">{{ formatNumber(ing.ratio) }}%</text>
							</view>
							<view v-if="component.procedure && component.procedure.length > 0" class="procedure-notes-read-only">
								<text class="notes-title">制作要点:</text>
								<text v-for="(step, stepIndex) in component.procedure" :key="stepIndex" class="note-item">{{ stepIndex + 1 }}. {{ step }}</text>
							</view>
						</view>
					</template>
					<view class="add-button-container">
						<AppButton type="dashed" full-width size="md" @click="openAddPreDoughModal">+ 添加面种</AppButton>
					</view>
				</template>

				<view class="card">
					<view class="card-title-wrapper">
						<span class="card-title">{{ mainComponentTitle }}</span>
					</view>
					<FormItem v-if="form.category === 'BREAD'" label="面团出缸温度 (°C)">
						<input class="input-field" type="number" v-model="form.targetTemp" placeholder="例如: 26" />
					</FormItem>
					<FormItem label="工艺损耗率 (%)">
						<input class="input-field" type="number" v-model="mainComponent.lossRatio" placeholder="例如: 2" />
					</FormItem>
					<view class="ingredient-header">
						<text class="col-name">原料名称</text>
						<text class="col-ratio">比例%</text>
						<text class="col-action"></text>
					</view>
					<view v-for="(ing, ingIndex) in mainComponent.ingredients" :key="ingIndex" class="ingredient-row">
						<view class="autocomplete-input-wrapper">
							<AutocompleteInput
								v-model="ing.name"
								:items="availableMainDoughIngredients"
								placeholder="输入或选择原料"
								@select="onIngredientSelect($event, ingIndex)"
								@blur="handleIngredientBlur(ing, availableMainDoughIngredients)"
								:show-tag="ing.isRecipe || (ing.name === '水' && showTotalWaterTag)"
								:tag-text="ing.name === '水' && showTotalWaterTag ? `总水: ${formatWaterRatio(totalCalculatedWaterRatio)}%` : '自制'"
								:tag-style="ing.name === '水' && showTotalWaterTag ? { backgroundColor: '#e0efff', color: '#00529b' } : {}"
							/>
						</view>
						<input class="input-field ratio-input" type="number" v-model="ing.ratio" placeholder="%" />
						<IconButton variant="field" @click="removeIngredient(ingIndex)">
							<image class="remove-icon" src="/static/icons/trash.svg" />
						</IconButton>
					</view>
					<AppButton type="dashed" full-width size="md" @click="addIngredient" class="add-button">+ 添加原料</AppButton>

					<view class="procedure-notes">
						<text class="notes-title">制作要点:</text>
						<view v-for="(step, stepIndex) in mainComponent.procedure" :key="stepIndex" class="procedure-item">
							<input class="input-field" v-model="mainComponent.procedure[stepIndex]" placeholder="输入制作步骤" />
							<IconButton variant="field" @click="removeProcedureStep(mainComponent, stepIndex)">
								<image class="remove-icon" src="/static/icons/trash.svg" />
							</IconButton>
						</view>
						<AppButton type="dashed" full-width size="md" @click="addProcedureStep(mainComponent)">+ 添加要点</AppButton>
					</view>
				</view>

				<template v-if="form.type === 'MAIN'">
					<view class="product-tabs-wrapper">
						<FilterTabs v-model="activeProductTab" :tabs="productTabs" class="product-tabs" editable @add="addProduct" align="center" />
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
							<FormItem label="基础原料克重 (g)">
								<input class="input-field" type="number" v-model="product.baseDoughWeight" placeholder="例如: 100" />
							</FormItem>

							<view class="sub-group">
								<view class="sub-group-title">辅料 (Mix-ins)</view>
								<view v-for="(ing, ingIndex) in product.mixIns" :key="ingIndex" class="ingredient-row">
									<view class="autocomplete-input-wrapper">
										<AutocompleteInput
											v-model="ing.name"
											:items="availableSubIngredients"
											placeholder="输入或选择原料/馅料"
											@select="onSubIngredientSelect($event, prodIndex, 'mixIns', ingIndex)"
											@blur="handleIngredientBlur(ing, availableSubIngredients)"
											:show-tag="ing.isRecipe"
										/>
									</view>
									<input class="input-field ratio-input" type="number" v-model="ing.ratio" placeholder="%" />
									<IconButton variant="field" @click="removeSubIngredient(prodIndex, 'mixIns', ingIndex)">
										<image class="remove-icon" src="/static/icons/trash.svg" />
									</IconButton>
								</view>
								<AppButton type="dashed" full-width size="md" @click="addSubIngredient(prodIndex, 'mixIns')">+ 添加辅料</AppButton>
							</view>

							<view class="sub-group">
								<view class="sub-group-title">馅料 (Fillings)</view>
								<view v-for="(ing, ingIndex) in product.fillings" :key="ingIndex" class="ingredient-row">
									<view class="autocomplete-input-wrapper">
										<AutocompleteInput
											v-model="ing.name"
											:items="availableSubIngredients"
											placeholder="输入或选择原料/馅料"
											@select="onSubIngredientSelect($event, prodIndex, 'fillings', ingIndex)"
											@blur="handleIngredientBlur(ing, availableSubIngredients)"
											:show-tag="ing.isRecipe"
										/>
									</view>
									<input class="input-field ratio-input" type="number" v-model="ing.weightInGrams" placeholder="g/个" />
									<IconButton variant="field" @click="removeSubIngredient(prodIndex, 'fillings', ingIndex)">
										<image class="remove-icon" src="/static/icons/trash.svg" />
									</IconButton>
								</view>
								<AppButton type="dashed" full-width size="md" @click="addSubIngredient(prodIndex, 'fillings')">+ 添加馅料</AppButton>
							</view>

							<view class="sub-group">
								<view class="sub-group-title">表面装饰 (Toppings)</view>
								<view v-for="(ing, ingIndex) in product.toppings" :key="ingIndex" class="ingredient-row">
									<view class="autocomplete-input-wrapper">
										<AutocompleteInput
											v-model="ing.name"
											:items="availableSubIngredients"
											placeholder="输入或选择原料/馅料"
											@select="onSubIngredientSelect($event, prodIndex, 'toppings', ingIndex)"
											@blur="handleIngredientBlur(ing, availableSubIngredients)"
											:show-tag="ing.isRecipe"
										/>
									</view>
									<input class="input-field ratio-input" type="number" v-model="ing.weightInGrams" placeholder="g/个" />
									<IconButton variant="field" @click="removeSubIngredient(prodIndex, 'toppings', ingIndex)">
										<image class="remove-icon" src="/static/icons/trash.svg" />
									</IconButton>
								</view>
								<AppButton type="dashed" full-width size="md" @click="addSubIngredient(prodIndex, 'toppings')">+ 添加表面装饰</AppButton>
							</view>

							<view class="procedure-notes">
								<text class="notes-title">制作要点:</text>
								<view v-for="(step, stepIndex) in product.procedure" :key="stepIndex" class="procedure-item">
									<input class="input-field" v-model="product.procedure[stepIndex]" placeholder="输入制作步骤" />
									<IconButton variant="field" @click="removeProcedureStep(product, stepIndex)">
										<image class="remove-icon" src="/static/icons/trash.svg" />
									</IconButton>
								</view>
								<AppButton type="dashed" full-width size="md" @click="addProcedureStep(product)">+ 添加要点</AppButton>
							</view>
						</view>
					</view>
				</template>

				<view class="bottom-actions-container">
					<AppButton type="primary" full-width @click="handleSubmit" :loading="isSubmitting" class="save-button">
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
				<input class="input-field" type="number" v-model="preDoughFlourRatio" placeholder="例如：20" />
			</FormItem>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showAddPreDoughModal = false">取消</AppButton>
				<AppButton type="primary" @click="confirmAddPreDough" :loading="isAddingPreDough">
					{{ isAddingPreDough ? '...' : '确认' }}
				</AppButton>
			</view>
		</AppModal>

		<AppModal v-model:visible="showCalculatorModal" title="发酵计算器">
			<FermentationCalculator @close="showCalculatorModal = false" />
		</AppModal>

		<ExpandingFab :icon="'/static/icons/calculator.svg'" @click="showCalculatorModal = true" :no-tab-bar="true" :visible="isFabVisible && showFermentationCalculator" />
	</view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { onLoad, onUnload } from '@dcloudio/uni-app';
import { createRecipe, createRecipeVersion, getRecipeFamily, updateRecipeVersion } from '@/api/recipes';
import { useDataStore } from '@/store/data';
import { useToastStore } from '@/store/toast';
import { useUiStore } from '@/store/ui';
import FormItem from '@/components/FormItem.vue';
import AppButton from '@/components/AppButton.vue';
import DetailHeader from '@/components/DetailHeader.vue';
import DetailPageLayout from '@/components/DetailPageLayout.vue';
import AppModal from '@/components/AppModal.vue';
import IconButton from '@/components/IconButton.vue';
import FilterTabs from '@/components/FilterTabs.vue';
import AutocompleteInput from '@/components/AutocompleteInput.vue';
import FermentationCalculator from '@/components/FermentationCalculator.vue';
import ExpandingFab from '@/components/ExpandingFab.vue';
import type { RecipeFamily, RecipeFormTemplate, RecipeCategory, ComponentTemplate } from '@/types/api'; // [核心重命名]
import { formatNumber, toDecimal } from '@/utils/format';
import { predefinedIngredients } from '@/utils/predefinedIngredients';

defineOptions({
	inheritAttrs: false
});

type AutocompleteItem = {
	id: string | null;
	name: string;
	isFlour: boolean;
	isRecipe: boolean;
	waterContent: number;
};

type SubIngredientRatio = { id: string | null; name: string; ratio: number | null; weightInGrams?: number | null; isRecipe?: boolean; waterContent?: number; isFlour?: boolean };
type SubIngredientWeight = { id: string | null; name: string; ratio?: number | null; weightInGrams: number | null; isRecipe?: boolean; waterContent?: number; isFlour?: boolean };

const dataStore = useDataStore();
const toastStore = useToastStore();
const uiStore = useUiStore();
const isSubmitting = ref(false);
const isEditing = ref(false);
const familyId = ref<string | null>(null);
const versionId = ref<string | null>(null);
const pageMode = ref<'create' | 'edit' | 'newVersion'>('create');

const showCalculatorModal = ref(false);

const isFabVisible = ref(true);
const lastScrollTop = ref(0);
const scrollThreshold = 5;

const form = ref<Omit<RecipeFormTemplate, 'ingredients' | 'procedure'> & { targetTemp?: number | null }>({
	name: '',
	type: 'MAIN',
	category: 'BREAD',
	notes: '',
	targetTemp: null,
	components: [
		{
			id: `main_${Date.now()}`,
			name: '主面团',
			type: 'MAIN_DOUGH',
			lossRatio: 0,
			ingredients: [{ id: null, name: '', ratio: null, isFlour: false, isRecipe: false, waterContent: 0 }],
			procedure: ['']
		}
	],
	products: []
});

// [核心新增] 新增计算属性，判断是否应该显示发酵计算器
const showFermentationCalculator = computed(() => {
	if (!form.value) return false;
	// 规则1: 如果是产品配方(MAIN)，则必须是面包品类(BREAD)
	const isBreadProduct = form.value.type === 'MAIN' && form.value.category === 'BREAD';
	// 规则2: 如果是其他配方，则必须是面种类型(PRE_DOUGH)
	const isPreDough = form.value.type === 'PRE_DOUGH';
	// 满足任意一个条件即可显示
	return isBreadProduct || isPreDough;
});

const recipeCategories = ref([
	{ label: '面包', value: 'BREAD' },
	{ label: '西点', value: 'PASTRY' },
	{ label: '甜品', value: 'DESSERT' },
	{ label: '饮品', value: 'DRINK' }
]);

const recipeTypes = ref([
	{ label: '面种', value: 'PRE_DOUGH' },
	{ label: '原料', value: 'EXTRA' }
]);

const currentCategoryLabel = computed(() => {
	return recipeCategories.value.find((c) => c.value === form.value.category)?.label || '请选择';
});

const currentTypeLabel = computed(() => {
	return recipeTypes.value.find((t) => t.value === form.value.type)?.label || '请选择';
});

const onCategoryChange = (e: any) => {
	form.value.category = recipeCategories.value[e.detail.value].value as RecipeCategory;
};

const onTypeChange = (e: any) => {
	form.value.type = recipeTypes.value[e.detail.value].value as 'PRE_DOUGH' | 'EXTRA';
};

const handlePageClick = () => {
	uni.$emit('page-clicked');
};

const pageTitle = computed(() => {
	if (pageMode.value === 'create') {
		return form.value.type === 'MAIN' ? '新建产品配方' : '新建其他配方';
	}
	if (pageMode.value === 'edit') {
		return '修改配方';
	}
	if (pageMode.value === 'newVersion') {
		return '创建新版本';
	}
	return '编辑配方';
});

const mainComponentTitle = computed(() => {
	if (form.value.category === 'BREAD' && form.value.type === 'MAIN') {
		return '主面团';
	}
	return form.value.name ? `${form.value.name}原料` : '基础原料';
});

const showAddPreDoughModal = ref(false);
const selectedPreDough = ref<RecipeFamily | null>(null);
const preDoughFlourRatio = ref<number | null>(null);
const isAddingPreDough = ref(false);

const activeProductTab = ref(0);

const mainComponent = computed(() => form.value.components!.find((c) => c.type === 'MAIN_DOUGH' || c.type === 'BASE_COMPONENT')!);

const productTabs = computed(() => {
	return form.value.products!.map((p, index) => ({
		key: index,
		label: p.name || `产品${index + 1}`
	}));
});

const availablePreDoughs = computed(() => dataStore.recipes.otherRecipes.filter((r) => r.type === 'PRE_DOUGH' && !r.deletedAt));

const availableMainDoughIngredients = computed((): AutocompleteItem[] => {
	const ingredientMap = new Map<string, AutocompleteItem>();

	predefinedIngredients.forEach((p) => {
		ingredientMap.set(p.name, { id: null, name: p.name, isFlour: p.isFlour, isRecipe: false, waterContent: p.waterContent || 0 });
	});

	const extras = dataStore.recipes.otherRecipes.filter((r) => r.type === 'EXTRA' && !r.deletedAt);
	extras.forEach((e) => {
		ingredientMap.set(e.name, { id: e.id, name: e.name, isFlour: false, isRecipe: true, waterContent: 0 });
	});

	dataStore.allIngredients.forEach((i) => {
		ingredientMap.set(i.name, { id: i.id, name: i.name, isFlour: i.isFlour, isRecipe: false, waterContent: i.waterContent || 0 });
	});

	const combined = Array.from(ingredientMap.values());

	const preDoughNames = new Set(availablePreDoughs.value.map((r) => r.name));
	return combined.filter((item) => !preDoughNames.has(item.name)).sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
});

const availableSubIngredients = computed((): AutocompleteItem[] => {
	const ingredientMap = new Map<string, AutocompleteItem>();

	predefinedIngredients.forEach((p) => {
		ingredientMap.set(p.name, { id: null, name: p.name, isFlour: p.isFlour, isRecipe: false, waterContent: p.waterContent || 0 });
	});

	const extras = dataStore.recipes.otherRecipes.filter((r) => r.type === 'EXTRA' && !r.deletedAt);
	extras.forEach((e) => {
		ingredientMap.set(e.name, { id: e.id, name: e.name, isFlour: false, isRecipe: true, waterContent: 0 });
	});

	dataStore.allIngredients.forEach((i) => {
		ingredientMap.set(i.name, { id: i.id, name: i.name, isFlour: i.isFlour, isRecipe: false, waterContent: i.waterContent || 0 });
	});

	return Array.from(ingredientMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
});

const totalCalculatedWaterRatio = computed(() => {
	let totalWater = 0;
	form.value.components?.forEach((component) => {
		component.ingredients.forEach((ing) => {
			if (ing.name && ing.ratio) {
				totalWater += Number(ing.ratio) * (ing.waterContent ?? 0);
			}
		});
	});
	return totalWater;
});

const manualWaterRatio = computed(() => {
	const waterIngredient = mainComponent.value.ingredients.find((i) => i.name === '水');
	return Number(waterIngredient?.ratio || 0);
});

const showTotalWaterTag = computed(() => {
	if (form.value.category !== 'BREAD' && form.value.type !== 'PRE_DOUGH') {
		return false;
	}
	if (manualWaterRatio.value === 0 && totalCalculatedWaterRatio.value === 0) {
		return false;
	}
	return Math.abs(totalCalculatedWaterRatio.value - manualWaterRatio.value) > 0.01;
});

const formatWaterRatio = (ratio: number): string => {
	const fixed = ratio.toFixed(1);
	return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
};

const handleIngredientBlur = (ingredient: { id: string | null; name: string; isRecipe?: boolean; waterContent?: number; isFlour?: boolean }, availableList: AutocompleteItem[]) => {
	if (!ingredient.id && ingredient.name) {
		const existing = availableList.find((item) => item.name === ingredient.name);
		if (existing) {
			ingredient.id = existing.id;
			ingredient.isRecipe = existing.isRecipe;
			ingredient.isFlour = existing.isFlour;
			ingredient.waterContent = existing.waterContent;
		} else {
			ingredient.isRecipe = false;
		}
	} else if (ingredient.id) {
		const existing = availableList.find((item) => item.id === ingredient.id);
		if (existing) {
			ingredient.isRecipe = existing.isRecipe;
		}
	}
};

onLoad(async (options) => {
	if (!dataStore.dataLoaded.ingredients) await dataStore.fetchIngredientsData();
	if (!dataStore.dataLoaded.recipes) await dataStore.fetchRecipesData();

	if (options && options.familyId) {
		isEditing.value = true;
		familyId.value = options.familyId;
		versionId.value = options.versionId || null;
		pageMode.value = options.mode as 'edit' | 'newVersion' | 'create';

		const sourceFormJson = uni.getStorageSync('source_recipe_version_form');
		if (sourceFormJson) {
			try {
				form.value = JSON.parse(sourceFormJson);

				if (form.value.products && form.value.products.length > 0) {
					activeProductTab.value = 0;
				}
			} catch (e) {
				console.error('解析或处理配方模板数据失败:', e);
				toastStore.show({ message: '加载配方模板失败', type: 'error' });
			}
		}
	} else {
		pageMode.value = 'create';
		if (options?.type === 'EXTRA') {
			form.value.type = 'EXTRA';
			form.value.products = [];
			form.value.category = 'OTHER';
			form.value.components = [
				{
					id: `main_${Date.now()}`,
					name: '',
					type: 'BASE_COMPONENT',
					lossRatio: 0,
					ingredients: [{ id: null, name: '', ratio: null, isFlour: false, isRecipe: false, waterContent: 0 }],
					procedure: ['']
				}
			];
		} else {
			form.value.type = 'MAIN';
			addProduct();
		}
	}
});

onUnload(() => {
	uni.removeStorageSync('source_recipe_version_form');
});

const handleScroll = (event?: any) => {
	if (!event || !event.detail) {
		return;
	}
	const scrollTop = event.detail.scrollTop;
	uni.$emit('page-clicked');
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

const onIngredientSelect = (item: AutocompleteItem, ingIndex: number) => {
	const ingredient = mainComponent.value.ingredients[ingIndex];
	ingredient.id = item.id;
	ingredient.name = item.name;
	ingredient.isFlour = item.isFlour;
	ingredient.isRecipe = item.isRecipe;
	ingredient.waterContent = item.waterContent;
};

const addIngredient = () => {
	mainComponent.value.ingredients.push({ id: null, name: '', ratio: null, isFlour: false, isRecipe: false, waterContent: 0 });
};

const removeIngredient = (ingIndex: number) => {
	mainComponent.value.ingredients.splice(ingIndex, 1);
};

const removeComponent = (componentIndex: number) => {
	form.value.components!.splice(componentIndex, 1);
};

const openAddPreDoughModal = () => {
	selectedPreDough.value = null;
	preDoughFlourRatio.value = null;
	showAddPreDoughModal.value = true;
};

const onPreDoughSelect = (e: any) => {
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
		const activeVersion = fullPreDoughData.versions?.find((v) => v.isActive) || fullPreDoughData.versions?.sort((a, b) => b.version - a.version)[0];

		if (!activeVersion || !activeVersion.components || activeVersion.components.length === 0) {
			toastStore.show({ message: '所选面种没有有效的配方版本', type: 'error' });
			return;
		}
		const preDoughRecipe = activeVersion.components[0];
		const ingredients = preDoughRecipe.ingredients;

		const preDoughInternalFlourRatio = ingredients.filter((i) => i.ingredient?.isFlour).reduce((sum, i) => sum + (i.ratio ?? 0), 0);

		if (preDoughInternalFlourRatio <= 0) {
			toastStore.show({ message: '所选面种配方中不含面粉，无法添加', type: 'error' });
			return;
		}

		const targetFlourRatioInMainDoughDecimal = toDecimal(preDoughFlourRatio.value);
		const scalingFactor = targetFlourRatioInMainDoughDecimal / preDoughInternalFlourRatio;

		const displayIngredients = ingredients.map((i) => ({
			id: i.ingredient!.id,
			name: i.ingredient!.name,
			ratio: (i.ratio ?? 0) * scalingFactor * 100,
			isRecipe: false,
			waterContent: i.ingredient!.waterContent
		}));

		form.value.components!.push({
			id: activeVersion.familyId,
			name: fullPreDoughData.name,
			type: 'PRE_DOUGH',
			flourRatioInMainDough: preDoughFlourRatio.value,
			ingredients: displayIngredients,
			procedure: preDoughRecipe.procedure
		});

		showAddPreDoughModal.value = false;
	} catch (error) {
		toastStore.show({ message: '添加面种失败，请稍后再试', type: 'error' });
		console.error('Failed to add pre-dough:', error);
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
		procedure: ['']
	});
	nextTick(() => {
		activeProductTab.value = form.value.products!.length - 1;
	});
};

const removeProduct = (index: number) => {
	form.value.products!.splice(index, 1);
	if (activeProductTab.value >= form.value.products!.length) {
		activeProductTab.value = Math.max(0, form.value.products!.length - 1);
	}
};

const addSubIngredient = (productIndex: number, type: 'mixIns' | 'fillings' | 'toppings') => {
	const product = form.value.products![productIndex];
	if (type === 'mixIns') {
		if (!product.mixIns) product.mixIns = [];
		product.mixIns.push({ id: null, name: '', ratio: null, weightInGrams: null, isRecipe: false, waterContent: 0, isFlour: false });
	} else {
		if (!product[type]) product[type] = [];
		product[type]!.push({ id: null, name: '', ratio: null, weightInGrams: null, isRecipe: false, waterContent: 0, isFlour: false });
	}
};

const removeSubIngredient = (productIndex: number, type: 'mixIns' | 'fillings' | 'toppings', ingIndex: number) => {
	form.value.products![productIndex][type]!.splice(ingIndex, 1);
};

const onSubIngredientSelect = (item: AutocompleteItem, productIndex: number, type: 'mixIns' | 'fillings' | 'toppings', ingIndex: number) => {
	const ingredient = form.value.products![productIndex][type]![ingIndex];
	ingredient.id = item.id;
	ingredient.name = item.name;
	ingredient.isRecipe = item.isRecipe;
	ingredient.isFlour = item.isFlour;
	ingredient.waterContent = item.waterContent;
};

const addProcedureStep = (itemWithProcedure: { procedure?: string[] }) => {
	if (!itemWithProcedure.procedure) {
		itemWithProcedure.procedure = [];
	}
	itemWithProcedure.procedure.push('');
};

const removeProcedureStep = (itemWithProcedure: { procedure: string[] }, index: number) => {
	itemWithProcedure.procedure.splice(index, 1);
};

const handleSubmit = async () => {
	if (!form.value.name.trim()) {
		toastStore.show({ message: '请输入配方名称', type: 'error' });
		return;
	}
	if (form.value.products && form.value.products.some((p) => !p.name.trim())) {
		toastStore.show({ message: '所有产品都必须填写名称', type: 'error' });
		return;
	}

	isSubmitting.value = true;

	try {
		const mainComponentFromForm = form.value.components!.find((c) => c.type === 'MAIN_DOUGH' || c.type === 'BASE_COMPONENT');
		if (!mainComponentFromForm) {
			toastStore.show({ message: '主组件数据丢失，无法保存', type: 'error' });
			isSubmitting.value = false;
			return;
		}

		const ingredientsPayload = [
			...mainComponentFromForm.ingredients
				.filter((ing) => ing.name && ing.ratio !== null && Number(ing.ratio) > 0)
				.map((ing) => {
					return {
						ingredientId: ing.id || undefined,
						name: ing.name,
						ratio: toDecimal(Number(ing.ratio)),
						isFlour: ing.isFlour,
						waterContent: ing.waterContent
					};
				}),
			...form.value
				.components!.filter((c) => c.type === 'PRE_DOUGH')
				.map((c) => ({
					name: c.name,
					flourRatio: toDecimal(Number(c.flourRatioInMainDough))
				}))
		];

		const processSubIngredients = (subIngredients: (SubIngredientWeight | SubIngredientRatio)[], type: 'MIX_IN' | 'FILLING' | 'TOPPING') => {
			return subIngredients
				.filter(
					(i) =>
						i.name && (('ratio' in i && i.ratio !== null && Number(i.ratio) > 0) || ('weightInGrams' in i && i.weightInGrams !== null && Number(i.weightInGrams) > 0))
				)
				.map((i) => {
					const base: { name: string; type: string; ingredientId?: string; ratio?: number; weightInGrams?: number } = { name: i.name, type };
					if (i.id) {
						base.ingredientId = i.id;
					}

					if ('ratio' in i && i.ratio !== null) {
						base.ratio = toDecimal(Number(i.ratio));
					}
					if ('weightInGrams' in i && i.weightInGrams !== null) {
						base.weightInGrams = Number(i.weightInGrams);
					}
					return base;
				})
				.filter(Boolean);
		};

		const payload = {
			name: form.value.name,
			type: form.value.type,
			category: form.value.category,
			notes: form.value.notes,
			targetTemp: form.value.targetTemp,
			lossRatio: toDecimal(Number(mainComponentFromForm.lossRatio)),
			procedure: mainComponentFromForm.procedure.filter((p) => p && p.trim()),
			ingredients: ingredientsPayload,
			products: form.value.products!.map((p) => ({
				name: p.name,
				weight: Number(p.baseDoughWeight),
				procedure: p.procedure.filter((step) => step && step.trim()),
				mixIn: processSubIngredients(p.mixIns, 'MIX_IN'),
				fillings: processSubIngredients(p.fillings, 'FILLING'),
				toppings: processSubIngredients(p.toppings, 'TOPPING')
			}))
		};

		if (pageMode.value === 'create') {
			await createRecipe(payload);
			uiStore.setNextPageToast({ message: '配方保存成功', type: 'success' }, '/pages/main/main');
		} else {
			const target = `/pages/recipes/detail?familyId=${familyId.value}`;
			if (pageMode.value === 'edit' && familyId.value && versionId.value) {
				await updateRecipeVersion(familyId.value, versionId.value, payload);
				uiStore.setNextPageToast({ message: '配方修改成功', type: 'success' }, target);
			} else if (pageMode.value === 'newVersion' && familyId.value) {
				await createRecipeVersion(familyId.value, payload);
				uiStore.setNextPageToast({ message: '新版本创建成功', type: 'success' }, target);
			}
		}

		dataStore.markRecipesAsStale();
		dataStore.markIngredientsAsStale();
		dataStore.markProductionAsStale();
		dataStore.markProductsForTaskCreationAsStale();
		uni.navigateBack();
	} catch (error) {
		console.error('Failed to save recipe:', error);
	} finally {
		isSubmitting.value = false;
	}
};
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
@include form-control-styles;

.page-wrapper {
	display: flex;
	flex-direction: column;
	height: 100vh;
}

.input-field.ratio-input {
	width: 80px;
	text-align: center;
	flex-shrink: 0;
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

.autocomplete-input-wrapper {
	flex: 1;
	min-width: 0;
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

.add-button-container {
	padding: 0 15px;
	margin: 30px 0px;
}

.add-button {
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

.card-delete-btn-wrapper {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	background-color: #fcf7f1;
	display: flex;
	justify-content: center;
	align-items: center;
}
</style>
