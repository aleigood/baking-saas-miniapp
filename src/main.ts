/**
 * 文件路径: /src/main.ts
 * 文件描述: Vue应用的入口文件。我们需要在这里引入并使用Pinia。
 */
import { createSSRApp } from "vue";
import { createPinia } from 'pinia'; // 引入 createPinia
import App from "./App.vue";

export function createApp() {
	const app = createSSRApp(App);
	app.use(createPinia()); // 使用 Pinia
	return {
		app,
	};
}