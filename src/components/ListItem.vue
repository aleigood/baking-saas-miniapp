<template>
	<view class="list-item ripple-container" @touchstart="handleTouchStart" @touchmove="handleTouchMove"
		@touchend="handleTouchEnd">
		<!-- 插槽，用于父组件填充自定义内容 -->
		<slot></slot>
		<!-- 水波纹效果的渲染容器 -->
		<span v-for="ripple in ripples" :key="ripple.id" class="ripple" :style="ripple.style"></span>
	</view>
</template>

<script setup lang="ts">
	import { ref } from 'vue';

	// 定义组件可以向外触发的事件
	const emit = defineEmits(['click', 'longpress']);

	// --- 内部状态定义 ---
	const ripples = ref<any[]>([]); // 存储当前显示的水波纹
	const longPressTimer = ref<any>(null); // 长按计时器
	const touchMoved = ref(false); // 标记手指是否移动过
	const LONG_PRESS_DURATION = 350; // 定义长按的时长（毫秒）

	/**
	 * 手指按下时触发
	 * @param {any} event - uni-app 提供的触摸事件对象
	 */
	const handleTouchStart = (event : any) => {
		touchMoved.value = false;
		clearTimeout(longPressTimer.value);

		const touch = event.touches[0];
		const target = event.currentTarget;

		// uni-app 的事件对象提供了计算触摸点在元素内坐标所需的所有信息
		// touch.pageX/pageY 是相对于页面的坐标
		// target.offsetLeft/Top 是元素相对于页面的偏移
		const x = touch.pageX - target.offsetLeft;
		const y = touch.pageY - target.offsetTop;
		const size = Math.max(target.offsetWidth, target.offsetHeight) * 2;

		// 创建一个新的水波纹对象
		const ripple = {
			id: Date.now(),
			style: {
				width: `${size}px`,
				height: `${size}px`,
				top: `${y - size / 2}px`,
				left: `${x - size / 2}px`,
			}
		};
		ripples.value.push(ripple);

		// 动画结束后自动移除水波纹元素
		setTimeout(() => {
			if (ripples.value.length > 0) {
				ripples.value.shift();
			}
		}, 600);

		// 启动长按计时器
		longPressTimer.value = setTimeout(() => {
			if (!touchMoved.value) {
				emit('longpress'); // 如果手指未移动，触发 longpress 事件
			}
		}, LONG_PRESS_DURATION);
	};

	/**
	 * 手指移动时触发
	 */
	const handleTouchMove = () => {
		touchMoved.value = true;
		clearTimeout(longPressTimer.value); // 移动则取消长按
	};

	/**
	 * 手指抬起时触发
	 */
	const handleTouchEnd = () => {
		clearTimeout(longPressTimer.value);
		if (!touchMoved.value) {
			emit('click'); // 如果未移动，则触发 click 事件
		}
	};
</script>

<style scoped lang="scss">
	// 引入全局样式，使组件拥有 list-item 和 ripple-container 的基础样式
	@import '@/styles/common.scss';

	.list-item {
		// 这里可以为组件本身添加一些特有的、不与父组件冲突的样式
	}
</style>