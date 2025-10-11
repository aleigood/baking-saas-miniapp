import { createSSRApp } from 'vue';
import * as Pinia from 'pinia';
import App from './App.vue';
import { useToastStore } from '@/store/toast'; // 1. 引入你的 toast store

export function createApp() {
	const app = createSSRApp(App);

	// 使用 Pinia
	app.use(Pinia.createPinia());

	// 2. 在 Pinia 初始化后，获取 store 实例
	// 注意：必须在 app.use(Pinia.createPinia()) 之后才能调用 useToastStore
	const toastStore = useToastStore();

	// 3. 定义需要拦截的 uni-app 页面跳转 API
	const methods = ['navigateTo', 'redirectTo', 'reLaunch', 'switchTab', 'navigateBack'];

	// 4. 循环添加拦截器
	methods.forEach((method) => {
		uni.addInterceptor(method, {
			// invoke 表示在方法执行前进行拦截
			invoke() {
				// 在页面即将跳转之前，调用 hide 方法来强制关闭 Toast
				toastStore.hide();
			},
			fail(err) {
				// 可以在这里处理API调用失败的逻辑，如果不需要可以不写
				console.log('interceptor-fail', err);
			}
		});
	});

	return {
		app,
		Pinia // 此处必须将 Pinia 返回
	};
}
