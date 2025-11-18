<template>
	<view class="autocomplete-container" :style="{ zIndex: focused ? 99 : 1 }" @click.stop>
		<view class="input-wrapper">
			<input
				class="input-field"
				:class="{ 'has-tags': tags.length > 0 }"
				:value="modelValue"
				:placeholder="placeholder"
				@input="onInput"
				@focus="onFocus"
				@blur="handleInputBlur"
			/>
			<view v-if="tags.length > 0" class="tags-container">
				<text v-for="(tag, index) in tags" :key="index" class="input-tag" :style="tag.style">{{ tag.text }}</text>
			</view>
		</view>
		<view v-if="showSuggestions" class="suggestions-container" :style="suggestionsStyle">
			<scroll-view :scroll-y="true" class="suggestions-scroll-view">
				<view v-for="item in filteredItems" :key="item.id" class="suggestion-item" @click="selectItem(item)">
					<text class="suggestion-name">{{ item.name }}</text>
					<view class="suggestion-tags">
						<text v-if="item.isFlour" class="mini-tag flour-tag">面粉</text>
						<text v-if="item.isRecipe" class="mini-tag recipe-tag">自制</text>
					</view>
				</view>
				<template v-if="canCreateNew">
					<view class="suggestion-item create-item" @click="createNewItem(false)">
						<text class="create-icon">+</text>
						<text>新建原料: "{{ modelValue }}"</text>
					</view>
					<view v-if="allowCreateFlour" class="suggestion-item create-item flour-create" @click="createNewItem(true)">
						<text class="create-icon">+</text>
						<text>新建面粉: "{{ modelValue }}"</text>
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

const props = withDefaults(
	defineProps<{
		modelValue: string;
		items: { id: string | null; name: string; isRecipe?: boolean; isFlour?: boolean }[];
		placeholder?: string;
		tags?: InputTag[];
		allowCreateFlour?: boolean;
		showTag?: boolean;
		tagText?: string;
		tagStyle?: Record<string, string>;
	}>(),
	{
		modelValue: '',
		items: () => [],
		placeholder: '',
		tags: () => [],
		allowCreateFlour: false,
		showTag: false,
		tagText: '自制',
		tagStyle: () => ({})
	}
);

const emit = defineEmits(['update:modelValue', 'select', 'blur']);

const instance = getCurrentInstance();
const focused = ref(false);
const inputRect = ref<UniApp.NodeInfo | null>(null);

const handleGlobalClick = () => {
	if (focused.value) {
		focused.value = false;
	}
};

onMounted(() => {
	uni.$on('page-clicked', handleGlobalClick);
});

onUnmounted(() => {
	uni.$off('page-clicked', handleGlobalClick);
});

const filteredItems = computed(() => {
	if (!props.modelValue) {
		return [];
	}
	return props.items.filter((item) => item.name.toLowerCase().includes(props.modelValue.toLowerCase())).slice(0, 50);
});

const canCreateNew = computed(() => {
	if (!props.modelValue) {
		return false;
	}
	return !props.items.some((item) => item.name.toLowerCase() === props.modelValue.toLowerCase());
});

const suggestionsStyle = computed(() => {
	if (!inputRect.value) {
		return { display: 'none' };
	}
	const bottom = uni.getWindowInfo().windowHeight - (inputRect.value.top || 0);
	return {
		bottom: `${bottom}px`,
		left: `${inputRect.value.left || 0}px`,
		width: `${inputRect.value.width || 0}px`
	};
});

const showSuggestions = computed(() => {
	return focused.value && props.modelValue.length > 0;
});

const onInput = (event: any) => {
	emit('update:modelValue', event.detail.value);
};

const onFocus = () => {
	uni.$emit('page-clicked');
	focused.value = true;
	nextTick(() => {
		const query = uni.createSelectorQuery().in(instance);
		query
			.select('.input-field')
			.boundingClientRect((rect) => {
				if (rect) {
					inputRect.value = rect;
				}
			})
			.exec();
	});
};

const handleInputBlur = () => {
	emit('blur');
};

const selectItem = (item: { id: string | null; name: string; isFlour?: boolean }) => {
	emit('update:modelValue', item.name);
	emit('select', item);
	focused.value = false;
};

const createNewItem = (isFlour: boolean) => {
	emit('select', {
		id: null,
		name: props.modelValue,
		isFlour: isFlour
	});
	focused.value = false;
};
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
@include form-control-styles;

.autocomplete-container {
	position: relative;
}

.input-wrapper {
	position: relative;
	width: 100%;
	display: flex;
	align-items: center;
}

.input-field.has-tags {
	padding-right: 100px;
}

.tags-container {
	position: absolute;
	right: 10px;
	top: 50%;
	transform: translateY(-50%);
	display: flex;
	gap: 6px;
	pointer-events: none;
	justify-content: flex-end;
	max-width: 120px;
	overflow: hidden;
}

.input-tag {
	background-color: #f0f2f5;
	color: var(--text-secondary);
	padding: 2px 6px;
	border-radius: 4px;
	font-size: 11px;
	font-weight: 500;
	white-space: nowrap;
	flex-shrink: 0;
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
	display: flex;
	justify-content: space-between;
	align-items: center;

	&:last-child {
		border-bottom: none;
	}

	&:active {
		background-color: #f8f9fa;
	}
}

.suggestion-tags {
	display: flex;
	gap: 5px;
}

.mini-tag {
	padding: 1px 5px;
	border-radius: 4px;
	font-size: 10px;
}

/* [G-Code-Note] [核心修改] 修改面粉标签颜色，从绿色改为燕麦/棕色 */
.flour-tag {
	background-color: #ebe2d9;
	color: #8d6e63;
}

.recipe-tag {
	background-color: #faedcd;
	color: var(--primary-color);
}

.create-item {
	display: flex;
	align-items: center;
	color: var(--primary-color);
	font-weight: 500;
	justify-content: flex-start;
}

/* [G-Code-Note] [核心修改] 修改新建面粉选项的颜色 */
.flour-create {
	color: #8d6e63;
	border-top: 1px dashed #dcc8b5;
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
