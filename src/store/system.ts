import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSystemStore = defineStore('system', () => {
	// 状态栏高度
	const statusBarHeight = ref(0);
	// [修改] navBarHeight 现在代表内容区域的实际高度，即胶囊按钮的高度
	const navBarHeight = ref(0);
	// [新增] headerHeight 代表整个自定义导航栏的总高度
	const headerHeight = ref(0);
	// [新增] navBarContentTop 代表内容区域距离屏幕顶部的距离
	const navBarContentTop = ref(0);
	// 胶囊按钮布局信息
	const menuButtonPosition = ref<UniApp.GetMenuButtonBoundingClientRectRes | null>(null);

	/**
	 * 初始化系统信息
	 * @description 在 App.vue 中调用，获取并设置状态栏、导航栏高度等关键布局信息
	 */
	const initSystemInfo = () => {
		try {
			const systemInfo = uni.getSystemInfoSync();
			statusBarHeight.value = systemInfo.statusBarHeight || 0;

			// #ifdef MP-WEIXIN
			const menuButtonInfo = uni.getMenuButtonBoundingClientRect();
			menuButtonPosition.value = menuButtonInfo;

			// [核心修改] 应用新的导航栏高度计算算法
			// 1. 导航栏内容区的高度 = 胶囊按钮高度
			navBarHeight.value = menuButtonInfo.height;
			// 2. 内容区距离屏幕顶部的距离 = 胶囊按钮顶部位置
			navBarContentTop.value = menuButtonInfo.top;
			// 3. 整个自定义导航栏的总高度 = 胶囊按钮底部位置 + 32px 的额外边距
			headerHeight.value = menuButtonInfo.bottom + 32;
			// #endif

			// #ifndef MP-WEIXIN
			// 为非微信小程序平台提供一个默认的导航栏高度
			navBarHeight.value = 44;
			headerHeight.value = (systemInfo.statusBarHeight || 0) + 44;
			navBarContentTop.value = systemInfo.statusBarHeight || 0;
			// #endif

		} catch (e) {
			console.error('获取系统信息失败', e);
			// 在异常情况下提供一个备用值
			statusBarHeight.value = 20;
			navBarHeight.value = 44;
			headerHeight.value = 64;
			navBarContentTop.value = 20;
		}
	};

	return {
		statusBarHeight,
		navBarHeight,
		headerHeight,
		navBarContentTop,
		menuButtonPosition,
		initSystemInfo,
	};
});