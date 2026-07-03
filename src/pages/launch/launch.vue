<template>
  <AppLaunchLoading v-if="viewState === 'loading'" />
  <view v-else class="launch-error-page">
    <image class="error-logo" src="/static/icons/croissant.svg" mode="aspectFit" />
    <text class="error-title">暂时无法进入小程序</text>
    <text class="error-description">网络连接或身份验证没有完成，您的登录信息仍然保留。</text>
    <view class="error-actions">
      <AppButton type="primary" full-width :loading="retrying" @click="retry">重新加载</AppButton>
      <AppButton type="secondary" full-width @click="loginAgain">重新登录</AppButton>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import AppButton from "@/components/AppButton.vue";
import AppLaunchLoading from "@/components/AppLaunchLoading.vue";
import { useDataStore } from "@/store/data";
import { useUserStore } from "@/store/user";

const userStore = useUserStore();
const dataStore = useDataStore();
const viewState = ref<"loading" | "error">("loading");
const retrying = ref(false);

const resolveLaunch = async () => {
  viewState.value = "loading";
  try {
    if (!userStore.token) {
      uni.reLaunch({ url: "/pages/login/login" });
      return;
    }

    await userStore.fetchUserInfo({ hideErrorToast: true });
    const memberships = userStore.userInfo?.tenants || [];
    if (!memberships.length) {
      uni.reLaunch({ url: "/pages/onboarding/store-access" });
      return;
    }

    const targetTenantId = dataStore.getPreferredTenantId();
    if (!(await dataStore.enterTenantHome(targetTenantId, { showErrorToast: false }))) {
      if (!userStore.isRedirecting) viewState.value = "error";
    }
  } catch (error) {
    console.error("Launch Page: failed to resolve destination.", error);
    if (!userStore.isRedirecting) viewState.value = "error";
  } finally {
    retrying.value = false;
  }
};

const retry = async () => {
  if (retrying.value) return;
  retrying.value = true;
  await resolveLaunch();
};

const loginAgain = () => userStore.logout();

onMounted(resolveLaunch);
</script>

<style scoped lang="scss">
.launch-error-page {
  display: flex;
  min-height: 100vh;
  box-sizing: border-box;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 36px;
  background: var(--bg-color);
  text-align: center;
}
.error-logo {
  width: 96px;
  height: 96px;
  margin-bottom: 28px;
  opacity: 0.78;
}
.error-title {
  color: var(--text-primary);
  font-size: 22px;
  font-weight: 700;
}
.error-description {
  max-width: 300px;
  margin-top: 12px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.65;
}
.error-actions {
  display: flex;
  width: 100%;
  max-width: 320px;
  flex-direction: column;
  gap: 2px;
  margin-top: 30px;
}
</style>
