<template>
	<view class="card card-full-bleed-list">
		<view class="card-title-wrapper">
			<view class="title-with-tag">
				<span class="card-title">配方版本</span>
				<span v-if="isDiscontinued" class="status-tag discontinued">已停用</span>
			</view>
		</view>
		<template v-if="versions.length > 0">
			<ListItem v-for="version in versions" :key="version.id" :selected="selectedVersionId === version.id"
				@click="$emit('select-version', version)" @longpress="$emit('longpress-version', version)"
				:vibrate-on-long-press="canEdit && !version.isActive" :bleed="true">
				<view class="main-info">
					<view class="name">{{ version.notes || `版本 ${version.version}` }}
						(v{{ version.version }})</view>
					<view class="desc">创建于:
						{{ formatChineseDate(version.createdAt) }}
					</view>
				</view>
				<view class="side-info">
					<view v-if="version.isActive" class="status-tag active">使用中</view>
				</view>
			</ListItem>
		</template>
		<view v-else class="empty-state" style="padding: 20px 0;">
			暂无版本信息
		</view>
		<AppButton v-if="canEdit" type="text-link" @click="$emit('create-version')">+ 创建新版本</AppButton>
	</view>
</template>

<script setup lang="ts">
	import type { PropType } from 'vue';
	import type { RecipeVersion } from '@/types/api';
	import { formatChineseDate } from '@/utils/format';
	import ListItem from '@/components/ListItem.vue';
	import AppButton from '@/components/AppButton.vue';

	defineProps({
		versions: {
			type: Array as PropType<RecipeVersion[]>,
			default: () => []
		},
		selectedVersionId: {
			type: String as PropType<string | null>,
			default: null
		},
		canEdit: {
			type: Boolean,
			default: false
		},
		isDiscontinued: {
			type: Boolean,
			default: false
		}
	});

	defineEmits(['select-version', 'create-version', 'longpress-version']);
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	/* [兼容性修复] 移除外部对子组件的样式控制，相关样式已移入 ListItem.vue 内部 */
	.card-full-bleed-list {
		padding-left: 0;
		padding-right: 0;
	}

	.card-full-bleed-list .card-title-wrapper {
		padding-left: 20px;
		padding-right: 20px;
	}

	.title-with-tag {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.title-with-tag .card-title {
		margin-bottom: 0;
	}

	.status-tag {
		padding: 4px 12px;
		border-radius: 15px;
		font-size: 13px;
		color: white;
		font-weight: 500;

		&.active {
			background-color: #5ac725;
		}

		&.discontinued {
			background-color: #fee2e2;
			color: #991b1b;
		}
	}
</style>