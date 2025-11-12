<template>
	<view
		class="list-item ripple-container"
		:class="{
			'card-mode': cardMode,
			'is-selected': selected,
			'bleed-mode': bleed,
			'is-discontinued': discontinued,
			'animate-in': animateOnMount // [中文注释] 仅在 animateOnMount 为 true 时添加动画类
		}"
		@touchstart="handleTouchStart"
		@click="handleClick"
		@longpress="handleLongPress"
		:style="animationStyle"
	>
		<span v-for="ripple in ripples" :key="ripple.id" class="ripple" :style="ripple.style"></span>
		<view class="list-item-content" :class="{ 'no-padding': noPadding, 'bleed-padding': bleed }">
			<slot></slot>
		</view>
		<view v-if="divider" class="divider"></view>
	</view>
</template>

<script setup lang="ts">
import { ref, getCurrentInstance, computed } from 'vue'; // [中文注释] 引入 computed

const props = defineProps({
	vibrateOnLongPress: {
		type: Boolean,
		default: false
	},
	cardMode: {
		type: Boolean,
		default: false
	},
	noPadding: {
		type: Boolean,
		default: false
	},
	bleed: {
		type: Boolean,
		default: false
	},
	selected: {
		type: Boolean,
		default: false
	},
	divider: {
		type: Boolean,
		default: false
	},
	// [中文注释] 新增 animateOnMount prop，控制是否播放入场动画
	animateOnMount: {
		type: Boolean,
		default: false
	},
	animationIndex: {
		type: Number,
		default: 0
	},
	discontinued: {
		type: Boolean,
		default: false
	}
});

const emit = defineEmits(['click', 'longpress']);

const ripples = ref<any[]>([]);
const instance = getCurrentInstance();

// [中文注释] 计算交错动画的延迟时间 (使用 CSS 变量)
const animationStyle = computed(() => {
	// [中文注释] 仅当需要动画时才计算延迟
	if (!props.animateOnMount) {
		return {};
	}
	// [中文注释] 每个item延迟50ms，最多延迟1000ms
	const delayMs = Math.min(props.animationIndex * 50, 1000);
	return {
		'--animation-delay': `${delayMs}ms`
	};
});

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

const handleLongPress = (event: Event) => {
	if (props.vibrateOnLongPress) {
		uni.vibrateShort({});
		emit('longpress', event);
	}
};
</script>

<style scoped lang="scss">
/* [中文注释] 新增：定义列表项入场动画 */
@keyframes fadeInUp {
	from {
		opacity: 0;
		transform: translateY(15px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

/* [CSS重构] 将 .list-item 相关的样式从 common.scss 移入组件内部 */
.list-item {
	position: relative;
	overflow: hidden;
	-webkit-user-select: none;
	user-select: none;
	-webkit-tap-highlight-color: transparent;
	display: flex;
	/* 新增flex布局以确保内容撑满 */
	justify-content: space-between;
	align-items: center;
	transition: transform 0.15s ease-out, opacity 0.2s ease-in-out; // [中文注释] 为 opacity 增加过渡效果
	/* [优化] 为点击反馈增加过渡动画 */

	/* [优化] 新增触摸状态下的微交互，轻微缩小，提升物理反馈感 */
	&:active {
		transform: scale(0.98);
	}
}

/* [中文注释] 新增：将动画应用到 .animate-in 类上 */
.list-item.animate-in {
	animation: fadeInUp 0.35s ease-out forwards;
	opacity: 0; /* [中文注释] 动画初始状态 (配合 forwards) */
	animation-delay: var(--animation-delay, 0ms); /* [中文注释] 使用 CSS 变量设置延迟 */
}

// [中文注释] 新增停用状态的样式，直接在组件内部定义
.list-item.is-discontinued {
	opacity: 0.6;
}

.list-item-content {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 15px 5px;
	flex: 1;
	position: relative;
	z-index: 1;
}

.list-item-content.bleed-padding {
	padding: 15px 20px;
}

.list-item-content.no-padding {
	padding: 0;
}

.card-mode {
	background: var(--card-bg);
	padding: 0;
	border-radius: 20px;
	margin-bottom: 15px;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
	border-left: 5px solid var(--card-border-color, transparent);
}

.card-mode .list-item-content {
	padding: 20px;
}

/* [CSS重构] card 内部的 list-item 特殊边距规则也移入 */
.card .list-item {
	padding-left: 0;
	padding-right: 0;
}

.card-mode .list-item-content.no-padding {
	padding: 0;
}

.ripple {
	background-color: rgba(0, 0, 0, 0.15);
}

.list-item.is-selected {
	background-color: transparent;
}

.list-item.is-selected::before {
	content: '';
	position: absolute;
	left: 0;
	top: 50%;
	transform: translateY(-50%);
	width: 4px;
	height: 50%;
	background-color: var(--primary-color);
	border-radius: 0 4px 4px 0;
	z-index: 1;
}

/* [兼容性修复] 新增一个真实的view元素作为分隔线，替代::after伪元素 */
.divider {
	content: '';
	position: absolute;
	bottom: 0;
	height: 1px;
	background-color: var(--border-color);
	left: 0;
	right: 0;
}

/* [兼容性修复] 当列表项为 bleed 模式时，分隔线也需要相应的内边距 */
.list-item.bleed-mode .divider {
	left: 20px;
	right: 20px;
}
</style>
