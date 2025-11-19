/**
 * 文件路径: /src/utils/request.ts
 * 文件描述: [最终版本] 封装了全局的网络请求，包含统一的认证处理、错误提示和401自动登出逻辑。
 */
import { useUserStore } from '@/store/user';
import { useToastStore } from '@/store/toast';
// [核心修改] 新增导入 useUiStore，用于跨页面传递 Toast 消息
import { useUiStore } from '@/store/ui';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface RequestOptions {
	url: string;
	method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	data?: any;
	header?: any;
}

export const request = <T = any>(options: RequestOptions): Promise<T> => {
	return new Promise((resolve, reject) => {
		const userStore = useUserStore();
		const toastStore = useToastStore();
		// [核心修改] 在请求处理作用域内获取 uiStore 实例
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
					// [新增] 防抖检测：如果应用已经处于重定向流程中，直接忽略后续的并发 401 错误，防止重复弹窗
					if (userStore.isRedirecting) {
						return reject(res);
					}

					// [核心改造] 为 Toast 消息指定目标地址：登录页
					uiStore.setNextPageToast(
						{
							message: '登录已过期，请重新登录',
							type: 'error'
						},
						'/pages/login/login' // 指定登录页为消费者
					);

					userStore.handleUnauthorized();
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
				// [核心改造] 在处理任何网络错误前，首先检查应用是否已处于“正在重定向到登录页”的状态
				if (userStore.isRedirecting) {
					// 如果是，则静默失败，不显示任何额外的Toast，以防止在页面跳转时出现消息闪现。
					// 因为 handleUnauthorized 已经确保了登录页会显示一个明确的提示。
					return reject(err);
				}

				// [核心改造] 对网络错误进行条件化处理
				// 如果是启动时验证用户身份的关键请求失败，则将Toast消息寄往登录页
				if (options.url === '/auth/profile') {
					uiStore.setNextPageToast(
						{
							message: '网络错误，无法验证身份',
							type: 'error'
						},
						'/pages/login/login'
					);
				} else {
					// 对于应用内部的其他普通请求，直接在当前页显示网络错误
					toastStore.show({ message: '网络错误，请检查您的连接', type: 'error' });
				}
				reject(err);
			}
		});
	});
};

/**
 * [新增] 封装 uni.uploadFile 的函数
 * @param options 上传配置
 */
interface UploadFileOptions {
	url: string;
	filePath: string;
	name: string;
	formData?: any;
	header?: any;
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
					// [新增] 防抖检测：同普通请求，防止文件上传时的并发 401 重复触发
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
						toastStore.show({ message: '服务器返回数据格式错误', type: 'error' });
						reject(new Error('Failed to parse server response'));
					}
				} else {
					try {
						const errorData = JSON.parse(res.data);
						const errorMessage = (errorData as any)?.message || '上传失败，请稍后再试';
						toastStore.show({
							message: Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage,
							type: 'error'
						});
						reject(errorData);
					} catch (e) {
						toastStore.show({ message: `上传失败: ${res.statusCode}`, type: 'error' });
						reject(new Error(`Upload failed with status ${res.statusCode}`));
					}
				}
			},
			fail: (err) => {
				if (userStore.isRedirecting) {
					return reject(err);
				}
				toastStore.show({ message: '网络连接错误，上传失败', type: 'error' });
				reject(err);
			}
		});
	});
}
