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
		tabs : {
			key : string | number; label : string
		}[];
		modelValue : string | number;
	}>();

	const emit = defineEmits(['update:modelValue']);

	const instance = getCurrentInstance();
	const scrollTargetId = ref('');
	const isFromClick = ref(false);
	const containerInfo = ref<UniApp.BoundingClientRect | null>(null);

	const ripples = reactive<Record<number, any[]>>({});

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
		Object.keys(ripples).forEach(key => delete ripples[parseInt(key)]);
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
		emit('update:modelValue', key);
	};

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

	watch(() => props.modelValue, (newValue) => {
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

						// [布局修正] 内边距现在在 .filter-tabs 上，所以这里的计算是准确的
						const containerContentRight = containerInfo.value.right;
						const containerContentLeft = containerInfo.value.left;

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

	.filter-tabs {
		margin-bottom: 20px;
		overflow-x: auto;
		white-space: nowrap;
		/* [布局修正] 移除 width: 100% 和 display:flex，让 scroll-view 自然适应父容器宽度 */
		/* [布局修正] 增加 box-sizing 并将内边距移到这里 */
		box-sizing: border-box;
		padding: 0 5px;
	}

	.filter-tabs::-webkit-scrollbar {
		display: none;
	}

	.tabs-wrapper {
		display: flex;
		gap: 12px;
		/* [布局修正] 移除此处的 padding */
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
</style>