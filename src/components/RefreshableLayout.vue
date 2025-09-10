<template>
	<view class="refreshable-layout">
		<view class="refresher-container"
			:style="{ height: refresherHeight + 'px', transition: isTouching ? 'none' : 'height 0.3s' }">
			<view class="refresher-content">
				<view class="croissant-wrapper" :style="{ croissantTransform }"
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

		<scroll-view :scroll-y="true" class="scroll-area" @scroll="onScrollViewScroll" @touchstart="handleTouchStart"
			@touchmove="handleTouchMove" @touchend="handleTouchEnd">
			<slot></slot>
		</scroll-view>
	</view>
</template>

<script setup lang="ts">
	import { ref, computed } from 'vue';

	const emit = defineEmits(['refresh', 'scroll']); // [核心修改] 增加 scroll 事件

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

	// [核心新增] 新的滚动处理函数，用于同时处理内部逻辑和对外触发事件
	const onScrollViewScroll = (e : any) => {
		handleScroll(e); // 保留原有的内部逻辑
		emit('scroll', e); // 向父组件发出 scroll 事件
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
		status.value = 'finishing'; // 1. 将状态设置为“完成中”，此时文本显示“刷新完成”

		// 2. 设置一个短暂延时，让用户能看到“刷新完成”的提示
		setTimeout(() => {
			refresherHeight.value = 0; // 3. 开始执行收起动画（动画时长为0.3秒）

			// 4. [核心修改] 在收起动画结束后，再将状态重置为“下拉刷新”
			setTimeout(() => {
				status.value = 'pulling';
			}, 300); // 这个延时必须与CSS中的transition时长保持一致
		}, 500); // “刷新完成”文本的显示时长
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