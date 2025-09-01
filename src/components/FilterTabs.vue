<template>
	<scroll-view class="filter-tabs" :scroll-x="true" :show-scrollbar="false" :scroll-left="scrollLeft"
		scroll-with-animation>
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
	const isFromClick = ref(false);
	const scrollLeft = ref(0);

	const ripples = reactive<Record<string | number, any[]>>({
		add: []
	});

	watch(() => props.tabs, (newTabs) => {
		Object.keys(ripples).forEach(key => {
			if (key !== 'add') delete ripples[String(key)];
		});
		newTabs.forEach((tab) => {
			ripples[tab.key] = [];
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

	watch(() => props.modelValue, (newValue) => {
		if (!props.tabs || props.tabs.length === 0) {
			return;
		}

		nextTick(() => {
			const activeIndex = props.tabs.findIndex(tab => tab.key === newValue);
			if (activeIndex === -1) {
				return;
			}

			setTimeout(() => {
				const query = uni.createSelectorQuery().in(instance);
				query.select('.filter-tabs').fields({
					rect: true,
					scrollOffset: true
				});
				query.selectAll('.tab-item').boundingClientRect();

				query.exec((res) => {
					const containerResult = res[0];
					let allTabsRects = res[1];

					if (!containerResult || !Array.isArray(allTabsRects) || allTabsRects.length === 0) {
						return;
					}

					if (props.editable && allTabsRects.length > props.tabs.length) {
						allTabsRects = allTabsRects.slice(0, props.tabs.length);
					}

					if (activeIndex >= allTabsRects.length) {
						return;
					}

					const currentScrollLeft = containerResult.scrollLeft;
					const containerRect = containerResult;
					const containerWidth = containerRect.width;
					let newScrollLeft = currentScrollLeft;

					if (isFromClick.value) {
						isFromClick.value = false;

						if (activeIndex < allTabsRects.length - 1) {
							const nextTabRect = allTabsRects[activeIndex + 1];
							if (nextTabRect.right > containerRect.right) {
								newScrollLeft = currentScrollLeft + (nextTabRect.right - containerRect.right) + 10;
							}
						}

						if (newScrollLeft === currentScrollLeft && activeIndex > 0) {
							const prevTabRect = allTabsRects[activeIndex - 1];
							if (prevTabRect.left < containerRect.left) {
								newScrollLeft = currentScrollLeft - (containerRect.left - prevTabRect.left) - 10;
							}
						}

						if (newScrollLeft === currentScrollLeft) {
							const activeTabRect = allTabsRects[activeIndex];
							if (activeTabRect.left < containerRect.left) {
								newScrollLeft = currentScrollLeft + (activeTabRect.left - containerRect.left);
							} else if (activeTabRect.right > containerRect.right) {
								newScrollLeft = currentScrollLeft + (activeTabRect.right - containerRect.right);
							}
						}
					} else {
						const activeTabRect = allTabsRects[activeIndex];
						if (activeTabRect.left < containerRect.left) {
							newScrollLeft = currentScrollLeft + (activeTabRect.left - containerRect.left);
						} else if (activeTabRect.right > containerRect.right) {
							newScrollLeft = currentScrollLeft + (activeTabRect.right - containerRect.right);
						}
					}

					if (Math.abs(newScrollLeft - currentScrollLeft) < 1) {
						return;
					}

					scrollLeft.value = newScrollLeft;
				});
			}, 100);
		});
	}, {
		immediate: true
	});
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