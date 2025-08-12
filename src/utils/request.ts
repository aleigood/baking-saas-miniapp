/**
 * 文件路径: /src/utils/request.ts (已重构)
 * 文件描述: 封装网络请求函数，并从环境变量中读取 API 地址。
 */
import { useUserStore } from '@/store/user';

// 从 Vite 的环境变量中读取 API 基础地址
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

		let url = BASE_URL + options.url;
		let data = options.data || {};
		const method = options.method || 'GET';

		// [ADDED] 改进 GET 请求的数组参数序列化
		// uni.request 默认将数组序列化为 'A,B,C'，但更标准的做法是 'key=A&key=B&key=C'
		// 此处手动处理以符合标准实践
		if (method === 'GET' && Object.keys(data).length > 0) {
			const params = new URLSearchParams();
			for (const key in data) {
				if (Object.prototype.hasOwnProperty.call(data, key)) {
					const value = data[key];
					if (Array.isArray(value)) {
						// 如果值是数组，则为数组中的每个元素重复添加键
						value.forEach(item => {
							params.append(key, item);
						});
					} else if (value !== undefined && value !== null) {
						// 其他情况正常添加
						params.append(key, value);
					}
				}
			}
			const queryString = params.toString();

			if (queryString) {
				url += (url.includes('?') ? '&' : '?') + queryString;
				data = {}; // 清空 data 对象，因为参数已经附加到 URL 上
			}
		}


		uni.request({
			url: url, // [MODIFIED] 使用处理过的 URL
			method: method,
			data: data, // [MODIFIED] GET 请求时此对象为空
			header: {
				...options.header,
				Authorization: userStore.token ? `Bearer ${userStore.token}` : '',
			},
			success: (res : UniApp.RequestSuccessCallbackResult) => {
				// 兼容所有 2xx 状态码
				if (res.statusCode >= 200 && res.statusCode < 300) {
					resolve(res.data as T);
				} else {
					// 统一处理错误提示
					const errorMessage = (res.data as any)?.message || '请求失败，请稍后重试';
					uni.showToast({
						title: Array.isArray(errorMessage) ? errorMessage.join(',') : errorMessage,
						icon: 'none',
					});
					reject(res);
				}
			},
			fail: (err) => {
				uni.showToast({ title: '网络错误，请检查您的连接', icon: 'none' });
				reject(err);
			},
		});
	});
};