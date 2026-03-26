<template>
	<view class="skeleton-list">
		<view class="skeleton-item" v-for="i in count" :key="i">
			<view class="skeleton-left">
				<view class="skeleton-line shimmer" style="width: 70%; height: 16px; margin-bottom: 8px"></view>
				<view class="skeleton-line shimmer" style="width: 40%; height: 12px"></view>
			</view>

			<view class="skeleton-right">
				<view class="skeleton-line shimmer" style="width: 50%; height: 16px"></view>
			</view>
		</view>
	</view>
</template>

<script setup lang="ts">
defineProps({
	// 允许外部传入需要渲染的行数，默认 6 行
	count: {
		type: Number,
		default: 6
	}
});
</script>

<style scoped lang="scss">
.skeleton-list {
	background: var(--card-bg, #ffffff);
	border-radius: 16px;
	padding: 0 15px;
	margin-top: 10px;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
}

.skeleton-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 16px 0;
	border-bottom: 1px solid var(--border-color-light, #f5f5f5);

	&:last-child {
		border-bottom: none;
	}
}

.skeleton-left {
	flex: 1;
	display: flex;
	flex-direction: column;
}

.skeleton-right {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: flex-end; /* 右侧内容靠右对齐 */
}

.skeleton-line {
	border-radius: 4px;
	background-color: #f0f2f5;
}

/* 核心呼吸扫光动效 (与 SkeletonCard 保持一致) */
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
