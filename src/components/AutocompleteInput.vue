<template>
	<view class="autocomplete-container" :style="{ zIndex: focused ? 99 : 1 }" @click.stop>
		<view class="input-wrapper-box input-field" :class="{ 'is-disabled': disabled }" @click="triggerFocus">
			<input
				class="real-input"
				:value="modelValue"
				:placeholder="placeholder"
				:disabled="disabled"
				:focus="innerFocus"
				@input="onInput"
				@focus="onFocus"
				@blur="handleInputBlur"
			/>

			<view v-if="tags.length > 0" class="tags-flow">
				<text v-for="(tag, index) in tags" :key="index" class="input-tag" :style="tag.style">{{ tag.text }}</text>
			</view>
		</view>

		<view v-if="showSuggestions && !disabled" class="suggestions-container" :style="suggestionsStyle">
			<scroll-view :scroll-y="true" class="suggestions-scroll-view">
				<view v-for="(item, index) in filteredItems" :key="item.id || index" class="suggestion-item" @click="selectItem(item)">
					<slot name="item" :item="item">
						<view class="default-item-layout">
							<text class="suggestion-name">{{ item.name }}</text>
						</view>
					</slot>
				</view>

				<template v-if="canCreateNew">
					<view class="suggestion-item create-item" @click="handleCreate(defaultCreateAction)">
						<text class="create-icon">+</text>
						<text>新建: "{{ modelValue }}"</text>
					</view>
					<view v-for="(action, idx) in creationOptions" :key="idx" class="suggestion-item create-item extra-create-action" @click="handleCreate(action)">
						<text class="create-icon">+</text>
						<text>{{ action.label }}: "{{ modelValue }}"</text>
					</view>
				</template>

				<view v-if="filteredItems.length === 0 && !canCreateNew" class="no-results">无匹配项</view>
			</scroll-view>
		</view>
	</view>
</template>

<script setup lang="ts">
import { ref, computed, getCurrentInstance, onMounted, onUnmounted, nextTick } from 'vue';

interface InputTag {
	text: string;
	style?: Record<string, string>;
}

export interface CreateAction {
	label: string;
	payload?: any;
}

const props = withDefaults(
	defineProps<{
		modelValue: string;
		items?: any[];
		placeholder?: string;
		tags?: InputTag[];
		disabled?: boolean;
		creationOptions?: CreateAction[];
	}>(),
	{
		modelValue: '',
		items: () => [],
		placeholder: '',
		tags: () => [],
		disabled: false,
		creationOptions: () => []
	}
);

const emit = defineEmits(['update:modelValue', 'select', 'blur', 'create']);

const instance = getCurrentInstance();
const focused = ref(false);
const innerFocus = ref(false);
const inputRect = ref<UniApp.NodeInfo | null>(null);

const handleGlobalClick = () => {
	if (focused.value) {
		focused.value = false;
		innerFocus.value = false;
	}
};

onMounted(() => {
	uni.$on('page-clicked', handleGlobalClick);
});

onUnmounted(() => {
	uni.$off('page-clicked', handleGlobalClick);
});

const filteredItems = computed(() => {
	if (!props.modelValue || props.disabled) return [];
	return props.items.filter((item) => item.name && item.name.toLowerCase().includes(props.modelValue.toLowerCase())).slice(0, 50);
});

const canCreateNew = computed(() => {
	if (!props.modelValue || props.disabled) return false;
	return !props.items.some((item) => item.name.toLowerCase() === props.modelValue.toLowerCase());
});

const defaultCreateAction = { label: '新建', payload: {} };

const suggestionsStyle = computed(() => {
	if (!inputRect.value) return { display: 'none' };
	const bottom = uni.getWindowInfo().windowHeight - (inputRect.value.top || 0);
	return {
		bottom: `${bottom}px`,
		left: `${inputRect.value.left || 0}px`,
		width: `${inputRect.value.width || 0}px`
	};
});

const showSuggestions = computed(() => {
	return focused.value && props.modelValue.length > 0 && !props.disabled;
});

const triggerFocus = () => {
	if (props.disabled) return;

	// [核心修复] 如果当前已经是聚焦状态，说明是用户直接点击了 input 触发的原生聚焦
	// 此时不要再通过 innerFocus 强制聚焦，否则会导致小程序键盘闪烁或关闭
	if (focused.value) return;

	innerFocus.value = true;
	// 注意：这里删除了 onFocus() 的手动调用
	// 因为 innerFocus 变为 true 会自动触发 input 的原生 @focus 事件，从而调用 onFocus
};

const onInput = (event: any) => {
	if (props.disabled) return;
	emit('update:modelValue', event.detail.value);
};

const onFocus = () => {
	if (props.disabled) return;
	uni.$emit('page-clicked');
	focused.value = true;
	nextTick(() => {
		const query = uni.createSelectorQuery().in(instance);
		query
			.select('.input-wrapper-box')
			.boundingClientRect((rect) => {
				if (rect) inputRect.value = rect;
			})
			.exec();
	});
};

const handleInputBlur = () => {
	// 这里保留 innerFocus = false 是为了下次能再次触发 :focus="true"
	// 配合 triggerFocus 中的 if(focused.value) return 检查，不会产生冲突
	innerFocus.value = false;
	emit('blur');
};

const selectItem = (item: any) => {
	emit('update:modelValue', item.name);
	emit('select', item);
	focused.value = false;
};

const handleCreate = (action: CreateAction) => {
	emit('select', {
		id: null,
		name: props.modelValue,
		...action.payload
	});
	focused.value = false;
};
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';

@include form-control-styles;

.autocomplete-container {
	position: relative;
	width: 100%;
}

.input-wrapper-box {
	display: flex !important;
	align-items: center;
	box-sizing: border-box;
	transition: border-color 0.3s;
}

.real-input {
	flex: 1;
	height: 100%;
	min-height: inherit;
	border: none;
	outline: none;
	background: transparent;
	font-size: inherit;
	color: inherit;
	padding: 0;
	margin: 0;
	line-height: normal;
}

.tags-flow {
	display: flex;
	align-items: center;
	flex-shrink: 0;
	gap: 6px;
	margin-left: 8px;
	max-width: 60%;
	overflow: hidden;
	height: 100%;
}

.input-tag {
	padding: 2px 6px;
	border-radius: 4px;
	font-size: 11px;
	font-weight: 500;
	white-space: nowrap;
	line-height: 1.4;
}

.suggestions-container {
	position: fixed;
	background-color: #ffffff;
	border: 1px solid var(--border-color);
	border-radius: 12px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	max-height: 240px;
	overflow: hidden;
	z-index: 100;
}

.suggestions-scroll-view {
	max-height: 240px;
}

.suggestion-item {
	padding: 12px 15px;
	font-size: 14px;
	color: var(--text-primary);
	border-bottom: 1px solid var(--border-color);
	display: block;

	&:last-child {
		border-bottom: none;
	}

	&:active {
		background-color: #f8f9fa;
	}
}

.default-item-layout {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
}

.create-item {
	display: flex;
	align-items: center;
	color: var(--primary-color);
	font-weight: 500;
	justify-content: flex-start;
}

.extra-create-action {
	color: #8d6e63;
	border-top: 1px dashed var(--border-color);
}

.create-icon {
	margin-right: 8px;
	font-weight: bold;
}

.no-results {
	padding: 12px 15px;
	font-size: 14px;
	color: #999;
	text-align: center;
}
</style>
