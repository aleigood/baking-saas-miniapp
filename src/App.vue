<script setup lang="ts">
	import { onLaunch } from '@dcloudio/uni-app';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';

	onLaunch(async () => {
		console.log('App Launch');
		const userStore = useUserStore();
		const dataStore = useDataStore();

		if (userStore.token) {
			// 初始化时加载租户列表和当前租户的数据
			await dataStore.fetchTenants();
			await dataStore.loadDataForCurrentTenant();
			await userStore.fetchUserInfo();
			uni.switchTab({
				url: '/pages/production/production'
			});
		} else {
			uni.reLaunch({
				url: '/pages/login/login'
			});
		}
	});
</script>

<style lang="scss">
	page {
		background-color: var(--bg-color);
		color: var(--text-primary);
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
	}
</style>