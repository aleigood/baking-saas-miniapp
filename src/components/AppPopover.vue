<template>
	<view
		v-if="isPopoverVisible"
		class="app-popover"
		:class="[`placement-${placement}`, { 'fade-out': isFadingOut }]"
		:style="{ top: finalTop + 'px', left: finalLeft + 'px', zIndex: zIndex }"
		@click.stop
	>
		<view class="popover-wrapper">
			<view class="popover-content" :style="{ maxWidth: maxWidth, minWidth: minWidth, padding: padding }">
				<view v-for="(line, index) in lines" :key="index" class="popover-line">
					<view v-if="lines.length > 1" class="bullet"></view>
					<text class="line-text">{{ line }}</text>
				</view>
			</view>
			<view class="popover-arrow"></view>
		</view>
	</view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const props = withDefaults(
	defineProps<{
		visible: boolean;
		content: string;
		targetRect: {
			left: number;
			top: number;
			width: number;
			height: number;
		} | null;
		offsetY?: number;
		offsetX?: number;
		placement?: 'top' | 'bottom' | 'left' | 'right';
		maxWidth?: string;
		minWidth?: string;
		padding?: string;
		zIndex?: number;
	}>(),
	{
		offsetY: 10,
		offsetX: 10,
		placement: 'right',
		maxWidth: '200px',
		minWidth: 'unset',
		padding: '6px 10px',
		zIndex: 1000
	}
);

const lines = computed(() => props.content.split('\n').filter((line) => line.trim() !== ''));

const isPopoverVisible = ref(false);
const isFadingOut = ref(false);

watch(
	() => props.visible,
	(newValue) => {
		if (newValue) {
			isFadingOut.value = false;
			isPopoverVisible.value = true;
		} else {
			if (isPopoverVisible.value) {
				isFadingOut.value = true;
				setTimeout(() => {
					isPopoverVisible.value = false;
				}, 100);
			}
		}
	},
	{
		immediate: true
	}
);

const finalTop = computed(() => {
	if (!props.targetRect) return 0;
	const arrowHeight = 6;

	switch (props.placement) {
		case 'top': {
			const estimatedLineHeight = 18;
			const estimatedPadding = 12;
			const linesCount = lines.value.length > 0 ? lines.value.length : 1;
			const popoverHeight = linesCount * estimatedLineHeight + estimatedPadding;
			return props.targetRect.top - popoverHeight - arrowHeight - props.offsetY;
		}
		case 'bottom':
			return props.targetRect.top + props.targetRect.height + arrowHeight + props.offsetY;
		case 'left':
		case 'right':
			return props.targetRect.top + props.targetRect.height / 2;
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
			return props.targetRect.left + props.targetRect.width / 2 - popoverWidth / 2;
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
	animation: pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
	transform-origin: center center;
}

.app-popover.fade-out {
	animation: pop-out 0.2s cubic-bezier(0.55, 0.085, 0.68, 0.53) forwards;
}

.popover-wrapper {
	position: relative;

	.app-popover.placement-left &,
	.app-popover.placement-right & {
		transform: translateY(-50%);
	}
}

.popover-content {
	background-color: #faedcd;
	color: var(--primary-color);
	border-radius: 6px;
	font-size: 12px;
	line-height: 1.4;
	word-break: break-word;
	text-align: left;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.popover-line {
	display: flex;
	align-items: flex-start;
	margin-bottom: 4px;
}

.popover-line:last-child {
	margin-bottom: 0;
}

.bullet {
	width: 4px;
	height: 4px;
	background-color: var(--primary-color);
	border-radius: 50%;
	margin-right: 6px;
	flex-shrink: 0;
	margin-top: 6px;
}

.line-text {
	white-space: pre-wrap;
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
	bottom: -12px;
}

.app-popover.placement-bottom .popover-arrow {
	border-bottom-color: #faedcd;
	top: -12px;
}

.app-popover.placement-right .popover-arrow,
.app-popover.placement-left .popover-arrow {
	top: 50%;
	transform: translateY(-50%);
}

.app-popover.placement-right .popover-arrow {
	border-right-color: #faedcd;
	left: -12px;
}

.app-popover.placement-left .popover-arrow {
	border-left-color: #faedcd;
	right: -12px;
}

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
