import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { UserInfo, LoginRes } from '@/types/api';
import { useDataStore } from './data';
import { request } from '@/utils/request';

export const useUserStore = defineStore('user', () => {
	const token = ref<string | null>(uni.getStorageSync('token') || null);
	const userInfo = ref<UserInfo | null>(null);

	function setToken(newToken : string) {
		token.value = newToken;
		uni.setStorageSync('token', newToken);
	}

	async function login(credentials : { email : string; password : string }) {
		try {
			const res = await request<LoginRes>({
				url: '/auth/login',
				method: 'POST',
				data: credentials,
			});
			setToken(res.access_token);
			return true;
		} catch (error) {
			console.error('Login failed:', error);
			uni.showToast({ title: '登录失败，请检查账户信息', icon: 'none' });
			return false;
		}
	}

	async function fetchUserInfo() {
		if (!token.value) return;
		try {
			const data = await request<UserInfo>({ url: '/auth/me' });
			userInfo.value = data;
		} catch (error) {
			console.error('Fetch user info failed:', error);
			logout(); // Token might be invalid, force logout
		}
	}

	function logout() {
		const dataStore = useDataStore();
		token.value = null;
		userInfo.value = null;
		uni.removeStorageSync('token');
		uni.removeStorageSync('tenant_id');
		dataStore.reset();
		uni.reLaunch({ url: '/pages/login/login' });
	}

	// [修正] 移除 loginAndInitData 函数，将逻辑合并回 login 页面
	// 初始化逻辑现在由 App.vue onLaunch 和各个页面的 onShow 负责

	return { token, userInfo, login, setToken, logout, fetchUserInfo };
});