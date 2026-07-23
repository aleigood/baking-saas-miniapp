<template>
  <view class="login-page">
    <view class="glow glow-top"></view>
    <view
      class="content"
      :class="{ ready: pageLoaded }"
      :style="{ paddingTop: safeAreaTop + 'px' }"
    >
      <view class="brand-header">
        <image class="brand-logo" src="/static/icons/croissant.svg" mode="aspectFit" />
        <text class="brand-name">BAKEFLOW</text>
      </view>
      <view class="hero">
        <text class="title">让每一次出炉，\n都更从容</text>
        <text class="subtitle">配方、生产与店铺协作，从这里开始</text>
      </view>
      <button
        class="wechat-button"
        :class="{ disabled: loading }"
        :loading="loading"
        :open-type="privacyButtonOpenType"
        @click="handleLogin"
        @agreeprivacyauthorization="handlePrivacyAuthorizationAgree"
      >
        <text>{{ loading ? "正在登录" : "微信一键登录" }}</text>
      </button>
      <view class="agreement-row" @click="toggleAgreement">
        <view class="custom-checkbox" :class="{ checked: agreementChecked }">
          <view v-if="agreementChecked" class="checkbox-dot"></view>
        </view>
        <view class="agreement-copy">
          <text>我已阅读并同意</text>
          <text class="agreement-link" @click.stop="openPrivacyContract">{{ privacyContractName }}</text>
        </view>
      </view>
    </view>
    <view class="glow glow-bottom"></view>
    <Toast />
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Toast from "@/components/Toast.vue";
import { useDataStore } from "@/store/data";
import { useSystemStore } from "@/store/system";
import { useUserStore } from "@/store/user";

const loading = ref(false);
const pageLoaded = ref(false);
const agreementChecked = ref(false);
const privacyAuthorizationRequired = ref(false);
const privacyAuthorized = ref(true);
const privacyContractName = ref("隐私政策");
const userStore = useUserStore();
const dataStore = useDataStore();
const systemStore = useSystemStore();
const safeAreaTop = computed(() => systemStore.statusBarHeight + 72);
const privacyButtonOpenType = computed(() => {
  if (!agreementChecked.value || privacyAuthorized.value || !privacyAuthorizationRequired.value) return "";
  return "agreePrivacyAuthorization";
});

onMounted(() => {
  setTimeout(() => (pageLoaded.value = true), 80);
  syncPrivacySetting();
});

const syncPrivacySetting = () => {
  // #ifdef MP-WEIXIN
  const wxApi = typeof wx !== "undefined" ? wx : undefined;
  if (!wxApi?.getPrivacySetting) return;
  wxApi.getPrivacySetting({
    success: (res: { needAuthorization?: boolean; privacyContractName?: string }) => {
      privacyAuthorizationRequired.value = !!res.needAuthorization;
      privacyAuthorized.value = !res.needAuthorization;
      if (res.privacyContractName) privacyContractName.value = res.privacyContractName;
    },
  });
  // #endif
};

const toggleAgreement = () => {
  agreementChecked.value = !agreementChecked.value;
};

const openPrivacyContract = () => {
  // #ifdef MP-WEIXIN
  const wxApi = typeof wx !== "undefined" ? wx : undefined;
  if (wxApi?.openPrivacyContract) {
    wxApi.openPrivacyContract({
      fail: () => {
        uni.showToast({ title: "隐私政策暂时无法打开", icon: "none" });
      },
    });
    return;
  }
  // #endif
  uni.showToast({ title: "隐私政策暂未开放查阅", icon: "none" });
};

const getCode = () =>
  new Promise<string>((resolve, reject) => {
    // #ifdef MP-WEIXIN
    uni.login({
      provider: "weixin",
      success: (res) => resolve(res.code),
      fail: reject,
    });
    // #endif
    // #ifndef MP-WEIXIN
    resolve(`dev-${Date.now()}`);
    // #endif
  });

const proceedLogin = async () => {
  loading.value = true;
  try {
    const result = await userStore.wechatLogin(await getCode());
    if (!result) return;
    await userStore.fetchUserInfo();
    const inviteToken = uni.getStorageSync("pending_join_token");
    if (inviteToken) {
      uni.reLaunch({ url: "/pages/onboarding/join-application" });
      return;
    }
    const memberships = userStore.userInfo?.tenants || [];
    if (memberships.length) {
      const targetTenantId = dataStore.getPreferredTenantId();
      await dataStore.enterTenantHome(targetTenantId);
      return;
    }
    uni.reLaunch({ url: result.redirectTo || "/pages/onboarding/store-access" });
  } catch (error) {
    console.error("Login destination resolution failed:", error);
  } finally {
    loading.value = false;
  }
};

const handleLogin = () => {
  if (loading.value) return;
  if (!agreementChecked.value) {
    uni.showToast({ title: "请先阅读并同意隐私政策", icon: "none" });
    return;
  }
  if (privacyAuthorizationRequired.value && !privacyAuthorized.value) return;

  // #ifdef MP-WEIXIN
  const getUserProfile = (uni as any).getUserProfile;
  if (getUserProfile) {
    getUserProfile({
      desc: "用于展示您的昵称",
      success: (res: any) => {
        if (res && res.userInfo) {
          userStore.setAuthorizedWechatProfile({
            nickName: res.userInfo.nickName,
            avatarUrl: res.userInfo.avatarUrl
          });
        }
        proceedLogin();
      },
      fail: (err: any) => {
        console.warn("getUserProfile failed", err);
        proceedLogin();
      }
    });
    return;
  }
  // #endif

  proceedLogin();
};

const handlePrivacyAuthorizationAgree = () => {
  privacyAuthorized.value = true;
  handleLogin();
};
</script>

<style scoped lang="scss">
.login-page {
  min-height: 100vh;
  overflow: hidden;
  position: relative;
  background: #fdf8f2;
  color: #402d22;
}
.content {
  position: relative;
  z-index: 2;
  padding-left: 36px;
  padding-right: 36px;
  opacity: 0;
  transform: translateY(24px);
  transition: 0.65s ease;
}
.content.ready {
  opacity: 1;
  transform: none;
}
.brand-header {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.brand-logo {
  width: 72px;
  height: 72px;
}
.brand-name {
  font-size: 11px;
  letter-spacing: 4px;
  text-indent: 4px; /* 抵消 letter-spacing 导致的最右侧字距偏移，实现完美的绝对中线对齐 */
  font-weight: 700;
  color: #bd7d4f;
}
.hero {
  display: flex;
  flex-direction: column;
  margin-top: 32px;
}
.title {
  margin-top: 16px;
  font-size: 34px;
  line-height: 1.28;
  font-weight: 750;
  letter-spacing: 1px;
}
.subtitle {
  margin-top: 18px;
  color: #8d796a;
  font-size: 15px;
}
.wechat-button {
  margin-top: 72px;
  height: 56px;
  border-radius: 18px;
  border: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: white;
  font-size: 16px;
  font-weight: 650;
  background: linear-gradient(135deg, #8c5a3b, #a96e47);
  box-shadow: 0 14px 32px rgba(140, 90, 59, 0.25);
}
.wechat-button::after {
  border: 0;
}
.wechat-button:active {
  transform: scale(0.985);
}
.agreement-row {
  width: fit-content;
  max-width: 100%;
  margin: 28px auto 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 9px;
  color: #8d796a;
  font-size: 12px;
  line-height: 1.6;
  -webkit-tap-highlight-color: transparent;
}
.custom-checkbox {
  width: 16px;
  height: 16px;
  margin-top: 1px;
  flex: 0 0 16px;
  box-sizing: border-box;
  border: 1px solid #b9a79a;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.72);
  transition: 0.2s ease;
}
.custom-checkbox.checked {
  border-color: #9b6442;
  background: #9b6442;
}
.checkbox-dot {
  width: 6px;
  height: 3px;
  border-left: 2px solid #fff;
  border-bottom: 2px solid #fff;
  transform: translateY(-1px) rotate(-45deg);
}
.agreement-copy {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
}
.agreement-link {
  margin-left: 3px;
  color: #8c5a3b;
  font-weight: 600;
}
.glow {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.glow-top {
  width: 320px;
  height: 320px;
  top: -140px;
  right: -120px;
  background: linear-gradient(
    135deg,
    rgba(236, 178, 111, 0.25) 0%,
    rgba(236, 178, 111, 0.05) 100%
  );
}
.glow-bottom {
  width: 420px;
  height: 420px;
  bottom: -200px;
  left: -160px;
  background: linear-gradient(
    135deg,
    rgba(161, 112, 78, 0.15) 0%,
    rgba(161, 112, 78, 0.02) 100%
  );
}
</style>
