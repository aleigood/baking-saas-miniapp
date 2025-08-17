<template>
	<view v-if="visible" class="modal-overlay" @click="closeModal" @touchmove.stop.prevent="() => {}">
		<view class="modal-content" :style="{ width: width }" :class="{ 'is-options-modal': noHeaderLine }" @click.stop>
			<view class="modal-header" :class="{ 'no-line': noHeaderLine }" v-if="title">
				<h3 class="modal-title">{{ title }}</h3>
			</view>
			<slot></slot>
		</view>
	</view>
</template>

<script setup lang="ts">
	import {
		watch
	} from 'vue';

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
			default: '80%',
		},
		noHeaderLine: {
			type: Boolean,
			default: false,
		}
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
		z-index: 99;
	}

	.modal-content {
		background-color: white;
		border-radius: 20px;
		padding: 25px;
		box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
		max-height: 80vh;
		overflow-y: auto;
	}

	/* 恢复为移除水平内边距的策略，以确保通栏列表项的事件可以被完整触发 */
	.modal-content.is-options-modal {
		padding: 25px 0;
	}

	.modal-header {
		display: flex;
		justify-content: center;
		align-items: center;
		margin-bottom: 20px;
		padding-bottom: 15px;
		border-bottom: 1px solid var(--border-color);
		/* 当父级是 is-options-modal 时，其自身没有水平内边距，所以需要在这里补上 */
		padding-left: 25px;
		padding-right: 25px;
	}

	.modal-header.no-line {
		border-bottom: none;
		padding-bottom: 0;
		margin-bottom: 15px;
	}


	.modal-title {
		font-size: 18px;
		font-weight: 600;
		color: var(--text-primary);
	}
</style>