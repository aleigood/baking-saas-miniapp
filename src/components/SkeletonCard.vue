<template>
	<view class="skeleton-card" :class="[`mode-${mode}`]">
		<template v-if="mode === 'default'">
			<view class="skeleton-header">
				<view class="skeleton-title shimmer"></view>
				<view class="skeleton-icon shimmer"></view>
			</view>
			<view class="skeleton-content">
				<view class="skeleton-row shimmer" style="width: 100%"></view>
				<view class="skeleton-row shimmer" style="width: 80%"></view>
				<view class="skeleton-row shimmer" style="width: 90%"></view>
			</view>
		</template>

		<template v-else-if="mode === 'summary'">
			<view class="summary-item">
				<view class="skeleton-block shimmer value-block"></view>
				<view class="skeleton-block shimmer label-block"></view>
			</view>
			<view class="summary-item">
				<view class="skeleton-block shimmer value-block"></view>
				<view class="skeleton-block shimmer label-block"></view>
			</view>
		</template>

		<template v-else-if="mode === 'ranking'">
			<view class="card-title">
				<view class="skeleton-block shimmer title-block"></view>
			</view>
			<view class="ranking-list">
				<view v-for="i in 10" :key="i" class="ranking-item">
					<view class="skeleton-block shimmer rank-block"></view>
					<view class="skeleton-block shimmer name-block"></view>
					<view class="skeleton-block shimmer count-block"></view>
				</view>
			</view>
		</template>
	</view>
</template>

<script setup lang="ts">
defineProps({
	// 控制卡片内部布局模式: 'default' (通用), 'summary' (生产页摘要), 'ranking' (配方页排行)
	mode: {
		type: String,
		default: 'default'
	}
});
</script>

<style scoped lang="scss">
/* --- 基础卡片外壳样式 --- */
.skeleton-card {
	background: var(--card-bg, #ffffff);
	border-radius: 20px;
	margin-bottom: 20px;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
	box-sizing: border-box;

	/* 根据模式动态调整内边距和布局 */
	&.mode-default,
	&.mode-ranking {
		padding: 20px;
	}

	&.mode-summary {
		padding: 25px 20px;
		display: flex;
		justify-content: space-around;
		text-align: center;
	}
}

/* --- 通用动效与占位块 --- */
.skeleton-block {
	border-radius: 4px;
	background-color: #f0f2f5;
}

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

/* =========================================
   以下为各个具体模式独有的局部样式
   ========================================= */

/* --- Default 模式特有 --- */
.skeleton-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20px;
}
.skeleton-title {
	width: 40%;
	height: 24px;
	border-radius: 6px;
}
.skeleton-icon {
	width: 24px;
	height: 24px;
	border-radius: 50%;
}
.skeleton-content {
	display: flex;
	flex-direction: column;
	gap: 12px;
}
.skeleton-row {
	height: 16px;
	border-radius: 4px;
}

/* --- Summary 模式特有 --- */
.summary-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 10px;
}
.value-block {
	width: 40px;
	height: 26px;
	border-radius: 6px;
}
.label-block {
	width: 70px;
	height: 16px;
}

/* --- Ranking 模式特有 --- */
.card-title {
	margin-bottom: 20px;
	display: flex;
}
.title-block {
	width: 100px;
	height: 20px;
	border-radius: 6px;
}
.ranking-list {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 15px 25px;
	padding-top: 10px;
}
.ranking-item {
	display: flex;
	align-items: center;
	min-height: 20px;
}
.rank-block {
	width: 12px;
	height: 14px;
	flex-shrink: 0;
}
.name-block {
	flex-grow: 1;
	height: 14px;
	margin: 0 8px 0 6px;
}
.count-block {
	width: 32px;
	height: 14px;
	flex-shrink: 0;
}
</style>
