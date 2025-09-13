<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app';
import { useSystemStore } from '@/store/system';

onLaunch(async () => {
	console.log('App Launch');
	const systemStore = useSystemStore();

	// [核心逻辑] App.vue 的 onLaunch 只负责初始化系统级别的信息
	// 页面导航和登录校验逻辑已移至 main.vue
	systemStore.initSystemInfo();
});
</script>

<style lang="scss">
@import '@/uni.scss';

page {
	background-color: var(--bg-color);
	color: var(--text-primary);
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
}

::-webkit-scrollbar {
	width: 0;
	height: 0;
	color: transparent;
	display: none;
}
</style>
