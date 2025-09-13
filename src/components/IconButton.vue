<template>
	<view class="icon-button ripple-container" :class="[variantClass]" @touchstart="handleTouchStart" @click="handleClick">
		<span v-for="ripple in ripples" :key="ripple.id" class="ripple" :style="ripple.style"></span>
		<slot></slot>
	</view>
</template>

<script setup lang="ts">
import { ref, computed, getCurrentInstance } from 'vue';

const props = defineProps({
	variant: {
		type: String,
		default: 'default' // 'default' | 'stepper' | 'field'
	}
});

const emit = defineEmits(['click']);

const variantClass = computed(() => {
	return `variant-${props.variant}`;
});

const ripples = ref<any[]>([]);
const instance = getCurrentInstance();
const handleTouchStart = (event: TouchEvent) => {
	const touch = event.touches[0];
	const query = uni.createSelectorQuery().in(instance);
	query
		.select('.ripple-container')
		.boundingClientRect((rect) => {
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
						left: `${x - size / 2}px`
					}
				};
				ripples.value.push(newRipple);
				setTimeout(() => {
					if (ripples.value.length > 0) ripples.value.shift();
				}, 600);
			}
		})
		.exec();
};

const handleClick = (event: Event) => {
	setTimeout(() => {
		emit('click', event);
	}, 300);
};
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';

.icon-button {
	position: relative;
	overflow: hidden;
	transform: translateZ(0);
	display: flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	padding: 0;
	border-radius: 50%;
	background-color: transparent;
	flex-shrink: 0;
}

.ripple {
	background-color: rgba(0, 0, 0, 0.08);
}

.icon-button.variant-stepper {
	width: 40px;
	height: 40px;
	background-color: #f3e9e3;

	.ripple {
		background-color: rgba(0, 0, 0, 0.1);
	}
}

/* [核心新增] 新的 field 变体样式 */
.icon-button.variant-field {
	width: 40px;
	height: 40px;
	border: 1px dashed var(--border-color);
	border-radius: 10px;
}
</style>
