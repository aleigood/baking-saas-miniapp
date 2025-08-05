<template>
	<view class="login-container">
		<h2 class="title">烘焙SaaS管理端</h2>
		<view class="form-card">
			<input class="input-field" v-model="form.phone" placeholder="请输入手机号" type="tel" />
			<input class="input-field" v-model="form.password" type="password" placeholder="请输入密码" />
			<!-- [修改] 使用新的统一按钮样式 -->
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

	// [重构] 字段从 email 改为 phone
	const form = reactive({
		phone: '13966666666', // 默认值或从缓存读取
		password: '123',
	});

	const handleLogin = async () => {
		loading.value = true;
		// [重构] 调用新的 userStore.login
		const loginSuccess = await userStore.login(form);
		if (loginSuccess) {
			// [修正] 登录成功后，获取用户信息（其中包含租户列表），然后获取业务数据
			await userStore.fetchUserInfo();
			await dataStore.fetchTenants(); // fetchTenants 现在从 userInfo 中读取租户
			uni.showToast({ title: '登录成功', icon: 'success' });
			uni.switchTab({ url: '/pages/production/production' });
		}
		// 登录失败的提示已在 request 工具函数中统一处理
		loading.value = false;
	};
</script>
<style scoped lang="scss">
	/* [修改] 引入全局样式，并移除局部按钮样式 */
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