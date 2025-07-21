<template>
	<!-- 
    一个通用的、可复用的模态框组件。
    - v-model:visible 控制显示和隐藏。
    - title prop 用于设置标题。
    - 点击遮罩层会自动关闭。
    - 使用 <slot> 填充模态框内容。
  -->
	<view v-if="visible" class="modal-overlay" @click.self="handleClose">
		<view class="modal-content" @click.stop>
			<view v-if="title" class="card-title" style="margin-bottom: 20px;">{{ title }}</view>
			<slot></slot>
		</view>
	</view>
</template>

<script setup lang="ts">
	defineProps({
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
</script>

<style scoped lang="scss">
	// 样式直接从 common.scss 继承，保持全局一致
	@import '@/styles/common.scss';
</style>