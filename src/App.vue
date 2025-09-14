<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app';
import { useSystemStore } from '@/store/system';
import { useUserStore } from '@/store/user';
import { useDataStore } from '@/store/data';

onLaunch(async () => {
	console.log('App Launch');
	const systemStore = useSystemStore();
	systemStore.initSystemInfo();

	// [核心修正] 在应用启动时进行角色判断和路由重定向
	const userStore = useUserStore();
	const dataStore = useDataStore();

	// 1. 检查是否存在 token
	if (userStore.token) {
		try {
			// 2. 获取用户信息
			await userStore.fetchUserInfo();
			if (userStore.userInfo && userStore.userInfo.tenants.length > 0) {
				// 3. 确定当前所在的店铺
				const currentTenantId = uni.getStorageSync('tenant_id') || userStore.userInfo.tenants[0]?.tenant.id;
				if (currentTenantId) {
					dataStore.currentTenantId = currentTenantId; // 确保 dataStore 也同步

					// 4. 查找用户在该店铺的角色
					const currentTenantInfo = userStore.userInfo.tenants.find((t) => t.tenant.id === currentTenantId);

					// 5. 如果角色是 MEMBER，则重定向到面包师专属页面
					if (currentTenantInfo && currentTenantInfo.role === 'MEMBER') {
						uni.reLaunch({
							url: '/pages/baker/main'
						});
					}
				}
			}
		} catch (error) {
			console.error('App Launch: Token validation failed, redirecting to login.', error);
			// 如果获取用户信息失败（例如token过期），则跳转到登录页
			userStore.handleUnauthorized();
		}
	}
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
