<template>
	<view v-if="isOpen" class="fab-overlay" @click="toggleMenu"></view>
	<view class="fab-container" :class="{ 'fab-no-tab-bar': noTabBar, 'is-hidden': !visible }">
		<view class="fab-options" :class="{ 'is-open': isOpen }">
			<view
				v-for="(item, index) in actions"
				:key="index"
				class="fab-option-wrapper"
				:style="{ transitionDelay: `${isOpen ? (actions.length - 1 - index) * 30 : index * 30}ms` }"
			>
				<view class="option-label">{{ item.text }}</view>
				<view :id="`fab-ripple-${index}`" class="option-button ripple-container" @touchstart="handleTouchStart($event, index)" @click="selectAction(item.action)">
					<span v-for="ripple in ripples[index]" :key="ripple.id" class="ripple" :style="ripple.style"></span>
					<image class="option-icon" :src="item.icon" />
				</view>
			</view>
		</view>

		<view :id="`fab-ripple-main`" class="fab-main ripple-container" @touchstart="handleTouchStart($event, 'main')" @click="handleMainButtonClick">
			<span v-for="ripple in ripples['main']" :key="ripple.id" class="ripple" :style="ripple.style"></span>
			<image class="fab-icon" :class="{ 'is-open': isOpen }" :src="isOpen ? '/static/icons/fab-add.svg' : icon" />
		</view>
	</view>
</template>

<script setup lang="ts">
import { ref, reactive, getCurrentInstance, type PropType } from 'vue';

const props = defineProps({
	actions: {
		type: Array as PropType<{ icon: string; text: string; action: () => void }[]>,
		default: () => []
	},
	noTabBar: {
		type: Boolean,
		default: false
	},
	icon: {
		type: String,
		default: '/static/icons/fab-add.svg'
	},
	// [核心新增] visible prop 用于控制显隐
	visible: {
		type: Boolean,
		default: true
	}
});

const emit = defineEmits(['click']);

const instance = getCurrentInstance();
const isOpen = ref(false);

const ripples = reactive<Record<string | number, any[]>>({
	main: []
});
props.actions.forEach((_, index) => {
	ripples[index] = [];
});

const toggleMenu = () => {
	isOpen.value = !isOpen.value;
};

const handleMainButtonClick = () => {
	if (!props.actions || props.actions.length === 0) {
		emit('click');
		return;
	}
	toggleMenu();
};

const selectAction = (action: () => void) => {
	setTimeout(() => {
		action();
		isOpen.value = false;
	}, 200);
};

const handleTouchStart = (event: TouchEvent, key: string | number) => {
	const touch = event.touches[0];
	const viewId = `fab-ripple-${key}`;

	const query = uni.createSelectorQuery().in(instance);
	query
		.select('#' + viewId)
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
				if (!ripples[key]) ripples[key] = [];
				ripples[key].push(newRipple);
				setTimeout(() => {
					if (ripples[key] && ripples[key].length > 0) ripples[key].shift();
				}, 600);
			}
		})
		.exec();
};
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';

.fab-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: transparent;
	z-index: 19;
}

.fab-container {
	position: fixed;
	bottom: calc(85px + constant(safe-area-inset-bottom));
	bottom: calc(85px + env(safe-area-inset-bottom));
	right: 20px;
	z-index: 20;
	width: 56px;
	height: 56px;
	/* [核心新增] 增加过渡动画 */
	transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s;
	opacity: 1;
	transform: translateY(0);
}

/* [核心新增] 隐藏状态的样式 */
.fab-container.is-hidden {
	opacity: 0;
	transform: translateY(calc(100% + 30px));
	/* 向下移出视野 */
	pointer-events: none;
	/* 隐藏时不可交互 */
}

.fab-container.fab-no-tab-bar {
	bottom: calc(30px + constant(safe-area-inset-bottom));
	bottom: calc(30px + env(safe-area-inset-bottom));
}

.fab-main {
	position: absolute;
	bottom: 0;
	right: 0;
	width: 56px;
	height: 56px;
	background-color: var(--primary-color);
	border-radius: 50%;
	display: flex;
	justify-content: center;
	align-items: center;
	box-shadow: 0 3px 5px -1px rgba(0, 0, 0, 0.2), 0 6px 10px 0 rgba(0, 0, 0, 0.14), 0 1px 18px 0 rgba(0, 0, 0, 0.12);
	z-index: 2;
	transform: translateZ(0);
	overflow: hidden;
	transition: box-shadow 0.28s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s ease-out;

	.fab-icon {
		width: 28px;
		height: 28px;
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.fab-icon.is-open {
		transform: rotate(135deg);
	}
}

.fab-main:active {
	transform: scale(0.95) translateZ(0);
	box-shadow: 0 7px 8px -4px rgba(0, 0, 0, 0.2), 0 12px 17px 2px rgba(0, 0, 0, 0.14), 0 5px 22px 4px rgba(0, 0, 0, 0.12);
}

.fab-options {
	position: absolute;
	bottom: calc(100% + 15px);
	right: 0;
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	list-style: none;
	padding: 0;
	margin: 0;
	z-index: 1;
	gap: 15px;
	pointer-events: none;
}

.fab-option-wrapper {
	display: flex;
	align-items: center;
	opacity: 0;
	transform: translateY(10px);
	transition: opacity 0.2s, transform 0.2s;
	transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

.fab-options.is-open {
	pointer-events: auto;
}

.fab-options.is-open .fab-option-wrapper {
	opacity: 1;
	transform: translateY(0);
}

.option-label {
	background-color: #fff;
	color: var(--text-primary);
	padding: 5px 12px;
	border-radius: 8px;
	margin-right: 12px;
	font-size: 14px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	white-space: nowrap;
}

.option-button {
	width: 44px;
	height: 44px;
	background-color: #fff;
	border-radius: 50%;
	display: flex;
	justify-content: center;
	align-items: center;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	overflow: hidden;
	transform: translateZ(0);
	margin-right: 6px;

	.option-icon {
		width: 22px;
		height: 22px;
	}
}

.ripple {
	background-color: rgba(0, 0, 0, 0.1);
}

.fab-main .ripple {
	background-color: rgba(255, 255, 255, 0.4);
}
</style>
