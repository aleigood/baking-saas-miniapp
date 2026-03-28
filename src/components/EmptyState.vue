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
@import '@/styles/common.scss';

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

	&.no-animation {
		opacity: 1;
		transform: translateY(0);
		animation: none;
	}

	&.is-full-page {
		padding-top: calc(var(--header-height, 80px) + 10vh);
		min-height: 100vh;
		justify-content: flex-start;
	}
}

@keyframes fadeInEmpty {
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

.icon-wrapper {
	width: 100px;
	height: 100px;
	background-color: rgba(140, 90, 59, 0.02);
	border-radius: 50%;
	display: flex;
	justify-content: center;
	align-items: center;
	margin-bottom: 16px;
}

.empty-icon {
	width: 42px;
	height: 42px;
	opacity: 0.2;
	/* [核心魔法：强制暖调染色] 
	  1. grayscale(100%): 无论原图是红绿蓝，先全部拍成灰阶。
	  2. sepia(100%): 给灰阶图强行覆盖一层复古暖黄色调。
	  3. hue-rotate(-15deg): 把偏黄的色调向红/棕方向轻微偏移，精准对齐我们的主题棕。
	  4. saturate(80%): 稍微降低饱和度，显得高级克制。
	*/
	filter: grayscale(100%) sepia(100%) hue-rotate(-15deg) saturate(80%);
}

.empty-title {
	font-size: 16px;
	font-weight: 600;
	color: rgba(140, 90, 59, 0.9);
	margin-bottom: 8px;
	letter-spacing: 0.3px;
}

.empty-subtitle {
	font-size: 14px;
	color: rgba(140, 90, 59, 0.6);
	text-align: center;
	line-height: 1.6;
	max-width: 85%;
}

.action-wrapper {
	margin-top: 20px;
	min-width: 130px;
}
</style>
