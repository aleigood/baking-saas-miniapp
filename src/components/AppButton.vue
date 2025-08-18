<template>
	<!-- [兼容性修复] 根元素从 button 改为 view，以获得完全且可靠的跨平台样式控制，彻底解决 loading 状态下高度塌陷的问题 -->
	<view class="btn ripple-container" :class="buttonClasses" @touchstart="handleTouchStart" @click="handleClick">
		<!-- 水波纹效果的容器 -->
		<span v-for="ripple in ripples" :key="ripple.id" class="ripple" :style="ripple.style"></span>

		<!-- [兼容性修复] 绝对定位的加载动画，不影响布局 -->
		<view v-if="loading" class="loading-indicator"></view>

		<!-- 按钮内容，加载时通过 visibility: hidden 隐藏，但仍占据空间以维持按钮高度 -->
		<view class="content-wrapper" :style="{ visibility: loading ? 'hidden' : 'visible' }">
			<slot></slot>
		</view>
	</view>
</template>

<script setup lang="ts">
	import { computed, ref, getCurrentInstance } from 'vue';

	const props = defineProps({
		type: {
			type: String,
			default: 'primary',
		},
		size: {
			type: String,
			default: '',
		},
		fullWidth: {
			type: Boolean,
			default: false,
		},
		disabled: {
			type: Boolean,
			default: false,
		},
		loading: {
			type: Boolean,
			default: false,
		},
	});

	const emit = defineEmits(['click']);

	const ripples = ref<any[]>([]);
	const instance = getCurrentInstance();
	const handleTouchStart = (event : TouchEvent) => {
		if (props.disabled || props.loading) return;
		const touch = event.touches[0];
		const query = uni.createSelectorQuery().in(instance);
		query.select('.ripple-container').boundingClientRect(rect => {
			if (rect) {
				const x = touch.clientX - rect.left;
				const y = touch.clientY - rect.top;
				const size = Math.max(rect.width, rect.height) * 2;
				const newRipple = {
					id: Date.now(),
					style: {
						width: `${size}px`,
						height: `${size}px`,
						top: `${y - size / 2}px`,
						left: `${x - size / 2}px`,
					}
				};
				ripples.value.push(newRipple);
				setTimeout(() => {
					if (ripples.value.length > 0) ripples.value.shift();
				}, 600);
			}
		}).exec();
	};


	const buttonClasses = computed(() => ({
		'btn-primary': props.type === 'primary',
		'btn-secondary': props.type === 'secondary',
		'btn-danger': props.type === 'danger',
		'btn-dashed': props.type === 'dashed',
		'btn-text-link': props.type === 'text-link',
		'btn-sm': props.size === 'sm',
		'btn-xs': props.size === 'xs',
		'btn-full-width': props.fullWidth,
		'loading': props.loading,
		'is-disabled': props.disabled || props.loading,
	}));

	const handleClick = (event : Event) => {
		if (props.disabled || props.loading) return;
		// [体验优化] 增加 300ms 延迟，确保水波纹动画可见后再执行点击操作
		setTimeout(() => {
			emit('click', event);
		}, 300);
	}
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	.btn {
		min-height: 60px;
		box-sizing: border-box;
		display: flex;
		justify-content: center;
		align-items: center;
		position: relative;
		overflow: hidden;
		transform: translateZ(0);
		/* [兼容性修复] 移除 button 的默认样式 */
		margin: 0;
		padding: 0 15px;
		line-height: 1;

		&::after {
			border: none;
		}

		&.is-disabled {
			background-color: #f3e9e3 !important;
			color: #b0a8a2 !important;
			box-shadow: none !important;
			opacity: 1 !important;
			cursor: not-allowed;
		}

		&.btn-primary.is-disabled {
			background-color: #f3e9e3 !important;
		}
	}

	.content-wrapper {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		z-index: 1;
	}

	.loading-indicator {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 20px;
		height: 20px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		border-top-color: #ffffff;
		animation: spin 1s linear infinite;
		z-index: 2;
	}

	@keyframes spin {
		to {
			transform: translate(-50%, -50%) rotate(360deg);
		}
	}

	.btn-primary.loading {
		background-color: #7d4f33;
		opacity: 1;
	}

	.ripple {
		background-color: rgba(255, 255, 255, 0.4);
	}

	.btn-secondary .ripple,
	.btn-dashed .ripple,
	.btn-text-link .ripple {
		background-color: rgba(0, 0, 0, 0.1);
	}
</style>