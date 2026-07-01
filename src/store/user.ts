import { defineStore } from "pinia";
import { ref } from "vue";
import type { UserInfo, LoginRes } from "@/types/api";
import { useDataStore } from "./data";
import {
  login as loginApi,
  wechatLogin as wechatLoginApi,
  getProfile,
} from "@/api/auth";

export const useUserStore = defineStore("user", () => {
  const token = ref<string | null>(uni.getStorageSync("token") || null);
  const userInfo = ref<UserInfo | null>(null);
  const isRedirecting = ref(false);
  const authorizedWechatProfile = ref<{ nickName?: string; avatarUrl?: string } | null>(
    uni.getStorageSync("wechat_profile") || null
  );

  function setToken(newToken: string) {
    token.value = newToken;
    uni.setStorageSync("token", newToken);
  }

  function clearSession(preservePendingInvite = true) {
    const dataStore = useDataStore();
    token.value = null;
    userInfo.value = null;
    authorizedWechatProfile.value = null;
    uni.removeStorageSync("token");
    uni.removeStorageSync("wechat_profile");
    uni.removeStorageSync("tenant_id");
    if (!preservePendingInvite) uni.removeStorageSync("pending_join_token");
    dataStore.reset();
  }

  function handleUnauthorized() {
    if (isRedirecting.value) {
      return;
    }
    isRedirecting.value = true;
    clearSession();
    uni.reLaunch({ url: "/pages/login/login" });
  }

  function logout() {
    if (isRedirecting.value) return;
    isRedirecting.value = true;
    clearSession(false);
    uni.reLaunch({ url: "/pages/login/login" });
  }

  function setAuthorizedWechatProfile(profile: { nickName?: string; avatarUrl?: string }) {
    authorizedWechatProfile.value = profile;
    uni.setStorageSync("wechat_profile", profile);
  }

  async function login(credentials: {
    phone: string;
    password: string;
  }): Promise<LoginRes | null> {
    clearSession();

    try {
      const res = await loginApi(credentials);
      setToken(res.accessToken);
      // [核心新增] 登录成功后，立刻重置重定向标志，防止竞态问题
      isRedirecting.value = false;
      return res; // [核心修改] 返回完整的登录响应
    } catch (error) {
      console.error("Login failed:", error);
      return null;
    }
  }

  async function wechatLogin(code: string): Promise<LoginRes | null> {
    clearSession();
    try {
      const res = await wechatLoginApi(code);
      setToken(res.accessToken);
      isRedirecting.value = false;
      return res;
    } catch (error) {
      console.error("Wechat login failed:", error);
      return null;
    }
  }

  async function fetchUserInfo() {
    if (!token.value) {
      throw new Error("No token found");
    }
    try {
      const data = await getProfile();
      userInfo.value = data;
    } catch (error) {
      console.error("Fetch user info failed:", error);
      throw error;
    }
  }

  return {
    token,
    userInfo,
    isRedirecting,
    authorizedWechatProfile,
    login,
    wechatLogin,
    logout,
    setToken,
    fetchUserInfo,
    handleUnauthorized,
    setAuthorizedWechatProfile,
  };
});
