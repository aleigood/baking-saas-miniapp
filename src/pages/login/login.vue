<template>
	<view class="login-container">
		<h2 class="title">烘焙SaaS管理端</h2>
		<view class="form-card">
			<input class="input-field" v-model="form.email" placeholder="请输入邮箱" />
			<input class="input-field" v-model="form.password" type="password" placeholder="请输入密码" />
			<button class="login-btn" @click="handleLogin" :loading="loading">
				{{ loading ? '登录中...' : '登 录' }}
			</button>
		</view>
	</view>
</template>
<script lang="ts" setup>
	import { reactive, ref } from 'vue';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';

	const loading = ref(false);
	const userStore = useUserStore();
	const dataStore = useDataStore();
	const form = reactive({
		email: 'owner@example.com',
		password: 'password123',
	});

	const handleLogin = async () => {
		loading.value = true;
		const loginSuccess = await userStore.login(form);
		if (loginSuccess) {
			// [修正] 登录成功后，只加载基础数据，不再加载所有业务数据
			await dataStore.fetchTenants();
			await userStore.fetchUserInfo();
			uni.showToast({ title: '登录成功', icon: 'success' });
			uni.switchTab({ url: '/pages/production/production' });
		}
		// 登录失败的提示已在 store action 中处理
		loading.value = false;
	};
</script>
<style scoped>
	.login-container {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		height: 100vh;
		background-color: var(--bg-color);
		padding: 20px;
	}

	.title {
		color: var(--primary-color);
		font-size: 28px;
		font-weight: 600;
		margin-bottom: 40px;
	}

	.form-card {
		width: 100%;
		background-color: var(--card-bg);
		padding: 30px;
		border-radius: 20px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
	}

	.input-field {
		width: 100%;
		height: 50px;
		background-color: #f7f8fa;
		border-radius: 10px;
		padding: 0 15px;
		margin-bottom: 20px;
		font-size: 16px;
		box-sizing: border-box;
		border: 1px solid var(--border-color);
	}

	.login-btn {
		width: 100%;
		height: 50px;
		line-height: 50px;
		border: none;
		border-radius: 12px;
		background-color: var(--primary-color);
		color: white;
		font-size: 18px;
		margin-top: 10px;
	}
</style>