<template>
	<view class="empty-state-container" :class="{ 'is-full-page': fullPage, 'no-animation': !animation }">
		<view class="icon-wrapper">
			<image v-if="icon" :src="icon" class="empty-icon" mode="aspectFit" />
		</view>

		<text class="empty-title" v-if="title">{{ title }}</text>
		<text class="empty-subtitle" v-if="subtitle">{{ subtitle }}</text>

		<view class="action-wrapper" v-if="showAction">
			<AppButton :type="actionType" size="md" @click="$emit('action')">
				{{ actionText }}
			</AppButton>
		</view>
	</view>
</template>

<script setup lang="ts">
import AppButton from '@/components/AppButton.vue';

defineProps({
	icon: { type: String, default: '' },
	title: { type: String, default: '暂无数据' },
	subtitle: { type: String, default: '' },
	showAction: { type: Boolean, default: false },
	actionText: { type: String, default: '重试' },
	actionType: { type: String, default: 'primary' },
	// 控制是否为独立页面占位，如果是，会自动避开顶部的 Header
	fullPage: { type: Boolean, default: false },
	// 是否显示进场动效
	animation: { type: Boolean, default: true }
});

defineEmits(['action']);
</script>

<style scoped lang="scss">
@import '@/styles/common.scss'; // 确保可以访问到全局变量

.empty-state-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 40px 20px;
	box-sizing: border-box;
	width: 100%;
	opacity: 0;
	transform: translateY(10px);
	animation: fadeInEmpty 0.4s ease-out forwards;

	/* 如果关闭动画 */
	&.no-animation {
		opacity: 1;
		transform: translateY(0);
		animation: none;
	}

	/* 独立全屏页面占位模式：视觉更稳重、更靠上 */
	&.is-full-page {
		// 降低下移距离，使其更靠近 Header，视觉更稳定。从 15vh 降为 10vh
		padding-top: calc(var(--header-height, 80px) + 10vh);
		min-height: 100vh;
		justify-content: flex-start;
	}
}

/* 呼吸进场动画 */
@keyframes fadeInEmpty {
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

/* 图标包裹层：大幅缩小尺寸，换成极淡的主题色背景托底，使其低调 */
.icon-wrapper {
	// 尺寸大幅从 130x130 降为 100x100
	width: 100px;
	height: 100px;
	// 使用极淡、接近透明的主题色，拒绝原本刺眼的颜色。从 0.04 降为 0.02
	background-color: rgba(140, 90, 59, 0.02);
	border-radius: 50%;
	display: flex;
	justify-content: center;
	align-items: center;
	// 降低间距，从 24px 降为 16px
	margin-bottom: 16px;
}

.empty-icon {
	// 降低图标本身尺寸，从 68x68 降为 48x48
	width: 48px;
	height: 48px;
	// [核心修改]：如果是 SVG，会变成极其低调的灰色；如果是 PNG，会被淡化。
	// 这使得红色的网络错误图标不再“突兀”
	opacity: 0.6;
	filter: grayscale(100%); // 极其重要：强制图标变灰，使其优雅
}

.empty-title {
	// 降低尺寸，拒绝傻大黑粗。从 18px 降为 16px
	font-size: 16px;
	font-weight: 600;
	// 统一色调：使用更淡、更符合整体基调的主题文字色
	color: rgba(140, 90, 59, 0.9);
	margin-bottom: 8px;
	letter-spacing: 0.3px;
}

.empty-subtitle {
	font-size: 14px;
	// 使用二级文字色，并增加透明度，增加 Typography 的层级感
	color: rgba(140, 90, 59, 0.6);
	text-align: center;
	line-height: 1.6;
	max-width: 85%; // 允许稍微宽一点
}

.action-wrapper {
	// 降低间距
	margin-top: 20px;
	// 降低按钮的宽度约束
	min-width: 130px;
}
</style>
