<template>
	<view class="calculator-container">
		<view class="form-container">
			<view class="form-item">
				<view class="form-label">计算对象</view>
				<picker mode="selector" :range="calculationTargets" range-key="name" @change="onPreDoughChange"
					:value="currentPreDoughIndex">
					<view class="picker" :class="{ placeholder: !selectedPreDough }">
						{{ selectedPreDough?.name || '通用比例计算' }}
						<view class="arrow-down"></view>
					</view>
				</picker>
			</view>

			<view class="form-item">
				<view class="form-label">发酵剂类型</view>
				<picker mode="selector" :range="fermentationTypes" range-key="label" @change="onTypeChange">
					<view class="picker">{{ currentTypeLabel }}
						<view class="arrow-down"></view>
					</view>
				</picker>
			</view>

			<view class="form-item">
				<view class="form-label">{{ form.type === 'LEVAIN' ? '鲁邦种类型' : '酵母类型' }}</view>
				<picker mode="selector" :range="availableBrands" range-key="label" @change="onBrandChange"
					:value="currentBrandIndex">
					<view class="picker" :class="{ placeholder: !form.brand }">
						{{ currentBrandLabel }}
						<view class="arrow-down"></view>
					</view>
				</picker>
			</view>

			<view class="form-item">
				<view class="form-label">发酵温度 (°C)</view>
				<picker mode="selector" :range="availableTemperatures" @change="onTemperatureChange"
					:value="currentTempIndex">
					<view class="picker" :class="{ placeholder: form.temperatureC === null }">
						{{ form.temperatureC !== null ? `${form.temperatureC} °C` : '请选择' }}
						<view class="arrow-down"></view>
					</view>
				</picker>
			</view>

			<view class="form-item">
				<view class="form-label">发酵时间 (小时)</view>
				<picker mode="selector" :range="availableTimes" @change="onTimeChange" :value="currentTimeIndex"
					:disabled="!form.temperatureC">
					<view class="picker"
						:class="{ placeholder: form.time === null, 'is-disabled': !form.temperatureC }">
						{{ form.time !== null ? `${form.time} 小时` : '请先选择温度' }}
						<view class="arrow-down"></view>
					</view>
				</picker>
			</view>
		</view>
		<view v-if="result !== null || isLoading" class="result-card"
			:class="{ 'visible': result !== null || isLoading }">
			<view class="result-title">{{ flourWeightInGrams > 0 ? '建议用量 (克)' : '建议用量 (占总粉量)' }}</view>

			<view v-if="isLoading" class="result-value is-loading">
				计算中...
			</view>
			<view v-else class="result-value">
				{{ result }}
			</view>
		</view>
		<view class="modal-actions">
			<AppButton type="secondary" @click="$emit('close')">返回</AppButton>
			<AppButton type="primary" @click="handleCalculate" :disabled="!isFormValid" :loading="isLoading">
				{{ isLoading ? '' : '计算' }}
			</AppButton>
		</view>


	</view>
</template>

<script setup lang="ts">
	import { ref, reactive, watch, computed } from 'vue';
	import AppButton from '@/components/AppButton.vue';
	import { getAvailableTemperatures, getAvailableTimes, findAmount } from '@/api/fermentation';
	import type { FermentationType, YeastBrand } from '@/types/fermentation';
	import type { CalculatedRecipeDetails } from '@/types/api';
	import { formatWeight, multiply } from '@/utils/format';
	import { useToastStore } from '@/store/toast';

	const props = defineProps<{
		preDoughs ?: CalculatedRecipeDetails[];
	}>();

	const emit = defineEmits(['close']);

	const toastStore = useToastStore();
	const isLoading = ref(false);

	const form = reactive({
		type: 'COMMERCIAL_YEAST' as FermentationType,
		brand: null as YeastBrand | null,
		temperatureC: null as number | null,
		time: null as number | null,
	});

	const result = ref<string | null>(null);
	const selectedPreDough = ref<CalculatedRecipeDetails | null>(null);
	const flourWeightInGrams = ref(0); // 新增 ref 用于存储面粉重量

	// [核心重构] 创建一个新的计算属性用于 picker
	const calculationTargets = computed(() => {
		const generalOption = { id: 'general', name: '通用比例计算' };
		if (props.preDoughs && props.preDoughs.length > 0) {
			return [...props.preDoughs, generalOption];
		}
		return [generalOption];
	});

	const currentPreDoughIndex = computed(() => {
		const targetId = selectedPreDough.value?.id || 'general';
		const index = calculationTargets.value.findIndex(p => p.id === targetId);
		return index === -1 ? 0 : index;
	});


	const availableTemperatures = ref<number[]>([]);
	const availableTimes = ref<number[]>([]);

	const fermentationTypes = [
		{ label: '商业酵母', value: 'COMMERCIAL_YEAST' },
		{ label: '鲁邦种 (液种)', value: 'LEVAIN' },
	];

	const yeastBrands = [
		{ label: '即发干酵母', value: 'INSTANT_DRY' },
		{ label: '活性干酵母', value: 'ACTIVE_DRY' },
		{ label: '鲜酵母', value: 'FRESH' },
		{ label: '半干酵母', value: 'SEMI_DRY' },
	];

	const levainBrands = [
		{ label: '鲁邦种', value: 'LEVAIN' },
	];

	const availableBrands = computed(() => {
		return form.type === 'LEVAIN' ? levainBrands : yeastBrands;
	});

	const currentTypeLabel = computed(() => {
		return fermentationTypes.find(t => t.value === form.type)?.label || '请选择';
	});

	const currentBrandLabel = computed(() => {
		return availableBrands.value.find(b => b.value === form.brand)?.label || '请选择';
	});

	const currentBrandIndex = computed(() => {
		const index = availableBrands.value.findIndex(b => b.value === form.brand);
		return index === -1 ? 0 : index;
	});

	const currentTempIndex = computed(() => {
		const index = availableTemperatures.value.findIndex(t => t === form.temperatureC);
		return index === -1 ? 0 : index;
	});

	const currentTimeIndex = computed(() => {
		const index = availableTimes.value.findIndex(t => t === form.time);
		return index === -1 ? 0 : index;
	});

	const isFormValid = computed(() => {
		return form.brand !== null && form.temperatureC !== null && form.time !== null;
	});

	const resetSelection = (level : 'type' | 'temp') => {
		if (level === 'type') {
			form.brand = null;
			form.temperatureC = null;
			availableTemperatures.value = [];
		}
		form.time = null;
		availableTimes.value = [];
		result.value = null;
	};

	const fetchTemperatures = async () => {
		try {
			availableTemperatures.value = await getAvailableTemperatures(form.type);
		} catch (error) {
			toastStore.show({ message: '获取温度列表失败', type: 'error' });
		}
	};

	const fetchTimes = async () => {
		if (form.temperatureC === null) return;
		try {
			availableTimes.value = await getAvailableTimes(form.type, form.temperatureC);
		} catch (error) {
			toastStore.show({ message: '获取时间列表失败', type: 'error' });
		}
	};

	const handleCalculate = async () => {
		if (!isFormValid.value) {
			toastStore.show({ message: '请将所有选项填写完整', type: 'info' });
			return;
		}
		isLoading.value = true;
		try {
			const amounts = await findAmount({
				type: form.type,
				brand: form.brand!,
				temperatureC: form.temperatureC!,
				time: form.time!,
			});

			if (amounts && amounts.length > 0) {
				if (flourWeightInGrams.value > 0) {
					const resultsInGrams = amounts.map(a => multiply(flourWeightInGrams.value, a));
					result.value = resultsInGrams.map(g => formatWeight(g)).join(' - ');
				} else {
					result.value = amounts.map(a => `${(a * 100).toFixed(2)}%`).join(' - ');
				}
			} else {
				result.value = '无适用数据';
			}
		} catch (error) {
			toastStore.show({ message: '计算失败', type: 'error' });
			result.value = '计算出错';
		} finally {
			isLoading.value = false;
		}
	};

	// [核心重构] 当选择计算对象时，更新内部状态
	const onPreDoughChange = (e : any) => {
		const selected = calculationTargets.value[e.detail.value];
		if (selected.id === 'general') {
			selectedPreDough.value = null;
			flourWeightInGrams.value = 0;
		} else {
			// @ts-ignore
			selectedPreDough.value = selected as CalculatedRecipeDetails;
			flourWeightInGrams.value = selectedPreDough.value.ingredients
				.filter(ing => ing.name.includes('粉'))
				.reduce((sum, ing) => sum + ing.weightInGrams, 0);
		}
		result.value = null; // 切换对象时清空结果
	};

	const onTypeChange = (e : any) => {
		const selectedType = fermentationTypes[e.detail.value].value as FermentationType;
		if (form.type !== selectedType) {
			form.type = selectedType;
			resetSelection('type');
			if (form.type === 'LEVAIN') {
				form.brand = 'LEVAIN';
			}
			fetchTemperatures();
		}
	};

	const onBrandChange = (e : any) => {
		form.brand = availableBrands.value[e.detail.value].value as YeastBrand;
	};

	const onTemperatureChange = (e : any) => {
		const selectedTemp = availableTemperatures.value[e.detail.value];
		if (form.temperatureC !== selectedTemp) {
			form.temperatureC = selectedTemp;
			resetSelection('temp');
			fetchTimes();
		}
	};

	const onTimeChange = (e : any) => {
		form.time = availableTimes.value[e.detail.value];
	};

	fetchTemperatures();
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';
	@include form-control-styles;

	.calculator-container {
		padding: 0px 10px;
	}

	.form-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 0;
		border-bottom: 1px solid var(--border-color-light, #f0f0f0);
	}

	.form-container .form-item:last-of-type {
		border-bottom: none;
	}

	.form-label {
		font-size: 16px;
		color: var(--text-primary);
		white-space: nowrap;
		margin-right: 15px;
	}

	.picker {
		text-align: right;
	}

	.modal-actions {
		margin-top: 30px;
	}

	.result-card {
		padding: 20px;
		margin-top: 10px;
		background-color: #faf8f5;
		border-radius: 15px;
		text-align: center;
		opacity: 0;
		transform: translateY(10px);
		transition: opacity 0.3s ease, transform 0.3s ease;
		min-height: 68px;
		display: flex;
		flex-direction: column;
		justify-content: center;

		&.visible {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.result-title {
		font-size: 14px;
		color: var(--text-secondary);
		margin-bottom: 8px;
	}

	.result-value {
		font-size: 24px;
		font-weight: bold;
		color: var(--primary-color);

		&.is-loading {
			font-size: 18px;
			font-weight: 400;
			color: var(--text-secondary);
		}
	}
</style>