<template>
	<view class="page-header" :style="headerStyle">
		<view class="header-content" :style="contentStyle">
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
	import { ref, computed, getCurrentInstance } from 'vue';
	import { useSystemStore } from '@/store/system';

	defineProps({
		title: {
			type: String,
			required: true,
		},
	});

	const systemStore = useSystemStore();

	// [修改] 计算整个 header 的动态高度
	const headerStyle = computed(() => ({
		height: `${systemStore.headerHeight}px`
	}));

	// [修改] 计算 header 内容区域的动态定位和高度
	const contentStyle = computed(() => ({
		top: `${systemStore.navBarContentTop}px`,
		height: `${systemStore.navBarHeight}px`
	}));

	// 水波纹效果逻辑
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
	/* [核心修改] 将标题样式直接定义在组件内部，以解决 shadow-root 隔离问题 */
	.detail-title {
		/* 使用主题预设的主要文本颜色 */
		color: var(--text-primary);
		/* 按要求设置字体大小 */
		font-size: 18px;
		font-weight: 600;
		flex: 1;
		/* [新增] 以下样式确保文本过长时能优雅地省略 */
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.actions {
		display: flex;
		align-items: center;
	}

	.back-btn .ripple {
		background-color: rgba(0, 0, 0, 0.08);
	}
</style>