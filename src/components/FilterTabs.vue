<template>
	<view class="filter-tabs-container" :class="{ 'show-left-fade': showLeftFade, 'show-right-fade': showRightFade }">
		<scroll-view class="filter-tabs" :scroll-x="true" :show-scrollbar="false" :scroll-left="scrollLeft" scroll-with-animation @scroll="handleScroll">
			<view class="tabs-wrapper" :class="wrapperClass">
				<view
					v-for="(tab, index) in tabs"
					:key="tab.key"
					:id="'filter-tab-' + tab.key"
					class="tab-item ripple-container"
					:class="[{ active: modelValue === tab.key }, sizeClass]"
					@click="handleClick(tab.key)"
					@touchstart.passive="handleTouchStart($event, tab.key)"
				>
					<span v-for="ripple in ripples[tab.key]" :key="ripple.id" class="ripple" :style="ripple.style"></span>
					<span class="tab-text">{{ tab.label }}</span>
				</view>
				<view v-if="editable" class="tab-item add-tab ripple-container" :class="sizeClass" @click="$emit('add')" @touchstart.passive="handleTouchStart($event, 'add')">
					<span v-for="ripple in ripples['add']" :key="ripple.id" class="ripple" :style="ripple.style"></span>
					<span class="tab-text">+ 添加产品</span>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, getCurrentInstance, reactive, computed, type PropType } from 'vue';

const props = defineProps({
	tabs: {
		type: Array as PropType<{ key: string | number; label: string }[]>,
		required: true
	},
	modelValue: {
		type: [String, Number] as PropType<string | number>,
		required: true
	},
	editable: {
		type: Boolean,
		default: false
	},
	size: {
		type: String as PropType<'default' | 'sm'>
	},
	align: {
		type: String as PropType<'left' | 'center'>,
		default: 'left'
	}
});

const emit = defineEmits(['update:modelValue', 'add']);

const sizeClass = computed(() => {
	if (props.size === 'sm') {
		return 'is-small';
	}
	return '';
});

const instance = getCurrentInstance();
const scrollLeft = ref(0);
const ripples = reactive<Record<string | number, any[]>>({
	add: []
});

const isScrollable = ref(false); // [核心修改] 将 isOverflowing 重命名为 isScrollable
const wrapperClass = computed(() => {
	if (props.align === 'center' && !isScrollable.value) {
		return 'is-centered';
	}
	return '';
});

// [核心新增] 用于控制边缘渐变效果的状态
const showLeftFade = ref(false);
const showRightFade = ref(false);
let containerInfo: UniApp.BoundingClientRect | null = null;
let wrapperInfo: UniApp.BoundingClientRect | null = null;

// [核心新增] scroll-view 的滚动事件处理函数
const handleScroll = (event: any) => {
	if (!isScrollable.value || !containerInfo || !wrapperInfo) return;
	const scroll = event.detail.scrollLeft;
	// 当滚动超过5px时，显示左侧渐变
	showLeftFade.value = scroll > 5;
	// 当滚动位置距离右侧终点超过5px时，显示右侧渐变
	showRightFade.value = scroll < wrapperInfo.width - containerInfo.width - 5;
};

const checkOverflow = () => {
	nextTick(() => {
		const query = uni.createSelectorQuery().in(instance);
		query.select('.filter-tabs').boundingClientRect();
		query.select('.tabs-wrapper').boundingClientRect();
		query.exec((rects) => {
			if (rects && rects[0] && rects[1]) {
				// [核心修改] 将查询到的 DOM 信息存储起来，供 handleScroll 使用
				containerInfo = rects[0];
				wrapperInfo = rects[1];

				const containerWidth = containerInfo.width;
				const wrapperWidth = wrapperInfo.width;
				isScrollable.value = wrapperWidth > containerWidth + 1;

				// [核心新增] 根据是否可滚动来设置渐变的初始状态
				showLeftFade.value = false; // 初始滚动位置在最左侧，不显示左侧渐变
				showRightFade.value = isScrollable.value; // 如果可滚动，则显示右侧渐变
			}
		});
	});
};

watch(
	[() => props.tabs, () => props.editable],
	() => {
		checkOverflow();
	},
	{
		deep: true,
		immediate: true
	}
);

watch(
	() => props.tabs,
	(newTabs) => {
		Object.keys(ripples).forEach((key) => {
			if (key !== 'add') delete ripples[String(key)];
		});
		newTabs.forEach((tab) => {
			ripples[tab.key] = [];
		});
	},
	{
		deep: true,
		immediate: true
	}
);

const handleClick = (key: string | number) => {
	emit('update:modelValue', key);
};

const handleTouchStart = (event: TouchEvent, key: string | number) => {
	const touch = event.touches[0];
	const selector = key === 'add' ? '.add-tab' : `#filter-tab-${key}`;
	const query = uni.createSelectorQuery().in(instance);
	query
		.select(selector)
		.boundingClientRect((rect) => {
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
						left: `${x - size / 2}px`
					}
				};
				if (!ripples[key]) ripples[key] = [];
				ripples[key].push(newRipple);
				setTimeout(() => {
					if (ripples[key] && ripples[key].length > 0) ripples[key].shift();
				}, 600);
			}
		})
		.exec();
};

watch(
	() => props.modelValue,
	(newValue) => {
		if (!props.tabs || props.tabs.length === 0) {
			return;
		}

		nextTick(() => {
			const activeIndex = props.tabs.findIndex((tab) => tab.key === newValue);
			if (activeIndex === -1) {
				return;
			}

			const query = uni.createSelectorQuery().in(instance);
			query.select('.filter-tabs').boundingClientRect();
			query.select('.tabs-wrapper').boundingClientRect();
			query.selectAll('.tab-item').boundingClientRect();

			query.exec((rects) => {
				if (rects && rects[0] && rects[1] && Array.isArray(rects[2]) && rects[2].length > 0) {
					const containerRect = rects[0];
					const wrapperRect = rects[1];
					let allTabsRects = rects[2];

					if (props.editable && allTabsRects.length > props.tabs.length) {
						allTabsRects = allTabsRects.slice(0, props.tabs.length);
					}

					if (activeIndex >= allTabsRects.length) {
						return;
					}

					const tabRect = allTabsRects[activeIndex];
					const tabCenterPosition = tabRect.left - wrapperRect.left + tabRect.width / 2;
					const containerCenterPosition = containerRect.width / 2;
					let targetScrollLeft = tabCenterPosition - containerCenterPosition;

					const maxScrollLeft = wrapperRect.width - (containerRect.width - 10);
					if (maxScrollLeft <= 0) {
						scrollLeft.value = 0;
						return;
					}
					targetScrollLeft = Math.max(0, targetScrollLeft);
					targetScrollLeft = Math.min(targetScrollLeft, maxScrollLeft);

					scrollLeft.value = targetScrollLeft;
				}
			});
		});
	},
	{
		immediate: true
	}
);
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';

/* [核心新增] 渐变效果的外部容器样式 */
.filter-tabs-container {
	position: relative;
	width: 100%;

	&::before,
	&::after {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		width: 20px;
		z-index: 2;
		pointer-events: none;
		opacity: 0;
		transition: opacity 0.2s ease-in-out;
	}

	/* 将渐变色修改为使用 CSS 变量 (--tabs-container-bg-rgb)
	   父组件可以通过设置这个变量来控制渐变的颜色，使其与容器背景匹配
	   默认回退到 (253, 248, 242)，即 #fdf8f2*/
	&::before {
		left: 0;
		background: linear-gradient(to right, rgb(var(--tabs-container-bg-rgb, 253, 248, 242)), rgba(var(--tabs-container-bg-rgb, 253, 248, 242), 0));
	}

	&::after {
		right: 0;
		background: linear-gradient(to left, rgb(var(--tabs-container-bg-rgb, 253, 248, 242)), rgba(var(--tabs-container-bg-rgb, 253, 248, 242), 0));
	}

	&.show-left-fade::before {
		opacity: 1;
	}
	&.show-right-fade::after {
		opacity: 1;
	}
}

.filter-tabs {
	overflow-x: auto;
	white-space: nowrap;
	box-sizing: border-box;
	/* [核心修改] 移除水平内边距，交由 tabs-wrapper 处理，以确保渐变效果覆盖边缘 */
}

.filter-tabs::-webkit-scrollbar {
	display: none;
}

.tabs-wrapper {
	display: flex;
	gap: 12px;
	width: max-content;
	min-width: 100%;
	/* [核心修改] 增加垂直和水平内边距，为阴影和边缘留出空间 */
	padding: 5px;
	box-sizing: border-box;
}

.tabs-wrapper.is-centered {
	justify-content: center;
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
	transition: background-color 0.3s, color 0.3s, box-shadow 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.tab-item.active {
	background: var(--primary-color);
	color: white;
	box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 1px 3px 1px rgba(0, 0, 0, 0.05);
}

.tab-item.is-small {
	padding: 6px 10px;
	border-radius: 16px;
}

.tab-item.is-small .tab-text {
	font-size: 14px;
	font-weight: 400;
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
	font-size: 16px;
	font-weight: 500;
}

.add-tab {
	border: 1px dashed var(--primary-color);
	background: transparent;
	color: var(--primary-color);
}
</style>
