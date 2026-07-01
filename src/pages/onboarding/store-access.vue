<template>
  <page-meta
    page-style="background-color: #fdf8f2; overflow: hidden;"
  ></page-meta>
  <view
    class="onboarding-wrapper"
    :style="{ paddingTop: statusBarHeight + 'px' }"
  >
    <view class="bg-wrapper-overflow-fix">
      <image
        class="footer-croissant"
        src="/static/icons/croissant.svg"
        mode="aspectFit"
      ></image>
    </view>

    <view class="profile-card-bar">
      <view class="user-meta">
        <UserAvatar
          class="onboarding-avatar"
          :user-id="userStore.userInfo?.id"
          :avatar-url="userStore.authorizedWechatProfile?.avatarUrl || userStore.userInfo?.avatarUrl"
          :size="38"
        />
        <view class="user-info-text">
          <view class="user-name-row">
            <text class="user-name"
              >{{ userStore.authorizedWechatProfile?.nickName || getUserDisplayName(userStore.userInfo) }}</text
            >
            <text class="logout-text-btn" @click="handleLogout">退出登录</text>
          </view>
          <text v-if="userStore.userInfo?.phone" class="user-phone">{{
            userStore.userInfo.phone
          }}</text>
        </view>
      </view>
    </view>

    <view class="welcome-banner" :class="{ 'enter-active': pageLoaded }">
      <view class="banner-title">{{
        hasJoinFlow ? "店铺邀请" : "申请创建店铺"
      }}</view>
      <view class="banner-subtitle">{{
        hasJoinFlow ? "确认店铺信息后申请加入" : "提交信息，开启您的店铺"
      }}</view>
    </view>

    <scroll-view
      scroll-y
      class="cards-scroll-container"
      :show-scrollbar="false"
      :class="{ 'enter-active': pageLoaded }"
    >
      <view class="cards-layout">
        <view v-if="hasJoinFlow" class="guided-card invitation-card">
          <view class="card-header">
            <view class="card-icon-tag bg-cyan"
              ><image
                class="mini-icon"
                src="/static/icons/person.svg"
                mode="aspectFit"
              ></image
            ></view>
            <view class="card-title-group">
              <view class="card-title">收到的店铺邀请</view>
              <view class="card-subtitle">店主确认后即可进入店铺</view>
            </view>
          </view>

          <view v-if="loading" class="loading-state"
            ><view class="spinner"></view><text>正在加载...</text></view
          >
          <view v-else class="invitations-list-wrapper">
            <view
              v-if="showInvitePreview && invitePreview"
              class="invite-preview-card"
            >
              <view class="invite-details-block">
                <view class="invite-detail-item">
                  <text class="invite-detail-label">邀请店铺</text>
                  <text class="invite-detail-val">{{ invitePreview.tenant.name }}</text>
                </view>
                <view class="invite-detail-item">
                  <text class="invite-detail-label">受邀角色</text>
                  <view class="invite-detail-val">
                    <text class="role-capsule" :class="invitePreview.role.toLowerCase()">
                      {{ roleName(invitePreview.role) }}
                    </text>
                  </view>
                </view>
                <view class="invite-detail-item">
                  <text class="invite-detail-label">邀请人</text>
                  <text class="invite-detail-val">{{ invitePreview.inviter }}</text>
                </view>
              </view>
              <view v-if="['OWNER', 'MEMBER'].includes(invitePreview.relationship)" class="invite-relationship-tip">
                {{ invitePreview.relationship === 'OWNER' ? '这是您管理的店铺，无需申请加入' : '您已经是该店铺成员' }}
              </view>
              <view v-else-if="['AVAILABLE', 'REJECTED'].includes(invitePreview.relationship)">
                <AppButton v-slot v-if="!showJoinForm" type="primary" full-width @click="openJoinForm">
                  {{ invitePreview.relationship === 'REJECTED' ? '重新申请加入' : '接受邀请并申请加入' }}
                </AppButton>
                <view v-else class="expanded-join-form" :class="{ 'enter-active': showJoinForm }">
                  <view class="form-divider"></view>
                  
                  <text class="input-label">真实姓名</text>
                  <input class="modern-tenant-input" v-model.trim="profileForm.name" maxlength="30" placeholder="方便店主确认身份" placeholder-style="color: #c4b5a6;" />
                  
                  <text class="input-label">微信昵称 (必填)</text>
                  <input type="nickname" class="modern-tenant-input" placeholder="点击快速填入微信昵称" :value="profileForm.wechatNickname" @blur="onNicknameBlur" placeholder-style="color: #c4b5a6;" />
                  
                  <text class="input-label">手机号</text>
                  <input class="modern-tenant-input" v-model.trim="profileForm.phone" type="number" maxlength="11" placeholder="请输入手机号" placeholder-style="color: #c4b5a6;" />
                  
                  <view v-if="needsPhoneVerification" class="verification-row">
                    <input class="modern-tenant-input verification-input" v-model.trim="profileForm.verificationCode" type="number" maxlength="6" placeholder="短信验证码" placeholder-style="color: #c4b5a6;" />
                    <AppButton type="secondary" size="mini" :loading="smsSending" :disabled="smsCountdown > 0" @click="sendCode">{{ smsCountdown > 0 ? `${smsCountdown}秒` : "获取验证码" }}</AppButton>
                  </view>
                  
                  <view class="form-actions-row">
                    <AppButton
                      type="secondary"
                      class="action-btn"
                      @click="showJoinForm = false"
                      >取消</AppButton
                    >
                    <AppButton
                      type="primary"
                      class="action-btn"
                      :loading="joinSubmitting"
                      @click="confirmJoin"
                      >确认申请</AppButton
                    >
                  </view>
                </view>
              </view>
            </view>
            <view
              v-for="item in memberships"
              :key="item.id"
              class="custom-invitation-item"
            >
              <view class="invitation-detail">
                <text class="invitation-tenant">{{ item.tenant.name }}</text>
                <view class="invitation-badge-row">
                  <text
                    class="role-capsule"
                    :class="item.joinLink.role.toLowerCase()"
                    >{{ roleName(item.joinLink.role) }}</text
                  >
                  <text
                    class="status-text"
                    :class="item.status.toLowerCase()"
                    >{{ membershipStatus(item.status) }}</text
                  >
                </view>
                <text
                  v-if="item.status === 'REJECTED' && item.reviewNote"
                  class="review-note"
                  >{{ item.reviewNote }}</text
                >
              </view>
              <AppButton
                v-if="item.status === 'APPROVED'"
                type="primary"
                size="mini"
                :loading="enteringId === item.id"
                @click="enterTenant(item)"
                >进入</AppButton
              >
            </view>
          </view>
        </view>

        <view v-else class="guided-card create-card">
          <view class="card-header">
            <view class="card-icon-tag" :class="headerIconBgClass">
              <image
                class="mini-icon"
                :src="headerIconSrc"
                mode="aspectFit"
              ></image>
            </view>
            <view class="card-title-group">
              <view class="card-title">{{ headerTitle }}</view>
              <view class="card-subtitle">{{ headerSubtitle }}</view>
            </view>
          </view>

          <view
            v-if="application && application.status === 'PENDING'"
            class="pending-status-container"
          >
            <view class="details-block">
              <view class="detail-item">
                <text class="detail-label">申请店铺</text>
                <text class="detail-val">{{ application.storeName }}</text>
              </view>
              <view class="detail-item">
                <text class="detail-label">店铺地址</text>
                <text class="detail-val">{{ application.address }}</text>
              </view>
              <view class="detail-item" v-if="application.createdAt">
                <text class="detail-label">申请时间</text>
                <text class="detail-val">{{ formatDate(application.createdAt) }}</text>
              </view>
            </view>

            <view class="timeline-wrapper">
              <view class="timeline-step done">
                <view class="step-dot"><view class="inner-dot"></view></view>
                <view class="step-content">
                  <text class="step-title">提交申请</text>
                  <text class="step-desc">资料已成功提交</text>
                </view>
              </view>
              <view class="timeline-step active">
                <view class="step-dot"><view class="inner-dot pulse"></view></view>
                <view class="step-content">
                  <text class="step-title">平台审核中</text>
                  <text class="step-desc">正在为您快速审核，预计 1 个工作日内完成</text>
                </view>
              </view>
            </view>

            <view class="action-footer">
              <AppButton type="secondary" size="mini" @click="cancel" class="cancel-btn">撤回申请</AppButton>
            </view>
          </view>
          <view
            v-else-if="application && application.status === 'APPROVED'"
            class="approved-status-container"
          >
            <view class="success-message-box">
              <image class="success-illustration" src="/static/icons/store.svg" mode="aspectFit" />
              <text class="success-title">开店资料审核已通过！</text>
              <text class="success-desc">您的店铺“{{ application.storeName }}”已准备就绪。</text>
            </view>
            <AppButton
              v-if="application.createdTenant"
              type="primary"
              full-width
              @click="enterApprovedStore"
              >立即进入店铺</AppButton
            >
          </view>
          <view v-else class="create-form-wrapper">
            <view
              v-if="application?.status === 'REJECTED'"
              class="rejected-message"
              >{{ application.reviewNote || "请完善信息后重新提交" }}</view
            >
            <text class="input-label">店铺名称</text>
            <input
              class="modern-tenant-input"
              v-model.trim="form.storeName"
              maxlength="60"
              placeholder="请输入店铺名称"
              placeholder-style="color: #c4b5a6;"
            />
            <text class="input-label">店铺地址</text>
            <input
              class="modern-tenant-input"
              v-model.trim="form.address"
              maxlength="200"
              placeholder="请输入店铺地址"
              placeholder-style="color: #c4b5a6;"
            />
            <view class="profile-section-header">
              <view class="card-icon-tag bg-cyan">
                <image class="mini-icon" src="/static/icons/person.svg" mode="aspectFit" />
              </view>
              <text class="profile-section-title-text">申请人资料</text>
            </view>
            <text class="input-label">真实姓名</text>
            <input class="modern-tenant-input" v-model.trim="profileForm.name" maxlength="30" placeholder="请输入真实姓名" placeholder-style="color: #c4b5a6;" />
            <text class="input-label">微信昵称 (必填)</text>
            <input type="nickname" class="modern-tenant-input" placeholder="点击快速填入微信昵称" :value="profileForm.wechatNickname" @blur="onNicknameBlur" placeholder-style="color: #c4b5a6;" />
            <text class="input-label">手机号</text>
            <input class="modern-tenant-input" v-model.trim="profileForm.phone" type="number" maxlength="11" placeholder="请输入手机号" placeholder-style="color: #c4b5a6;" />
            <view v-if="needsPhoneVerification" class="verification-row">
              <input class="modern-tenant-input verification-input" v-model.trim="profileForm.verificationCode" type="number" maxlength="6" placeholder="短信验证码" placeholder-style="color: #c4b5a6;" />
              <AppButton type="secondary" size="mini" :loading="smsSending" :disabled="smsCountdown > 0" @click="sendCode">{{ smsCountdown > 0 ? `${smsCountdown}秒` : "获取验证码" }}</AppButton>
            </view>
            <AppButton
              type="primary"
              full-width
              :loading="submitting"
              @click="requestSubmit"
              class="action-btn-styled"
              >提交申请</AppButton
            >
          </view>
        </view>
      </view>
    </scroll-view>

    <AppModal v-model:visible="showSubmitConfirm" title="提交开店申请">
      <view class="modal-prompt-text"
        >确认提交“{{ form.storeName }}”的开店申请吗？</view
      >
      <view class="modal-warning-text">提交后，您可以在这里查看审核进度。</view>
      <view class="modal-actions">
        <AppButton
          type="secondary"
          class="modal-btn"
          @click="showSubmitConfirm = false"
          >取消</AppButton
        >
        <AppButton
          type="primary"
          class="modal-btn"
          :loading="submitting"
          @click="submit"
          >确认提交</AppButton
        >
      </view>
    </AppModal>


    <Toast />
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from "vue";
import AppButton from "@/components/AppButton.vue";
import AppModal from "@/components/AppModal.vue";
import Toast from "@/components/Toast.vue";
import UserAvatar from "@/components/UserAvatar.vue";
import { sendProfileCode, switchTenant } from "@/api/auth";
import {
  cancelStoreApplication,
  createStoreApplication,
  getJoinPreview,
  getMyMembershipApplications,
  getStoreApplication,
  submitMembershipApplication,
  type JoinPreview,
  type MembershipApplication,
  type StoreApplication,
} from "@/api/onboarding";
import { useDataStore } from "@/store/data";
import { useSystemStore } from "@/store/system";
import { useToastStore } from "@/store/toast";
import { useUserStore } from "@/store/user";
import type { TenantRole } from "@/types/api";
import { getUserDisplayName } from "@/utils/user-display";

const userStore = useUserStore();
const dataStore = useDataStore();
const systemStore = useSystemStore();
const toastStore = useToastStore();
const statusBarHeight = computed(() => systemStore.statusBarHeight);
const application = ref<StoreApplication | null>(null);

const headerTitle = computed(() => {
  if (!application.value) return "填写店铺资料";
  if (application.value.status === "PENDING") return "店铺申请审核中";
  if (application.value.status === "APPROVED") return "店铺已开通";
  return "填写店铺资料";
});

const headerSubtitle = computed(() => {
  if (!application.value) return "审核通过后，您将成为店主";
  if (application.value.status === "PENDING") return "您的开店申请正在处理";
  if (application.value.status === "APPROVED") return "您的店铺已成功创建";
  return "审核通过后，您将成为店主";
});

const headerIconSrc = computed(() => {
  if (application.value?.status === "PENDING") return "/static/icons/person.svg";
  return "/static/icons/store.svg";
});

const headerIconBgClass = computed(() => {
  if (application.value?.status === "PENDING") return "bg-orange";
  if (application.value?.status === "APPROVED") return "bg-green";
  return "bg-brown";
});

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch (e) {
    return dateStr;
  }
};
const memberships = ref<MembershipApplication[]>([]);
const invitePreview = ref<JoinPreview | null>(null);
const inviteToken = ref("");
const loading = ref(false);
const submitting = ref(false);
const joinSubmitting = ref(false);
const enteringId = ref("");
const showSubmitConfirm = ref(false);
const showJoinForm = ref(false);
const pageLoaded = ref(false);
const smsSending = ref(false);
const smsCountdown = ref(0);
let smsTimer: ReturnType<typeof setInterval> | undefined;
const form = reactive({
  storeName: "",
  address: "",
});
const profileForm = reactive({ name: "", wechatNickname: "", phone: "", verificationCode: "" });
const needsPhoneVerification = computed(
  () => !userStore.userInfo?.phoneVerifiedAt || profileForm.phone !== userStore.userInfo?.phone,
);

const hasJoinFlow = computed(
  () => Boolean(invitePreview.value) || memberships.value.length > 0,
);
const showInvitePreview = computed(() => {
  if (!invitePreview.value) return false;
  return !memberships.value.some(
    (item) =>
      item.tenant.id === invitePreview.value?.tenant.id &&
      ["PENDING", "APPROVED"].includes(item.status),
  );
});

const roleName = (role: TenantRole) =>
  ({ OWNER: "店主", ADMIN: "管理员", MEMBER: "员工" })[role];
const membershipStatus = (status: string) =>
  ({
    PENDING: "等待店主确认",
    APPROVED: "已通过",
    REJECTED: "未通过",
    CANCELED: "已取消",
  })[status] || status;

const load = async () => {
  loading.value = true;
  try {
    inviteToken.value = String(uni.getStorageSync("pending_join_token") || "");
    const [storeApplication, membershipApplications] = await Promise.all([
      getStoreApplication(),
      getMyMembershipApplications(),
    ]);
    application.value = storeApplication;
    memberships.value = membershipApplications;
    if (inviteToken.value) {
      try {
        invitePreview.value = await getJoinPreview(inviteToken.value);
      } catch (error) {
        console.warn("Invalid or expired join token", error);
        uni.removeStorageSync("pending_join_token");
        inviteToken.value = "";
        invitePreview.value = null;
        toastStore.show({ message: "邀请已失效", type: "error" });
      }
    }
  } finally {
    loading.value = false;
  }
};

const activateTenant = async (tenantId: string, role: TenantRole) => {
  const result = await switchTenant(tenantId);
  userStore.setToken(result.accessToken);
  uni.setStorageSync("tenant_id", tenantId);
  dataStore.currentTenantId = tenantId;
  await Promise.all([userStore.fetchUserInfo(), dataStore.fetchTenants()]);
  uni.reLaunch({
    url: role === "MEMBER" ? "/pages/baker/main" : "/pages/main/main",
  });
};

const enterTenant = async (item: MembershipApplication) => {
  enteringId.value = item.id;
  try {
    await activateTenant(item.tenant.id, item.joinLink.role);
  } finally {
    enteringId.value = "";
  }
};

const enterApprovedStore = async () => {
  if (application.value?.createdTenant)
    await activateTenant(application.value.createdTenant.id, "OWNER");
};

const openJoinForm = () => {
  showJoinForm.value = true;
};

const onNicknameBlur = (e: any) => {
  profileForm.wechatNickname = e.detail.value;
};

const sendCode = async () => {
  if (!/^1\d{10}$/.test(profileForm.phone) || smsCountdown.value > 0) {
    if (!/^1\d{10}$/.test(profileForm.phone)) toastStore.show({ message: "请输入正确的手机号", type: "error" });
    return;
  }
  smsSending.value = true;
  try {
    const result = await sendProfileCode(profileForm.phone);
    if (result.debugCode) profileForm.verificationCode = result.debugCode;
    smsCountdown.value = result.retryAfterSeconds;
    smsTimer = setInterval(() => {
      smsCountdown.value -= 1;
      if (smsCountdown.value <= 0 && smsTimer) { clearInterval(smsTimer); smsTimer = undefined; }
    }, 1000);
    toastStore.show({ message: "验证码已发送", type: "success" });
  } finally { smsSending.value = false; }
};

const validatePhone = () => {
  if (!/^1\d{10}$/.test(profileForm.phone)) {
    toastStore.show({ message: "请输入正确的手机号", type: "error" });
    return false;
  }
  if (needsPhoneVerification.value && !/^\d{6}$/.test(profileForm.verificationCode)) {
    toastStore.show({ message: "请输入6位短信验证码", type: "error" });
    return false;
  }
  return true;
};

const confirmJoin = async () => {
  if (!inviteToken.value) return;
  if (!profileForm.name) {
    toastStore.show({ message: "请填写真实姓名", type: "error" });
    return;
  }
  if (!profileForm.wechatNickname) {
    toastStore.show({ message: "请填写微信昵称", type: "error" });
    return;
  }
  if (!validatePhone()) return;
  joinSubmitting.value = true;
  try {
    const result = await submitMembershipApplication({
      token: inviteToken.value,
      ...profileForm,
      wechatNickname: profileForm.wechatNickname || undefined,
      verificationCode: needsPhoneVerification.value ? profileForm.verificationCode : undefined,
    });
    if (result.accessToken) userStore.setToken(result.accessToken);
    uni.removeStorageSync("pending_join_token");
    inviteToken.value = "";
    invitePreview.value = null;
    showJoinForm.value = false;
    memberships.value = await getMyMembershipApplications();
    await userStore.fetchUserInfo();
    toastStore.show({ message: "申请已提交", type: "success" });
  } finally {
    joinSubmitting.value = false;
  }
};

const validateForm = () => {
  if (
    !form.storeName ||
    !form.address ||
    !profileForm.name ||
    !profileForm.wechatNickname
  ) {
    toastStore.show({ message: "请完整填写申请人信息（含真实姓名与微信昵称）", type: "error" });
    return false;
  }
  return validatePhone();
};

const requestSubmit = () => {
  if (validateForm()) showSubmitConfirm.value = true;
};
const submit = async () => {
  if (!validateForm()) return;
  submitting.value = true;
  try {
    const result = await createStoreApplication({
      ...form,
      ...profileForm,
      wechatNickname: profileForm.wechatNickname || undefined,
      verificationCode: needsPhoneVerification.value ? profileForm.verificationCode : undefined,
    });
    if (result.accessToken) userStore.setToken(result.accessToken);
    application.value = result;
    await userStore.fetchUserInfo();
    showSubmitConfirm.value = false;
    toastStore.show({ message: "申请已提交", type: "success" });
  } finally {
    submitting.value = false;
  }
};
const cancel = async () => {
  if (application.value) {
    await cancelStoreApplication(application.value.id);
    await load();
  }
};
const handleLogout = () => {
  userStore.logout();
};

onMounted(async () => {
  if (!userStore.userInfo) await userStore.fetchUserInfo();
  profileForm.name = userStore.userInfo?.name || "";
  profileForm.wechatNickname = userStore.authorizedWechatProfile?.nickName || userStore.userInfo?.wechatNickname || "";
  profileForm.phone = userStore.userInfo?.phone || "";
  await load();
  setTimeout(() => {
    pageLoaded.value = true;
  }, 100);
});

onUnmounted(() => { if (smsTimer) clearInterval(smsTimer); });
</script>

<style scoped lang="scss">
@import "@/styles/common.scss";
.onboarding-wrapper {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background-color: var(--bg-color);
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
}
.bg-wrapper-overflow-fix {
  position: absolute;
  inset: 0;
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
.profile-card-bar {
  display: flex;
  align-items: center;
  padding: 12px 24px;
  z-index: 10;
  margin-top: 10px;
}
.user-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}
.onboarding-avatar {
  border-radius: 50%;
  box-shadow: 0 4px 10px rgba(140, 90, 59, 0.15);
}
.user-info-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.user-name-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.user-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
.user-phone {
  font-size: 12px;
  color: var(--text-secondary);
}
.logout-text-btn {
  font-size: 11px;
  font-weight: 500;
  color: #ab9d88;
  background: rgba(171, 157, 136, 0.12);
  padding: 2px 8px;
  border-radius: 6px;
}
.logout-text-btn:active {
  transform: scale(0.95);
  background: rgba(171, 157, 136, 0.2);
}
.welcome-banner {
  padding: 16px 24px 8px;
  z-index: 5;
  opacity: 0;
  transform: translateY(15px);
  transition:
    opacity 0.5s ease-out,
    transform 0.5s ease-out;
}
.welcome-banner.enter-active {
  opacity: 1;
  transform: translateY(0);
}
.banner-title {
  font-size: 26px;
  font-weight: 700;
  color: var(--text-primary);
}
.banner-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 4px;
}
.cards-scroll-container {
  flex: 1;
  min-height: 0;
  z-index: 5;
  opacity: 0;
  transform: translateY(20px);
  transition:
    opacity 0.6s ease-out 0.1s,
    transform 0.6s ease-out 0.1s;
}
.cards-scroll-container.enter-active {
  opacity: 1;
  transform: translateY(0);
}
.cards-layout {
  padding: 12px 20px 40px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-sizing: border-box;
}
.guided-card {
  background: #fff;
  border-radius: 20px;
  border: 1px solid rgba(140, 90, 59, 0.1);
  box-shadow: 0 8px 24px rgba(89, 61, 42, 0.04);
  padding: 20px;
  box-sizing: border-box;
}
.guided-card.create-card {
  background: linear-gradient(135deg, #fff, #fff7f1);
  border-color: rgba(140, 90, 59, 0.12);
}
.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.card-icon-tag {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.card-icon-tag.bg-cyan {
  background: #e0f2fe;
}
.card-icon-tag.bg-brown {
  background: #fef3c7;
}
.card-icon-tag.bg-orange {
  background: #fff7ed;
}
.card-icon-tag.bg-green {
  background: #f0fdf4;
}
.mini-icon {
  width: 20px;
  height: 20px;
}
.card-title-group {
  display: block;
}
.card-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
  margin: 0;
  padding: 0;
}
.card-subtitle {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 5px 0 0 0;
  padding: 0;
  line-height: 1.2;
}
.invitations-list-wrapper {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.custom-invitation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fcfcfc;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 12px 14px;
}
.invitation-detail {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  gap: 4px;
}
.invitation-tenant {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.invitation-badge-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.role-capsule {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}
.role-capsule.owner {
  background: #fef3c7;
  color: #d97706;
}
.role-capsule.admin {
  background: #e0f2fe;
  color: #0284c7;
}
.role-capsule.member {
  background: #dcfce7;
  color: #16a34a;
}
.status-text {
  font-size: 10px;
  color: #9a897d;
}
.status-text.approved {
  color: #16865a;
}
.status-text.rejected {
  color: #c15f50;
}
.review-note {
  font-size: 11px;
  color: #a27163;
}
.empty-invitations {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 10px;
  text-align: center;
  gap: 8px;
}
.empty-icon {
  width: 24px;
  height: 24px;
  opacity: 0.3;
}
.empty-tip,
.loading-state {
  font-size: 12px;
  color: var(--text-secondary);
}
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.step-connector {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 4px 0;
}
.step-connector .line {
  flex: 1;
  height: 1px;
  background: rgba(140, 90, 59, 0.12);
}
.or-text {
  font-size: 12px;
  color: var(--text-secondary);
  padding: 0 16px;
  font-weight: 500;
}
.create-form-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
}
.input-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}
.profile-section-header { 
  display: flex; 
  align-items: center; 
  gap: 12px; 
  margin: 10px 0 14px; 
  padding-top: 14px; 
  border-top: 1px solid rgba(140, 90, 59, 0.1); 
}
.profile-section-title-text { font-size: 15px; font-weight: 700; color: var(--text-primary); }
.verification-row { display: flex; align-items: stretch; gap: 10px; margin-bottom: 14px; }
.verification-row :deep(.btn) { height: 48px; min-height: 48px; border-radius: 12px; margin: 0; padding: 0 16px; box-sizing: border-box; }
.verification-input { flex: 1; min-width: 0; margin-bottom: 0; }
.modern-tenant-input {
  width: 100%;
  height: 48px;
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 0 16px;
  box-sizing: border-box;
  font-size: 15px;
  margin-bottom: 14px;
}
.modern-tenant-input:focus,
.modern-tenant-textarea:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(140, 90, 59, 0.1);
}
.modern-tenant-textarea {
  width: 100%;
  height: 86px;
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px 16px;
  box-sizing: border-box;
  font-size: 14px;
  margin-bottom: 16px;
}
.two-column-fields {
  display: flex;
  gap: 10px;
}
.two-column-fields > view {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.pending-status-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-top: 8px;
}
.details-block {
  background: rgba(140, 90, 59, 0.02);
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 20px;
  border: 1px solid rgba(140, 90, 59, 0.08);
}
.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}
.detail-item:last-child {
  margin-bottom: 0;
}
.detail-label {
  font-size: 13px;
  color: var(--text-secondary);
  flex-shrink: 0;
  width: 70px;
}
.detail-val {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
  text-align: right;
  word-break: break-all;
}
.timeline-wrapper {
  display: flex;
  flex-direction: column;
  padding-left: 8px;
  position: relative;
  margin-bottom: 24px;
}
.timeline-wrapper::before {
  content: "";
  position: absolute;
  left: 13px;
  top: 16px;
  bottom: 16px;
  width: 1px;
  background: rgba(140, 90, 59, 0.12);
}
.timeline-step {
  display: flex;
  gap: 14px;
  position: relative;
  padding-bottom: 20px;
}
.timeline-step:last-child {
  padding-bottom: 0;
}
.step-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid rgba(140, 90, 59, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  margin-top: 4px;
}
.timeline-step.done .step-dot {
  border-color: var(--primary-color);
}
.timeline-step.done .inner-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--primary-color);
}
.timeline-step.active .step-dot {
  border-color: #f97316;
}
.timeline-step.active .inner-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f97316;
}
.pulse {
  animation: pulse-animation 1.8s infinite ease-in-out;
}
@keyframes pulse-animation {
  0% { transform: scale(0.9); opacity: 0.6; }
  50% { transform: scale(1.3); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.6; }
}
.step-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.step-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}
.timeline-step.active .step-title {
  color: #ea580c;
}
.step-desc {
  font-size: 11px;
  color: var(--text-secondary);
}
.action-footer {
  display: flex;
  justify-content: center;
  width: 100%;
}
.cancel-btn {
  width: 120px !important;
}
.approved-status-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin-top: 10px;
}
.success-message-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 20px 10px;
  margin-bottom: 20px;
}
.success-illustration {
  width: 60px;
  height: 60px;
  margin-bottom: 12px;
}
.success-title {
  font-size: 16px;
  font-weight: 700;
  color: #166534;
  margin-bottom: 6px;
}
.success-desc {
  font-size: 13px;
  color: var(--text-secondary);
}
.invite-preview-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-top: 8px;
}
.invite-details-block {
  background: rgba(2, 132, 199, 0.02);
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 20px;
  border: 1px solid rgba(2, 132, 199, 0.08);
}
.invite-detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.invite-detail-item:last-child {
  margin-bottom: 0;
}
.invite-detail-label {
  font-size: 13px;
  color: var(--text-secondary);
}
.invite-detail-val {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
}
.invite-relationship-tip {
  padding: 13px 16px;
  border: 1px solid rgba(140, 90, 59, 0.12);
  border-radius: 12px;
  background: #fff8f1;
  color: #7d6251;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
}
.rejected-message {
  font-size: 12px;
  color: #b15f52;
  background: #fff2ef;
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 14px;
}
.modal-prompt-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  margin-bottom: 10px;
}
.modal-warning-text {
  font-size: 13px;
  color: var(--text-secondary);
  text-align: center;
  margin-bottom: 20px;
  line-height: 1.5;
}
.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  width: 100%;
}
.modal-btn {
  flex: 1;
}
.invite-preview-item {
  background: #f9fcfd;
  border-color: #dceff5;
}
.expanded-join-form {
  display: flex;
  flex-direction: column;
  width: 100%;
  opacity: 0;
  transform: translateY(-10px);
  transition: opacity 0.3s ease-out, transform 0.3s ease-out;
  &.enter-active {
    opacity: 1;
    transform: translateY(0);
  }
}
.form-divider {
  height: 1px;
  background: rgba(140, 90, 59, 0.1);
  margin: 16px 0;
}
.form-actions-row {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  width: 100%;
}
.action-btn {
  flex: 1;
}
</style>
