import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { UserInfo, LoginRes } from '@/types/api';
import { useDataStore } from './data';
import { login as loginApi, getProfile } from '@/api/auth';

export const useUserStore = defineStore('user', () => {
	const token = ref<string | null>(uni.getStorageSync('token') || null);
	const userInfo = ref<UserInfo | null>(null);
	const isRedirecting = ref(false);

	function setToken(newToken: string) {
		token.value = newToken;
		uni.setStorageSync('token', newToken);
	}

	function clearSession() {
		const dataStore = useDataStore();
		token.value = null;
		userInfo.value = null;
		uni.removeStorageSync('token');
		uni.removeStorageSync('tenant_id');
		dataStore.reset();
	}

	function handleUnauthorized() {
		if (isRedirecting.value) {
			return;
		}
		isRedirecting.value = true;
		clearSession();
		uni.reLaunch({ url: '/pages/login/login' });
	}

	function logout() {
		handleUnauthorized();
	}

	async function login(credentials: { phone: string; password: string }) {
		clearSession();

		try {
			const res = await loginApi(credentials);
			setToken(res.accessToken);
			isRedirecting.value = false;
			return true;
		} catch (error) {
			console.error('Login failed:', error);
			return false;
		}
	}

	async function fetchUserInfo() {
		if (!token.value) {
			throw new Error('No token found');
		}
		try {
			const data = await getProfile();
			userInfo.value = data;
		} catch (error) {
			console.error('Fetch user info failed:', error);
			throw error;
		}
	}

	return { token, userInfo, login, logout, setToken, fetchUserInfo, handleUnauthorized };
});
