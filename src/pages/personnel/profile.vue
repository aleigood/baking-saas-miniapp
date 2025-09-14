<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader title="个人信息" />
		<DetailPageLayout>
			<view class="page-content" v-if="editableUser">
				<view class="card">
					<view class="avatar-section">
						<view class="avatar-wrapper" @click="handleChooseAvatar">
							<image class="avatar-image" :src="localAvatarUrl || editableUser.avatarUrl || '/static/icons/person.svg'"></image>
							<view class="avatar-edit-icon">
								<image src="/static/icons/camera.svg" class="camera-icon"></image>
							</view>
						</view>
					</view>
					<FormItem label="姓名">
						<input class="input-field" type="text" v-model="editableUser.name" placeholder="请输入姓名" />
					</FormItem>
					<FormItem label="手机号">
						<input class="input-field is-disabled" type="text" :value="editableUser.phone" disabled />
					</FormItem>
					<AppButton type="primary" full-width @click="handleUpdateProfile" :disabled="isSubmitting" :loading="isSubmitting">
						{{ isSubmitting ? '' : '保存修改' }}
					</AppButton>
				</view>

				<view class="card">
					<view class="card-title">修改密码</view>
					<FormItem label="当前密码">
						<input class="input-field" type="password" v-model="passwordForm.currentPassword" placeholder="请输入当前密码" />
					</FormItem>
					<FormItem label="新密码">
						<input class="input-field" type="password" v-model="passwordForm.newPassword" placeholder="请输入新密码" />
					</FormItem>
					<FormItem label="确认新密码">
						<input class="input-field" type="password" v-model="passwordForm.confirmPassword" placeholder="请再次输入新密码" />
					</FormItem>
					<AppButton type="secondary" full-width @click="handleChangePassword" :disabled="isChangingPassword" :loading="isChangingPassword">
						{{ isChangingPassword ? '' : '确认修改密码' }}
					</AppButton>
				</view>
			</view>
			<view class="loading-spinner" v-else>
				<text>加载中...</text>
			</view>
		</DetailPageLayout>
	</view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useUserStore } from '@/store/user';
import { useToastStore } from '@/store/toast';
import { updateProfile, changePassword } from '@/api/user';
import FormItem from '@/components/FormItem.vue';
import AppButton from '@/components/AppButton.vue';
import DetailHeader from '@/components/DetailHeader.vue';
import DetailPageLayout from '@/components/DetailPageLayout.vue';

// 定义组件选项
defineOptions({
	inheritAttrs: false
});

// Store 初始化
const userStore = useUserStore();
const toastStore = useToastStore();

// 响应式状态
const isSubmitting = ref(false);
const isChangingPassword = ref(false);
const editableUser = ref<{ name: string | null; phone: string; avatarUrl: string | null } | null>(null);
const localAvatarUrl = ref<string | null>(null); // 用于本地预览新头像

const passwordForm = reactive({
	currentPassword: '',
	newPassword: '',
	confirmPassword: ''
});

// onMounted钩子：页面加载时，深拷贝用户信息以进行编辑
onMounted(() => {
	if (userStore.userInfo) {
		editableUser.value = JSON.parse(
			JSON.stringify({
				name: userStore.userInfo.name,
				phone: userStore.userInfo.phone,
				avatarUrl: userStore.userInfo.avatarUrl
			})
		);
	}
});

// 事件处理器：选择头像
const handleChooseAvatar = () => {
	uni.chooseImage({
		count: 1,
		sizeType: ['compressed'],
		sourceType: ['album', 'camera'],
		success: (res) => {
			if (res.tempFilePaths && res.tempFilePaths.length > 0) {
				localAvatarUrl.value = res.tempFilePaths[0];
				// 提示：此处应调用上传服务将图片上传到服务器，并获取URL
				// 例如：const avatarUrl = await uploadFile(localAvatarUrl.value);
				// editableUser.value.avatarUrl = avatarUrl;
				toastStore.show({ message: '头像已选择，请点击保存以上传', type: 'info' });
			}
		}
	});
};

// 事件处理器：更新个人资料
const handleUpdateProfile = async () => {
	if (!editableUser.value) return;

	isSubmitting.value = true;
	try {
		// 提示：在真实场景中，如果 localAvatarUrl 存在，
		// 您需要先调用上传服务，并将返回的URL赋值给 editableUser.value.avatarUrl
		// const remoteUrl = await uploadFile(localAvatarUrl.value);
		// editableUser.value.avatarUrl = remoteUrl;

		const updatedInfo = await updateProfile({
			name: editableUser.value.name || ''
			// avatarUrl: editableUser.value.avatarUrl, // 上传功能实现后取消此行注释
		});

		// 更新 Pinia store 中的用户信息
		userStore.userInfo!.name = updatedInfo.name;
		userStore.userInfo!.avatarUrl = updatedInfo.avatarUrl;

		toastStore.show({ message: '个人信息更新成功', type: 'success' });
		uni.navigateBack();
	} catch (error) {
		console.error('更新个人信息失败:', error);
	} finally {
		isSubmitting.value = false;
	}
};

// 事件处理器：修改密码
const handleChangePassword = async () => {
	if (passwordForm.newPassword !== passwordForm.confirmPassword) {
		toastStore.show({ message: '两次输入的新密码不一致', type: 'error' });
		return;
	}
	if (!passwordForm.currentPassword || !passwordForm.newPassword) {
		toastStore.show({ message: '请输入当前密码和新密码', type: 'error' });
		return;
	}

	isChangingPassword.value = true;
	try {
		await changePassword(passwordForm);
		toastStore.show({ message: '密码修改成功', type: 'success' });
		// 重置表单
		passwordForm.currentPassword = '';
		passwordForm.newPassword = '';
		passwordForm.confirmPassword = '';
	} catch (error: any) {
		console.error('修改密码失败:', error);
	} finally {
		isChangingPassword.value = false;
	}
};
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
@include form-control-styles;

.page-wrapper {
	display: flex;
	flex-direction: column;
	height: 100vh;
}

.avatar-section {
	display: flex;
	justify-content: center;
	margin-bottom: 20px;
}

.avatar-wrapper {
	position: relative;
	width: 100px;
	height: 100px;
}

.avatar-image {
	width: 100%;
	height: 100%;
	border-radius: 50%;
	border: 2px solid var(--border-color);
}

.avatar-edit-icon {
	position: absolute;
	bottom: 0;
	right: 0;
	width: 32px;
	height: 32px;
	background-color: var(--primary-color);
	border-radius: 50%;
	display: flex;
	justify-content: center;
	align-items: center;
	border: 2px solid white;
}

.camera-icon {
	width: 18px;
	height: 18px;
}
</style>
