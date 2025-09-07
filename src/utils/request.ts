/**
 * 文件路径: /src/utils/request.ts
 * 文件描述: [最终版本] 封装了全局的网络请求，包含统一的认证处理、错误提示和401自动登出逻辑。
 */
import { useUserStore } from '@/store/user';
import { useToastStore } from '@/store/toast';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface RequestOptions {
	url : string;
	method ?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	data ?: any;
	header ?: any;
}

export const request = <T = any>(options : RequestOptions) : Promise<T> => {
	return new Promise((resolve, reject) => {
		const userStore = useUserStore();
		const toastStore = useToastStore();

		let url = BASE_URL + options.url;
		let data = options.data || {};
		const method = options.method || 'GET';

		// 处理 GET 请求的参数拼接
		if (method === 'GET' && Object.keys(data).length > 0) {
			const params = Object.keys(data)
				.map(key => {
					const value = data[key];
					if (Array.isArray(value)) {
						return value.map(item => `${key}=${encodeURIComponent(item)}`).join('&');
					} else if (value !== undefined && value !== null) {
						return `${key}=${encodeURIComponent(value)}`;
					}
					return '';
				})
				.filter(Boolean)
				.join('&');

			if (params) {
				url += (url.includes('?') ? '&' : '?') + params;
				data = {};
			}
		}

		uni.request({
			url: url,
			method: method,
			data: data,
			header: {
				...options.header,
				Authorization: userStore.token ? `Bearer ${userStore.token}` : '',
			},
			success: (res : UniApp.RequestSuccessCallbackResult) => {
				// 核心：处理401 Unauthorized错误
				if (res.statusCode === 401 && options.url !== '/auth/login') {
					toastStore.show({
						message: '登录已过期，请重新登录',
						type: 'error',
					});
					// 调用 userStore 中统一的延时登出方法，防止重复触发
					userStore.scheduleLogout();
					return reject(res);
				}

				// 处理成功的业务请求
				if (res.statusCode >= 200 && res.statusCode < 300) {
					resolve(res.data as T);
				} else {
					// 处理其他HTTP错误（如400, 404, 500等）
					const errorMessage = (res.data as any)?.message || '请求失败，请稍后重试';
					toastStore.show({
						message: Array.isArray(errorMessage) ? errorMessage.join(',') : errorMessage,
						type: 'error'
					});
					reject(res);
				}
			},
			fail: (err) => {
				// 处理网络层面的失败
				toastStore.show({ message: '网络错误，请检查您的连接', type: 'error' });
				reject(err);
			},
		});
	});
};