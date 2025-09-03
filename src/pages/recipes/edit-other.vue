<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader :title="isEditing ? '创建新版本' : '新建其他配方'" />
		<DetailPageLayout>
			<view class="page-content">
				<view class="card">
					<FormItem label="配方名称">
						<input class="input-field" v-model="form.name" placeholder="例如：波兰种 或 奶酥馅"
							:disabled="isEditing" />
					</FormItem>
					<FormItem v-if="isEditing" label="版本说明">
						<input class="input-field" v-model="form.notes" placeholder="例如：更换了黄油品牌" />
					</FormItem>
					<FormItem label="配方类型">
						<view class="picker-wrapper">
							<picker mode="selector" :range="recipeTypes" range-key="label" @change="onTypeChange"
								:disabled="isEditing">
								<view class="picker-display">{{ currentTypeLabel }}</view>
							</picker>
						</view>
					</FormItem>
					<FormItem label="面团出缸温度 (°C)">
						<input class="input-field" type="number" v-model.number="form.targetTemp"
							placeholder="例如: 26" />
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
						<view class="picker-wrapper">
							<picker class="ingredient-picker" mode="selector" :range="availableIngredients"
								range-key="name" @change="onIngredientChange($event, ingIndex)">
								<view class="picker-display" :class="{ placeholder: !ing.id }">
									{{ getIngredientName(ing.id) }}
								</view>
							</picker>
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
	</view>
</template>

<script setup lang="ts">
	import { ref, computed, onMounted, reactive } from 'vue';
	import { onLoad, onUnload } from '@dcloudio/uni-app';
	import { createRecipe, createRecipeVersion } from '@/api/recipes';
	import { useDataStore } from '@/store/data';
	import { useToastStore } from '@/store/toast';
	import FormItem from '@/components/FormItem.vue';
	import AppButton from '@/components/AppButton.vue';
	import DetailHeader from '@/components/DetailHeader.vue';
	import DetailPageLayout from '@/components/DetailPageLayout.vue';
	import IconButton from '@/components/IconButton.vue';
	import { toDecimal } from '@/utils/format';

	defineOptions({
		inheritAttrs: false
	});

	const dataStore = useDataStore();
	const toastStore = useToastStore();
	const isSubmitting = ref(false);

	const isEditing = ref(false);
	const familyId = ref<string | null>(null);

	// [核心修改] 为 form 类型增加 targetTemp 字段
	const form = reactive({
		name: '',
		type: 'PRE_DOUGH' as 'PRE_DOUGH' | 'EXTRA',
		notes: '',
		targetTemp: undefined as number | undefined, // 初始化
		ingredients: [{ id: null as string | null, name: '', ratio: null as number | null }],
		procedure: [''],
	});

	const recipeTypes = ref([
		{ label: '面种', value: 'PRE_DOUGH' },
		{ label: '馅料/其他', value: 'EXTRA' },
	]);

	const currentTypeLabel = computed(() => {
		return recipeTypes.value.find(t => t.value === form.type)?.label || '请选择';
	});

	const availableIngredients = computed(() => dataStore.allIngredients);

	onLoad(async (options) => {
		if (!dataStore.dataLoaded.ingredients) {
			await dataStore.fetchIngredientsData();
		}

		if (options && options.familyId) {
			isEditing.value = true;
			familyId.value = options.familyId;

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


	const getIngredientName = (id : string | null) => {
		if (!id) return '请选择原料';
		const ingredient = availableIngredients.value.find(i => i.id === id);
		return ingredient?.name || '未知原料';
	};

	const onTypeChange = (e : any) => {
		form.type = recipeTypes.value[e.detail.value].value as 'PRE_DOUGH' | 'EXTRA';
	};

	const onIngredientChange = (e : any, ingIndex : number) => {
		const selected = availableIngredients.value[e.detail.value];
		form.ingredients[ingIndex].id = selected.id;
		form.ingredients[ingIndex].name = selected.name;
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
			// [核心修复] 创建一个Map以便快速查找原料的isFlour属性
			const allIngredientsMap = new Map(dataStore.allIngredients.map(i => [i.id, i]));

			// [核心修改] 在提交的数据中包含 targetTemp
			const payload = {
				name: form.name,
				type: form.type,
				notes: form.notes,
				targetTemp: form.targetTemp, // 新增
				ingredients: form.ingredients
					.filter(ing => ing.id && (ing.ratio !== null && ing.ratio > 0))
					.map(ing => {
						// 从Map中查找原料的完整信息
						const ingredientDetails = allIngredientsMap.get(ing.id!);
						return {
							ingredientId: ing.id,
							name: ing.name,
							ratio: toDecimal(ing.ratio),
							// [核心修复] 确保isFlour字段被正确地包含在提交的数据中
							isFlour: ingredientDetails ? ingredientDetails.isFlour : false,
						}
					}),
				procedure: form.procedure.filter(p => p && p.trim()),
				products: [],
			};

			// [核心修改] 移除调试日志
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

	.input-field[disabled] {
		background-color: #e9ecef;
		color: #6c757d;
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