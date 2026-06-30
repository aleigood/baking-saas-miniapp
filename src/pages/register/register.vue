<template>
	<page-meta page-style="background-color: #fdf8f2;"></page-meta>
	<view class="register-container">
		<!-- 装饰背景容器，防溢出 -->
		<view class="bg-wrapper-overflow-fix">
			<image class="footer-croissant" src="/static/icons/croissant.svg" mode="aspectFit"></image>
		</view>

		<!-- 悬浮返回按钮 (裸箭头样式，无圆形白底和阴影，与系统其他页面统一) -->
		<view class="back-btn-wrapper" :style="{ top: statusBarHeight + 12 + 'px' }" @click="goBack">
			<image class="back-icon" src="/static/icons/arrow-left.svg" mode="aspectFit"></image>
		</view>

		<view class="content-wrapper" :class="{ 'enter-active': pageLoaded }" :style="{ paddingTop: safeAreaTop + 'px' }">
			<image class="logo" src="/static/icons/croissant.svg" mode="aspectFit"></image>

			<view class="welcome-text-group">
				<h1 class="title">创建您的账户</h1>
				<p class="subtitle">接受邀请或开始管理您的烘焙店铺</p>
			</view>

			<view class="form-container">
				<input class="input-field" v-model.trim="form.phone" type="tel" maxlength="11" placeholder="请输入手机号" placeholder-style="color: #c4b5a6;" />
				<view class="verification-row">
					<input
						class="input-field verification-input"
						v-model.trim="form.verificationCode"
						type="number"
						maxlength="6"
						:focus="codeInputFocused"
						placeholder="6位短信验证码"
						placeholder-style="color: #c4b5a6;"
					/>
					<view
						class="send-code-button"
						:class="{ disabled: sendingCode || countdown > 0 || !isPhoneValid }"
						@click="handleSendCode"
					>
						<view v-if="sendingCode" class="mini-spinner"></view>
						<text v-else>{{ countdown > 0 ? `${countdown}s` : '获取验证码' }}</text>
					</view>
				</view>
				<input class="input-field" v-model="form.password" password placeholder="请输入登录密码（至少8位）" placeholder-style="color: #c4b5a6;" />
				<input class="input-field" v-model="confirmPassword" password placeholder="请再次输入确认密码" placeholder-style="color: #c4b5a6;" />

				<!-- 服务协议协议行 -->
				<view class="agreement-row" @click="agreementChecked = !agreementChecked">
					<view class="custom-checkbox" :class="{ 'is-checked': agreementChecked }">
						<view class="checkbox-inner" v-if="agreementChecked"></view>
					</view>
					<view class="agreement-text">
						我已阅读并同意 <text class="link" @click.stop="openAgreement">《服务协议》</text> 与 <text class="link" @click.stop="openPrivacy">《隐私政策》</text>
					</view>
				</view>

				<AppButton type="primary" full-width :loading="submitting" @click="handleRegister" class="register-button">
					{{ submitting ? '' : '注 册 并 继 续' }}
				</AppButton>
				
				<view class="login-link-wrapper" @click="goToLogin">
					<text class="login-link-tip">已有账号？</text>
					<text class="login-link-action">立即登录</text>
				</view>
			</view>
		</view>

		<Toast />
	</view>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { register, sendRegistrationCode } from '@/api/auth';
import { useUserStore } from '@/store/user';
import { useSystemStore } from '@/store/system';
import { useToastStore } from '@/store/toast';
import AppButton from '@/components/AppButton.vue';
import Toast from '@/components/Toast.vue';

const form = reactive({ phone: '', verificationCode: '', password: '' });
const confirmPassword = ref('');
const agreementChecked = ref(false);
const submitting = ref(false);
const sendingCode = ref(false);
const countdown = ref(0);
const codeInputFocused = ref(false);
let countdownTimer: ReturnType<typeof setInterval> | null = null;

const userStore = useUserStore();
const systemStore = useSystemStore();
const toastStore = useToastStore();

const pageLoaded = ref(false);

const statusBarHeight = computed(() => systemStore.statusBarHeight);
const safeAreaTop = computed(() => systemStore.statusBarHeight + 70);
const isPhoneValid = computed(() => /^1\d{10}$/.test(form.phone));

onMounted(() => {
	setTimeout(() => {
		pageLoaded.value = true;
	}, 100);
});

onUnmounted(() => {
	if (countdownTimer) clearInterval(countdownTimer);
});

const startCountdown = (seconds: number) => {
	if (countdownTimer) clearInterval(countdownTimer);
	countdown.value = seconds;
	countdownTimer = setInterval(() => {
		countdown.value -= 1;
		if (countdown.value <= 0 && countdownTimer) {
			clearInterval(countdownTimer);
			countdownTimer = null;
		}
	}, 1000);
};

const handleSendCode = async () => {
	if (sendingCode.value || countdown.value > 0) return;
	if (!isPhoneValid.value) {
		toastStore.show({ message: '请输入正确的11位手机号', type: 'error' });
		return;
	}

	sendingCode.value = true;
	try {
		const result = await sendRegistrationCode(form.phone);
		if (result.debugCode) form.verificationCode = result.debugCode;
		startCountdown(result.retryAfterSeconds || 60);
		toastStore.show({ message: '验证码已发送', type: 'success' });
		codeInputFocused.value = false;
		await nextTick();
		codeInputFocused.value = true;
	} finally {
		sendingCode.value = false;
	}
};

const goBack = () => {
	const pages = getCurrentPages();
	if (pages.length > 1) {
		uni.navigateBack();
	} else {
		uni.navigateTo({ url: '/pages/login/login' });
	}
};

const goToLogin = () => {
	uni.navigateTo({ url: '/pages/login/login' });
};

const openAgreement = () => {
	toastStore.show({ message: '服务协议暂未开放查阅', type: 'info' });
};

const openPrivacy = () => {
	toastStore.show({ message: '隐私政策暂未开放查阅', type: 'info' });
};

const handleRegister = async () => {
	if (!isPhoneValid.value) {
		toastStore.show({ message: '请输入正确的11位手机号', type: 'error' });
		return;
	}
	if (!/^\d{6}$/.test(form.verificationCode)) {
		toastStore.show({ message: '请输入6位短信验证码', type: 'error' });
		return;
	}
	if (form.password.length < 8) {
		toastStore.show({ message: '密码至少需要8位', type: 'error' });
		return;
	}
	if (form.password !== confirmPassword.value) {
		toastStore.show({ message: '两次输入的密码不一致', type: 'error' });
		return;
	}
	if (!agreementChecked.value) {
		toastStore.show({ message: '请先阅读并同意服务协议和隐私政策', type: 'warning' });
		return;
	}
	
	submitting.value = true;
	try {
		const result = await register(form);
		userStore.setToken(result.accessToken);
		await userStore.fetchUserInfo();
		uni.reLaunch({ url: '/pages/onboarding/store-access' });
	} finally {
		submitting.value = false;
	}
};
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';

.register-container {
	display: flex;
	flex-direction: column;
	justify-content: flex-start;
	align-items: center;
	min-height: 100vh;
	background-color: var(--bg-color);
	padding: 0 40px;
	box-sizing: border-box;
	position: relative;
	overflow-x: hidden;
}

/* 防溢出的背景容器 */
.bg-wrapper-overflow-fix {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	overflow: hidden;
	pointer-events: none;
	z-index: 0;
}

.footer-croissant {
	position: absolute;
	bottom: -20vh;
	right: -40vw;
	width: 120vw;
	height: 120vw;
	opacity: 0.05;
}

/* 悬浮返回按钮，去掉圆形白底背景和阴影，还原为裸露箭头以和系统其他页面统一 */
.back-btn-wrapper {
	position: absolute;
	left: 20px;
	width: 36px;
	height: 36px;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 10;
	cursor: pointer;
	-webkit-tap-highlight-color: transparent;
	
	&:active {
		opacity: 0.6;
	}
}

.back-icon {
	width: 20px;
	height: 20px;
	opacity: 0.8;
}

.content-wrapper {
	width: 100%;
	z-index: 1;
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	opacity: 0;
	transform: translateY(30px);
	transition: opacity 0.6s ease-out, transform 0.6s ease-out;
	padding-bottom: calc(30px + env(safe-area-inset-bottom));
	box-sizing: border-box;
}

.content-wrapper.enter-active {
	opacity: 1;
	transform: translateY(0);
}

.welcome-text-group {
	width: 100%;
}

.logo {
	width: 80px;
	height: 80px;
	margin-bottom: 20px;
	align-self: center;
}

.title {
	color: var(--text-primary);
	font-size: 30px;
	font-weight: 600;
	margin-bottom: 5px;
}

.subtitle {
	color: var(--text-secondary);
	font-size: 15px;
	margin-bottom: 30px;
}

.form-container {
	width: 100%;
}

.input-field {
	width: 100%;
	height: 52px;
	background-color: #ffffff;
	border-radius: 15px;
	padding: 0 20px;
	margin-bottom: 16px;
	font-size: 15px;
	box-sizing: border-box;
	border: 1px solid var(--border-color);
	transition: border-color 0.3s, box-shadow 0.3s;
}

.input-field:focus {
	border-color: var(--primary-color);
	box-shadow: 0 0 0 3px rgba(140, 90, 59, 0.1);
}

.verification-row {
	display: flex;
	align-items: stretch;
	gap: 10px;
	margin-bottom: 16px;
}

.verification-input {
	flex: 1;
	min-width: 0;
	margin-bottom: 0;
}

.send-code-button {
	width: 112px;
	height: 52px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 15px;
	background: #f3e9e3;
	color: var(--primary-color);
	font-size: 14px;
	font-weight: 600;
	box-shadow: inset 0 0 0 1px rgba(140, 90, 59, 0.08);
	transition: transform 0.2s ease, opacity 0.2s ease;

	&:active:not(.disabled) {
		transform: scale(0.97);
	}

	&.disabled {
		color: #b0a8a2;
		opacity: 0.72;
	}
}

.mini-spinner {
	width: 16px;
	height: 16px;
	border: 2px solid rgba(140, 90, 59, 0.18);
	border-top-color: var(--primary-color);
	border-radius: 50%;
	animation: mini-spin 0.8s linear infinite;
}

@keyframes mini-spin {
	to { transform: rotate(360deg); }
}

.agreement-row {
	display: flex;
	align-items: flex-start;
	margin: 8px 0 20px 2px;
	cursor: pointer;
	-webkit-tap-highlight-color: transparent; /* 清除默认的蓝色点击高亮 */
}

.custom-checkbox {
	width: 18px;
	height: 18px;
	border: 1.5px solid #c4b5a6;
	border-radius: 50%;
	margin-right: 8px;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	transition: all 0.2s ease;
	margin-top: 1px;
	
	&.is-checked {
		border-color: var(--primary-color);
		background-color: var(--primary-color);
	}
}

.checkbox-inner {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background-color: #ffffff;
}

.agreement-text {
	font-size: 12px;
	color: var(--text-secondary);
	line-height: 1.5;
	
	.link {
		color: var(--primary-color);
		font-weight: 500;
		display: inline-block;
	}
}

.register-button {
	margin-top: 10px;
}

.login-link-wrapper {
	display: flex;
	justify-content: center;
	align-items: center;
	width: 100%;
	margin-top: 24px;
	padding-bottom: 30px;
	font-size: 14px;
	cursor: pointer;
	-webkit-tap-highlight-color: transparent;
}

.login-link-tip {
	color: var(--text-secondary);
}

.login-link-action {
	color: var(--primary-color);
	font-weight: 600;
	margin-left: 4px;
}
</style>
