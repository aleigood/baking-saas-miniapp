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
	} from 'vue';

	const props = defineProps<{
		tabs : {
			key : string; label : string
		}[];
		modelValue : string;
	}>();

	const emit = defineEmits(['update:modelValue']);

	const activeTabDomId = ref('');

	const handleClick = (key : string) => {
		emit('update:modelValue', key);
	};

	// [核心修复] 监听 modelValue 变化，并设置 scroll-into-view
	watch(() => props.modelValue, (newValue) => {
		nextTick(() => {
			// 根据当前激活的 key 找到对应的索引，生成正确的 id
			const activeIndex = props.tabs.findIndex(tab => tab.key === newValue);
			if (activeIndex !== -1) {
				activeTabDomId.value = 'tab-' + activeIndex;
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
		font-weight: 600;
		padding: 8px 0;
		cursor: pointer;
		transition: color 0.3s ease-in-out;
		z-index: 1;
		flex-shrink: 0;
		-webkit-tap-highlight-color: transparent;

		&.active {
			color: var(--primary-color);
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