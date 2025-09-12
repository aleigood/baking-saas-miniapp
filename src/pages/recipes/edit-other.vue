<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader :title="pageTitle" />
		<DetailPageLayout @scroll="handleScroll">
			<view class="page-content page-content-with-fab">
				<view class=" card">
					<FormItem label="配方名称">
						<input class="input-field" v-model="form.name" placeholder="例如：波兰种 或 奶酥馅" :disabled="isEditing"
							:class="{'is-disabled': isEditing}" />
					</FormItem>
					<FormItem label="配方类型">
						<picker mode="selector" :range="recipeTypes" range-key="label" @change="onTypeChange"
							:disabled="isEditing">
							<view class="picker" :class="{ 'is-disabled': isEditing }">{{ currentTypeLabel }}
								<view class="arrow-down"></view>
							</view>
						</picker>
					</FormItem>
					<FormItem v-if="isEditing" label="版本说明">
						<input class="input-field" v-model="form.notes" placeholder="例如：更换了黄油品牌" />
					</FormItem>
				</view>

				<view class="card">
					<view class="card-title-wrapper">
						<span class="card-title">原料列表</span>
					</view>
					<view class="ingredient-header">
						<text class="col-name">原料名称</text>
						<text class="col-ratio">比例%</text>
						<text class="col-action"></text>
					</view>
					<view v-for="(ing, ingIndex) in form.ingredients" :key="ingIndex" class="ingredient-row">
						<view class="autocomplete-input-wrapper">
							<AutocompleteInput v-model="ing.name" :items="availableIngredients" placeholder="输入或选择原料"
								@select="onIngredientSelect($event, ingIndex)" />
						</view>
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
						<view v-for="(step, stepIndex) in form.procedure" :key="stepIndex" class="procedure-item">
							<input class="input-field" v-model="form.procedure[stepIndex]" placeholder="输入制作步骤" />
							<IconButton variant="field" @click="removeProcedureStep(stepIndex)">
								<image class="remove-icon" src="/static/icons/trash.svg" />
							</IconButton>
						</view>
						<AppButton type="dashed" full-width size="md" @click="addProcedureStep">+ 添加要点
						</AppButton>
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

		<AppModal v-model:visible="showCalculatorModal" title="发酵计算器">
			<FermentationCalculator @close="showCalculatorModal = false" />
		</AppModal>

		<ExpandingFab v-if="form.type === 'PRE_DOUGH'" :icon="'/static/icons/calculator.svg'"
			@click="showCalculatorModal = true" :no-tab-bar="true" :visible="isFabVisible" />
	</view>
</template>

<script setup lang="ts">
	import { ref, computed, onMounted, reactive } from 'vue';
	import { onLoad, onUnload } from '@dcloudio/uni-app';
	import { createRecipe, createRecipeVersion, updateRecipeVersion } from '@/api/recipes';
	import { useDataStore } from '@/store/data';
	import { useToastStore } from '@/store/toast';
	// [核心新增] 导入 uiStore
	import { useUiStore } from '@/store/ui';
	import FormItem from '@/components/FormItem.vue';
	import AppButton from '@/components/AppButton.vue';
	import DetailHeader from '@/components/DetailHeader.vue';
	import DetailPageLayout from '@/components/DetailPageLayout.vue';
	import IconButton from '@/components/IconButton.vue';
	import AutocompleteInput from '@/components/AutocompleteInput.vue';
	import FermentationCalculator from '@/components/FermentationCalculator.vue';
	import ExpandingFab from '@/components/ExpandingFab.vue';
	import AppModal from '@/components/AppModal.vue';
	import { toDecimal } from '@/utils/format';

	defineOptions({
		inheritAttrs: false
	});

	const dataStore = useDataStore();
	const toastStore = useToastStore();
	// [核心新增] 获取 uiStore 实例
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

	const form = reactive({
		name: '',
		type: 'PRE_DOUGH' as 'PRE_DOUGH' | 'EXTRA',
		notes: '',
		ingredients: [{ id: null as string | null, name: '', ratio: null as number | null }],
		procedure: [''],
	});

	const pageTitle = computed(() => {
		if (pageMode.value === 'edit') {
			return '修改配方';
		}
		if (pageMode.value === 'newVersion') {
			return '创建新版本';
		}
		return '新建其他配方';
	});

	const recipeTypes = ref([
		{ label: '面种', value: 'PRE_DOUGH' },
		{ label: '馅料/其他', value: 'EXTRA' },
	]);

	const currentTypeLabel = computed(() => {
		return recipeTypes.value.find(t => t.value === form.type)?.label || '请选择';
	});

	const availableIngredients = computed(() => {
		const extras = dataStore.recipes.otherRecipes.filter(r => r.type === 'EXTRA' && !r.deletedAt);
		const combined = [
			...dataStore.allIngredients.map(i => ({ id: i.id, name: i.name })),
			...extras.map(e => ({ id: e.id, name: e.name })),
		];
		return combined.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
	});


	onLoad(async (options) => {
		if (!dataStore.dataLoaded.ingredients) {
			await dataStore.fetchIngredientsData();
		}
		if (!dataStore.dataLoaded.recipes) {
			await dataStore.fetchRecipesData();
		}

		if (options && options.familyId) {
			isEditing.value = true;
			familyId.value = options.familyId;
			versionId.value = options.versionId || null;
			pageMode.value = options.mode as 'edit' | 'newVersion' | 'create';

			const sourceFormJson = uni.getStorageSync('source_recipe_version_form');
			if (sourceFormJson) {
				try {
					const sourceForm = JSON.parse(sourceFormJson);
					Object.assign(form, sourceForm);
				} catch (e) {
					toastStore.show({ message: '加载配方模板失败', type: 'error' });
				}
			}
		}
	});

	onUnload(() => {
		uni.removeStorageSync('source_recipe_version_form');
	});

	const handleScroll = (event ?: any) => {
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


	const onTypeChange = (e : any) => {
		form.type = recipeTypes.value[e.detail.value].value as 'PRE_DOUGH' | 'EXTRA';
	};

	const onIngredientSelect = (item : { id : string | null; name : string }, ingIndex : number) => {
		form.ingredients[ingIndex].id = item.id;
		form.ingredients[ingIndex].name = item.name;
	};


	const addIngredient = () => {
		form.ingredients.push({ id: null, name: '', ratio: null });
	};

	const removeIngredient = (ingIndex : number) => {
		form.ingredients.splice(ingIndex, 1);
	};

	const addProcedureStep = () => {
		form.procedure.push('');
	};

	const removeProcedureStep = (index : number) => {
		form.procedure.splice(index, 1);
	};

	const handleSubmit = async () => {
		isSubmitting.value = true;
		try {
			const allAvailableItemsMap = new Map(availableIngredients.value.map(i => [i.id, i]));
			const allIngredientsMap = new Map(dataStore.allIngredients.map(i => [i.id, i]));

			const payload = {
				name: form.name,
				type: form.type,
				notes: form.notes,
				ingredients: form.ingredients
					.filter(ing => ing.name && (ing.ratio !== null && ing.ratio > 0))
					.map(ing => {
						const ingredientDetails = allIngredientsMap.get(ing.id!);
						return {
							ingredientId: ing.id || undefined,
							name: ing.name,
							ratio: toDecimal(ing.ratio),
							isFlour: ingredientDetails ? ingredientDetails.isFlour : false,
						}
					}),
				procedure: form.procedure.filter(p => p && p.trim()),
				products: [],
			};

			if (pageMode.value === 'edit' && familyId.value && versionId.value) {
				await updateRecipeVersion(familyId.value, versionId.value, payload);
			} else if (pageMode.value === 'newVersion' && familyId.value) {
				await createRecipeVersion(familyId.value, payload);
			} else {
				await createRecipe(payload);
			}

			// [核心修改] 使用 uiStore.setNextPageToast 替代 toastStore.show
			uiStore.setNextPageToast({ message: '配方保存成功', type: 'success' });
			dataStore.markRecipesAsStale();
			dataStore.markIngredientsAsStale();
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
	@include form-control-styles;

	.page-wrapper {
		display: flex;
		flex-direction: column;
		height: 100vh;
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

	.ratio-input {
		width: 80px;
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

	.add-button {
		margin-bottom: 20px;
		min-height: 46px;
	}

	.procedure-notes {
		margin-top: 20px;
		border-top: 1px solid var(--border-color);
		padding-top: 20px;
		padding-bottom: 15px;
	}

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
</style>