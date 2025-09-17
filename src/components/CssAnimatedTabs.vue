<template>
	<view
		class="tabs-outer-container"
		:class="{
			'show-left-fade': showLeftFade,
			'show-right-fade': showRightFade
		}"
	>
		<scroll-view class="animated-tabs-container" :scroll-x="true" :show-scrollbar="false" scroll-with-animation :scroll-left="scrollLeft" @scroll="handleScroll">
			<view class="tabs-wrapper">
				<view v-for="(tab, index) in tabs" :key="tab.key" :id="'tab-' + index" class="tab-item" :class="{ active: modelValue === tab.key }" @click="handleClick(tab.key)">
					{{ tab.label }}
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, getCurrentInstance } from 'vue';

const props = defineProps<{
	tabs: {
		key: string;
		label: string;
	}[];
	modelValue: string;
}>();

const emit = defineEmits(['update:modelValue']);

const instance = getCurrentInstance();
const scrollLeft = ref(0);

// [核心新增] 用于控制边缘淡化效果的状态
const isScrollable = ref(false);
const showLeftFade = ref(false);
const showRightFade = ref(false);
let containerInfo: UniApp.BoundingClientRect | null = null;
let wrapperInfo: UniApp.BoundingClientRect | null = null;

const handleClick = (key: string) => {
	emit('update:modelValue', key);
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

watch(
	() => props.modelValue,
	(newValue) => {
		if (!props.tabs || props.tabs.length === 0) {
			return;
		}

		nextTick(() => {
			const activeIndex = props.tabs.findIndex((tab) => tab.key === newValue);
			if (activeIndex === -1) return;

			const query = uni.createSelectorQuery().in(instance);
			query.select('.animated-tabs-container').boundingClientRect();
			query.select('.tabs-wrapper').boundingClientRect();
			query.select(`#tab-${activeIndex}`).boundingClientRect();

			query.exec((rects) => {
				if (rects && rects[0] && rects[1] && rects[2]) {
					containerInfo = rects[0];
					wrapperInfo = rects[1];
					const tabRect = rects[2];

					// 更新滚动状态
					isScrollable.value = wrapperInfo.width > containerInfo.width;
					showRightFade.value = isScrollable.value;

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
.tabs-outer-container {
	position: relative;
	width: 100%;
	padding: 5px 0;
	margin-bottom: 20px;

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

	/* [核心修改] 将渐变色修改为白色 */
	&::before {
		left: 0;
		background: linear-gradient(to right, white, rgba(255, 255, 255, 0));
	}

	/* [核心修改] 将渐变色修改为白色 */
	&::after {
		right: 0;
		background: linear-gradient(to left, white, rgba(255, 255, 255, 0));
	}

	&.show-left-fade::before {
		opacity: 1;
	}
	&.show-right-fade::after {
		opacity: 1;
	}
}

.animated-tabs-container {
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
	display: flex;
	justify-content: center;
	min-width: 100%;
	width: max-content;
	gap: 20px;
	position: relative;
	padding: 0 15px;
	box-sizing: border-box;
}

.tab-item {
	position: relative;
	font-size: 15px;
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
