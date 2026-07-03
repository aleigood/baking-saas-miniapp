/**
 * 文件路径: src/api/auth.ts
 * 文件描述: [新增] 封装所有与认证(Auth)相关的API请求。
 */
import { request } from '@/utils/request';
import type { LoginRes, UserInfo, Tenant } from '@/types/api';

/**
 * 使用手机号和密码登录
 * @param credentials 包含手机号和密码的对象
 */
export function login(credentials: { phone: string; password: string }): Promise<LoginRes> {
	return request<LoginRes>({
		url: '/auth/login',
		method: 'POST',
		data: credentials
	});
}

export interface SmsCodeResponse {
	message: string;
	expiresInSeconds: number;
	retryAfterSeconds: number;
	debugCode?: string;
}

export function wechatLogin(code: string): Promise<LoginRes> {
	return request<LoginRes>({ url: '/auth/wechat-login', method: 'POST', data: { code } });
}

export function sendRegistrationCode(phone: string): Promise<SmsCodeResponse> {
	return request<SmsCodeResponse>({ url: '/auth/sms-codes', method: 'POST', data: { phone } });
}

export function sendProfileCode(phone: string): Promise<SmsCodeResponse> {
	return request<SmsCodeResponse>({ url: '/auth/profile-sms-codes', method: 'POST', data: { phone } });
}

export function register(data: { phone: string; password: string; verificationCode: string }): Promise<LoginRes> {
	return request<LoginRes>({ url: '/auth/register', method: 'POST', data });
}

/**
 * 获取当前登录用户的个人资料
 */
export function getProfile(options: { hideErrorToast?: boolean } = {}): Promise<UserInfo> {
	return request<UserInfo>({
		url: '/auth/profile',
		hideErrorToast: options.hideErrorToast
	});
}

/**
 * 切换当前操作的店铺（租户）
 * @param tenantId 要切换到的店铺ID
 */
export function switchTenant(tenantId: string): Promise<LoginRes> {
	return request<LoginRes>({
		url: `/auth/switch-tenant/${tenantId}`,
		method: 'POST'
	});
}

export function bindWechat(code: string): Promise<{ bound: boolean }> {
	return request({ url: '/auth/wechat-bind', method: 'POST', data: { code } });
}
