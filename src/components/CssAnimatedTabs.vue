<template>
	<scroll-view class="animated-tabs-container" :scroll-x="true" :show-scrollbar="false" scroll-with-animation
		:scroll-into-view="activeTabDomId">
		<view class="tabs-wrapper">
			<view v-for="(tab, index) in tabs" :key="tab.key" :id="'tab-' + index" class="tab-item"
				:class="{ active: modelValue === tab.key }" @click="handleClick(tab.key)">
				{{ tab.label }}
			</view>
		</view>
	</scroll-view>
</template>

<script setup lang="ts">
	import {
		ref,
		watch,
		nextTick,
		onMounted,
		getCurrentInstance
	} from 'vue';

	const props = defineProps<{
		tabs : {
			key : string; label : string
		}[];
		modelValue : string;
	}>();

	const emit = defineEmits(['update:modelValue']);

	const instance = getCurrentInstance();
	const activeTabDomId = ref('');
	const isFromClick = ref(false);
	const containerInfo = ref<UniApp.BoundingClientRect | null>(null);

	/**
	 * 获取并存储容器的宽度和位置信息
	 */
	const getContainerInfo = () => {
		setTimeout(() => {
			const query = uni.createSelectorQuery().in(instance);
			query.select('.animated-tabs-container').boundingClientRect(rect => {
				if (rect) {
					containerInfo.value = rect;
				}
			}).exec();
		}, 100);
	};

	onMounted(() => {
		getContainerInfo();
	});

	// 当tabs列表变化时，也需要重新获取容器信息
	watch(() => props.tabs, () => {
		nextTick(() => {
			getContainerInfo();
		});
	}, { deep: true });

	const handleClick = (key : string) => {
		isFromClick.value = true;
		emit('update:modelValue', key);
	};

	watch(() => props.modelValue, (newValue) => {
		nextTick(() => {
			const activeIndex = props.tabs.findIndex(tab => tab.key === newValue);
			if (activeIndex === -1) return;

			if (isFromClick.value) {
				const query = uni.createSelectorQuery().in(instance);
				query.selectAll('.tab-item').boundingClientRect(allTabsRects => {
					if (containerInfo.value && Array.isArray(allTabsRects) && allTabsRects.length > 0) {

						// [核心修正] 计算容器内容区域的实际左右边界，减去15px的内边距
						const containerContentRight = containerInfo.value.right - 15;
						const containerContentLeft = containerInfo.value.left + 15;

						let targetIndex = activeIndex; // 默认目标是当前点击的tab

						// [核心修正] 检查下一个tab是否在内容区可见
						if (activeIndex < props.tabs.length - 1) {
							const nextTabRect = allTabsRects[activeIndex + 1];
							// 如果下一个tab的右边缘超出了内容区的右边缘，则需要滚动
							if (nextTabRect.right > containerContentRight) {
								targetIndex = activeIndex + 1;
							}
						}

						// [核心修正] 检查上一个tab是否在内容区可见
						if (activeIndex > 0) {
							const prevTabRect = allTabsRects[activeIndex - 1];
							// 如果上一个tab的左边缘超出了内容区的左边缘，则需要滚动
							if (prevTabRect.left < containerContentLeft) {
								targetIndex = activeIndex - 1;
							}
						}

						// 只有在计算出的目标索引与当前不一致时才触发滚动
						// 这样可以避免不必要的滚动
						if (targetIndex !== activeIndex) {
							activeTabDomId.value = `tab-${targetIndex}`;
						} else {
							// 如果不需要滚动到邻近的，也要确保当前点击的tab本身是可见的
							const activeTabRect = allTabsRects[activeIndex];
							if (activeTabRect.right > containerContentRight || activeTabRect.left < containerContentLeft) {
								activeTabDomId.value = `tab-${activeIndex}`;
							}
						}

					} else {
						// Fallback: 如果获取布局失败，则直接滚动到当前点击的项
						activeTabDomId.value = `tab-${activeIndex}`;
					}
				}).exec();
				isFromClick.value = false; // 重置点击标记
			} else {
				// 如果是程序化设置，不是用户点击，则直接滚动到目标项
				activeTabDomId.value = `tab-${activeIndex}`;
			}
		});
	}, { immediate: true });
</script>

<style scoped lang="scss">
	.animated-tabs-container {
		width: 100%;
		white-space: nowrap;
		margin-bottom: 20px;
		padding: 5px 15px;
		box-sizing: border-box;

		&::-webkit-scrollbar {
			display: none;
			width: 0 !important;
			height: 0 !important;
			-webkit-appearance: none;
			background: transparent;
		}
	}

	.tabs-wrapper {
		display: flex;
		justify-content: center;
		min-width: 100%;
		width: max-content;
		gap: 20px;
		position: relative;
	}

	.tab-item {
		position: relative;
		font-size: 14px;
		color: var(--text-secondary);
		font-weight: 400;
		padding: 8px 0;
		cursor: pointer;
		transition: color 0.3s ease-in-out, font-weight 0.3s ease-in-out;
		z-index: 1;
		flex-shrink: 0;
		-webkit-tap-highlight-color: transparent;

		&.active {
			color: var(--primary-color);
			font-weight: 600;
		}

		&::after {
			content: '';
			position: absolute;
			bottom: 4px;
			left: 0;
			width: 100%;
			height: 3px;
			background-color: var(--primary-color);
			border-radius: 3px;
			transform: scaleX(0);
			transition: transform 0.3s ease-in-out;
		}

		&.active::after {
			transform: scaleX(1);
		}
	}
</style>