<template>
	<view v-if="visible" class="modal-overlay" @click="closeModal" @touchmove.stop.prevent="() => {}">
		<view class="modal-content" :style="{ width: width }" @click.stop>
			<view class="modal-header" v-if="title">
				<h3 class="modal-title">{{ title }}</h3>
			</view>
			<slot></slot>
		</view>
	</view>
</template>

<script setup lang="ts">
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
		width: {
			type: String,
			default: '80%', // [核心修改] 将默认宽度从 85% 改为 80%
		},
	});

	const emit = defineEmits(['update:visible']);

	const closeModal = () => {
		emit('update:visible', false);
	};
</script>

<style scoped lang="scss">
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 9999;
	}

	.modal-content {
		background-color: white;
		border-radius: 20px;
		padding: 25px;
		box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
		max-height: 80vh;
		overflow-y: auto;
	}

	.modal-header {
		display: flex;
		justify-content: center;
		align-items: center;
		margin-bottom: 20px;
		padding-bottom: 15px;
		border-bottom: 1px solid var(--border-color);
	}

	.modal-title {
		font-size: 18px;
		font-weight: 600;
		color: var(--text-primary);
	}
</style>