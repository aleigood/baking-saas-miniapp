<template>
	<view class="pie-chart-wrapper">
		<svg v-if="chartData && chartData.length > 0" :viewBox="`0 0 ${size} ${size}`" class="pie-chart">
			<g :transform="`translate(${center}, ${center})`">
				<path v-for="(slice, index) in slices" :key="index" :d="slice.path" :fill="slice.color" />
			</g>
		</svg>
		<view v-if="chartData && chartData.length > 0" class="legend">
			<view v-for="(item, index) in chartData" :key="index" class="legend-item">
				<view class="legend-color" :style="{ backgroundColor: colors[index % colors.length] }"></view>
				<text class="legend-name">{{ item.name }}</text>
				<text class="legend-value">{{ ((item.value / total) * 100).toFixed(1) }}%</text>
			</view>
		</view>
		<view v-if="!chartData || chartData.length === 0" class="chart-placeholder">
			暂无成本构成数据
		</view>
	</view>
</template>

<script setup lang="ts">
	import { computed } from 'vue';

	const props = defineProps({
		chartData: {
			type: Array as () => { name : string, value : number }[],
			default: () => []
		},
		size: {
			type: Number,
			default: 180
		},
		holeSize: {
			type: Number,
			default: 0.5 // 內圆半径占总半径的比例
		}
	});

	const colors = ['#e57373', '#81c784', '#64b5f6', '#ffd54f', '#ba68c8', '#ff8a65', '#a1887f', '#90a4ae'];
	const center = computed(() => props.size / 2);
	const radius = computed(() => props.size / 2);
	const innerRadius = computed(() => radius.value * props.holeSize);

	const total = computed(() => {
		if (!props.chartData) return 0;
		return props.chartData.reduce((sum, item) => sum + item.value, 0);
	});

	const slices = computed(() => {
		if (!props.chartData || total.value === 0) return [];

		let startAngle = -90; // 从顶部开始

		return props.chartData.map((item, index) => {
			let angle = (item.value / total.value) * 360;
			// [核心修正] 防止角度为360度时SVG路径无法渲染
			if (angle >= 360) {
				angle = 359.999;
			}
			const endAngle = startAngle + angle;

			const x1 = center.value + radius.value * Math.cos(Math.PI * startAngle / 180);
			const y1 = center.value + radius.value * Math.sin(Math.PI * startAngle / 180);
			const x2 = center.value + radius.value * Math.cos(Math.PI * endAngle / 180);
			const y2 = center.value + radius.value * Math.sin(Math.PI * endAngle / 180);

			const ix1 = center.value + innerRadius.value * Math.cos(Math.PI * startAngle / 180);
			const iy1 = center.value + innerRadius.value * Math.sin(Math.PI * startAngle / 180);
			const ix2 = center.value + innerRadius.value * Math.cos(Math.PI * endAngle / 180);
			const iy2 = center.value + innerRadius.value * Math.sin(Math.PI * endAngle / 180);

			const largeArcFlag = angle > 180 ? 1 : 0;

			const path = `M ${ix1} ${iy1} L ${x1} ${y1} A ${radius.value} ${radius.value} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerRadius.value} ${innerRadius.value} 0 ${largeArcFlag} 0 ${ix1} ${iy1} Z`;

			startAngle = endAngle;

			return {
				path,
				color: colors[index % colors.length]
			};
		});
	});
</script>

<style scoped>
	.pie-chart-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 180px;
		background-color: #faf8f5;
		border-radius: 16px;
		padding: 10px;
		box-sizing: border-box;
	}

	.pie-chart {
		width: 160px;
		height: 160px;
		flex-shrink: 0;
	}

	.legend {
		flex-grow: 1;
		padding-left: 20px;
		height: 100%;
		overflow-y: auto;
	}

	.legend-item {
		display: flex;
		align-items: center;
		margin-bottom: 8px;
		font-size: 12px;
	}

	.legend-color {
		width: 12px;
		height: 12px;
		border-radius: 3px;
		margin-right: 8px;
		flex-shrink: 0;
	}

	.legend-name {
		color: #6c757d;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		flex-grow: 1;
	}

	.legend-value {
		color: #343a40;
		font-weight: 500;
		margin-left: 8px;
		flex-shrink: 0;
	}

	.chart-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		color: #ced4da;
		font-size: 14px;
	}
</style>