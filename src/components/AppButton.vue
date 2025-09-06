<template>
	<view class="btn ripple-container" :class="buttonClasses" @touchstart="handleTouchStart" @click="handleClick">
		<span v-for="ripple in ripples" :key="ripple.id" class="ripple" :style="ripple.style"></span>

		<view v-if="loading" class="loading-indicator"></view>

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
		'btn-md': props.size === 'md', // [核心新增] 增加 md 尺寸的 class 判断
		'btn-full-width': props.fullWidth,
		'loading': props.loading,
		'is-disabled': props.disabled || props.loading,
	}));

	const handleClick = (event : Event) => {
		if (props.disabled || props.loading) return;
		setTimeout(() => {
			emit('click', event);
		}, 300);
	}
</script>

<style scoped lang="scss">
	/* [样式修复] 将所有按钮样式内聚到组件内部，解决H5平台样式冲突问题 */
	.btn {
		display: flex;
		justify-content: center;
		align-items: center;
		margin: 0;
		padding: 10px 15px;
		min-height: 60px;
		box-sizing: border-box;
		border: none;
		border-radius: 12px;
		font-size: 16px;
		font-weight: 500;
		text-align: center;
		position: relative;
		overflow: hidden;
		transform: translateZ(0);
		/* [核心新增] 为阴影和形变增加过渡动画，使交互更平滑 */
		transition: box-shadow 0.28s cubic-bezier(0.4, 0, 0.2, 1);

		&::after {
			border: none;
		}

		&:active {
			/* [核心新增] 按下时轻微缩小，提升物理反馈感 */
			transform: scale(0.98);
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

	.btn-primary {
		background-color: var(--primary-color);
		color: white;
		/* [核心新增] 新增符合 Material Design 规范的阴影 */
		box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 3px 1px -2px rgba(0, 0, 0, 0.2), 0 1px 5px 0 rgba(0, 0, 0, 0.12);
	}

	/* [核心新增] 主按钮在点击时的阴影效果 */
	.btn-primary:active {
		box-shadow: 0 8px 10px 1px rgba(0, 0, 0, 0.14), 0 3px 14px 2px rgba(0, 0, 0, 0.12), 0 5px 5px -3px rgba(0, 0, 0, 0.2);
	}

	.btn-secondary {
		background-color: #f3e9e3;
		color: var(--text-secondary);
	}

	.btn-danger {
		background-color: var(--danger-color);
		color: white;
		/* [核心新增] 为危险按钮也增加阴影 */
		box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 3px 1px -2px rgba(0, 0, 0, 0.2), 0 1px 5px 0 rgba(0, 0, 0, 0.12);
	}

	/* [核心新增] 危险按钮在点击时的阴影效果 */
	.btn-danger:active {
		box-shadow: 0 8px 10px 1px rgba(0, 0, 0, 0.14), 0 3px 14px 2px rgba(0, 0, 0, 0.12), 0 5px 5px -3px rgba(0, 0, 0, 0.2);
	}

	.btn-dashed {
		border: 1px dashed var(--primary-color);
		color: var(--primary-color);
		background: transparent;
	}

	.btn-full-width {
		width: 100%;
		margin-top: 15px;
	}

	/* [核心新增] 为 md 尺寸添加新的样式规则 */
	.btn-md {
		padding: 0 15px;
		/* 上下 padding 设为0，通过 min-height 控制高度 */
		font-size: 14px;
		min-height: 46px;
	}

	.btn-sm {
		padding: 6px 12px;
		font-size: 12px;
		border-radius: 8px;
		min-height: 32px;
	}

	.btn-xs {
		padding: 4px 8px;
		font-size: 12px;
		border-radius: 8px;
		min-height: 30px;
	}

	.btn-text-link {
		width: 100%;
		padding: 8px;
		border: none;
		color: var(--primary-color);
		background: transparent;
		border-radius: 0px;
		font-size: 14px;
		min-height: 60px;
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