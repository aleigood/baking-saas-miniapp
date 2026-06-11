<template>
	<view v-show="toastStore.isVisible" class="toast-wrapper" :class="animationClass">
		<view class="toast-content">
			{{ toastStore.message }}
		</view>
	</view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useToastStore } from '@/store/toast';
const toastStore = useToastStore();

// animationClass 用于控制进入和离开的动画类
const animationClass = ref('');

let animationTimer: ReturnType<typeof setTimeout> | null = null;

// 获取组件初始化时所在的页面实例，锁定该 Toast 组件所属的页面对象（增加启动防空保护）
const pages = getCurrentPages();
const myPageInstance = pages.length > 0 ? pages[pages.length - 1] : null;

watch(
	() => toastStore.isVisible,
	(newValue) => {
		if (animationTimer) {
			clearTimeout(animationTimer);
		}

		// 检查当前处于栈顶活跃状态的页面是否是本组件所属的页面
		const currentPages = getCurrentPages();
		const activePageInstance = currentPages.length > 0 ? currentPages[currentPages.length - 1] : null;

		// 若当前活跃页面与本组件所在的页面不一致（说明组件在后台），则静默重置状态，不触发动画
		if (activePageInstance !== myPageInstance) {
			animationClass.value = '';
			return;
		}

		if (newValue) {
			animationClass.value = 'toast-fade-in';
		} else {
			// 关键修复：只有在当前页面真正触发过“淡入”显示的情况下，才触发“淡出”隐藏动画
			// 否则直接清空动画类，防止从后台返回前一页时，因 @keyframes fadeOut 的 from { opacity: 1 } 造成 Toast 闪现再消失的 Bug
			if (animationClass.value === 'toast-fade-in') {
				animationClass.value = 'toast-fade-out';
			} else {
				animationClass.value = '';
			}
		}
	}
);
</script>

<style scoped lang="scss">
.toast-wrapper {
	position: fixed;
	/* [样式修改] 调整位置以更贴合屏幕底部，并考虑安全区域 */
	bottom: calc(30px + constant(safe-area-inset-bottom));
	bottom: calc(30px + env(safe-area-inset-bottom));
	left: 50%;
	transform: translateX(-50%);
	z-index: 1000;
	pointer-events: none;
	display: flex;
	justify-content: center;
	/* [样式修改] 限制最大宽度，在大屏幕上更美观 */
	width: 100%;
	max-width: 568px;
	padding: 0 20px;
	box-sizing: border-box;
	opacity: 0;
}

.toast-content {
	padding: 12px 22px;
	/* [样式修改] 采用更圆润的胶囊形状 */
	border-radius: 25px;
	font-size: 14px;
	color: #ffffff;
	/* [样式修改] 采用主题色作为背景，并增加透明度 */
	background-color: rgba(140, 90, 59, 0.85);
	/* [样式修改] 增加毛玻璃效果，提升质感 */
	backdrop-filter: saturate(180%) blur(10px);
	/* [样式修改] 采用更柔和、弥散的阴影 */
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	text-align: center;
	min-width: 150px;
	max-width: 80vw;
	box-sizing: border-box;
}

/* CSS动画定义 */
@keyframes fadeIn {
	from {
		opacity: 0;
		transform: translate(-50%, 20px);
	}

	to {
		opacity: 1;
		transform: translate(-50%, 0);
	}
}

@keyframes fadeOut {
	from {
		opacity: 1;
		transform: translate(-50%, 0);
	}

	to {
		opacity: 0;
		transform: translate(-50%, 20px);
	}
}

/* 应用动画的类 */
.toast-fade-in {
	animation: fadeIn 0.3s ease forwards;
}

.toast-fade-out {
	animation: fadeOut 0.3s ease forwards;
}
</style>
