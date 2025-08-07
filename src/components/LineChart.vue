<template>
	<view class="chart-container" id="chart-container">
		<!-- #ifdef H5 || APP-PLUS || MP-WEIXIN -->
		<!-- 确保在获取到容器宽度后再渲染 -->
		<svg v-if="chartData && chartData.length > 1 && chartWidth > 0" :viewBox="`0 0 ${chartWidth} ${height}`"
			xmlns="http://www.w3.org/2000/svg">
			<!-- 平滑成本曲线 -->
			<path class="line" :d="linePath" />

			<!-- 数据点 -->
			<g class="data-points">
				<circle v-for="(point, index) in points" :key="`point-${index}`" :cx="point.x" :cy="point.y" r="4">
				</circle>
			</g>

			<!-- 数据标签 (数值) -->
			<g class="data-labels">
				<!-- [核心修改] foreignObject 的宽度现在是动态的 -->
				<foreignObject v-for="(point, index) in points" :key="`label-${point.x}`"
					:x="getLabelXPosition(point, index)" :y="point.y - 25" :width="point.labelWidth" height="20">
					<view xmlns="http://www.w3.org/1999/xhtml" class="label-div">
						{{ point.label }}
					</view>
				</foreignObject>
			</g>
		</svg>
		<!-- #endif -->

		<!-- 当数据不足时显示提示 -->
		<view v-if="!chartData || chartData.length <= 1" class="chart-placeholder">
			需要至少两次记录才能生成曲线
		</view>
	</view>
</template>

<script setup lang="ts">
	import { ref, computed, onMounted, getCurrentInstance } from 'vue';

	const props = defineProps({
		chartData: {
			type: Array as () => { cost : number }[],
			default: () => [],
		},
		unitPrefix: {
			type: String,
			default: '¥',
		},
		unitSuffix: {
			type: String,
			default: '',
		},
	});

	const chartWidth = ref(0);
	const height = 180;
	const padding = { top: 30, right: 20, bottom: 20, left: 20 };

	onMounted(() => {
		const instance = getCurrentInstance();
		setTimeout(() => {
			const query = uni.createSelectorQuery().in(instance);
			query.select('#chart-container').boundingClientRect(data => {
				if (data && data.width) {
					chartWidth.value = data.width;
				}
			}).exec();
		}, 50);
	});

	const dataValues = computed(() => props.chartData.map(d => d.cost));
	const yMin = computed(() => Math.min(...dataValues.value));
	const yMax = computed(() => Math.max(...dataValues.value));

	const yRange = computed(() => {
		const range = yMax.value - yMin.value;
		if (range === 0) return { min: yMin.value > 0.01 ? yMin.value - 0.01 : 0, max: yMax.value + 0.01 };
		const buffer = range * 0.2;
		return { min: Math.max(0, yMin.value - buffer), max: yMax.value + buffer };
	});

	const xScale = computed(() => {
		const dataLength = props.chartData.length;
		if (dataLength <= 1) return () => 0;
		return (index : number) => padding.left + (index * (chartWidth.value - padding.left - padding.right)) / (
			dataLength - 1);
	});

	const yScale = computed(() => {
		const { min, max } = yRange.value;
		if (max - min === 0) return () => height / 2;
		return (value : number) => height - padding.bottom - ((value - min) * (height - padding.top - padding.bottom)) / (
			max - min);
	});

	// [核心修改] 动态计算每个标签的宽度
	const estimateLabelWidth = (text : string) => {
		// 基础宽度 + 每个字符大约8px
		return 10 + text.length * 8;
	};

	const points = computed(() => {
		return dataValues.value.map((value, index) => {
			const labelText = `${props.unitPrefix}${value.toFixed(2)}${props.unitSuffix}`;
			return {
				x: xScale.value(index),
				y: yScale.value(value),
				label: labelText,
				labelWidth: estimateLabelWidth(labelText)
			}
		});
	});

	const linePath = computed(() => {
		if (points.value.length < 2) return '';
		const path = points.value.map((p, i) => {
			if (i === 0) return `M ${p.x},${p.y}`;
			const prev = points.value[i - 1];
			const cp1x = prev.x + (p.x - prev.x) / 2;
			const cp1y = prev.y;
			const cp2x = prev.x + (p.x - prev.x) / 2;
			const cp2y = p.y;
			return `C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p.x},${p.y}`;
		});
		return path.join(' ');
	});

	const getLabelXPosition = (point : { x : number, labelWidth : number }, index : number) => {
		const centeredX = point.x - (point.labelWidth / 2);
		if (centeredX < 0) {
			return 0;
		}
		if (centeredX + point.labelWidth > chartWidth.value) {
			return chartWidth.value - point.labelWidth;
		}
		return centeredX;
	};
</script>

<style scoped>
	.chart-container {
		width: 100%;
		height: 180px;
		position: relative;
		background-color: #faf8f5;
		border-radius: 16px;
	}

	svg {
		width: 100%;
		height: 100%;
		overflow: visible;
	}

	.line {
		fill: none;
		stroke: var(--primary-color);
		stroke-width: 2;
	}

	.data-points circle {
		fill: var(--primary-color);
	}

	.label-div {
		font-size: 12px;
		font-weight: bold;
		color: var(--primary-color);
		text-align: center;
		width: 100%;
		height: 100%;
	}

	.chart-placeholder {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		border-radius: 16px;
		display: flex;
		justify-content: center;
		align-items: center;
		color: #ced4da;
		font-size: 14px;
	}
</style>