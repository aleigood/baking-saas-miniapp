<template>
	<view class="empty-state-container">
		<image v-if="icon" :src="icon" class="empty-icon" mode="aspectFit" />

		<text v-if="title" class="empty-title">{{ title }}</text>

		<text v-if="subtitle" class="empty-subtitle">{{ subtitle }}</text>

		<view v-if="showAction" class="action-btn" @click="handleAction">
			<text>{{ actionText }}</text>
		</view>
	</view>
</template>

<script setup lang="ts">
defineProps({
	icon: {
		type: String,
		default: ''
	},
	title: {
		type: String,
		default: '暂无数据'
	},
	subtitle: {
		type: String,
		default: ''
	},
	showAction: {
		type: Boolean,
		default: false
	},
	actionText: {
		type: String,
		default: '重试'
	}
});

const emit = defineEmits(['action']);

// 触发按钮点击事件
const handleAction = () => {
	emit('action');
};
</script>

<style scoped lang="scss">
.empty-state-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	/* [修复 1: 避开 Header] 引入系统的 var(--header-height)，确保顶部有足够的安全距离 */
	padding: calc(var(--header-height, 80px) + 80px) 20px 80px;
	width: 100%;
	box-sizing: border-box;
}

.empty-icon {
	/* [修复 2: 缩小尺寸] 从 120px 缩小到 80px，让视觉比例更精致 */
	width: 80px;
	height: 80px;
	margin-bottom: 24px;
	/* [修复 3: 柔化颜色] 大幅降低不透明度（0.85 -> 0.35），让深色的图标在浅色背景上显得非常柔和淡雅 */
	opacity: 0.35;
}

.empty-title {
	font-size: 16px;
	color: var(--text-primary);
	font-weight: 500;
	margin-bottom: 8px;
}

.empty-subtitle {
	font-size: 13px;
	color: var(--text-secondary);
	text-align: center;
	margin-bottom: 24px;
	line-height: 1.5;
}

.action-btn {
	padding: 10px 28px;
	border-radius: 20px;
	background-color: var(--primary-color);
	color: #fff;
	font-size: 14px;
	font-weight: 500;
	display: flex;
	justify-content: center;
	align-items: center;
	box-shadow: 0 4px 12px rgba(140, 90, 59, 0.25);
	transition: opacity 0.2s, transform 0.1s;

	&:active {
		opacity: 0.8;
		transform: scale(0.96);
	}
}
</style>
