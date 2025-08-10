<template>
	<view class="chart-container">
		<view v-if="!chartData || chartData.length === 0" class="chart-placeholder">
			暂无成本构成数据
		</view>
		<!-- [核心修正] 移除 type="2d" 属性，使用旧版 Canvas API -->
		<canvas v-else :id="canvasId" :canvas-id="canvasId" class="chart-canvas"></canvas>
	</view>
</template>

<script setup lang="ts">
	import { ref, onMounted, watch, nextTick, getCurrentInstance } from 'vue';

	const props = defineProps({
		chartData: {
			type: Array as () => { name : string, value : number }[],
			default: () => [],
		},
	});

	const instance = getCurrentInstance();
	const canvasId = `pie-chart-${Date.now()}-${Math.random().toString().slice(2)}`;
	let ctx : UniApp.CanvasContext | null = null;
	let canvasWidth = 0;
	let canvasHeight = 0;

	// 监听数据变化，重新绘制图表
	watch(() => props.chartData, () => {
		if (ctx) {
			drawChart();
		}
	}, { deep: true });

	onMounted(() => {
		initChart();
	});

	// 初始化 Canvas
	const initChart = () => {
		nextTick(() => {
			// [核心修正] 使用 uni.createCanvasContext 获取绘图上下文
			ctx = uni.createCanvasContext(canvasId, instance);

			const query = uni.createSelectorQuery().in(instance);
			query.select(`#${canvasId}`)
				.boundingClientRect((res) => {
					if (res) {
						canvasWidth = res.width as number;
						canvasHeight = res.height as number;
						drawChart();
					}
				}).exec();
		});
	};

	// 绘制图表的核心函数
	const drawChart = () => {
		if (!ctx || !props.chartData || props.chartData.length === 0) {
			return;
		}

		// 清空画布
		ctx.clearRect(0, 0, canvasWidth, canvasHeight);

		const colors = [
			'#8c5a3b', '#d4a373', '#a98467', '#c2956f',
			'#e6b89c', '#7b4f32', '#b38a68', '#d9ae94'
		];

		// [核心新增] 数据处理逻辑：排序、取前5、合并“其他”
		const sortedData = [...props.chartData].sort((a, b) => b.value - a.value);
		let displayData = sortedData;
		if (sortedData.length > 5) {
			const top5 = sortedData.slice(0, 5);
			const otherValue = sortedData.slice(5).reduce((sum, item) => sum + item.value, 0);
			if (otherValue > 0) {
				displayData = [...top5, { name: '其他', value: otherValue }];
			} else {
				displayData = top5;
			}
		}

		const total = displayData.reduce((sum, d) => sum + d.value, 0);
		if (total === 0) return;

		// 图表参数
		const centerX = canvasWidth / 2;
		const centerY = canvasHeight / 2;
		const radius = Math.min(canvasWidth, canvasHeight) / 2 * 0.65;
		const innerRadius = radius * 0.5;

		let startAngle = -0.5 * Math.PI;

		// 绘制环形图扇区和标签
		displayData.forEach((item, index) => {
			const sliceAngle = (item.value / total) * 2 * Math.PI;
			const endAngle = startAngle + sliceAngle;

			// 绘制扇区
			ctx!.beginPath();
			ctx!.arc(centerX, centerY, radius, startAngle, endAngle);
			ctx!.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
			ctx!.closePath();
			ctx!.setFillStyle(colors[index % colors.length]);
			ctx!.fill();

			// [核心重构] 绘制引线和文本标签
			const midAngle = startAngle + sliceAngle / 2;
			const isRightSide = midAngle > -0.5 * Math.PI && midAngle < 0.5 * Math.PI;

			const lineStartX = centerX + Math.cos(midAngle) * radius;
			const lineStartY = centerY + Math.sin(midAngle) * radius;
			const lineEndX = centerX + Math.cos(midAngle) * (radius + 10);
			const lineEndY = centerY + Math.sin(midAngle) * (radius + 10);
			const textStartX = lineEndX + (isRightSide ? 5 : -5);

			ctx!.beginPath();
			ctx!.moveTo(lineStartX, lineStartY);
			ctx!.lineTo(lineEndX, lineEndY);
			ctx!.lineTo(textStartX, lineEndY);
			ctx!.setStrokeStyle(colors[index % colors.length]);
			ctx!.stroke();

			const percentage = ((item.value / total) * 100).toFixed(1);
			const text = `${item.name} ${percentage}%`;
			// [核心优化] 文本颜色与引线、扇区颜色保持一致
			ctx!.setFillStyle(colors[index % colors.length]);
			ctx!.setFontSize(12);
			ctx!.setTextAlign(isRightSide ? 'left' : 'right');
			ctx!.setTextBaseline('middle');
			ctx!.fillText(text, textStartX, lineEndY);

			startAngle = endAngle;
		});

		// [核心修正] 调用 draw() 方法将所有绘制操作渲染到 canvas 上
		ctx.draw();
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

	.chart-canvas {
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