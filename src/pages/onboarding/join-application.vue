<template>
  <AppLaunchLoading v-if="viewState === 'loading'" />
  <view v-else class="resolver-error-page">
    <image class="error-logo" src="/static/icons/croissant.svg" mode="aspectFit" />
    <text class="error-title">暂时无法打开邀请</text>
    <text class="error-description">{{ errorMessage }}</text>
    <view class="error-actions">
      <AppButton type="primary" full-width :loading="retrying" @click="retry">重新加载</AppButton>
      <AppButton type="secondary" full-width @click="returnToSafeDestination">返回小程序首页</AppButton>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onUnmounted, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import AppButton from "@/components/AppButton.vue";
import AppLaunchLoading from "@/components/AppLaunchLoading.vue";
import { getJoinPreview } from "@/api/onboarding";
import { useDataStore } from "@/store/data";
import { useUserStore } from "@/store/user";

type ViewState = "loading" | "error";

const RESOLVE_TIMEOUT_MS = 10000;
const userStore = useUserStore();
const dataStore = useDataStore();
const viewState = ref<ViewState>("loading");
const errorMessage = ref("请检查网络连接后重试，邀请信息会继续为您保留。");
const retrying = ref(false);
const inviteToken = ref("");
let resolveVersion = 0;
let timeoutTimer: ReturnType<typeof setTimeout> | undefined;

const clearResolveTimeout = () => {
  if (timeoutTimer) clearTimeout(timeoutTimer);
  timeoutTimer = undefined;
};

const routeToCurrentTenant = async (tenantId: string) => {
  const selected = await dataStore.enterTenantHome(tenantId, { showErrorToast: false });
  if (!selected) throw new Error("TENANT_SWITCH_FAILED");
  uni.removeStorageSync("pending_join_token");
};

const returnToSafeDestination = () => {
  resolveVersion += 1;
  clearResolveTimeout();
  uni.reLaunch({ url: "/pages/launch/launch" });
};

const handleInvalidInvite = async () => {
  uni.removeStorageSync("pending_join_token");
  const targetTenantId = dataStore.getPreferredTenantId();
  if (targetTenantId) {
    await routeToCurrentTenant(targetTenantId);
    return;
  }
  uni.reLaunch({ url: "/pages/onboarding/store-access" });
};

const resolveInvite = async () => {
  const currentVersion = ++resolveVersion;
  clearResolveTimeout();
  viewState.value = "loading";
  errorMessage.value = "请检查网络连接后重试，邀请信息会继续为您保留。";
  timeoutTimer = setTimeout(() => {
    if (currentVersion !== resolveVersion) return;
    resolveVersion += 1;
    viewState.value = "error";
    errorMessage.value = "加载时间有点久，请重新加载或先返回小程序首页。";
    retrying.value = false;
  }, RESOLVE_TIMEOUT_MS);

  try {
    if (!userStore.token) {
      clearResolveTimeout();
      uni.reLaunch({ url: "/pages/login/login" });
      return;
    }

    await userStore.fetchUserInfo({ hideErrorToast: true });
    if (currentVersion !== resolveVersion) return;
    const preview = await getJoinPreview(inviteToken.value);
    if (currentVersion !== resolveVersion) return;

    if (["OWNER", "MEMBER"].includes(preview.relationship)) {
      await routeToCurrentTenant(preview.tenant.id);
      return;
    }

    clearResolveTimeout();
    uni.reLaunch({ url: "/pages/onboarding/store-access" });
  } catch (error: any) {
    if (currentVersion !== resolveVersion || userStore.isRedirecting) return;
    clearResolveTimeout();
    if (Number(error?.statusCode) === 404) {
      try {
        await handleInvalidInvite();
      } catch {
        viewState.value = "error";
        errorMessage.value = "邀请已失效，暂时无法返回您的店铺，请稍后重试。";
      }
      return;
    }
    viewState.value = "error";
  } finally {
    if (currentVersion === resolveVersion) retrying.value = false;
  }
};

const retry = async () => {
  if (retrying.value) return;
  retrying.value = true;
  await resolveInvite();
};

onLoad((options) => {
  const optionToken = decodeURIComponent(String(options?.token || ""));
  inviteToken.value = optionToken || String(uni.getStorageSync("pending_join_token") || "");
  if (!inviteToken.value) {
    returnToSafeDestination();
    return;
  }
  if (optionToken) uni.setStorageSync("pending_join_token", optionToken);
  void resolveInvite();
});

onUnmounted(clearResolveTimeout);
</script>

<style scoped lang="scss">
.resolver-error-page {
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
