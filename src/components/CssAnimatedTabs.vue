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
		// [Bug修复] 增加保护，确保 props.tabs 存在后再执行
		if (!props.tabs) {
			return;
		}

		nextTick(() => {
			const activeIndex = props.tabs.findIndex(tab => tab.key === newValue);
			if (activeIndex === -1) return;

			if (isFromClick.value) {
				const query = uni.createSelectorQuery().in(instance);
				query.selectAll('.tab-item').boundingClientRect(allTabsRects => {
					if (containerInfo.value && Array.isArray(allTabsRects) && allTabsRects.length > 0) {

						const containerContentRight = containerInfo.value.right - 15;
						const containerContentLeft = containerInfo.value.left + 15;

						let targetIndex = activeIndex;

						if (activeIndex < props.tabs.length - 1) {
							const nextTabRect = allTabsRects[activeIndex + 1];
							if (nextTabRect.right > containerContentRight) {
								targetIndex = activeIndex + 1;
							}
						}

						if (activeIndex > 0) {
							const prevTabRect = allTabsRects[activeIndex - 1];
							if (prevTabRect.left < containerContentLeft) {
								targetIndex = activeIndex - 1;
							}
						}

						if (targetIndex !== activeIndex) {
							activeTabDomId.value = `tab-${targetIndex}`;
						} else {
							const activeTabRect = allTabsRects[activeIndex];
							if (activeTabRect.right > containerContentRight || activeTabRect.left < containerContentLeft) {
								activeTabDomId.value = `tab-${activeIndex}`;
							}
						}

					} else {
						activeTabDomId.value = `tab-${activeIndex}`;
					}
				}).exec();
				isFromClick.value = false;
			} else {
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