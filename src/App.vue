<script lang="ts">
import { defineComponent } from 'vue';
import { useSystemStore } from '@/store/system';

export default defineComponent({
	onLaunch: async function () {
		console.log('App Launch');
		const systemStore = useSystemStore();
		systemStore.initSystemInfo();

		// [核心说明] 移除了原有的身份验证和重定向逻辑
		// 所有启动时的路由判断都已迁移到 pages/launch/launch.vue 页面
	},
	onShow: function () {},
	onHide: function () {}
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
