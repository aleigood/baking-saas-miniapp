<template>
	<view class="chart-container" id="chart-container">
		<!-- #ifdef H5 || APP-PLUS || MP-WEIXIN -->
		<!-- 确保在获取到容器宽度后再渲染 -->
		<svg v-if="chartData && chartData.length > 0 && chartWidth > 0" :viewBox="`0 0 ${chartWidth} ${height}`"
			xmlns="http://www.w3.org/2000/svg">
			<g :transform="`translate(${chartWidth / 2}, ${height / 2})`">
				<!-- 绘制环图的各个扇区 -->
				<path v-for="(slice, index) in slices" :key="index" :d="slice.path" :fill="slice.color" />

				<!-- 绘制标签和引线 -->
				<g v-for="(slice, index) in slices" :key="`label-${index}`">
					<polyline :points="slice.linePoints" fill="none" :stroke="slice.color" stroke-width="1" />
					<!-- [核心修正] 使用 foreignObject 包装 view 来渲染文本，以解决小程序SVG文本渲染问题 -->
					<foreignObject :x="slice.labelBox.x" :y="slice.labelBox.y" :width="slice.labelBox.width"
						:height="slice.labelBox.height">
						<view xmlns="http://www.w3.org/1999/xhtml" class="label-div"
							:style="{ color: slice.color, textAlign: slice.textAnchor === 'start' ? 'left' : 'right' }">
							{{ slice.name }} ({{ slice.percentage }}%)
						</view>
					</foreignObject>
				</g>
			</g>
		</svg>
		<!-- #endif -->

		<!-- 当数据为空时显示提示 -->
		<view v-if="!chartData || chartData.length === 0" class="chart-placeholder">
			暂无成本构成数据
		</view>
	</view>
</template>

<script setup lang="ts">
	import { ref, computed, onMounted, getCurrentInstance } from 'vue';

	// 定义组件接收的属性
	const props = defineProps({
		// [核心修正] chartData 期望的格式是 [{ name: string, value: number }]
		chartData: {
			type: Array as () => { name : string, value : number }[],
			default: () => [],
		},
	});

	const chartWidth = ref(0);
	const height = 180;
	const radius = computed(() => Math.min(chartWidth.value, height) / 2 * 0.6);
	const innerRadius = computed(() => radius.value * 0.5); // 环图的内半径

	// 预定义的颜色列表
	const colors = [
		'#8c5a3b', '#d4a373', '#a98467', '#c2956f',
		'#e6b89c', '#7b4f32', '#b38a68', '#d9ae94'
	];

	// 在组件挂载后获取容器宽度
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

	// 计算每个数据项的角度、路径等SVG属性
	const slices = computed(() => {
		if (!props.chartData || props.chartData.length === 0) return [];

		const total = props.chartData.reduce((sum, d) => sum + d.value, 0);
		if (total === 0) return [];

		let startAngle = -Math.PI / 2;

		return props.chartData.map((d, i) => {
			const percentage = ((d.value / total) * 100).toFixed(1);
			const angle = (d.value / total) * 2 * Math.PI;
			let endAngle = startAngle + angle;

			// [核心修正] 避免SVG绘制360度弧的问题
			if (Math.abs(angle - 2 * Math.PI) < 1e-9) {
				endAngle -= 0.0001;
			}

			const largeArcFlag = angle > Math.PI ? 1 : 0;

			const x1 = Math.cos(startAngle) * radius.value;
			const y1 = Math.sin(startAngle) * radius.value;
			const x2 = Math.cos(endAngle) * radius.value;
			const y2 = Math.sin(endAngle) * radius.value;

			const ix1 = Math.cos(startAngle) * innerRadius.value;
			const iy1 = Math.sin(startAngle) * innerRadius.value;
			const ix2 = Math.cos(endAngle) * innerRadius.value;
			const iy2 = Math.sin(endAngle) * innerRadius.value;

			const path = `M ${ix1} ${iy1} L ${x1} ${y1} A ${radius.value} ${radius.value} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerRadius.value} ${innerRadius.value} 0 ${largeArcFlag} 0 ${ix1} ${iy1} Z`;

			// 计算标签引线和文本位置
			const midAngle = startAngle + angle / 2;
			const labelRadius = radius.value * 1.2;
			const lineStartX = Math.cos(midAngle) * (radius.value + 5);
			const lineStartY = Math.sin(midAngle) * (radius.value + 5);
			const lineEndX = Math.cos(midAngle) * labelRadius;
			const lineEndY = Math.sin(midAngle) * labelRadius;
			const textAnchor = midAngle > -Math.PI / 2 && midAngle < Math.PI / 2 ? 'start' : 'end';

			// [新增] 计算 foreignObject 的属性
			const labelText = `${d.name} (${percentage}%)`;
			const labelWidth = labelText.length * 7 + 10;
			const labelHeight = 20;
			const labelBox = {
				width: labelWidth,
				height: labelHeight,
				x: textAnchor === 'start' ? lineEndX + 5 : lineEndX - 5 - labelWidth,
				y: lineEndY - (labelHeight / 2)
			};

			const sliceData = {
				...d,
				path,
				percentage,
				color: colors[i % colors.length],
				linePoints: `${lineStartX},${lineStartY} ${lineEndX},${lineEndY}`,
				textAnchor,
				labelBox,
			};

			startAngle = endAngle;
			return sliceData;
		});
	});
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

	/* [新增] 标签文本样式 */
	.label-div {
		font-size: 12px;
		font-weight: 500;
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