<template>
	<view class="fab ripple-container" @touchstart="handleTouchStart" @click="handleClick">
		<span v-for="ripple in ripples" :key="ripple.id" class="ripple" :style="ripple.style"></span>
		<image class="fab-icon" src="/static/icons/fab-add.svg" />
	</view>
</template>

<script setup lang="ts">
	import { ref, getCurrentInstance } from 'vue';

	const emit = defineEmits(['click']);

	const ripples = ref<any[]>([]);
	const instance = getCurrentInstance();
	const handleTouchStart = (event : TouchEvent) => {
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

	// [体验优化] 新增 handleClick 方法以延迟事件触发
	const handleClick = (event : Event) => {
		// [体验优化] 增加 300ms 延迟，确保水波纹动画可见后再执行点击操作
		setTimeout(() => {
			emit('click', event);
		}, 300);
	};
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	.ripple {
		background-color: rgba(255, 255, 255, 0.4);
	}
</style>