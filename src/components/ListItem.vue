<template>
	<view class="list-item ripple-container" :class="{ 'card-mode': cardMode }" @touchstart="handleTouchStart"
		@click="handleClick" @longpress="handleLongPress">
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
		cardMode: {
			type: Boolean,
			default: false,
		}
	});

	const emit = defineEmits(['click', 'longpress']);

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
		-webkit-user-select: none;
		user-select: none;
		-webkit-tap-highlight-color: transparent;

		/* [新增] 禁用小程序默认的点击态 */
		&::after {
			display: none;
		}
	}

	.card-mode {
		background: var(--card-bg);
		padding: 20px;
		border-radius: 20px;
		margin-bottom: 15px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
		/* [修改] 使用 CSS 变量来设置边框颜色，并提供一个透明的默认值 */
		border-left: 5px solid var(--card-border-color, transparent);
	}

	.ripple {
		background-color: rgba(0, 0, 0, 0.15);
	}
</style>