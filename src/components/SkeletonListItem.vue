<template>
	<view class="list-item skeleton-list-item" :class="{ 'is-bleed': bleed, 'has-divider': divider }">
		<view class="list-item-content">
			<view class="main-info skeleton-main">
				<view class="skeleton-block shimmer title-block"></view>
				<view class="skeleton-block shimmer desc-block"></view>
			</view>

			<view class="side-info skeleton-side">
				<view class="skeleton-block shimmer value-block"></view>
				<view class="skeleton-block shimmer desc-right-block"></view>
			</view>
		</view>
	</view>
</template>

<script setup lang="ts">
defineProps({
	bleed: {
		type: Boolean,
		default: false
	},
	divider: {
		type: Boolean,
		default: true
	}
});
</script>

<style scoped lang="scss">
/* 严格复刻 ListItem 的基础布局，确保不发生 1px 的跳动 */
.list-item {
	position: relative;
	background-color: var(--card-bg, #ffffff);
	margin-bottom: 12px;
	border-radius: 16px;
	box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
}

.list-item.is-bleed {
	margin-bottom: 0;
	border-radius: 0;
	box-shadow: none;
	background-color: transparent;
}

.list-item-content {
	padding: 16px;
	display: flex;
	justify-content: space-between;
	align-items: center;
	min-height: 48px;
}

.list-item.is-bleed .list-item-content {
	padding-left: 0;
	padding-right: 0;
}

.list-item.has-divider::after {
	content: '';
	position: absolute;
	bottom: 0;
	left: 16px;
	right: 16px;
	height: 1px;
	background-color: var(--border-color-light, #f5f5f5);
}

.list-item.is-bleed.has-divider::after {
	left: 0;
	right: 0;
}

/* 骨架屏特有样式 */
.skeleton-main {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 8px; /* 两行文字的间距 */
}

.skeleton-side {
	display: flex;
	flex-direction: column;
	align-items: flex-end; /* 右侧文字总是靠右对齐的 */
	gap: 8px;
	margin-left: 15px;
}

.skeleton-block {
	border-radius: 4px;
	background-color: #f0f2f5;
}

/* 模拟具体文字的长宽比例 */
.title-block {
	width: 60%;
	height: 16px;
}

.desc-block {
	width: 40%;
	height: 13px;
}

.value-block {
	width: 48px;
	height: 16px;
}

.desc-right-block {
	width: 64px;
	height: 13px;
}

/* 核心呼吸扫光动效 */
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
