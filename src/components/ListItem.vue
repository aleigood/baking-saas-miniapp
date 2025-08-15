<template>
	<view class="list-item ripple-container" @touchstart="handleTouchStart" @click="handleClick"
		@longpress="handleLongPress">
		<!-- 水波纹效果的容器 -->
		<span v-for="ripple in ripples" :key="ripple.id" class="ripple" :style="ripple.style"></span>
		<slot></slot>
	</view>
</template>

<script setup lang="ts">
	import { ref, getCurrentInstance } from 'vue';

	const props = defineProps({
		vibrateOnLongPress: {
			type: Boolean,
			default: false,
		},
	});

	const emit = defineEmits(['click', 'longpress']);

	// [新增] 水波纹效果逻辑
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

	const handleClick = (event : Event) => {
		emit('click', event);
	};

	const handleLongPress = (event : Event) => {
		if (props.vibrateOnLongPress) {
			uni.vibrateShort({});
		}
		emit('longpress', event);
	};
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	.list-item {
		position: relative;
		overflow: hidden;
	}

	/* [修改] 样式现在直接作用于组件内的 .ripple */
	.ripple {
		background-color: rgba(0, 0, 0, 0.15);
	}
</style>