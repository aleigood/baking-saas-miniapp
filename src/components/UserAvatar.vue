<template>
	<view class="user-avatar-shell" :class="`variant-${variant}`" :style="sizeStyle">
		<image v-if="resolvedAvatarUrl" class="user-avatar-photo" :src="resolvedAvatarUrl" mode="aspectFill" />
		<image v-else class="user-avatar-symbol" src="/static/icons/person.svg" mode="aspectFit" />
	</view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { getAvatarVariant } from '@/utils/user-display';
import { resolveAssetUrl } from '@/utils/asset-url';

const props = withDefaults(
	defineProps<{
		userId?: string | null;
		avatarUrl?: string | null;
		size?: number;
	}>(),
	{ size: 42 }
);

const variant = computed(() => getAvatarVariant(props.userId));
const resolvedAvatarUrl = computed(() => resolveAssetUrl(props.avatarUrl));
const sizeStyle = computed(() => ({ width: `${props.size}px`, height: `${props.size}px` }));
</script>

<style scoped lang="scss">
.user-avatar-shell {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	border-radius: 50%;
	overflow: hidden;
	box-sizing: border-box;
	box-shadow: inset 0 0 0 1px rgba(90, 58, 39, 0.08);
	transform: translateZ(0); /* [核心修复] 解决小程序中圆角失效导致的方形背景问题 */
}

.user-avatar-photo {
	width: 100%;
	height: 100%;
	border-radius: 50%; /* 进一步保证图片本身是圆角的 */
}

.user-avatar-symbol {
	width: 60%;
	height: 60%;
}

.variant-0 { background: #f3dfd2; }
.variant-1 { background: #e7ddd0; }
.variant-2 { background: #dce7df; }
.variant-3 { background: #e3e2ef; }
.variant-4 { background: #f2e7c9; }
.variant-5 { background: #dbe7ec; }
</style>
