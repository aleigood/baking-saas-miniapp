<script setup lang="ts">
	import { onLaunch } from '@dcloudio/uni-app';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';

	onLaunch(async () => {
		console.log('App Launch');
		const userStore = useUserStore();
		const dataStore = useDataStore();

		if (userStore.token) {
			// [修正] 应用启动时，先获取用户信息，再根据用户信息获取租户列表
			try {
				await userStore.fetchUserInfo();
				await dataStore.fetchTenants(); // fetchTenants 依赖 userInfo
				uni.switchTab({
					url: '/pages/production/production',
				});
			} catch (error) {
				// 如果获取用户信息失败（例如token过期），则跳转到登录页
				uni.reLaunch({
					url: '/pages/login/login',
				});
			}
		} else {
			uni.reLaunch({
				url: '/pages/login/login',
			});
		}
	});
</script>

<style lang="scss">
	/* [新增] 引入全局颜色变量 */
	@import '@/uni.scss';

	page {
		background-color: var(--bg-color);
		color: var(--text-primary);
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans',
			sans-serif;
	}

	/* 隐藏滚动条的样式 */
	::-webkit-scrollbar {
		width: 0;
		height: 0;
		color: transparent;
		display: none;
	}
</style>