/**
 * 文件路径: /src/utils/request.ts (已重构)
 * 文件描述: 封装网络请求函数，并从环境变量中读取 API 地址。
 */
import { useUserStore } from '@/store/user';

// [核心重构] 从 Vite 的环境变量中读取 API 基础地址
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface RequestOptions {
	url : string;
	method ?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; // [修正] 增加了 PATCH 方法
	data ?: any;
	header ?: any;
}

export const request = <T = any>(options : RequestOptions) : Promise<T> => {
	return new Promise((resolve, reject) => {
		const userStore = useUserStore();

		uni.request({
			url: BASE_URL + options.url,
			method: options.method || 'GET',
			data: options.data || {},
			header: {
				...options.header,
				'Authorization': userStore.token ? `Bearer ${userStore.token}` : ''
			},
			success: (res : UniApp.RequestSuccessCallbackResult) => {
				// 兼容所有 2xx 状态码
				if (res.statusCode >= 200 && res.statusCode < 300) {
					resolve(res.data as T);
				} else {
					uni.showToast({ title: '请求失败', icon: 'none' });
					reject(res);
				}
			},
			fail: (err) => {
				uni.showToast({ title: '网络错误', icon: 'none' });
				reject(err);
			}
		});
	});
};