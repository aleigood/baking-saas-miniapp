<template>
	<view v-if="visible" class="app-popover" :style="{ top: finalTop + 'px', left: finalLeft + 'px', zIndex: zIndex }"
		@click.stop>
		<view class="popover-content" :style="{ maxWidth: maxWidth, minWidth: minWidth, padding: padding }">
			{{ content }}
		</view>
		<view class="popover-arrow" :style="{ 'border-top-color': arrowColor, left: arrowLeft + 'px' }"></view>
	</view>
</template>

<script setup lang="ts">
	import {
		computed
	} from 'vue';

	const props = withDefaults(
		defineProps<{
			visible : boolean;
			content : string;
			targetRect : {
				left : number;
				top : number;
				width : number;
				height : number;
			} | null;
			offsetY ?: number; // Y轴额外偏移量，默认为10px
			offsetX ?: number; // X轴额外偏移量，默认为0px
			placement ?: 'top' | 'bottom' | 'left' | 'right'; // 浮框相对于目标的放置位置
			maxWidth ?: string; // 浮框最大宽度
			minWidth ?: string; // 浮框最小宽度
			padding ?: string; // 浮框内边距
			zIndex ?: number; // z-index值
		}>(), {
		offsetY: 10,
		offsetX: 0,
		placement: 'top',
		maxWidth: '200px',
		minWidth: 'unset',
		padding: '6px 10px',
		zIndex: 1000,
	}
	);

	const arrowColor = 'var(--primary-color)'; // 使用主题色作为箭头颜色

	// 计算最终的浮框位置
	const finalTop = computed(() => {
		if (!props.targetRect) return 0;
		let top = props.targetRect.top;
		const popoverHeight = 36; // 估算浮框内容高度 + padding
		const arrowHeight = 8; // 箭头高度

		switch (props.placement) {
			case 'top':
				top = props.targetRect.top - popoverHeight - arrowHeight - props.offsetY;
				break;
			case 'bottom':
				top = props.targetRect.top + props.targetRect.height + arrowHeight + props.offsetY;
				break;
			// 目前只实现top和bottom，左右需要更多计算
			default:
				top = props.targetRect.top - popoverHeight - arrowHeight - props.offsetY;
		}
		return top;
	});

	const finalLeft = computed(() => {
		if (!props.targetRect) return 0;
		// 浮框默认宽度我们假设为120px，箭头的宽度为16px
		const popoverWidth = 120; // 这是一个估算值，可以根据实际内容调整或通过JS获取
		const targetCenterX = props.targetRect.left + props.targetRect.width / 2;
		// 让浮框的中心对齐目标的中心
		return targetCenterX - popoverWidth / 2 + props.offsetX;
	});

	// 计算箭头的定位
	const arrowLeft = computed(() => {
		if (!props.targetRect) return '50%';
		// 箭头相对浮框的中心位置
		return '50%';
	});
</script>

<style scoped lang="scss">
	.app-popover {
		position: fixed;
		/* 确保浮框在最顶层 */
		z-index: var(--popover-z-index, 1000);
		/* 默认z-index，可以通过props覆盖 */
	}

	.popover-content {
		background-color: var(--primary-color);
		color: white;
		border-radius: 6px;
		font-size: 12px;
		line-height: 1.4;
		word-break: break-word;
		text-align: center;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.popover-arrow {
		position: absolute;
		width: 0;
		height: 0;
		border-left: 8px solid transparent;
		border-right: 8px solid transparent;
		border-top: 8px solid var(--primary-color);
		/* 箭头颜色与浮框背景色一致 */
		bottom: -8px;
		/* 位于浮框下方 */
		left: 50%;
		transform: translateX(-50%);
	}
</style>