<template>
	<view class="calculator-container">
		<FormItem label="发酵类型">
			<picker mode="selector" :range="fermentationTypes" range-key="label" @change="onTypeChange">
				<view class="picker">{{ currentTypeLabel }}
					<view class="arrow-down"></view>
				</view>
			</picker>
		</FormItem>

		<FormItem :label="form.type === 'LEVAIN' ? '鲁邦种类型' : '酵母品牌'">
			<picker mode="selector" :range="availableBrands" range-key="label" @change="onBrandChange"
				:value="currentBrandIndex">
				<view class="picker" :class="{ placeholder: !form.brand }">
					{{ currentBrandLabel }}
					<view class="arrow-down"></view>
				</view>
			</picker>
		</FormItem>

		<FormItem label="发酵温度 (°C)">
			<picker mode="selector" :range="availableTemperatures" @change="onTemperatureChange"
				:value="currentTempIndex">
				<view class="picker" :class="{ placeholder: form.temperatureC === null }">
					{{ form.temperatureC !== null ? `${form.temperatureC} °C` : '请选择' }}
					<view class="arrow-down"></view>
				</view>
			</picker>
		</FormItem>

		<FormItem label="发酵时间 (小时)">
			<picker mode="selector" :range="availableTimes" @change="onTimeChange" :value="currentTimeIndex"
				:disabled="!form.temperatureC">
				<view class="picker" :class="{ placeholder: form.time === null, 'is-disabled': !form.temperatureC }">
					{{ form.time !== null ? `${form.time} 小时` : '请先选择温度' }}
					<view class="arrow-down"></view>
				</view>
			</picker>
		</FormItem>

		<view v-if="isLoading || result" class="result-card" :class="{ 'visible': result !== null || isLoading }">
			<view v-if="isLoading" class="loading-spinner">
				计算中...
			</view>
			<template v-else-if="result !== null">
				<view class="result-title">建议用量 (占总粉量)</view>
				<view class="result-value">{{ result }}</view>
			</template>
		</view>
	</view>
</template>

<script setup lang="ts">
	import { ref, reactive, watch, computed } from 'vue';
	import FormItem from '@/components/FormItem.vue';
	import { getAvailableTemperatures, getAvailableTimes, findAmount } from '@/api/fermentation';
	import type { FermentationType, YeastBrand } from '@/types/fermentation';
	import { useToastStore } from '@/store/toast';

	const toastStore = useToastStore();
	const isLoading = ref(false);

	const form = reactive({
		type: 'COMMERCIAL_YEAST' as FermentationType,
		brand: null as YeastBrand | null,
		temperatureC: null as number | null,
		time: null as number | null,
	});

	const result = ref<string | null>(null);

	// --- 选项数据 ---
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

	// --- 计算属性 ---

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


	// --- 方法 ---

	const resetSelection = (level : 'type' | 'brand' | 'temp') => {
		if (level === 'type') {
			form.brand = null;
			availableTemperatures.value = [];
		}
		if (level === 'type' || level === 'brand') {
			form.temperatureC = null;
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

	const calculateAmount = async () => {
		if (form.brand === null || form.temperatureC === null || form.time === null) {
			result.value = null;
			return;
		}
		isLoading.value = true;
		try {
			const amounts = await findAmount({
				type: form.type,
				brand: form.brand,
				temperatureC: form.temperatureC,
				time: form.time,
			});
			if (amounts && amounts.length > 0) {
				result.value = amounts.map(a => `${(a * 100).toFixed(2)}%`).join(' - ');
			} else {
				result.value = '无适用数据';
			}
		} catch (error) {
			toastStore.show({ message: '计算失败', type: 'error' });
			result.value = null;
		} finally {
			isLoading.value = false;
		}
	};

	// --- 事件处理器 ---

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

	// --- 侦听器 ---

	watch(() => form.type, (newType, oldType) => {
		if (newType !== oldType) {
			resetSelection('type');
			if (newType === 'LEVAIN') {
				form.brand = 'LEVAIN';
			}
			fetchTemperatures();
		}
	});

	watch([() => form.brand, () => form.temperatureC, () => form.time], () => {
		calculateAmount();
	}, { deep: true });

	// 初始化加载
	fetchTemperatures();
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';
	@include form-control-styles;

	.calculator-container {
		padding: 10px 5px;
	}

	.result-card {
		margin-top: 25px;
		padding: 20px;
		background-color: #faf8f5;
		border-radius: 15px;
		text-align: center;
		opacity: 0;
		transform: translateY(10px);
		transition: opacity 0.3s ease, transform 0.3s ease;
		min-height: 88px;

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
	}

	.loading-spinner {
		padding-top: 12px;
	}
</style>