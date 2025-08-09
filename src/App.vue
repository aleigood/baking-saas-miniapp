<script setup lang="ts">
	import { onLaunch } from '@dcloudio/uni-app';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';

	onLaunch(async () => {
		console.log('App Launch');
		const userStore = useUserStore();
		const dataStore = useDataStore();

		if (userStore.token) {
			try {
				await userStore.fetchUserInfo();
				await dataStore.fetchTenants();
				// [核心修改] 使用 reLaunch 代替 switchTab
				uni.reLaunch({
					url: '/pages/production/production',
				});
			} catch (error) {
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