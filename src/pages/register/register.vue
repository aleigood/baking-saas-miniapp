<template>
	<page-meta page-style="background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader title="注册账号" />
		<DetailPageLayout>
			<view class="page-content">
				<view class="intro-title">创建你的账号</view>
				<view class="intro-desc">注册后可以创建自己的店铺，或接受店铺发来的员工邀请。</view>
				<view class="form-section">
					<FormItem label="姓名">
						<input class="input-field" v-model.trim="form.name" placeholder="请输入姓名" />
					</FormItem>
					<FormItem label="手机号">
						<input class="input-field" v-model.trim="form.phone" type="tel" maxlength="11" placeholder="请输入手机号" />
					</FormItem>
					<FormItem label="登录密码">
						<input class="input-field" v-model="form.password" password placeholder="至少输入8位密码" />
					</FormItem>
					<FormItem label="确认密码">
						<input class="input-field" v-model="confirmPassword" password placeholder="请再次输入密码" />
					</FormItem>
					<AppButton type="primary" full-width :loading="submitting" @click="handleRegister">注册并继续</AppButton>
				</view>
			</view>
		</DetailPageLayout>
		<Toast />
	</view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { register } from '@/api/auth';
import AppButton from '@/components/AppButton.vue';
import DetailHeader from '@/components/DetailHeader.vue';
import DetailPageLayout from '@/components/DetailPageLayout.vue';
import FormItem from '@/components/FormItem.vue';
import Toast from '@/components/Toast.vue';
import { useToastStore } from '@/store/toast';
import { useUserStore } from '@/store/user';

const form = reactive({ name: '', phone: '', password: '' });
const confirmPassword = ref('');
const submitting = ref(false);
const userStore = useUserStore();
const toastStore = useToastStore();

const handleRegister = async () => {
	if (!form.name || !/^1\d{10}$/.test(form.phone)) {
		toastStore.show({ message: '请填写姓名和正确的手机号', type: 'error' });
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
@include form-control-styles;
.page-wrapper { min-height: 100vh; background: var(--bg-color); }
.intro-title { font-size: 24px; font-weight: 700; color: var(--text-primary); margin: 8px 0; }
.intro-desc { font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 26px; }
.form-section { max-width: 520px; }
</style>
