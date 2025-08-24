<template>
	<scroll-view class="animated-tabs-container" :scroll-x="true" :show-scrollbar="false" scroll-with-animation
		:scroll-into-view="activeTabDomId">
		<view class="tabs-wrapper">
			<view v-for="(tab) in tabs" :key="tab.key" :id="'tab-' + tab.key" class="tab-item"
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

	watch(() => props.modelValue, (newValue) => {
		activeTabDomId.value = `tab-${newValue}`;
	}, { immediate: true });
</script>

<style scoped lang="scss">
	.animated-tabs-container {
		width: 100%;
		white-space: nowrap;
		margin-bottom: 20px;
		/* 新增：将 padding 从 wrapper 移至此处的容器 */
		padding: 5px 15px;
		/* 新增：确保 padding 不会撑大容器宽度，对 scroll-view 很重要 */
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
		/* 移除：此处的 padding 导致了居中偏移问题 */
		/* padding: 5px 15px; */
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