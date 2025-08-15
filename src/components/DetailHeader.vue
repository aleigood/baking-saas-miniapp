<template>
	<view class="page-header">
		<view class="detail-header">
			<view class="back-btn" @click="navigateBack">&#10094;</view>
			<h2 class="detail-title">{{ title }}</h2>
			<!-- [新增] 插槽用于放置额外的操作按钮，如编辑图标 -->
			<slot></slot>
		</view>
	</view>
</template>

<script setup lang="ts">
	// 定义组件接收的属性
	defineProps({
		title: {
			type: String,
			default: '详情'
		}
	});

	// 返回上一页的逻辑
	const navigateBack = () => {
		uni.navigateBack();
	};
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';
</style>