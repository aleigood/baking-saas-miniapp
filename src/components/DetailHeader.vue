<template>
	<view class="page-header">
		<view class="detail-header">
			<view class="back-btn ripple-container" @touchstart="handleTouchStart" @click="navigateBack">
				<!-- 水波纹效果的容器 -->
				<span v-for="ripple in ripples" :key="ripple.id" class="ripple" :style="ripple.style"></span>
				&#10094;
			</view>
			<h2 class="detail-title">{{ title }}</h2>
			<view class="actions">
				<slot></slot>
			</view>
		</view>
	</view>
</template>

<script setup lang="ts">
	import { ref, getCurrentInstance } from 'vue';

	defineProps({
		title: {
			type: String,
			required: true,
		},
	});

	// [新增] 水波纹效果逻辑
	const ripples = ref<any[]>([]);
	const instance = getCurrentInstance();
	const handleTouchStart = (event : TouchEvent) => {
		const touch = event.touches[0];
		const query = uni.createSelectorQuery().in(instance);
		query.select('.ripple-container').boundingClientRect(rect => {
			if (rect) {
				const x = touch.clientX - rect.left;
				const y = touch.clientY - rect.top;
				const size = Math.max(rect.width, rect.height) * 2;
				const newRipple = {
					id: Date.now(),
					style: {
						width: `${size}px`,
						height: `${size}px`,
						top: `${y - size / 2}px`,
						left: `${x - size / 2}px`,
					}
				};
				ripples.value.push(newRipple);
				setTimeout(() => {
					if (ripples.value.length > 0) ripples.value.shift();
				}, 600);
			}
		}).exec();
	};

	const navigateBack = () => {
		uni.navigateBack();
	};
</script>

<style scoped lang="scss">
	// The styles for page-header and detail-header are already in common.scss
	.actions {
		display: flex;
		align-items: center;
	}

	.back-btn .ripple {
		background-color: rgba(0, 0, 0, 0.08);
	}
</style>