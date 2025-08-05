<template>
	<!-- 
    一个通用的、可复用的浮动操作按钮 (FAB) 组件。
    - 包含了 SVG 图标和水波纹点击效果。
    - 通过 v-if 控制显示。
    - 监听 click 事件。
  -->
	<view class="fab" @click="$emit('click')">
		<image class="fab-icon"
			src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z'/%3E%3C/svg%3E" />
	</view>
</template>

<script setup lang="ts">
	// 定义组件可以触发的事件
	defineEmits(['click']);
</script>

<style scoped lang="scss">
	// 样式从全局 common.scss 继承
	@import '@/styles/common.scss';
</style>