<template>
  <view class="login-page">
    <view class="glow glow-top"></view>
    <view
      class="content"
      :class="{ ready: pageLoaded }"
      :style="{ paddingTop: safeAreaTop + 'px' }"
    >
      <view class="brand-mark"
        ><image src="/static/icons/croissant.svg" mode="aspectFit"
      /></view>
      <view class="hero">
        <text class="eyebrow">BAKEFLOW</text>
        <text class="title">让每一次出炉，\n都更从容</text>
        <text class="subtitle">配方、生产与店铺协作，从这里开始</text>
      </view>
      <button class="wechat-button" :loading="loading" @click="handleLogin">
        <text>{{ loading ? "正在登录" : "微信一键登录" }}</text>
      </button>
      <text class="agreement">登录即表示您同意用户协议与隐私政策</text>
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
const userStore = useUserStore();
const dataStore = useDataStore();
const systemStore = useSystemStore();
const safeAreaTop = computed(() => systemStore.statusBarHeight + 72);

onMounted(() => setTimeout(() => (pageLoaded.value = true), 80));

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
    await dataStore.fetchTenants();
    if (dataStore.currentTenantId) {
      if (!(await dataStore.selectTenant(dataStore.currentTenantId))) return;
    }
    const inviteToken = uni.getStorageSync("pending_join_token");
    if (inviteToken) {
      uni.reLaunch({ url: "/pages/onboarding/store-access" });
    } else {
      uni.reLaunch({ url: result.redirectTo || "/pages/main/main" });
    }
  } finally {
    loading.value = false;
  }
};

const handleLogin = () => {
  if (loading.value) return;

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
.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.brand-mark image {
  width: 72px;
  height: 72px;
}
.hero {
  display: flex;
  flex-direction: column;
  margin-top: 24px;
}
.eyebrow {
  font-size: 11px;
  letter-spacing: 4px;
  font-weight: 700;
  color: #bd7d4f;
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
.agreement {
  display: block;
  margin-top: 18px;
  text-align: center;
  font-size: 11px;
  color: #b0a092;
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
