<template>
	<page-meta page-style="background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader title="管理订阅" />
		<DetailPageLayout>
			<view class="page-content">
				<!-- 尊贵版状态卡片 -->
				<view class="vip-status-card" :class="summary?.state?.toLowerCase() || 'free'">
					<view class="vip-card-content">
						<view class="vip-card-header">
							<view class="vip-title-wrap">
								<view class="vip-icon">👑</view>
								<text class="vip-status-title">{{ statusTitle }}</text>
							</view>
							<view class="vip-badge" v-if="summary?.state === 'PAID'">SVIP</view>
							<view class="vip-badge trial" v-else-if="summary?.state === 'TRIAL'">体验中</view>
						</view>
						<view class="vip-card-body">
							<view class="vip-expiry">{{ expiryText }}</view>
							<view class="vip-user" v-if="userStore.userInfo">
								<UserAvatar class="vip-avatar" :user-id="userStore.userInfo.id" :avatar-url="userStore.userInfo.avatarUrl" :size="20" />
								<text class="vip-name">{{ getUserDisplayName(userStore.userInfo) }}</text>
							</view>
						</view>
					</view>
				</view>

				<view v-if="summary?.trial.eligible && isOwner" class="trial-card">
					<view class="trial-kicker">一次性体验机会</view>
					<view class="trial-title">免费开启 {{ summary.trial.days }} 天专业版</view>
					<view class="trial-desc">全部功能与额度开放，无需预先绑定支付方式。到期后数据完整保留，并自动回到免费版。</view>
					<AppButton type="secondary" full-width :loading="startingTrial" @click="handleStartTrial">开启专业版试用</AppButton>
				</view>

				<view class="section-heading pricing-heading">
					<view class="heading-left">
						<view class="section-eyebrow">专业版价格</view>
						<view class="section-title">周期越长，月均越省</view>
					</view>
					<view class="heading-right" @click="openBenefits">
						<text class="compare-btn">权益对比 ›</text>
					</view>
				</view>

				<view class="pricing-list">
					<view
						v-for="plan in plans"
						:key="plan.id"
						class="price-card"
						:class="{ recommended: isRecommended(plan), selected: selectedPlanId === plan.id }"
						@click="selectedPlanId = plan.id"
					>
						<view v-if="isRecommended(plan)" class="recommend-badge">推荐 · 最划算</view>
						<view class="price-main">
							<view><view class="duration">{{ plan.name }}</view><view class="monthly">约 ¥{{ monthlyPrice(plan) }}/月</view></view>
							<view class="price-block">
								<view v-if="hasDiscount(plan)" class="original-price">¥{{ formatPrice(plan.originalPriceInCents!) }}</view>
								<view class="sale-price"><text class="currency">¥</text>{{ formatPrice(plan.priceInCents) }}</view>
							</view>
						</view>
						<view class="price-footer">
							<text>{{ discountText(plan) }}</text>
							<view class="radio" :class="{ checked: selectedPlanId === plan.id }"><view></view></view>
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
import { onLoad } from '@dcloudio/uni-app';
import AppButton from '@/components/AppButton.vue';
import DetailHeader from '@/components/DetailHeader.vue';
import DetailPageLayout from '@/components/DetailPageLayout.vue';
import Toast from '@/components/Toast.vue';
import UserAvatar from '@/components/UserAvatar.vue';
import { bindWechat } from '@/api/auth';
import { createPaymentOrder, getPaymentCapabilities, getSubscriptionPlans, getSubscriptionSummary, startProfessionalTrial, syncPaymentOrder, type SubscriptionPlan, type SubscriptionSummary } from '@/api/billing';
import { useDataStore } from '@/store/data';
import { useToastStore } from '@/store/toast';
import { useUserStore } from '@/store/user';
import { formatChineseDate } from '@/utils/format';
import { useEntitlementsStore } from '@/store/entitlements';
import { getUserDisplayName } from '@/utils/user-display';

const plans = ref<SubscriptionPlan[]>([]);
const summary = ref<SubscriptionSummary | null>(null);
const selectedPlanId = ref('');
const paying = ref(false);
const startingTrial = ref(false);
const paymentMode = ref<'mock' | 'wechat'>('wechat');
const dataStore = useDataStore();
const userStore = useUserStore();
const toastStore = useToastStore();
const entitlementsStore = useEntitlementsStore();

const isOwner = computed(() => userStore.userInfo?.tenants.find((item) => item.tenant.id === dataStore.currentTenantId)?.role === 'OWNER');
const statusTitle = computed(() => ({ PAID: '专业尊享版', TRIAL: '专业版试用中', GRACE: '订阅宽限期', FREE: '免费版' })[summary.value?.state || 'FREE']);
const expiryText = computed(() => {
	if (!summary.value) return '';
	if (summary.value.state === 'FREE') return '永久免费，尽享基础烘焙工具';
	if (summary.value.state === 'GRACE') return `完整功能保留至 ${formatChineseDate(summary.value.graceEndsAt!)}`;
	return `当前权益至 ${formatChineseDate(summary.value.entitledUntil!)}`;
});

const formatPrice = (cents: number) => (cents / 100).toFixed(2);
const openBenefits = () => uni.navigateTo({ url: '/pages/subscription/benefits' });

const monthsFor = (plan: SubscriptionPlan) => Math.max(1, Math.round(plan.durationDays / 31));
const monthlyPrice = (plan: SubscriptionPlan) => (plan.priceInCents / monthsFor(plan) / 100).toFixed(1);
const hasDiscount = (plan: SubscriptionPlan) => Boolean(plan.originalPriceInCents && plan.originalPriceInCents > plan.priceInCents);
const isRecommended = (plan: SubscriptionPlan) => monthsFor(plan) >= 12;
const discountText = (plan: SubscriptionPlan) => {
	if (!hasDiscount(plan)) return '灵活月付，随时续订';
	const saved = plan.originalPriceInCents! - plan.priceInCents;
	return `立省 ¥${(saved / 100).toFixed(0)} · 相当于 ${Math.round((plan.priceInCents / plan.originalPriceInCents!) * 10)} 折`;
};

const loadData = async () => {
	const [planData, subscriptionData, capabilities] = await Promise.all([getSubscriptionPlans(), getSubscriptionSummary(), getPaymentCapabilities()]);
	plans.value = planData;
	summary.value = subscriptionData;
	entitlementsStore.setSummary(subscriptionData);
	paymentMode.value = capabilities.paymentMode;
	if (!selectedPlanId.value && planData.length) selectedPlanId.value = planData[0].id;
};

const handleStartTrial = async () => {
	if (startingTrial.value) return;
	startingTrial.value = true;
	try {
		const result = await startProfessionalTrial();
		summary.value = result;
		entitlementsStore.setSummary(result);
		toastStore.show({ message: `${result.trial.days} 天专业版试用已开启`, type: 'success' });
	} finally {
		startingTrial.value = false;
	}
};

const getWechatCode = () =>
	new Promise<string>((resolve, reject) => {
		uni.login({ provider: 'weixin', success: (result) => (result.code ? resolve(result.code) : reject(new Error('未获取到微信登录凭证'))), fail: reject });
	});

const requestPayment = (options: UniApp.RequestPaymentOptions) =>
	new Promise<void>((resolve, reject) => uni.requestPayment({ ...options, success: () => resolve(), fail: reject }));

onLoad((options) => {
	if (options?.planId) selectedPlanId.value = options.planId;
});

const handlePurchase = async () => {
	if (!selectedPlanId.value || paying.value) return;
	paying.value = true;
	try {
		if (paymentMode.value === 'wechat') await bindWechat(await getWechatCode());
		const order = await createPaymentOrder(selectedPlanId.value);
		if (!order.mockPaid) {
			if (!order.paymentParams) throw new Error('支付参数缺失');
			await requestPayment(order.paymentParams);
			await syncPaymentOrder(order.orderNo);
		}
		await loadData();
		toastStore.show({ message: '订阅已开通', type: 'success' });
		setTimeout(() => uni.reLaunch({ url: '/pages/main/main' }), 500);
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
.compare-link { color: var(--primary-color); font-size: 13px; font-weight: 600; }

/* 尊贵感 VIP 卡片设计 */
.vip-status-card {
	position: relative;
	margin-top: 10px;
	margin-bottom: 28px;
	border-radius: 20px;
	padding: 24px 20px;
	background: linear-gradient(135deg, #2b2b2b 0%, #1a1a1a 100%);
	color: #f7e1c8;
	box-shadow: 0 16px 32px rgba(0, 0, 0, 0.12);
	overflow: hidden;
}

.vip-status-card::before {
	content: '';
	position: absolute;
	top: -50%;
	left: -50%;
	width: 200%;
	height: 200%;
	background: radial-gradient(circle at 50% 50%, rgba(212, 163, 115, 0.15), transparent 60%);
	pointer-events: none;
}

.vip-status-card.free {
	background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
	color: #5c5c5c;
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
}

.vip-status-card.free::before {
	background: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.5), transparent 60%);
}

.vip-status-card.trial,
.vip-status-card.grace {
	background: linear-gradient(135deg, #3d2f25 0%, #291e16 100%);
	color: #e6cba8;
	box-shadow: 0 16px 32px rgba(61, 47, 37, 0.15);
}

.vip-card-content {
	position: relative;
	z-index: 2;
}

.vip-card-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 30px;
}

.vip-title-wrap {
	display: flex;
	align-items: center;
}

.vip-icon {
	font-size: 22px;
	margin-right: 10px;
	transform: translateY(-2px);
}

.vip-status-card.free .vip-icon {
	filter: grayscale(100%) opacity(0.6);
}

.vip-status-title {
	font-size: 22px;
	font-weight: 800;
	letter-spacing: 0.5px;
	background: linear-gradient(90deg, #ffd9a3, #d4a373);
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
}

.vip-status-card.free .vip-status-title {
	background: none;
	-webkit-text-fill-color: initial;
	color: #4a4a4a;
}

.vip-badge {
	padding: 4px 10px;
	border-radius: 12px;
	background: linear-gradient(90deg, #d4a373, #b8844e);
	color: #fff;
	font-size: 11px;
	font-weight: 800;
	letter-spacing: 1px;
	text-transform: uppercase;
}

.vip-badge.trial {
	background: rgba(255, 255, 255, 0.15);
}

.vip-card-body {
	display: flex;
	justify-content: space-between;
	align-items: flex-end;
}

.vip-expiry {
	font-size: 13px;
	opacity: 0.8;
}

.vip-user {
	display: flex;
	align-items: center;
	background: rgba(255, 255, 255, 0.08);
	padding: 4px 12px 4px 4px;
	border-radius: 20px;
	backdrop-filter: blur(4px);
}

.vip-status-card.free .vip-user {
	background: rgba(0, 0, 0, 0.04);
}

.vip-avatar {
	width: 20px;
	height: 20px;
	border-radius: 50%;
	margin-right: 6px;
	border: 1px solid rgba(255, 255, 255, 0.2);
}

.vip-status-card.free .vip-avatar {
	border-color: rgba(0, 0, 0, 0.1);
}

.vip-name {
	font-size: 12px;
	font-weight: 500;
	max-width: 80px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.section-title { font-size: 20px; font-weight: 700; color: #432e21; }
.section-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 1.7px; color: #a27b5c; }
.pricing-heading { margin-top: 34px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end; }
.compare-btn { display: inline-block; color: var(--primary-color); font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 20px; background: rgba(140, 90, 59, 0.06); }
.pricing-list { display: flex; flex-direction: column; gap: 11px; margin-bottom: 22px; }

.price-card {
	position: relative;
	padding: 17px;
	border: 1px solid rgba(212, 163, 115, 0.2);
	border-radius: 16px;
	background: #ffffff;
	transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.price-card.selected {
	border-color: #d4a373;
	box-shadow: 0 8px 24px rgba(140, 90, 59, 0.08);
	transform: translateY(-1px);
}

.price-card.recommended {
	padding-top: 25px;
	background: linear-gradient(145deg, #fffdfa, #fdf5eb);
}

.recommend-badge {
	position: absolute;
	top: -1px;
	right: 14px;
	padding: 5px 10px 6px;
	border-radius: 0 0 9px 9px;
	color: #ffffff;
	background: linear-gradient(90deg, #d4a373, #8c5a3b);
	font-size: 10px;
	font-weight: 700;
}

.price-main,
.price-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.duration { color: #432e21; font-size: 17px; font-weight: 700; }
.monthly { margin-top: 4px; color: #a39185; font-size: 11px; }
.price-block { text-align: right; }
.original-price { color: #c4b5a6; font-size: 11px; text-decoration: line-through; }
.sale-price { color: #8c5a3b; font-size: 25px; font-weight: 700; line-height: 1.1; }
.currency { margin-right: 2px; font-size: 13px; font-weight: 600; }
.price-footer { margin-top: 13px; padding-top: 11px; border-top: 1px solid #f7ece1; color: #a27b5c; font-size: 10px; }

.radio { width: 19px; height: 19px; display: flex; align-items: center; justify-content: center; border: 1.5px solid #c4b5a6; border-radius: 50%; }
.radio.checked { border-color: #8c5a3b; }
.radio.checked view { width: 10px; height: 10px; border-radius: 50%; background: #8c5a3b; }
.owner-notice { color: #a06b2c; background: #fff6e8; padding: 10px 12px; border-radius: 6px; font-size: 13px; margin-bottom: 14px; }
.trial-card { padding: 18px; margin-bottom: 24px; border-radius: 14px; background: #fff; border: 1px solid rgba(140, 90, 59, 0.13); box-shadow: 0 8px 24px rgba(89, 61, 42, 0.06); }
.trial-kicker { color: var(--text-secondary); font-size: 12px; letter-spacing: 0.5px; }
.trial-card { background: linear-gradient(145deg, #fffaf3, #f8ecdd); border-color: rgba(174, 119, 69, 0.22); }
.trial-title { margin-top: 5px; color: #4f3729; font-size: 18px; font-weight: 700; }
.trial-desc { margin: 7px 0 16px; color: var(--text-secondary); font-size: 13px; line-height: 1.6; }
</style>
