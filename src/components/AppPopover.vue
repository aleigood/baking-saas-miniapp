<template>
	<view v-if="visible" class="app-popover" :class="[`placement-${placement}`]"
		:style="{ top: finalTop + 'px', left: finalLeft + 'px', zIndex: zIndex }" @click.stop>
		<view class="popover-content" :style="{ maxWidth: maxWidth, minWidth: minWidth, padding: padding }">
			{{ content }}
		</view>
		<view class="popover-arrow"></view>
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
			offsetY ?: number; // Y轴额外偏移量
			offsetX ?: number; // X轴额外偏移量
			placement ?: 'top' | 'bottom' | 'left' | 'right'; // 浮框相对于目标的放置位置
			maxWidth ?: string; // 浮框最大宽度
			minWidth ?: string; // 浮框最小宽度
			padding ?: string; // 浮框内边距
			zIndex ?: number; // z-index值
		}>(), {
		offsetY: 10,
		offsetX: 10,
		placement: 'right', // [核心修改] 默认放置位置改为 'right'
		maxWidth: '200px',
		minWidth: 'unset',
		padding: '6px 10px',
		zIndex: 1000,
	}
	);

	const finalTop = computed(() => {
		if (!props.targetRect) return 0;
		const estimatedLineHeight = 18;
		const estimatedPadding = 12;
		const lines = props.content.length / 10;
		const popoverHeight = (lines * estimatedLineHeight) + estimatedPadding;
		const arrowHeight = 6;

		switch (props.placement) {
			case 'top':
				return props.targetRect.top - popoverHeight - arrowHeight - props.offsetY;
			case 'bottom':
				return props.targetRect.top + props.targetRect.height + arrowHeight + props.offsetY;
			case 'left':
			case 'right':
				// [核心修改] 左右布局时，箭头指向感叹号图标的垂直中间部分
				return props.targetRect.top + (props.targetRect.height / 2) - (popoverHeight / 2) + props.offsetY;
			default:
				return 0;
		}
	});

	const finalLeft = computed(() => {
		if (!props.targetRect) return 0;
		const popoverWidth = Math.min(parseInt(props.maxWidth), props.content.length * 12 + 20);
		const arrowWidth = 6;

		switch (props.placement) {
			case 'top':
			case 'bottom':
				return props.targetRect.left + (props.targetRect.width / 2) - (popoverWidth / 2);
			case 'left':
				return props.targetRect.left - popoverWidth - arrowWidth - props.offsetX;
			case 'right':
				return props.targetRect.left + props.targetRect.width + arrowWidth + props.offsetX;
			default:
				return 0;
		}
	});
</script>

<style scoped lang="scss">
	.app-popover {
		position: fixed;
		z-index: var(--popover-z-index, 1000);
		/* [核心新增] 动画效果 */
		animation: pop-in 0.3s cubic-bezier(0.22, 0.61, 0.36, 1);
		transform-origin: center center;
		/* 根据需要调整原点 */
	}

	.app-popover.fade-out {
		animation: pop-out 0.2s cubic-bezier(0.55, 0.085, 0.68, 0.53) forwards;
	}

	.popover-content {
		background-color: #faedcd;
		/* [核心修改] 背景色 */
		color: var(--primary-color);
		/* [核心修改] 文字颜色 */
		border-radius: 6px;
		font-size: 12px;
		line-height: 1.4;
		word-break: break-word;
		text-align: left;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.popover-arrow {
		position: absolute;
		width: 0;
		height: 0;
		border: 6px solid transparent;
	}

	.app-popover.placement-top .popover-arrow,
	.app-popover.placement-bottom .popover-arrow {
		left: 50%;
		transform: translateX(-50%);
	}

	.app-popover.placement-top .popover-arrow {
		border-top-color: #faedcd;
		/* [核心修改] 箭头颜色 */
		bottom: -12px;
	}

	.app-popover.placement-bottom .popover-arrow {
		border-bottom-color: #faedcd;
		/* [核心修改] 箭头颜色 */
		top: -12px;
	}

	.app-popover.placement-right .popover-arrow,
	.app-popover.placement-left .popover-arrow {
		top: 50%;
		/* [核心修改] Y轴位置调整，指向中心，如果需要更精确指向感叹号，可能需要进一步微调 offsetY */
		transform: translateY(-50%);
	}

	.app-popover.placement-right .popover-arrow {
		border-right-color: #faedcd;
		/* [核心修改] 箭头颜色 */
		left: -12px;
	}

	.app-popover.placement-left .popover-arrow {
		border-left-color: #faedcd;
		/* [核心修改] 箭头颜色 */
		right: -12px;
	}

	/* [核心新增] 冒泡动画 */
	@keyframes pop-in {
		from {
			opacity: 0;
			transform: scale(0.8);
		}

		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@keyframes pop-out {
		from {
			opacity: 1;
			transform: scale(1);
		}

		to {
			opacity: 0;
			transform: scale(0.8);
		}
	}
</style>