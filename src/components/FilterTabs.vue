<template>
	<scroll-view class="filter-tabs" :scroll-x="true" :show-scrollbar="false" :scroll-left="scrollLeft" scroll-with-animation>
		<view class="tabs-wrapper">
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
</template>

<script setup lang="ts">
import {
	ref,
	watch,
	nextTick,
	getCurrentInstance,
	reactive,
	computed // [核心新增] 导入 computed
} from 'vue';

const props = defineProps<{
	tabs: {
		key: string | number;
		label: string;
	}[];
	modelValue: string | number;
	editable?: boolean;
	// [核心新增] 新增 size 属性，用于控制标签大小
	size?: 'default' | 'sm';
}>();

const emit = defineEmits(['update:modelValue', 'add']);

// [核心新增] 新增计算属性，根据 size prop 返回对应的 CSS 类
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

// [核心改造] 移除 @touchstart 事件的 .passive 修饰符以解决H5控制台报错
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

.filter-tabs {
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
	width: max-content;
	min-width: 100%;
	/* [核心修改] 增加垂直内边距，为阴影提供显示空间 */
	padding: 5px 0;
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
	transition: background-color 0.3s, color 0.3s, box-shadow 0.28s cubic-bezier(0.4, 0, 0.2, 1); // [核心新增] 增加阴影过渡
}

.tab-item.active {
	background: var(--primary-color);
	color: white;
	/* [核心新增] 为激活的标签页增加一个细微的阴影，使其在视觉上“浮起” */
	box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 1px 3px 1px rgba(0, 0, 0, 0.05);
}

/* [核心新增] 小尺寸标签的样式 */
.tab-item.is-small {
	padding: 6px 10px;
	/* 减小内边距 */
	border-radius: 16px;
	/* 调整圆角以匹配更小的尺寸 */
}

/* [核心新增] 小尺寸标签内部文字的样式 */
.tab-item.is-small .tab-text {
	font-size: 14px;
	/* 设置字体大小为14px */
	font-weight: 400;
	/* 调整字重 */
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
