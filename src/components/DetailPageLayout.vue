<template>
	<view class="detail-page-layout-wrapper" :style="{ '--header-height': systemStore.headerHeight + 'px' }">
		<scroll-view :scroll-y="true" :show-scrollbar="false" class="scroll-area" enhanced @scrolltolower="$emit('scrolltolower')" @scroll="(e) => $emit('scroll', e)">
			<slot></slot>
		</scroll-view>
		<Toast />
	</view>
</template>

<script setup lang="ts">
import { useSystemStore } from '@/store/system';
import Toast from '@/components/Toast.vue';

defineEmits(['scrolltolower', 'scroll']);

// 引入系统信息 store
const systemStore = useSystemStore();
</script>

<style scoped lang="scss">
.detail-page-layout-wrapper {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	width: 100%;
	height: 100%;
	/* [终极杀招 1] 开启溢出隐藏，准备“截断”超出屏幕的滚动条 */
	overflow: hidden;
}

.scroll-area {
	/* [终极杀招 2] 强行让 scroll-view 的宽度超出屏幕 30px，把滚动条挤到屏幕外面去！ */
	width: calc(100% + 30px);
	height: 100%;
	box-sizing: border-box;
	/* [终极杀招 3] 用 30px 的右内边距把内容区域再“挤”回来，确保内容布局丝毫不受影响 */
	padding-right: 30px;
}
</style>
