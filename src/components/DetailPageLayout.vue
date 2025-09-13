<template>
	<view class="detail-page-layout-wrapper">
		<scroll-view
			:scroll-y="true"
			:show-scrollbar="false"
			class="scroll-area"
			:style="{ height: scrollAreaHeight }"
			enhanced
			@scrolltolower="$emit('scrolltolower')"
			@scroll="(e) => $emit('scroll', e)"
		>
			<slot></slot>
		</scroll-view>
		<Toast />
	</view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSystemStore } from '@/store/system';
import Toast from '@/components/Toast.vue';

defineEmits(['scrolltolower', 'scroll']);

// 引入系统信息 store
const systemStore = useSystemStore();

// 动态计算滚动区域的高度，这是确保小程序正常滚动的关键
const scrollAreaHeight = computed(() => {
	// 100vh 是整个屏幕的高度
	// systemStore.headerHeight 是顶部自定义导航栏的高度
	// 滚动区域的高度就是视口高度减去头部高度
	return `calc(100vh - ${systemStore.headerHeight}px)`;
});
</script>

<style scoped lang="scss">
/* 这个包装容器是关键。
	   在父页面中，它将作为 flex: 1 的子元素，从而获得一个明确的、由 flexbox 计算出的高度。
	*/
.detail-page-layout-wrapper {
	flex: 1;
	min-height: 0;
	position: relative;
}

/* 滚动区域不再需要 flex 相关的样式。
	   它的高度完全由 <script> 部分计算出的 scrollAreaHeight 来控制。
	   这避免了样式冲突，是小程序兼容性的关键。
	*/
.scroll-area {
	box-sizing: border-box;
}
</style>
