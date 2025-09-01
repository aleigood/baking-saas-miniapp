<template>
	<scroll-view class="animated-tabs-container" :scroll-x="true" :show-scrollbar="false" scroll-with-animation
		:scroll-left="scrollLeft">
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
	// 新增一个 ref 用于控制 scroll-view 的滚动位置
	const scrollLeft = ref(0);

	const handleClick = (key : string) => {
		emit('update:modelValue', key);
	};

	watch(() => props.modelValue, (newValue) => {
		// [Bug修复] 增加保护，确保 props.tabs 存在后再执行
		if (!props.tabs || props.tabs.length === 0) {
			return;
		}

		nextTick(() => {
			const activeIndex = props.tabs.findIndex(tab => tab.key === newValue);
			if (activeIndex === -1) return;

			// 使用 uni.createSelectorQuery 获取 DOM 元素信息
			const query = uni.createSelectorQuery().in(instance);
			// 查询容器
			query.select('.animated-tabs-container').boundingClientRect();
			// 查询可滚动内容区域
			query.select('.tabs-wrapper').boundingClientRect();
			// 查询当前激活的tab
			query.select(`#tab-${activeIndex}`).boundingClientRect();

			query.exec(rects => {
				// 确保查询结果有效
				if (rects && rects[0] && rects[1] && rects[2]) {
					const containerRect = rects[0]; // 容器的尺寸和位置
					const wrapperRect = rects[1]; // 整个可滚动区域的尺寸和位置
					const tabRect = rects[2]; // 当前激活Tab的尺寸和位置

					// 计算当前激活tab的中心点在可滚动区域中的精确位置
					const tabCenterPosition = (tabRect.left - wrapperRect.left) + (tabRect.width / 2);

					// 计算容器的可视区域中心点位置
					const containerCenterPosition = containerRect.width / 2;

					// 计算要使tab居中，scroll-view需要滚动的目标距离
					let targetScrollLeft = tabCenterPosition - containerCenterPosition;

					// --- 边界检查，处理滚动到两端的情况 ---

					// 计算最大可滚动距离，需要减去容器的左右padding
					const maxScrollLeft = wrapperRect.width - (containerRect.width - 30); // 减去容器左右各15px的内边距

					// 如果可滚动内容未超出容器宽度，则不执行滚动
					if (maxScrollLeft <= 0) {
						scrollLeft.value = 0;
						return;
					}

					// 保证滚动距离不小于0 (不能向左滚出边界)
					targetScrollLeft = Math.max(0, targetScrollLeft);
					// 保证滚动距离不超过最大值 (不能向右滚出边界)
					targetScrollLeft = Math.min(targetScrollLeft, maxScrollLeft);

					// 更新scroll-left属性，平滑地滚动到目标位置
					scrollLeft.value = targetScrollLeft;
				}
			});
		});
	}, {
		immediate: true
	});
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