<template>
	<view class="chart-container">
		<view v-if="!chartData || chartData.length === 0" class="chart-placeholder">
			暂无成本构成数据
		</view>
		<canvas v-else type="2d" :id="canvasId" :canvas-id="canvasId" class="chart-canvas"></canvas>
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
	// [核心修改] ctx 类型变更为 CanvasRenderingContext2D
	let ctx : CanvasRenderingContext2D | null = null;
	let canvasWidth = 0;
	let canvasHeight = 0;

	watch(() => props.chartData, () => {
		// [核心修改] 确保 canvas 和 context 都已初始化
		if (ctx && canvas) {
			drawChart();
		}
	}, { deep: true });

	onMounted(() => {
		// 延迟初始化以确保 canvas 元素已渲染
		setTimeout(initChart, 150);
	});

	// [核心修改] canvas 节点引用
	let canvas : any = null;

	// 初始化 Canvas
	const initChart = () => {
		nextTick(() => {
			const query = uni.createSelectorQuery().in(instance);
			query.select(`#${canvasId}`)
				.fields({ node: true, size: true }) // [核心修改] 获取 node 节点
				.exec((res) => {
					if (res && res[0] && res[0].node) {
						canvas = res[0].node;
						ctx = canvas.getContext('2d');

						// [核心修改] 使用条件编译，仅在小程序端进行高分屏适配
						// #ifdef MP-WEIXIN
						const dpr = uni.getWindowInfo().pixelRatio;
						canvas.width = res[0].width * dpr;
						canvas.height = res[0].height * dpr;
						ctx!.scale(dpr, dpr);
						// #endif

						// [核心修改] 在非小程序端，直接使用CSS尺寸作为绘图尺寸
						// #ifndef MP-WEIXIN
						canvas.width = res[0].width;
						canvas.height = res[0].height;
						// #endif

						canvasWidth = res[0].width;
						canvasHeight = res[0].height;
						drawChart();
					}
				});
		});
	};

	/**
	 * @description [新增] 标签对象类型定义
	 */
	interface Label {
		text : string;
		x : number;
		y : number;
		width : number;
		height : number;
		lineStartX : number;
		lineStartY : number;
		color : string;
		textAlign : 'left' | 'right';
	}

	/**
	 * @description [新增] 解决标签重叠的核心算法
	 * @param {Label[]} labels - 需要处理的标签数组 (已按 y 坐标排序)
	 */
	const resolveLabelOverlaps = (labels : Label[]) => {
		const spacing = 5; // 标签间的最小垂直间距
		// 进行多次迭代，以确保标签位置收敛到一个稳定状态
		for (let i = 0; i < 10; i++) {
			let overlaps = false;
			for (let j = 0; j < labels.length; j++) {
				for (let k = j + 1; k < labels.length; k++) {
					const label1 = labels[j];
					const label2 = labels[k];

					// 检查垂直方向上的重叠
					if (label1.y < label2.y + label2.height + spacing && label1.y + label1.height + spacing > label2.y) {
						overlaps = true;
						// 计算重叠量
						const overlapAmount = (label1.y + label1.height + spacing) - label2.y;
						// 将两个标签沿垂直方向推开，各移动重叠量的一半
						label1.y -= overlapAmount / 2;
						label2.y += overlapAmount / 2;
					}
				}
			}
			// 如果单次迭代中没有发现任何重叠，说明布局已经稳定，可以提前退出
			if (!overlaps) break;
		}
	};


	// 绘制图表的核心函数
	const drawChart = () => {
		if (!ctx || !props.chartData || props.chartData.length === 0) {
			return;
		}

		ctx.clearRect(0, 0, canvasWidth, canvasHeight);

		const colors = [
			'#8c5a3b', '#d4a373', '#a98467', '#c2956f',
			'#e6b89c', '#7b4f32', '#b38a68', '#d9ae94'
		];

		const displayData = props.chartData;

		const total = displayData.reduce((sum, d) => sum + d.value, 0);
		if (total === 0) return;

		const centerX = canvasWidth / 2;
		const centerY = canvasHeight / 2;
		const radius = Math.min(canvasWidth, canvasHeight) / 2 * 0.65;
		const innerRadius = radius * 0.5;
		const labelOffset = 15; // 引导线拐点到标签文字的水平距离
		const lineHeight = 14; // 标签文字的估算高度

		let startAngle = -0.5 * Math.PI;

		const leftLabels : Label[] = [];
		const rightLabels : Label[] = [];

		// =================================================================
		// [重构] 第一阶段：绘制饼图本身，并计算所有标签的初始信息
		// =================================================================
		displayData.forEach((item, index) => {
			const sliceAngle = (item.value / total) * 2 * Math.PI;
			if (sliceAngle === 0) return;

			const endAngle = startAngle + sliceAngle;
			const midAngle = startAngle + sliceAngle / 2;

			// 绘制饼图扇区
			ctx!.beginPath();
			ctx!.arc(centerX, centerY, radius, startAngle, endAngle);
			ctx!.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
			ctx!.closePath();
			ctx!.fillStyle = colors[index % colors.length];
			ctx!.fill();

			startAngle = endAngle;

			// 计算标签文本和尺寸
			const percentage = ((item.value / total) * 100).toFixed(1);
			const text = `${item.name} ${percentage}%`;
			ctx!.font = '12px sans-serif';
			const textWidth = ctx!.measureText(text).width;

			// 计算引导线起点 (在饼图外环上)
			const lineStartX = centerX + Math.cos(midAngle) * (radius + 2);
			const lineStartY = centerY + Math.sin(midAngle) * (radius + 2);

			// 判断标签在左侧还是右侧
			const isRightSide = midAngle > -0.5 * Math.PI && midAngle < 0.5 * Math.PI;

			// 计算标签的初始 x, y 位置
			const labelX = isRightSide ? centerX + radius + labelOffset : centerX - radius - labelOffset;

			// 将标签信息存入对应数组
			const label : Label = {
				text,
				x: labelX,
				y: lineStartY,
				width: textWidth,
				height: lineHeight,
				lineStartX,
				lineStartY,
				color: colors[index % colors.length],
				textAlign: isRightSide ? 'left' : 'right',
			};

			if (isRightSide) {
				rightLabels.push(label);
			} else {
				leftLabels.push(label);
			}
		});

		// =================================================================
		// [重构] 第二阶段：处理标签重叠
		// =================================================================
		// 分别对左右两侧的标签进行排序和重叠处理
		leftLabels.sort((a, b) => a.y - b.y);
		rightLabels.sort((a, b) => a.y - b.y);

		resolveLabelOverlaps(leftLabels);
		resolveLabelOverlaps(rightLabels);

		// =================================================================
		// [重构] 第三阶段：绘制所有标签和引导线
		// =================================================================
		const allLabels = [...leftLabels, ...rightLabels];
		allLabels.forEach(label => {
			// 绘制引导线
			ctx!.beginPath();
			ctx!.moveTo(label.lineStartX, label.lineStartY);
			// 引导线终点 x 坐标根据左右位置调整
			const lineEndX = label.textAlign === 'right' ? label.x - 2 : label.x + 2;
			ctx!.lineTo(lineEndX, label.y);
			ctx!.strokeStyle = label.color;
			ctx!.stroke();

			// 绘制标签文本
			ctx!.fillStyle = label.color;
			ctx!.font = '12px sans-serif';
			ctx!.textAlign = label.textAlign;
			ctx!.textBaseline = 'middle';
			ctx!.fillText(label.text, label.x, label.y);
		});
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