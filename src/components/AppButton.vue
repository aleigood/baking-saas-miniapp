<template>
	<button class="btn ripple-container" :class="buttonClasses" :disabled="disabled || loading"
		@touchstart="handleTouchStart" @click="handleClick">
		<!-- 水波纹效果的容器 -->
		<span v-for="ripple in ripples" :key="ripple.id" class="ripple" :style="ripple.style"></span>

		<!-- 按钮内容 -->
		<view class="content-wrapper" :style="{ visibility: loading ? 'hidden' : 'visible' }">
			<slot></slot>
		</view>

		<view v-if="loading" class="loading-content-wrapper">
			<slot></slot>
		</view>
	</button>
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

	// [新增] 水波纹效果逻辑
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
	}));

	const handleClick = (event : Event) => {
		if (props.disabled || props.loading) return;
		emit('click', event);
	}
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	.btn {
		min-height: 50px;
		box-sizing: border-box;
		display: flex;
		justify-content: center;
		align-items: center;
		position: relative;
		overflow: hidden;
		transform: translateZ(0);

		&::after {
			border: none;
		}

		&[disabled] {
			background-color: #f3e9e3 !important;
			color: #b0a8a2 !important;
			box-shadow: none !important;
			opacity: 1 !important;
			cursor: not-allowed;
		}

		&.btn-primary[disabled] {
			background-color: #f3e9e3 !important;
		}

	}

	.content-wrapper {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		/* [新增] 确保内容在水波纹之上 */
		z-index: 1;
	}

	.loading-content-wrapper {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 8px;
		z-index: 1;
	}

	.btn-primary.loading {
		background-color: #7d4f33;
		opacity: 1;
	}

	/* [修改] 样式现在直接作用于组件内的 .ripple */
	.ripple {
		background-color: rgba(255, 255, 255, 0.4);
	}

	.btn-secondary .ripple,
	.btn-dashed .ripple,
	.btn-text-link .ripple {
		background-color: rgba(0, 0, 0, 0.1);
	}
</style>