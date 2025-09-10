<template>
	<view class="refreshable-layout">
		<view class="refresher-container" :style="{ height: refresherHeight + 'px' }">

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

			</view>
		</view>

		<scroll-view :scroll-y="true" class="scroll-area" :refresher-enabled="true" :refresher-triggered="isRefreshing"
			refresher-default-style="none" refresher-background="transparent" @refresherpulling="handleRefresherPulling"
			@refresherrefresh="handleRefresherRefresh" @refresherrestore="handleRefresherRestore"
			@refresherabort="handleRefresherAbort" @scroll="(e) => $emit('scroll', e)">
			<slot></slot>
		</scroll-view>
	</view>
</template>

<script setup lang="ts">
	import { ref, computed } from 'vue';

	const emit = defineEmits(['refresh', 'scroll']);

	const REFRESHER_HEIGHT = 80;

	const refresherHeight = ref(0);
	const status = ref<'pulling' | 'releasing' | 'loading' | 'finishing'>('pulling');
	const isRefreshing = ref(false);

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

	const handleRefresherPulling = (e : any) => {
		const dy = e.detail.dy;
		refresherHeight.value = Math.min(dy, REFRESHER_HEIGHT);;
		if (status.value !== 'loading') {
			// 即使不显示文字，状态判断依然保留，用于驱动动画
			status.value = dy >= REFRESHER_HEIGHT ? 'releasing' : 'pulling';
		}
	};

	const handleRefresherRefresh = () => {
		status.value = 'loading';
		isRefreshing.value = true;
		emit('refresh');
	};

	const handleRefresherRestore = () => {
		refresherHeight.value = 0;
		status.value = 'pulling';
		isRefreshing.value = false;
	};

	const handleRefresherAbort = () => {
		refresherHeight.value = 0;
		status.value = 'pulling';
		isRefreshing.value = false;
	};

	const finishRefresh = () => {
		status.value = 'finishing';
		setTimeout(() => {
			isRefreshing.value = false;
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
		position: relative;
	}

	.refresher-container {
		width: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		overflow: hidden;
		position: absolute;
		top: 0;
		left: 0;
		z-index: 1;
	}

	.refresher-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		position: relative;
		// 图标网上偏移，防止遮挡下面页面
		padding-bottom: 20px;
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

	.scroll-area {
		width: 100%;
		height: 100%;

		box-sizing: border-box;
		position: relative;
		z-index: 0;
	}

	.steam-container {
		position: absolute;
		top: -10px; // 数值越小与图标间距越大
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