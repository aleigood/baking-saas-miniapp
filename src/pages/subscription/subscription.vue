<template>
	<page-meta page-style="background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader title="订阅与续费" />
		<DetailPageLayout>
			<view class="page-content">
				<view class="status-band">
					<view>
						<view class="status-title">{{ summary?.active ? '订阅使用中' : '订阅已到期' }}</view>
						<view class="status-desc">{{ expiryText }}</view>
					</view>
					<view class="status-dot" :class="{ active: summary?.active }"></view>
				</view>

				<view class="section-title">选择使用期限</view>
				<view class="plan-list">
					<view v-for="plan in plans" :key="plan.id" class="plan-item" :class="{ selected: selectedPlanId === plan.id }" @click="selectedPlanId = plan.id">
						<view class="plan-main">
							<view class="plan-name">{{ plan.name }}</view>
							<view class="plan-days">{{ plan.durationDays }} 天使用期</view>
						</view>
						<view class="price-block">
							<view class="price">¥{{ formatPrice(plan.priceInCents) }}</view>
							<view v-if="plan.originalPriceInCents" class="original-price">¥{{ formatPrice(plan.originalPriceInCents) }}</view>
						</view>
					</view>
				</view>

				<view v-if="!isOwner" class="owner-notice">只有店主可以购买或续订，请联系店主处理。</view>
				<AppButton type="primary" full-width :loading="paying" :disabled="!selectedPlanId || !isOwner" @click="handlePurchase">
					{{ summary?.active ? '续订所选套餐' : '立即开通' }}
				</AppButton>
			</view>
		</DetailPageLayout>
		<Toast />
	</view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import DetailHeader from '@/components/DetailHeader.vue';
import DetailPageLayout from '@/components/DetailPageLayout.vue';
import Toast from '@/components/Toast.vue';
import { bindWechat } from '@/api/auth';
import { createPaymentOrder, getSubscriptionPlans, getSubscriptionSummary, syncPaymentOrder, type SubscriptionPlan, type SubscriptionSummary } from '@/api/billing';
import { useDataStore } from '@/store/data';
import { useToastStore } from '@/store/toast';
import { useUserStore } from '@/store/user';

const plans = ref<SubscriptionPlan[]>([]);
const summary = ref<SubscriptionSummary | null>(null);
const selectedPlanId = ref('');
const paying = ref(false);
const dataStore = useDataStore();
const userStore = useUserStore();
const toastStore = useToastStore();

const isOwner = computed(() => userStore.userInfo?.tenants.find((item) => item.tenant.id === dataStore.currentTenantId)?.role === 'OWNER');
const expiryText = computed(() => {
	if (!summary.value?.entitledUntil) return '选择套餐后即可恢复店铺功能';
	return `当前权益至 ${new Date(summary.value.entitledUntil).toLocaleDateString()}`;
});

const formatPrice = (cents: number) => (cents / 100).toFixed(2);

const loadData = async () => {
	const [planData, subscriptionData] = await Promise.all([getSubscriptionPlans(), getSubscriptionSummary()]);
	plans.value = planData;
	summary.value = subscriptionData;
	if (!selectedPlanId.value && planData.length) selectedPlanId.value = planData[0].id;
};

const getWechatCode = () =>
	new Promise<string>((resolve, reject) => {
		uni.login({ provider: 'weixin', success: (result) => (result.code ? resolve(result.code) : reject(new Error('未获取到微信登录凭证'))), fail: reject });
	});

const requestPayment = (options: UniApp.RequestPaymentOptions) =>
	new Promise<void>((resolve, reject) => uni.requestPayment({ ...options, success: () => resolve(), fail: reject }));

const handlePurchase = async () => {
	if (!selectedPlanId.value || paying.value) return;
	paying.value = true;
	try {
		await bindWechat(await getWechatCode());
		const order = await createPaymentOrder(selectedPlanId.value);
		await requestPayment(order.paymentParams);
		await syncPaymentOrder(order.orderNo);
		await loadData();
		toastStore.show({ message: '订阅已开通', type: 'success' });
	} catch (error: any) {
		if (String(error?.errMsg || '').includes('cancel')) toastStore.show({ message: '支付已取消', type: 'info' });
	} finally {
		paying.value = false;
	}
};

onMounted(loadData);
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
.page-wrapper { min-height: 100vh; background: var(--bg-color); }
.status-band { display: flex; justify-content: space-between; align-items: center; padding: 18px 0; border-bottom: 1px solid var(--border-color); margin-bottom: 24px; }
.status-title { font-size: 19px; font-weight: 600; color: var(--text-primary); }
.status-desc, .plan-days { margin-top: 5px; color: var(--text-secondary); font-size: 13px; }
.status-dot { width: 11px; height: 11px; border-radius: 50%; background: #c8c8c8; }
.status-dot.active { background: #3f9b66; }
.section-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
.plan-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 22px; }
.plan-item { display: flex; justify-content: space-between; align-items: center; min-height: 72px; padding: 12px 15px; background: #fff; border: 1px solid var(--border-color); border-radius: 8px; box-sizing: border-box; }
.plan-item.selected { border-color: var(--primary-color); box-shadow: inset 3px 0 0 var(--primary-color); }
.plan-name { font-size: 16px; font-weight: 600; }
.price-block { text-align: right; }
.price { color: var(--primary-color); font-size: 18px; font-weight: 600; }
.original-price { color: var(--text-secondary); font-size: 12px; text-decoration: line-through; }
.owner-notice { color: #a06b2c; background: #fff6e8; padding: 10px 12px; border-radius: 6px; font-size: 13px; margin-bottom: 14px; }
</style>
