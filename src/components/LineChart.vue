<template>
	<view class="chart-container">
		<view v-if="!chartData || chartData.length <= 1" class="chart-placeholder">
			需要至少两次记录才能生成曲线
		</view>
		<!-- [核心修正] 移除 type="2d" 属性，使用旧版 Canvas API -->
		<canvas v-else :id="canvasId" :canvas-id="canvasId" class="chart-canvas"></canvas>
	</view>
</template>

<script setup lang="ts">
	import { ref, onMounted, watch, nextTick, getCurrentInstance } from 'vue';

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

	const instance = getCurrentInstance();
	const canvasId = `line-chart-${Date.now()}-${Math.random().toString().slice(2)}`;
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
		if (!ctx || !props.chartData || props.chartData.length <= 1) {
			return;
		}

		ctx.clearRect(0, 0, canvasWidth, canvasHeight);

		const padding = { top: 30, right: 20, bottom: 20, left: 20 };
		const data = props.chartData.map(d => d.cost);
		const yMin = Math.min(...data);
		const yMax = Math.max(...data);

		const range = yMax - yMin;
		const yRange = {
			min: Math.max(0, yMin - range * 0.2),
			max: yMax + range * 0.2,
		};
		if (yRange.max === yRange.min) {
			yRange.max += 1;
		}

		const points = data.map((value, index) => {
			const x = padding.left + (index / (data.length - 1)) * (canvasWidth - padding.left - padding.right);
			const y = canvasHeight - padding.bottom - ((value - yRange.min) / (yRange.max - yRange.min)) * (canvasHeight - padding.top - padding.bottom);
			return { x, y, value };
		});

		// [核心重构] 采用基于中点的二次贝塞尔曲线算法，确保曲线穿过所有点
		const drawSmoothPath = (isFill : boolean) => {
			ctx!.beginPath();
			ctx!.moveTo(points[0].x, isFill ? canvasHeight - padding.bottom : points[0].y);
			if (isFill) {
				ctx!.lineTo(points[0].x, points[0].y);
			}

			// 遍历所有点来绘制平滑曲线
			for (let i = 0; i < points.length - 1; i++) {
				const p1 = points[i];
				const p2 = points[i + 1];
				// 计算两个数据点之间的中点
				const midPoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
				// 从上一个点，以当前点为控制点，绘制到中点
				ctx!.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
			}
			// 绘制最后一个线段，确保曲线到达终点
			ctx!.lineTo(points[points.length - 1].x, points[points.length - 1].y);

			if (isFill) {
				ctx!.lineTo(points[points.length - 1].x, canvasHeight - padding.bottom);
				ctx!.closePath();
				const gradient = ctx!.createLinearGradient(0, 0, 0, canvasHeight);
				gradient.addColorStop(0, 'rgba(140, 90, 59, 0.3)');
				gradient.addColorStop(1, 'rgba(140, 90, 59, 0)');
				ctx!.setFillStyle(gradient);
				ctx!.fill();
			} else {
				ctx!.setStrokeStyle('#8c5a3b');
				ctx!.setLineWidth(2);
				ctx!.stroke();
			}
		}

		// 绘制区域填充
		drawSmoothPath(true);
		// 绘制曲线
		drawSmoothPath(false);

		// 绘制数据点和文本
		points.forEach(p => {
			ctx!.beginPath();
			ctx!.arc(p.x, p.y, 4, 0, 2 * Math.PI);
			ctx!.setFillStyle('#8c5a3b');
			ctx!.fill();

			const text = `${props.unitPrefix}${p.value.toFixed(1)}${props.unitSuffix}`;
			ctx!.setFontSize(12);
			ctx!.setFillStyle('#8c5a3b');
			ctx!.setTextAlign('center');
			ctx!.fillText(text, p.x, p.y - 10);
		});

		ctx!.draw();
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