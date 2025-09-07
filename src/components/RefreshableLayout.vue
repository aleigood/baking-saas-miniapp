<template>
	<view class="refreshable-layout">
		<view class="refresher-container"
			:style="{ height: refresherHeight + 'px', transition: isTouching ? 'none' : 'height 0.3s' }">
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

		<scroll-view :scroll-y="true" class="scroll-area" @scroll="handleScroll" @touchstart="handleTouchStart"
			@touchmove="handleTouchMove" @touchend="handleTouchEnd">
			<slot></slot>
		</scroll-view>
	</view>
</template>

<script setup lang="ts">
	import { ref, computed } from 'vue';

	const emit = defineEmits(['refresh']);

	const REFRESHER_HEIGHT = 80; // 触发刷新的阈值
	const MAX_PULL_HEIGHT = 120; // 最大下拉高度

	const refresherHeight = ref(0);
	const status = ref<'pulling' | 'releasing' | 'loading' | 'finishing'>('pulling');
	const isTouching = ref(false);
	const startY = ref(0);

	const statusText = computed(() => {
		switch (status.value) {
			case 'pulling':
				return '下拉刷新';
			case 'releasing':
				return '松开刷新';
			case 'loading':
				return '正在刷新...';
			case 'finishing':
				return '刷新完成';
			default:
				return '';
		}
	});

	const croissantTransform = computed(() => {
		const baseScale = 0.5;
		if (status.value === 'loading') {
			return `scale(${baseScale})`;
		}
		if (status.value === 'pulling' || status.value === 'releasing') {
			const pullScale = baseScale + (refresherHeight.value / REFRESHER_HEIGHT) * 0.1;
			return `scale(${Math.min(pullScale, baseScale + 0.1)})`;
		}
		return `scale(${baseScale})`;
	});

	const handleTouchStart = (e : TouchEvent) => {
		if (scrollTop.value > 0) return;
		startY.value = e.touches[0].clientY;
		isTouching.value = true;
	};

	const handleTouchMove = (e : TouchEvent) => {
		if (scrollTop.value > 0 && startY.value === 0) return;

		// #ifdef H5
		e.preventDefault();
		// #endif

		const deltaY = e.touches[0].clientY - startY.value;

		if (deltaY > 0) {
			const newHeight = Math.min(deltaY, MAX_PULL_HEIGHT);
			refresherHeight.value = newHeight;

			if (status.value !== 'loading') {
				status.value = newHeight >= REFRESHER_HEIGHT ? 'releasing' : 'pulling';
			}
		}
	};

	const handleTouchEnd = () => {
		if (scrollTop.value > 0 || startY.value === 0) {
			startY.value = 0;
			isTouching.value = false;
			return;
		};
		startY.value = 0;
		isTouching.value = false;

		if (status.value === 'releasing') {
			startLoading();
		} else if (status.value === 'pulling') {
			resetRefresher();
		}
	};

	const scrollTop = ref(0);
	const handleScroll = (e : any) => {
		if (!isTouching.value) {
			scrollTop.value = e.detail.scrollTop;
		}
	};

	const startLoading = () => {
		status.value = 'loading';
		refresherHeight.value = REFRESHER_HEIGHT;
		emit('refresh');
	};

	const resetRefresher = () => {
		refresherHeight.value = 0;
		status.value = 'pulling';
	};

	const finishRefresh = () => {
		status.value = 'finishing';
		setTimeout(() => {
			resetRefresher();
		}, 500);
	};

	defineExpose({ finishRefresh });
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
		// [核心修改] 44px * 0.7 ≈ 31px
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
		// [核心修改] 88px * 0.7 ≈ 62px
		width: 62px;
		height: 62px;
		-webkit-tap-highlight-color: transparent;
		user-select: none;
		-webkit-user-select: none;
	}

	.status-text {
		// [核心修改] 8px * 0.7 ≈ 6px
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
		// [核心修改] -8px * 0.7 ≈ -6px
		top: -6px;
		left: 50%;
		transform: translateX(-50%);
		// [核心修改] 40px * 0.7 = 28px
		width: 28px;
		// [核心修改] 25px * 0.7 ≈ 18px
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
		// [核心修改] 5px * 0.7 ≈ 4px
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
			// [核心修改] -25px * 0.7 ≈ -18px
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