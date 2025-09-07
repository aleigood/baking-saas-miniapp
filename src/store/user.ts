import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { UserInfo, LoginRes } from '@/types/api';
import { useDataStore } from './data';
import { login as loginApi, getProfile } from '@/api/auth';

let logoutTimer : ReturnType<typeof setTimeout> | null = null;

export const useUserStore = defineStore('user', () => {
	const token = ref<string | null>(uni.getStorageSync('token') || null);
	const userInfo = ref<UserInfo | null>(null);

	function setToken(newToken : string) {
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

	function clearAuthAndRedirect() {
		clearSession();
		uni.reLaunch({ url: '/pages/login/login' });
	}

	// [核心修复] 恢复 logout 函数，解决 personnel 页面报错问题
	function logout() {
		clearAuthAndRedirect();
	}

	async function login(credentials : { phone : string; password : string }) {
		if (logoutTimer) {
			clearTimeout(logoutTimer);
			logoutTimer = null;
		}
		clearSession();

		try {
			const res = await loginApi(credentials);
			setToken(res.accessToken);
			return true;
		} catch (error) {
			console.error('Login failed:', error);
			return false;
		}
	}

	async function fetchUserInfo() {
		if (!token.value) {
			throw new Error("No token found");
		};
		try {
			const data = await getProfile();
			userInfo.value = data;
		} catch (error) {
			console.error('Fetch user info failed:', error);
			throw error;
		}
	}

	function scheduleLogout() {
		if (logoutTimer) {
			clearTimeout(logoutTimer);
		}
		logoutTimer = setTimeout(() => {
			clearAuthAndRedirect();
			logoutTimer = null;
		}, 1500);
	}

	return { token, userInfo, login, logout, setToken, fetchUserInfo, clearAuthAndRedirect, scheduleLogout };
});