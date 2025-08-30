<template>
	<scroll-view class="filter-tabs" :scroll-x="true" :show-scrollbar="false" scroll-with-animation
		:scroll-into-view="scrollTargetId">
		<view class="tabs-wrapper">
			<view v-for="(tab, index) in tabs" :key="tab.key" :id="'filter-tab-' + index"
				class="tab-item ripple-container" :class="{ active: modelValue === tab.key }"
				@click="handleClick(tab.key)" @touchstart="handleTouchStart($event, index)">
				<span v-for="ripple in ripples[index]" :key="ripple.id" class="ripple" :style="ripple.style"></span>
				<span class="tab-text">{{ tab.label }}</span>
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
		getCurrentInstance,
		reactive
	} from 'vue';

	const props = defineProps<{
		// [新增] 接收一个由 { key, label } 对象组成的数组
		tabs : {
			key : string | number; label : string
		}[];
		// [新增] 使用 v-model 来双向绑定当前激活的 tab
		modelValue : string | number;
	}>();

	const emit = defineEmits(['update:modelValue']);

	const instance = getCurrentInstance();
	const scrollTargetId = ref('');
	const isFromClick = ref(false);
	const containerInfo = ref<UniApp.BoundingClientRect | null>(null);

	// [新增] 水波纹效果逻辑
	const ripples = reactive<Record<number, any[]>>({});

	/**
	 * [新增] 获取并存储滚动容器的布局信息
	 */
	const getContainerInfo = () => {
		setTimeout(() => {
			const query = uni.createSelectorQuery().in(instance);
			query.select('.filter-tabs').boundingClientRect(rect => {
				if (rect) {
					containerInfo.value = rect;
				}
			}).exec();
		}, 100);
	};

	onMounted(() => {
		getContainerInfo();
	});

	watch(() => props.tabs, (newTabs) => {
		// 清空旧的水波纹记录
		Object.keys(ripples).forEach(key => delete ripples[parseInt(key)]);
		// 为新的 tabs 初始化
		newTabs.forEach((_, index) => {
			ripples[index] = [];
		});
		nextTick(() => {
			getContainerInfo();
		});
	}, {
		deep: true,
		immediate: true
	});


	const handleClick = (key : string | number) => {
		isFromClick.value = true;
		// [核心改造] 移除了 setTimeout，实现立即切换
		emit('update:modelValue', key);
	};

	// [新增] 水波纹触摸事件处理
	const handleTouchStart = (event : TouchEvent, key : number) => {
		const touch = event.touches[0];
		const query = uni.createSelectorQuery().in(instance);
		query.select(`#filter-tab-${key}`).boundingClientRect(rect => {
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
				if (!ripples[key]) ripples[key] = [];
				ripples[key].push(newRipple);
				setTimeout(() => {
					if (ripples[key] && ripples[key].length > 0) ripples[key].shift();
				}, 600);
			}
		}).exec();
	};


	// [新增] 移植过来的核心智能滚动逻辑
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
							scrollTargetId.value = `filter-tab-${targetIndex}`;
						} else {
							const activeTabRect = allTabsRects[activeIndex];
							if (activeTabRect.right > containerContentRight || activeTabRect.left < containerContentLeft) {
								scrollTargetId.value = `filter-tab-${activeIndex}`;
							}
						}

					} else {
						scrollTargetId.value = `filter-tab-${activeIndex}`;
					}
				}).exec();
				isFromClick.value = false;
			} else {
				scrollTargetId.value = `filter-tab-${activeIndex}`;
			}
		});
	}, { immediate: true });
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	/* [核心改造] 样式现在直接作用于 scroll-view */
	.filter-tabs {
		display: flex;
		margin-bottom: 20px;
		overflow-x: auto;
		-ms-overflow-style: none;
		scrollbar-width: none;
		white-space: nowrap;
		width: 100%;
	}

	.filter-tabs::-webkit-scrollbar {
		display: none;
	}

	/* 新增一个 wrapper 来处理内边距和 flex 布局 */
	.tabs-wrapper {
		display: flex;
		gap: 12px;
		padding: 0 15px;
	}

	/* [核心改造] 将原 FilterTab 的样式直接整合到这里 */
	.tab-item {
		padding: 8px 12px;
		border-radius: 20px;
		background: #f3e9e3;
		color: var(--text-secondary);
		font-size: 14px;
		white-space: nowrap;
		position: relative;
		overflow: hidden;
		transform: translateZ(0);
		flex-shrink: 0;
		transition: background-color 0.3s, color 0.3s;
		/* [新增] 增加平滑的过渡效果 */
	}

	.tab-item.active {
		background: var(--primary-color);
		color: white;
	}

	/* [新增] 水波纹和文本的样式 */
	.ripple {
		background-color: rgba(0, 0, 0, 0.1);
	}

	.tab-item.active .ripple {
		background-color: rgba(255, 255, 255, 0.3);
	}

	.tab-text {
		z-index: 1;
		position: relative;
	}
</style>