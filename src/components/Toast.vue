<template>
	<view v-if="isRendered" class="toast-wrapper" :class="animationClass">
		<view class="toast-content" :class="toastStore.type">
			{{ toastStore.message }}
		</view>
	</view>
</template>

<script setup lang="ts">
	import { ref, watch, nextTick } from 'vue';
	import { useToastStore } from '@/store/toast';
	const toastStore = useToastStore();

	// [新增] isRendered 用于 v-if，控制组件是否真实存在于DOM中
	const isRendered = ref(false);
	// [新增] animationClass 用于控制进入和离开的动画类
	const animationClass = ref('');
	// [新增] 用于管理动画结束后的DOM移除操作
	let animationTimer : ReturnType<typeof setTimeout> | null = null;

	watch(() => toastStore.isVisible, (newValue) => {
		// 清除可能存在的上一个定时器
		if (animationTimer) {
			clearTimeout(animationTimer);
		}

		if (newValue) {
			// 1. 当需要显示时，立即渲染DOM
			isRendered.value = true;
			// 2. 使用 nextTick 确保DOM渲染完成后，再添加动画类以触发进入动画
			nextTick(() => {
				animationClass.value = 'toast-fade-in';
			});
		} else {
			// 1. 当需要隐藏时，先应用离开动画
			animationClass.value = 'toast-fade-out';
			// 2. 等待动画播放完毕（300ms）后，再从DOM中移除元素
			animationTimer = setTimeout(() => {
				isRendered.value = false;
			}, 300); // 这个时间必须和CSS动画的持续时间一致
		}
	});
</script>

<style scoped lang="scss">
	.toast-wrapper {
		position: fixed;
		bottom: 80px;
		left: 50%;
		/* [修改] 动画会处理transform，这里只负责水平居中 */
		transform: translateX(-50%);
		z-index: 1000;
		pointer-events: none;
		display: flex;
		justify-content: center;
		width: 100%;
		opacity: 0;
	}

	.toast-content {
		padding: 10px 20px;
		border-radius: 20px;
		font-size: 14px;
		color: white;
		background-color: rgba(0, 0, 0, 0.7);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		text-align: center;
		min-width: 150px;
		max-width: 80vw;
		box-sizing: border-box;
	}

	.toast-content.success {
		background-color: var(--primary-color);
	}

	.toast-content.error {
		background-color: var(--primary-color);
	}

	/* CSS动画定义 */
	@keyframes fadeIn {
		from {
			opacity: 0;
			/* [修改] 动画的transform需要带上translateX以保持居中 */
			transform: translate(-50%, 20px);
		}

		to {
			opacity: 1;
			transform: translate(-50%, 0);
		}
	}

	@keyframes fadeOut {
		from {
			opacity: 1;
			transform: translate(-50%, 0);
		}

		to {
			opacity: 0;
			transform: translate(-50%, 20px);
		}
	}

	/* 应用动画的类 */
	.toast-fade-in {
		/* [修改] 动画时长0.3s，缓动函数ease，并使用forwards保持动画结束状态 */
		animation: fadeIn 0.3s ease forwards;
	}

	.toast-fade-out {
		animation: fadeOut 0.3s ease forwards;
	}
</style>