<script setup lang="ts">
	import { onLaunch } from '@dcloudio/uni-app';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import { useSystemStore } from '@/store/system';

	onLaunch(async () => {
		console.log('App Launch');
		const userStore = useUserStore();
		const dataStore = useDataStore();
		const systemStore = useSystemStore();

		systemStore.initSystemInfo();

		// [核心逻辑] 恢复原有的启动流程
		if (userStore.token) {
			try {
				// 尝试用现有的token获取用户信息，验证其有效性
				await userStore.fetchUserInfo();
				// 如果成功，说明token有效，则继续获取店铺信息并跳转
				if (userStore.userInfo) {
					await dataStore.fetchTenants();
					uni.reLaunch({
						url: '/pages/main/main',
					});
				}
			} catch (error) {
				// 如果获取用户信息失败（例如token过期或无效），则静默停留在登录页
				console.error("App Launch: Token validation failed.", error);
			}
		}
	});
</script>

<style lang="scss">
	@import '@/uni.scss';

	page {
		background-color: var(--bg-color);
		color: var(--text-primary);
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans',
			sans-serif;
	}

	::-webkit-scrollbar {
		width: 0;
		height: 0;
		color: transparent;
		display: none;
	}
</style>