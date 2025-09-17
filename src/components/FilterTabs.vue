<template>
	<view
		class="tabs-outer-container"
		:class="{
			'show-left-fade': showLeftFade,
			'show-right-fade': showRightFade
		}"
	>
		<scroll-view class="filter-tabs-container" :scroll-x="true" :show-scrollbar="false" scroll-with-animation :scroll-left="scrollLeft" @scroll="handleScroll">
			<view class="tabs-wrapper" id="tabs-wrapper-filter" :class="[align === 'center' ? 'is-centered' : '']">
				<view
					v-for="(tab, index) in tabs"
					:key="tab.key"
					:id="'filter-tab-' + tab.key"
					class="tab-item"
					:class="{ active: modelValue === tab.key, 'tab-item-sm': size === 'sm' }"
					@click="handleClick(tab.key, index)"
				>
					{{ tab.label }}
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, getCurrentInstance } from 'vue';

// 定义组件的 props 和 emits
const props = withDefaults(
	defineProps<{
		tabs: {
			key: string;
			label: string;
		}[];
		modelValue: string;
		size?: 'sm';
		// [核心新增] align prop，用于控制对齐方式
		align?: 'left' | 'center';
	}>(),
	{
		align: 'left' // 默认值为 'left'
	}
);
const emit = defineEmits(['update:modelValue']);

const instance = getCurrentInstance();

const scrollLeft = ref(0);
let wrapperInfo: UniApp.BoundingClientRect | null = null;
let containerInfo: UniApp.BoundingClientRect | null = null;
const tabElementsInfo = ref<any[]>([]);

// [核心新增] 用于控制边缘淡化效果的状态
const isScrollable = ref(false);
const showLeftFade = ref(false);
const showRightFade = ref(false);

// 获取所有 tab 元素的尺寸和位置信息
const getTabsInfo = () => {
	setTimeout(() => {
		const query = uni.createSelectorQuery().in(instance);
		query.select('.filter-tabs-container').boundingClientRect();
		query.select('#tabs-wrapper-filter').boundingClientRect();
		query.selectAll('.tab-item').boundingClientRect();

		query.exec((data) => {
			if (data && data[0] && data[1] && Array.isArray(data[2]) && data[2].length > 0) {
				containerInfo = data[0];
				wrapperInfo = data[1];
				tabElementsInfo.value = data[2];

				// [核心新增] 计算是否需要滚动，并初始化淡化效果的状态
				isScrollable.value = wrapperInfo.width > containerInfo.width;
				showLeftFade.value = false; // 初始在最左侧，不显示左侧淡化
				showRightFade.value = isScrollable.value; // 如果可滚动，初始显示右侧淡化

				updateScrollPosition(props.modelValue);
			}
		});
	}, 100);
};

// [核心新增] scroll-view 的滚动事件处理函数
const handleScroll = (event: any) => {
	if (!isScrollable.value || !containerInfo || !wrapperInfo) return;
	const scroll = event.detail.scrollLeft;
	// 当滚动超过5px时，显示左侧淡出
	showLeftFade.value = scroll > 5;
	// 当滚动位置距离右侧终点超过5px时，显示右侧淡出
	showRightFade.value = scroll < wrapperInfo.width - containerInfo.width - 5;
};

onMounted(() => {
	getTabsInfo();
});

watch(
	() => props.modelValue,
	(newValue) => {
		if (tabElementsInfo.value.length > 0) {
			updateScrollPosition(newValue);
		}
	}
);

watch(
	() => props.tabs,
	() => {
		nextTick(() => {
			getTabsInfo();
		});
	},
	{
		deep: true
	}
);

const updateScrollPosition = (activeKey: string) => {
	if (!containerInfo || !wrapperInfo || tabElementsInfo.value.length === 0) {
		return;
	}

	const activeIndex = props.tabs.findIndex((tab) => tab.key === activeKey);
	if (activeIndex === -1) return;

	const tabRect = tabElementsInfo.value[activeIndex];
	const tabCenterPosition = tabRect.left - wrapperInfo.left + tabRect.width / 2;
	const containerCenterPosition = containerInfo.width / 2;
	let targetScrollLeft = tabCenterPosition - containerCenterPosition;

	const maxScrollLeft = wrapperInfo.width - containerInfo.width;

	if (maxScrollLeft <= 0) {
		scrollLeft.value = 0;
		return;
	}
	targetScrollLeft = Math.max(0, targetScrollLeft);
	targetScrollLeft = Math.min(targetScrollLeft, maxScrollLeft);

	scrollLeft.value = targetScrollLeft;
};

const handleClick = (key: string, index: number) => {
	emit('update:modelValue', key);
};
</script>

<style scoped lang="scss">
/* [核心新增] 外部容器样式 */
.tabs-outer-container {
	position: relative;
	width: 100%;

	/* [核心新增] 定义左右边缘的淡化效果伪元素 */
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

	/* [核心新增] 左侧淡化效果 */
	&::before {
		left: 0;
		background: linear-gradient(to right, var(--bg-color), rgba(253, 248, 242, 0));
	}

	/* [核心新增] 右侧淡化效果 */
	&::after {
		right: 0;
		background: linear-gradient(to left, var(--bg-color), rgba(253, 248, 242, 0));
	}

	/* [核心新增] 控制淡化效果显示的类 */
	&.show-left-fade::before {
		opacity: 1;
	}
	&.show-right-fade::after {
		opacity: 1;
	}
}

.filter-tabs-container {
	width: 100%;
	white-space: nowrap;
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
	position: relative;
	display: flex;
	/* [核心修改] 默认对齐方式为 flex-start (左对齐) */
	justify-content: flex-start;
	min-width: 100%;
	width: max-content;
	gap: 15px;
	padding: 5px 15px; // 将内边距移到这里以兼容淡化效果
	box-sizing: border-box;

	/* [核心新增] 居中对齐的样式 */
	&.is-centered {
		justify-content: center;
	}
}

.tab-item {
	padding: 8px 16px;
	font-size: 15px;
	color: var(--text-secondary);
	background-color: #f3e9e3;
	border-radius: 20px;
	transition: all 0.3s ease;
	-webkit-tap-highlight-color: transparent;

	&.active {
		background-color: var(--primary-color);
		color: white;
		font-weight: 500;
	}

	&.tab-item-sm {
		padding: 6px 12px;
		font-size: 13px;
		border-radius: 16px;
	}
}
</style>
