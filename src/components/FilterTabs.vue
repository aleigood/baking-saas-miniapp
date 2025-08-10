<template>
	<view class="filter-tabs">
		<slot></slot>
	</view>
</template>

<script setup lang="ts">
	// 这个组件目前只是一个容器，不需要脚本逻辑
</script>

<style scoped lang="scss">
	.filter-tabs {
		display: flex;
		gap: 10px;
		margin-bottom: 20px;
	}
</style>