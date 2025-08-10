<template>
	<button class="btn ripple-container" :class="buttonClasses" :disabled="disabled || loading"
		@touchstart="handleTouchStart" @touchmove="handleTouchMove" @touchend="handleTouchEnd">
		<view v-if="loading" class="loading-spinner"></view>
		<slot v-else></slot>
		<span v-for="ripple in ripples" :key="ripple.id" class="ripple" :style="ripple.style"></span>
	</button>
</template>

<script setup lang="ts">
	import { ref, computed, getCurrentInstance } from 'vue';

	const props = defineProps({
		type: {
			type: String,
			default: 'primary', // primary, secondary, danger, dashed
		},
		size: {
			type: String,
			default: '', // sm, xs
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
	const instance = getCurrentInstance();

	const buttonClasses = computed(() => ({
		'btn-primary': props.type === 'primary',
		'btn-secondary': props.type === 'secondary',
		'btn-danger': props.type === 'danger',
		'btn-dashed': props.type === 'dashed',
		'btn-sm': props.size === 'sm',
		'btn-xs': props.size === 'xs',
		'btn-full-width': props.fullWidth,
	}));

	// 水波纹效果逻辑
	const ripples = ref<any[]>([]);
	const touchMoved = ref(false);

	const handleTouchStart = (event : any) => {
		if (props.disabled || props.loading) return;
		touchMoved.value = false;
		const touch = event.touches[0];
		const query = uni.createSelectorQuery().in(instance);
		query.select('.btn').boundingClientRect(rect => {
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
					if (ripples.value.length > 0) {
						ripples.value.shift();
					}
				}, 600);
			}
		}).exec();
	};

	const handleTouchMove = () => {
		touchMoved.value = true;
	};

	const handleTouchEnd = () => {
		if (props.disabled || props.loading) return;
		if (!touchMoved.value) {
			emit('click');
		}
	};
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	/* 让按钮内的 slot 内容和 loading 居中 */
	.btn {
		display: flex;
		justify-content: center;
		align-items: center;
	}

	/* 加载中动画 */
	.loading-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: #ffffff;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* 为不同背景色的按钮调整 loading 颜色 */
	.btn-secondary .loading-spinner,
	.btn-dashed .loading-spinner {
		border-color: rgba(0, 0, 0, 0.2);
		border-top-color: var(--primary-color);
	}

	/* 水波纹颜色 */
	.ripple {
		background-color: rgba(255, 255, 255, 0.4);
	}

	.btn-secondary .ripple,
	.btn-dashed .ripple {
		background-color: rgba(0, 0, 0, 0.1);
	}
</style>