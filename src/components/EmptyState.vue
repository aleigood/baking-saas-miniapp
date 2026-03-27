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
	/* [专业设计]: 优化顶部留白，营造更好的开阔感和精致感 */
	padding: 80px 20px 60px;
	width: 100%;
	box-sizing: border-box;
}

.empty-icon {
	/* [修复]: 将尺寸从 80px 缩小到 48px，使视觉比例更精致、更协调 */
	width: 48px;
	height: 48px;
	margin-bottom: 20px;
	/* [修复]: 大幅降低不透明度至 0.28，颜色非常淡雅、柔和，与背景更好融合，减少突兀感 */
	opacity: 0.28;
}

.empty-title {
	font-size: 16px;
	/* [核心修改/协调性优化]: 删除了全局的 var(--text-primary)，改为定义专属的、中等深度的暖棕色 */
	/* 这样能极大降低纯黑文字带来的生硬感和 stark 感，与淡化后的图标更协调。 */
	color: #4a3328;
	font-weight: 500;
	margin-bottom: 8px;
}

.empty-subtitle {
	font-size: 13px;
	/* [核心修改/协调性优化]: 删除了全局的 var(--text-secondary)，改为定义专属的、更柔和的暖灰色。 */
	/* 降低其视觉权重，使其柔和地融入背景中。 */
	color: #8c7f76;
	text-align: center;
	margin-bottom: 24px;
	line-height: 1.5;
	/* [专业设计]: 微调排版细节，增加精致感 */
	letter-spacing: 0.5px;
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
