<template>
	<view class="dropdown-pill ripple-container" @touchstart="handleTouchStart" @click="handleClick">
		<span v-for="ripple in ripples" :key="ripple.id" class="ripple" :style="ripple.style"></span>
		<view class="pill-content">
			<text class="pill-text">{{ text }}</text>
			<view class="arrow-down"></view>
		</view>
	</view>
</template>

<script setup lang="ts">
import { ref, getCurrentInstance } from 'vue';

// 定义组件接收的属性
const props = defineProps({
	text: {
		type: String,
		default: ''
	}
});

// 定义组件可触发的事件
const emit = defineEmits(['click']);

// --- 水波纹动效逻辑 ---
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
	// 延迟触发 click 事件，让水波纹动画播放
	setTimeout(() => {
		emit('click', event);
	}, 300);
};
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';

.dropdown-pill {
	display: inline-flex; /* 关键：使容器宽度自适应内容 */
	position: relative;
	overflow: hidden;
	transform: translateZ(0);
	border-radius: 20px; /* 胶囊圆角 */
	background-color: #f3e9e3; /* [核心修改] 颜色改为与FilterTabs非激活状态一致 */
	box-shadow: none; /* [核心修改] 移除阴影，使其更像页面内元素 */
	transition: transform 0.15s ease-out;
	padding: 6px 12px; /* 内边距 */

	&:active {
		transform: scale(0.96); /* 点击时的按压反馈 */
	}
}

.pill-content {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px; /* 文字和图标的间距 */
	z-index: 1; /* 确保内容在水波纹之上 */
	position: relative;
}

.pill-text {
	font-size: 14px;
	font-weight: 500;
	color: var(--text-secondary); /* [核心修改] 文字颜色改为次要文字颜色 */
}

.arrow-down {
	width: 0;
	height: 0;
	border-left: 5px solid transparent;
	border-right: 5px solid transparent;
	border-top: 6px solid var(--text-secondary); /* [核心修改] 箭头颜色与文字统一 */
}

.ripple {
	background-color: rgba(0, 0, 0, 0.1);
}
</style>
