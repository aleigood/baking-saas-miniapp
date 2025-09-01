<template>
	<scroll-view class="filter-tabs" :scroll-x="true" :show-scrollbar="false" scroll-with-animation
		:scroll-into-view="scrollTargetId">
		<view class="tabs-wrapper">
			<view v-for="(tab, index) in tabs" :key="tab.key" :id="'filter-tab-' + tab.key"
				class="tab-item ripple-container" :class="{ active: modelValue === tab.key }"
				@click="handleClick(tab.key)" @touchstart="handleTouchStart($event, tab.key)">
				<span v-for="ripple in ripples[tab.key]" :key="ripple.id" class="ripple" :style="ripple.style"></span>
				<span class="tab-text">{{ tab.label }}</span>
			</view>
			<view v-if="editable" class="tab-item add-tab ripple-container" @click="$emit('add')"
				@touchstart="handleTouchStart($event, 'add')">
				<span v-for="ripple in ripples['add']" :key="ripple.id" class="ripple" :style="ripple.style"></span>
				<span class="tab-text">+ 添加产品</span>
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
		tabs : {
			key : string | number; label : string
		}[];
		modelValue : string | number;
		editable ?: boolean;
	}>();

	const emit = defineEmits(['update:modelValue', 'add']);

	const instance = getCurrentInstance();
	const scrollTargetId = ref('');
	const isFromClick = ref(false);
	const containerInfo = ref<UniApp.BoundingClientRect | null>(null);

	const ripples = reactive<Record<string | number, any[]>>({
		add: []
	});

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
		Object.keys(ripples).forEach(key => {
			if (key !== 'add') delete ripples[String(key)];
		});
		newTabs.forEach((tab) => {
			ripples[tab.key] = [];
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
		emit('update:modelValue', key);
	};

	const handleTouchStart = (event : TouchEvent, key : string | number) => {
		const touch = event.touches[0];
		const selector = key === 'add' ? '.add-tab' : `#filter-tab-${key}`;
		const query = uni.createSelectorQuery().in(instance);
		query.select(selector).boundingClientRect(rect => {
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

	// [核心修复] 恢复并优化智能滚动逻辑
	watch(() => props.modelValue, (newValue) => {
		if (!props.tabs || props.tabs.length === 0) {
			return;
		}

		nextTick(() => {
			const activeIndex = props.tabs.findIndex(tab => tab.key === newValue);
			if (activeIndex === -1) return;

			const activeTabKey = props.tabs[activeIndex].key;

			if (isFromClick.value) {
				const query = uni.createSelectorQuery().in(instance);
				// 同时获取容器和所有标签项的布局信息
				query.select('.filter-tabs').boundingClientRect();
				query.selectAll('.tab-item:not(.add-tab)').boundingClientRect();

				query.exec((res) => {
					const containerRect = res[0];
					const allTabsRects = res[1];

					if (containerRect && Array.isArray(allTabsRects) && allTabsRects.length > 0 && activeIndex < allTabsRects.length) {

						const containerLeft = containerRect.left;
						const containerRight = containerRect.right;

						let targetScrollIndex = -1;

						// 检查右侧是否需要滚动：下一个标签是否在屏幕外
						if (activeIndex < allTabsRects.length - 1) {
							const nextTabRect = allTabsRects[activeIndex + 1];
							if (nextTabRect.right > containerRight) {
								targetScrollIndex = activeIndex + 1;
							}
						}

						// 检查左侧是否需要滚动：上一个标签是否在屏幕外
						if (activeIndex > 0) {
							const prevTabRect = allTabsRects[activeIndex - 1];
							if (prevTabRect.left < containerLeft) {
								targetScrollIndex = activeIndex - 1;
							}
						}

						// 如果计算出了需要滚动到的目标，则执行滚动
						if (targetScrollIndex !== -1) {
							scrollTargetId.value = `filter-tab-${props.tabs[targetScrollIndex].key}`;
						} else {
							// 如果目标标签自身就在屏幕外，也需要滚动
							const activeTabRect = allTabsRects[activeIndex];
							if (activeTabRect.right > containerRight || activeTabRect.left < containerLeft) {
								scrollTargetId.value = `filter-tab-${activeTabKey}`;
							}
						}
					}
				});
				isFromClick.value = false;
			} else {
				// 如果不是通过点击触发的（例如，页面初始化），直接滚动到目标
				scrollTargetId.value = `filter-tab-${activeTabKey}`;
			}
		});
	}, { immediate: true });
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	.filter-tabs {
		margin-bottom: 20px;
		overflow-x: auto;
		white-space: nowrap;
		box-sizing: border-box;
		padding: 0 5px;
	}

	.filter-tabs::-webkit-scrollbar {
		display: none;
	}

	.tabs-wrapper {
		display: flex;
		gap: 12px;
	}

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
	}

	.tab-item.active {
		background: var(--primary-color);
		color: white;
	}

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

	.add-tab {
		border: 1px dashed var(--primary-color);
		background: transparent;
		color: var(--primary-color);
	}
</style>