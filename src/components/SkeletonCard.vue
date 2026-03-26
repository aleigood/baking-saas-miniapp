<template>
	<view class="skeleton-card">
		<view class="skeleton-header">
			<view class="skeleton-title shimmer"></view>
			<view class="skeleton-icon shimmer"></view>
		</view>

		<view class="skeleton-content">
			<view class="skeleton-row shimmer" style="width: 100%"></view>
			<view class="skeleton-row shimmer" style="width: 80%"></view>
			<view class="skeleton-row shimmer" style="width: 90%"></view>
		</view>
	</view>
</template>

<script setup lang="ts">
// 这是一个纯展示组件，不需要复杂的逻辑
</script>

<style scoped lang="scss">
/* 延续你现有的卡片整体风格 */
.skeleton-card {
	background: var(--card-bg, #ffffff);
	padding: 20px;
	border-radius: 20px;
	margin-bottom: 20px;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.skeleton-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20px;
}

/* 占位块的基础样式 */
.skeleton-title {
	width: 40%;
	height: 24px;
	border-radius: 6px;
	background-color: #f0f2f5;
}

.skeleton-icon {
	width: 24px;
	height: 24px;
	border-radius: 50%;
	background-color: #f0f2f5;
}

.skeleton-content {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.skeleton-row {
	height: 16px;
	border-radius: 4px;
	background-color: #f0f2f5;
}

/* [核心动画] 骨架屏的高级呼吸扫光动效 (Shimmer)
  利用线性渐变在背景上横向移动产生波光粼粼的感觉
*/
.shimmer {
	position: relative;
	overflow: hidden;
	background-color: #f0f2f5;
}

.shimmer::after {
	content: '';
	position: absolute;
	top: 0;
	left: -100%;
	width: 200%;
	height: 100%;
	background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0, rgba(255, 255, 255, 0.6) 50%, rgba(255, 255, 255, 0) 100%);
	animation: shimmer-sweep 1.5s infinite linear;
}

@keyframes shimmer-sweep {
	100% {
		transform: translateX(100%);
	}
}
</style>
