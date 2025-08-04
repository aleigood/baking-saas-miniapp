<template>
	<!-- 
    一个通用的、可复用的模态框组件。
    - v-model:visible 控制显示和隐藏。
    - title prop 用于设置标题。
    - 点击遮罩层会自动关闭。
    - 使用 <slot> 填充模态框内容。
  -->
	<view v-if="visible" class="modal-overlay" @click="handleClose">
		<view class="modal-content" @click.stop>
			<view v-if="title" class="card-title" style="margin-bottom: 20px;">{{ title }}</view>
			<slot></slot>
		</view>
	</view>
</template>

<script setup lang="ts">
	// [新增] 引入 watch 用于监听属性变化
	import { watch } from 'vue';

	const props = defineProps({
		visible: {
			type: Boolean,
			default: false,
		},
		title: {
			type: String,
			default: '',
		},
	});

	const emit = defineEmits(['update:visible']);

	const handleClose = () => {
		emit('update:visible', false);
	};

	// [新增] 定义 TabBar 页面的路径列表
	const tabBarPages = [
		'pages/production/production',
		'pages/ingredients/ingredients',
		'pages/recipes/recipes',
		'pages/personnel/personnel',
	];

	// [新增] 监听 visible 属性的变化
	watch(
		() => props.visible,
		(newValue) => {
			// [新增] 获取当前页面栈
			const pages = getCurrentPages();
			if (pages.length === 0) return;

			// [新增] 获取当前页面的路由
			const currentPageRoute = pages[pages.length - 1].route;

			// [新增] 判断当前页面是否是 TabBar 页面
			if (tabBarPages.includes(currentPageRoute)) {
				if (newValue) {
					// [新增] 模态框显示时，隐藏 TabBar
					uni.hideTabBar({
						animation: true, // 可以添加动画效果
					});
				} else {
					// [新增] 模态框关闭时，显示 TabBar
					uni.showTabBar({
						animation: true, // 可以添加动画效果
					});
				}
			}
		},
	);
</script>

<style scoped lang="scss">
	// 样式直接从 common.scss 继承，保持全局一致
	@import '@/styles/common.scss';
</style>