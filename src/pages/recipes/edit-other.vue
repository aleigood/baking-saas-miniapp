<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader title="新建其他配方" />
		<DetailPageLayout>
			<view class="page-content">
				<view class="card">
					<FormItem label="配方名称">
						<input class="input-field" v-model="form.name" placeholder="例如：波兰种 或 奶酥馅" />
					</FormItem>
					<FormItem label="配方类型">
						<picker mode="selector" :range="recipeTypes" range-key="label" @change="onTypeChange">
							<view class="picker-display">{{ currentTypeLabel }}</view>
						</picker>
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
						<IconButton variant="stepper" @click="removeIngredient(ingIndex)">
							<image class="remove-icon" src="/static/icons/close-x.svg" />
						</IconButton>
					</view>
					<AppButton type="dashed" full-width size="md" @click="addIngredient" class="add-button">+ 添加原料
					</AppButton>
				</view>

				<AppButton type="primary" full-width @click="handleSubmit" :loading="isSubmitting" class="save-button">
					{{ isSubmitting ? '' : '保存配方' }}
				</AppButton>
			</view>
		</DetailPageLayout>
	</view>
</template>

<script setup lang="ts">
	import { ref, computed, onMounted, reactive } from 'vue';
	import { createRecipe } from '@/api/recipes';
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

	const form = reactive({
		name: '',
		type: 'PRE_DOUGH' as 'PRE_DOUGH' | 'EXTRA',
		ingredients: [{ id: null as string | null, name: '', ratio: null as number | null }],
	});

	const recipeTypes = ref([
		{ label: '面种 (PRE_DOUGH)', value: 'PRE_DOUGH' },
		{ label: '馅料/其他 (EXTRA)', value: 'EXTRA' },
	]);

	const currentTypeLabel = computed(() => {
		return recipeTypes.value.find(t => t.value === form.type)?.label || '请选择';
	});

	const availableIngredients = computed(() => dataStore.ingredients);

	onMounted(async () => {
		if (!dataStore.dataLoaded.ingredients) {
			await dataStore.fetchIngredientsData();
		}
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

	const handleSubmit = async () => {
		isSubmitting.value = true;
		try {
			const payload = {
				name: form.name,
				type: form.type,
				// 其他配方只有一个 dough，结构比较简单
				ingredients: form.ingredients.map(ing => ({
					ingredientId: ing.id,
					ratio: toDecimal(ing.ratio),
				})),
				products: [], // 其他配方没有最终产品
			};

			await createRecipe(payload);
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

	/* 样式与主配方编辑页保持高度一致 */
	.page-wrapper {
		display: flex;
		flex-direction: column;
		height: 100vh;
	}

	.input-field,
	.picker-display {
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
		width: 12px;
		height: 12px;
	}

	.save-button {
		margin-top: 30px;
	}

	.add-button {
		margin-bottom: 20px;
		min-height: 46px;
	}
</style>