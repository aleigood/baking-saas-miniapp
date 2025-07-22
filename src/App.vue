<script setup lang="ts">
	import { onLaunch } from '@dcloudio/uni-app';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';

	onLaunch(async () => {
		console.log('App Launch');
		const userStore = useUserStore();
		const dataStore = useDataStore();

		if (userStore.token) {
			// [修正] 应用启动时，不再加载所有业务数据，只加载租户列表和用户信息。
			// 各个页面的具体数据将由页面自己按需加载。
			await dataStore.fetchTenants();
			await userStore.fetchUserInfo();
			uni.switchTab({
				url: '/pages/production/production',
			});
		} else {
			uni.reLaunch({
				url: '/pages/login/login',
			});
		}
	});
</script>

<style lang="scss">
	page {
		background-color: var(--bg-color);
		color: var(--text-primary);
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
			'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
	}
</style>