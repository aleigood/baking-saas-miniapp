<template>
	<view class="login-container">
		<h2 class="title">烘焙SaaS管理端</h2>
		<view class="form-card">
			<input class="input-field" v-model="form.phone" placeholder="请输入手机号" type="tel" />
			<input class="input-field" v-model="form.password" type="password" placeholder="请输入密码" />
			<button class="btn btn-primary btn-full-width" @click="handleLogin" :loading="loading">
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
		phone: '13966666666',
		password: '123',
	});

	const handleLogin = async () => {
		loading.value = true;
		const loginSuccess = await userStore.login(form);
		if (loginSuccess) {
			await userStore.fetchUserInfo();
			await dataStore.fetchTenants();
			uni.showToast({ title: '登录成功', icon: 'success' });
			// [核心修改] 使用 reLaunch 代替 switchTab
			uni.reLaunch({ url: '/pages/production/production' });
		}
		loading.value = false;
	};
</script>
<style scoped lang="scss">
	@import '@/styles/common.scss';

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
</style>