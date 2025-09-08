<template>
	<view class="login-container">
		<view class="header-bg"></view>

		<view class="content-wrapper" :class="{ 'enter-active': pageLoaded }">
			<!-- [核心修改] 将图标移到最上方 -->
			<image class="logo" src="/static/icons/croissant.svg" mode="aspectFit"></image>

			<view class="welcome-text-group">
				<h1 class="title">欢迎回来,</h1>
				<p class="subtitle">登录您的账户</p>
			</view>

			<view class="form-container">
				<input class="input-field" v-model="form.phone" placeholder="请输入手机号" type="tel" />
				<input class="input-field" v-model="form.password" type="password" placeholder="请输入密码" />
				<AppButton type="primary" full-width :loading="loading" @click="handleLogin" class="login-button">
					{{ loading ? '' : '登 录' }}
				</AppButton>
			</view>
		</view>

		<image class="footer-croissant" src="/static/icons/croissant.svg"></image>

		<Toast />
	</view>
</template>
<script lang="ts" setup>
	import { reactive, ref, onMounted } from 'vue';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import AppButton from '@/components/AppButton.vue';
	import Toast from '@/components/Toast.vue';

	const loading = ref(false);
	const pageLoaded = ref(false);
	const userStore = useUserStore();
	const dataStore = useDataStore();

	const form = reactive({
		phone: '13966666666',
		password: '123',
	});

	onMounted(() => {
		setTimeout(() => {
			pageLoaded.value = true;
		}, 100);
	});

	const handleLogin = async () => {
		loading.value = true;
		const loginSuccess = await userStore.login(form);
		if (loginSuccess) {
			try {
				await userStore.fetchUserInfo();
				await dataStore.fetchTenants();
				uni.reLaunch({ url: '/pages/main/main' });
			} catch (error) {
				loading.value = false;
			}
		} else {
			loading.value = false;
		}
	};
</script>
<style scoped lang="scss">
	@import '@/styles/common.scss';

	.login-container {
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		align-items: center;
		height: 100vh;
		background-color: var(--bg-color);
		padding: 40px;
		box-sizing: border-box;
		overflow: hidden;
		position: relative;
	}

	.header-bg {
		position: absolute;
		top: -15vh;
		left: -20vw;
		width: 140vw;
		height: 40vh;
		background-image: url("@/static/backgrounds/personnel-bg.svg");
		background-size: cover;
		opacity: 0.3;
		transform: rotate(-10deg);
		z-index: 0;
	}

	.content-wrapper {
		width: 100%;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		// [核心修改] 调整上边距，让整体内容更高
		padding-top: 5vh;
		opacity: 0;
		transform: translateY(30px);
		transition: opacity 0.6s ease-out, transform 0.6s ease-out;
	}

	.content-wrapper.enter-active {
		opacity: 1;
		transform: translateY(0);
	}

	.welcome-text-group {
		width: 100%;
	}

	.logo {
		width: 130px;
		height: 130px;
		// [核心修改] 调整与下方文字的间距
		margin-bottom: 30px;
		align-self: center;
	}

	.title {
		color: var(--text-primary);
		font-size: 32px;
		font-weight: 600;
		margin-bottom: 5px;
	}

	.subtitle {
		color: var(--text-secondary);
		font-size: 16px;
		margin-bottom: 40px;
	}

	.form-container {
		width: 100%;
	}

	.input-field {
		width: 100%;
		height: 54px;
		background-color: #ffffff;
		border-radius: 15px;
		padding: 0 20px;
		margin-bottom: 20px;
		font-size: 16px;
		box-sizing: border-box;
		border: 1px solid var(--border-color);
		transition: border-color 0.3s, box-shadow 0.3s;
	}

	.input-field:focus {
		border-color: var(--primary-color);
		box-shadow: 0 0 0 3px rgba(140, 90, 59, 0.1);
	}

	.login-button {
		margin-top: 10px;
	}

	.footer-croissant {
		position: absolute;
		bottom: -15vh;
		right: -10vw;
		width: 60vw;
		height: 60vw;
		opacity: 0.05;
		z-index: 0;
	}
</style>