<template>
	<view class="launch-container">
		<image class="logo" src="/static/icons/croissant.svg" mode="aspectFit"></image>
		<view class="loading-dots">
			<view class="dot"></view>
			<view class="dot"></view>
			<view class="dot"></view>
		</view>
	</view>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useUserStore } from '@/store/user';
import { useDataStore } from '@/store/data';

onMounted(async () => {
	// [核心逻辑] 将原 App.vue 中的启动逻辑迁移至此
	const userStore = useUserStore();
	const dataStore = useDataStore();

	// 1. 检查是否存在 token
	if (userStore.token) {
		try {
			// 2. 获取用户信息
			await userStore.fetchUserInfo();
			if (userStore.userInfo && userStore.userInfo.tenants.length > 0) {
				// [核心修改] 增加对缓存 tenant_id 的校验逻辑
				let currentTenantId = uni.getStorageSync('tenant_id');
				const userHasTenant = userStore.userInfo.tenants.some((t) => t.tenant.id === currentTenantId);

				// 如果缓存的 tenant_id 无效或不存在，则使用用户店铺列表的第一个作为默认
				if (!currentTenantId || !userHasTenant) {
					currentTenantId = userStore.userInfo.tenants[0].tenant.id;
					uni.setStorageSync('tenant_id', currentTenantId);
				}
				dataStore.currentTenantId = currentTenantId; // 确保 dataStore 也同步

				// 4. 查找用户在该店铺的角色
				const currentTenantInfo = userStore.userInfo.tenants.find((t) => t.tenant.id === currentTenantId);

				// 5. 如果角色是 MEMBER，则重定向到面包师专属页面
				if (currentTenantInfo && currentTenantInfo.role === 'MEMBER') {
					uni.reLaunch({
						url: '/pages/baker/main'
					});
				} else {
					// 否则，进入常规主页
					uni.reLaunch({
						url: '/pages/main/main'
					});
				}
			} else {
				// 如果用户信息中没有店铺信息，也跳转到登录页
				userStore.handleUnauthorized();
			}
		} catch (error) {
			console.error('Launch Page: Token validation failed, redirecting to login.', error);
			// 如果获取用户信息失败（例如token过期），则跳转到登录页
			userStore.handleUnauthorized();
		}
	} else {
		// 如果没有 token，直接跳转到登录页
		uni.reLaunch({
			url: '/pages/login/login'
		});
	}
});
</script>

<style scoped lang="scss">
.launch-container {
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	height: 100vh;
	background-color: var(--bg-color);
}

.logo {
	width: 150px;
	height: 150px;
	margin-bottom: 40px;
	animation: float 3s ease-in-out infinite;
}

.loading-dots {
	display: flex;
}

.dot {
	width: 10px;
	height: 10px;
	margin: 0 5px;
	background-color: var(--primary-color);
	border-radius: 50%;
	animation: bounce 1.4s infinite ease-in-out both;
}

.dot:nth-child(1) {
	animation-delay: -0.32s;
}

.dot:nth-child(2) {
	animation-delay: -0.16s;
}

@keyframes float {
	0%,
	100% {
		transform: translateY(0);
	}
	50% {
		transform: translateY(-15px);
	}
}

@keyframes bounce {
	0%,
	80%,
	100% {
		transform: scale(0);
	}
	40% {
		transform: scale(1);
	}
}
</style>
