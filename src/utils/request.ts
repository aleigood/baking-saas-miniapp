/**
 * 文件路径: /src/utils/request.ts (新建文件)
 * 文件描述: 封装网络请求函数。
 */
import { useUserStore } from '@/store/user';

const BASE_URL = 'http://localhost:3000'; // 您的后端API地址

interface RequestOptions {
	url : string;
	method ?: 'GET' | 'POST' | 'PUT' | 'DELETE';
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
				if (res.statusCode === 200 || res.statusCode === 201) {
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