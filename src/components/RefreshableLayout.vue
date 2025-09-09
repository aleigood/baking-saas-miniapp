<template>
	<view class="refreshable-layout">
		<view class="refresher-container"
			:style="{ height: refresherHeight + 'px', transition: transitionDisabled ? 'none' : 'height 0.3s' }">
			<view class="refresher-content">
				<view class="croissant-wrapper" :style="{ transform: croissantTransform }"
					:class="{ 'is-loading': status === 'loading' }">
					<image class="croissant-outline" src="/static/icons/croissant.svg" />
				</view>
				<view class="steam-container" :class="{ 'is-loading': status === 'loading' }">
					<view class="steam-dot"></view>
					<view class="steam-dot"></view>
					<view class="steam-dot"></view>
					<view class="steam-dot"></view>
					<view class="steam-dot"></view>
				</view>
				<view class="status-text">{{ statusText }}</view>
			</view>
		</view>

		<scroll-view :scroll-y="true" class="scroll-area" @scroll="handleScroll" @scrolltoupper="handleScrollToUpper"
			@touchstart="handleTouchStart" @touchmove="handleTouchMove" @touchend="handleTouchEnd">
			<slot></slot>
		</scroll-view>
	</view>
</template>

<script setup lang="ts">
	import { ref, computed } from 'vue';

	const emit = defineEmits(['refresh']);

	// --- 常量 ---
	const REFRESHER_HEIGHT = 80;
	const MAX_PULL_HEIGHT = 120;
	const DAMPING_FACTOR = 0.5;

	// --- 核心状态变量 ---
	const status = ref<'pulling' | 'releasing' | 'loading' | 'finishing'>('pulling');
	const startY = ref(0);
	const isTouching = ref(false);
	const isPulling = ref(false);
	const pullDistance = ref(0);
	const transitionDisabled = ref(false);
	// [核心修复] 新增 isAtTop 状态标志，默认为 true
	const isAtTop = ref(true);

	// --- 计算属性 (UI状态) ---
	const refresherHeight = computed(() => {
		if (status.value === 'loading' || status.value === 'finishing') {
			return REFRESHER_HEIGHT;
		}
		return pullDistance.value;
	});

	const statusText = computed(() => {
		switch (status.value) {
			case 'pulling': return '下拉刷新';
			case 'releasing': return '松开刷新';
			case 'loading': return '正在刷新...';
			case 'finishing': return '刷新完成';
			default: return '';
		}
	});

	const croissantTransform = computed(() => {
		const baseScale = 0.5;
		if (status.value === 'loading' || status.value === 'finishing') {
			return `scale(${baseScale})`;
		}
		const pullScale = baseScale + (pullDistance.value / REFRESHER_HEIGHT) * 0.1;
		return `scale(${Math.min(pullScale, baseScale + 0.1)})`;
	});

	// --- 事件处理方法 ---

	const handleTouchStart = (event : TouchEvent) => {
		if (status.value === 'loading' || status.value === 'finishing') return;

		const touch = event.touches[0] || event.changedTouches[0];
		isTouching.value = true;
		startY.value = touch.pageY;
		transitionDisabled.value = true;
	};

	const handleTouchMove = (event : TouchEvent) => {
		if (!isTouching.value) return;

		const touch = event.touches[0] || event.changedTouches[0];
		const deltaY = touch.pageY - startY.value;

		// [核心修复] 使用 isAtTop 标志位进行判断，不再依赖 scrollTop
		if (isAtTop.value && deltaY > 0 && !isPulling.value) {
			isPulling.value = true;
		}

		if (isPulling.value) {
			// 在小程序中，当下拉时，scroll-view的默认行为（橡皮筋效果）已经提供了视觉反馈
			// 我们只需要处理自己的下拉逻辑，无需阻止默认事件

			pullDistance.value = Math.min(deltaY * DAMPING_FACTOR, MAX_PULL_HEIGHT);
			if (status.value !== 'loading' && status.value !== 'finishing') {
				status.value = pullDistance.value >= REFRESHER_HEIGHT ? 'releasing' : 'pulling';
			}
		}
	};

	const handleTouchEnd = () => {
		if (!isTouching.value) return;

		isTouching.value = false;
		transitionDisabled.value = false;

		if (isPulling.value) {
			if (status.value === 'releasing') {
				status.value = 'loading';
				emit('refresh');
			} else {
				pullDistance.value = 0;
				status.value = 'pulling';
			}
		}
		isPulling.value = false;
	};

	/**
	 * [核心修复] 新增方法，当滚动到顶部时触发
	 */
	const handleScrollToUpper = () => {
		isAtTop.value = true;
	};

	/**
	 * [核心修复] 修改方法，当开始滚动时，清除 isAtTop 标志
	 */
	const handleScroll = (event : any) => {
		// 只要滚动了（scrollTop > 0），就说明不在顶部
		if (event.detail.scrollTop > 0) {
			isAtTop.value = false;
		}
	};

	const finishRefresh = () => {
		if (status.value === 'loading') {
			status.value = 'finishing';
			setTimeout(() => {
				pullDistance.value = 0;
				setTimeout(() => {
					status.value = 'pulling';
				}, 300);
			}, 500);
		}
	};

	defineExpose({
		finishRefresh
	});
</script>

<style scoped lang="scss">
	.refreshable-layout {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.refresher-container {
		width: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		overflow: hidden;
	}

	.refresher-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		position: relative;
		padding-top: 10px;
		padding-bottom: 10px;
	}

	.croissant-wrapper {
		position: relative;
		width: 31px;
		height: 31px;
		display: flex;
		justify-content: center;
		align-items: center;
		transition: transform 0.2s;

		&.is-loading {
			animation: breathe 1.5s ease-in-out infinite;
		}
	}

	.croissant-outline {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 62px;
		height: 62px;
		-webkit-tap-highlight-color: transparent;
		user-select: none;
		-webkit-user-select: none;
	}

	.status-text {
		margin-top: 6px;
		font-size: 13px;
		color: var(--text-secondary);
	}

	.scroll-area {
		width: 100%;
		flex: 1;
		min-height: 0;
		box-sizing: border-box;
	}

	.steam-container {
		position: absolute;
		top: -2px;
		left: 50%;
		transform: translateX(-50%);
		width: 28px;
		height: 18px;
		display: flex;
		justify-content: space-around;
		align-items: flex-end;
		opacity: 0;
		transition: opacity 0.3s;
		z-index: 3;
	}

	.steam-container.is-loading {
		opacity: 1;
	}

	.steam-dot {
		width: 4px;
		height: 4px;
		background-color: #d4a373;
		border-radius: 50%;
		animation: steam-rise 1.5s infinite;
	}

	.steam-dot:nth-child(1) {
		animation-delay: 0s;
	}

	.steam-dot:nth-child(2) {
		animation-delay: 0.3s;
	}

	.steam-dot:nth-child(3) {
		animation-delay: 0.6s;
	}

	.steam-dot:nth-child(4) {
		animation-delay: 0.9s;
	}

	.steam-dot:nth-child(5) {
		animation-delay: 1.2s;
	}

	@keyframes steam-rise {
		0% {
			transform: translateY(0) scale(1);
			opacity: 1;
		}

		100% {
			transform: translateY(-18px) scale(0.5);
			opacity: 0;
		}
	}

	@keyframes breathe {

		0%,
		100% {
			transform: scale(0.55);
		}

		50% {
			transform: scale(0.5);
		}
	}
</style>