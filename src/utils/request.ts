/**
 * 文件路径: /src/utils/request.ts
 * 文件描述: [最终版本] 封装了全局的网络请求，包含统一的认证处理、错误提示和401自动登出逻辑。
 */
import { useUserStore } from '@/store/user';
import { useToastStore } from '@/store/toast';
import { useUiStore } from '@/store/ui';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface RequestOptions {
	url: string;
	method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	data?: any;
	header?: any;
	/* [新增] 是否隐藏底层的全局错误 Toast 提示。
	   对于有 EmptyState 兜底的页面级初始化请求，可设为 true */
	hideErrorToast?: boolean;
}

export const request = <T = any>(options: RequestOptions): Promise<T> => {
	return new Promise((resolve, reject) => {
		const userStore = useUserStore();
		const toastStore = useToastStore();
		const uiStore = useUiStore();

		let url = BASE_URL + options.url;
		let data = options.data || {};
		const method = options.method || 'GET';

		// 处理 GET 请求的参数拼接
		if (method === 'GET' && Object.keys(data).length > 0) {
			const params = Object.keys(data)
				.map((key) => {
					const value = data[key];
					if (Array.isArray(value)) {
						return value.map((item) => `${key}=${encodeURIComponent(item)}`).join('&');
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
				Authorization: userStore.token ? `Bearer ${userStore.token}` : ''
			},
			success: (res: UniApp.RequestSuccessCallbackResult) => {
				// 核心：处理401 Unauthorized错误
				if (res.statusCode === 401 && options.url !== '/auth/login') {
					if (userStore.isRedirecting) {
						return reject(res);
					}

					uiStore.setNextPageToast(
						{
							message: '登录已过期，请重新登录',
							type: 'error'
						},
						'/pages/login/login'
					);

					userStore.handleUnauthorized();
					return reject(res);
				}

				// 处理成功的业务请求
				if (res.statusCode >= 200 && res.statusCode < 300) {
					resolve(res.data as T);
				} else {
					// [优化] 处理其他HTTP错误：检查是否需要静默
					if (!options.hideErrorToast) {
						const errorMessage = (res.data as any)?.message || '请求失败，请稍后重试';
						toastStore.show({
							message: Array.isArray(errorMessage) ? errorMessage.join(',') : errorMessage,
							type: 'error'
						});
					}
					reject(res);
				}
			},
			fail: (err) => {
				if (userStore.isRedirecting) {
					return reject(err);
				}

				if (options.url === '/auth/profile') {
					uiStore.setNextPageToast(
						{
							message: '网络错误，无法验证身份',
							type: 'error'
						},
						'/pages/login/login'
					);
				} else {
					// [优化] 只有在没有被标记为静默请求时，才弹出全局网络错误
					if (!options.hideErrorToast) {
						toastStore.show({ message: '网络错误，请检查您的连接', type: 'error' });
					}
				}
				reject(err);
			}
		});
	});
};

/**
 * 封装 uni.uploadFile 的函数
 */
interface UploadFileOptions {
	url: string;
	filePath: string;
	name: string;
	formData?: any;
	header?: any;
	hideErrorToast?: boolean; // [新增] 上传同样支持静默模式
}

export function uploadFile<T>(options: UploadFileOptions): Promise<T> {
	return new Promise((resolve, reject) => {
		const userStore = useUserStore();
		const toastStore = useToastStore();
		const uiStore = useUiStore();

		uni.uploadFile({
			url: BASE_URL + options.url,
			filePath: options.filePath,
			name: options.name,
			formData: options.formData,
			header: {
				...options.header,
				Authorization: `Bearer ${userStore.token || ''}`
			},
			success: (res) => {
				if (res.statusCode === 401 && options.url !== '/auth/login') {
					if (userStore.isRedirecting) {
						return reject(new Error('Unauthorized'));
					}

					uiStore.setNextPageToast(
						{
							message: '登录已过期，请重新登录',
							type: 'error'
						},
						'/pages/login/login'
					);
					userStore.handleUnauthorized();
					return reject(new Error('Unauthorized'));
				}

				if (res.statusCode >= 200 && res.statusCode < 300) {
					try {
						const parsedData = JSON.parse(res.data);
						resolve(parsedData as T);
					} catch (e) {
						if (!options.hideErrorToast) toastStore.show({ message: '服务器返回数据格式错误', type: 'error' });
						reject(new Error('Failed to parse server response'));
					}
				} else {
					try {
						const errorData = JSON.parse(res.data);
						if (!options.hideErrorToast) {
							const errorMessage = (errorData as any)?.message || '上传失败，请稍后再试';
							toastStore.show({
								message: Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage,
								type: 'error'
							});
						}
						reject(errorData);
					} catch (e) {
						if (!options.hideErrorToast) toastStore.show({ message: `上传失败: ${res.statusCode}`, type: 'error' });
						reject(new Error(`Upload failed with status ${res.statusCode}`));
					}
				}
			},
			fail: (err) => {
				if (userStore.isRedirecting) {
					return reject(err);
				}
				if (!options.hideErrorToast) {
					toastStore.show({ message: '网络连接错误，上传失败', type: 'error' });
				}
				reject(err);
			}
		});
	});
}
