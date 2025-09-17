<template>
	<view class="advanced-filter-bar-container">
		<view
			class="pills-container"
			:class="{
				'show-left-fade': showLeftFade,
				'show-right-fade': showRightFade
			}"
		>
			<scroll-view class="pills-scroll-view" :scroll-x="true" :show-scrollbar="false" @scroll="handleScroll">
				<view class="pills-wrapper" id="pills-wrapper-adv">
					<view v-for="filter in filters" :key="filter.key" class="dropdown-pill-wrapper">
						<view
							class="dropdown-pill ripple-container"
							:id="'pill-' + filter.key"
							@touchstart="handleTouchStart($event, filter.key)"
							@click="$emit('pill-click', filter.key)"
						>
							<span v-for="ripple in ripples[filter.key]" :key="ripple.id" class="ripple" :style="ripple.style"></span>
							<view class="pill-content">
								<text class="pill-text">{{ getPillText(filter) }}</text>
								<view class="arrow-down"></view>
							</view>
						</view>
					</view>
				</view>
			</scroll-view>
			<view class="fade-edge left" v-if="showLeftFade"></view>
			<view class="fade-edge right" v-if="showRightFade"></view>
		</view>

		<view v-if="showSearch" class="search-btn-wrapper ripple-container" id="search-btn-ripple" @click="onSearchClick" @touchstart="handleTouchStart($event, 'search')">
			<span v-for="ripple in ripples['search']" :key="ripple.id" class="ripple" :style="ripple.style"></span>
			<view class="search-icon"></view>
		</view>
	</view>
</template>

<script setup lang="ts">
import { reactive, getCurrentInstance, type PropType, ref, onMounted, watch, nextTick } from 'vue';

// --- 类型定义 ---
interface FilterOption {
	text: string;
	value: string | number;
}
interface Filter {
	key: string;
	label: string; // 用作默认文本
	options: FilterOption[];
}
interface ModelValue {
	keyword: string;
	[key: string]: any; // 其他筛选条件
}

// --- Props and Emits ---
const props = defineProps({
	modelValue: {
		type: Object as PropType<ModelValue>,
		required: true
	},
	filters: {
		type: Array as PropType<Filter[]>,
		default: () => []
	},
	showSearch: {
		type: Boolean,
		default: false
	},
	getPillText: {
		type: Function as PropType<(filter: Filter) => string>,
		required: false
	}
});

const emit = defineEmits(['pill-click', 'search-click']);

const instance = getCurrentInstance();
const ripples = reactive<Record<string, any[]>>({});

const isScrollable = ref(false);
const showLeftFade = ref(false);
const showRightFade = ref(false);
let containerInfo: UniApp.BoundingClientRect | null = null;
let wrapperInfo: UniApp.BoundingClientRect | null = null;

const getPillInfo = () => {
	setTimeout(() => {
		const query = uni.createSelectorQuery().in(instance);
		query.select('.pills-scroll-view').boundingClientRect();
		query.select('#pills-wrapper-adv').boundingClientRect();
		query.exec((data) => {
			if (data && data[0] && data[1]) {
				containerInfo = data[0];
				wrapperInfo = data[1];
				isScrollable.value = wrapperInfo.width > containerInfo.width;
				showLeftFade.value = false;
				showRightFade.value = isScrollable.value;
			}
		});
	}, 100);
};

onMounted(() => {
	getPillInfo();
});

watch(
	() => props.filters,
	() => {
		nextTick(() => getPillInfo());
	},
	{ deep: true }
);

const handleScroll = (event: any) => {
	if (!isScrollable.value || !containerInfo || !wrapperInfo) return;
	const scroll = event.detail.scrollLeft;
	showLeftFade.value = scroll > 5;
	showRightFade.value = scroll < wrapperInfo.width - containerInfo.width - 5;
};

const getPillText = (filter: Filter) => {
	if (props.getPillText) {
		return props.getPillText(filter);
	}
	const selectedValue = props.modelValue[filter.key];
	if (selectedValue === null || selectedValue === undefined) {
		return filter.label;
	}
	const selectedOption = filter.options.find((opt) => opt.value === selectedValue);
	return selectedOption ? selectedOption.text : filter.label;
};

const onSearchClick = () => {
	emit('search-click');
};

const handleTouchStart = (event: any, key: string) => {
	if (!ripples[key]) ripples[key] = [];
	const touch = event.touches[0];
	const targetId = event.currentTarget.id;

	if (!targetId) return;

	const query = uni.createSelectorQuery().in(instance);
	query
		.select('#' + targetId)
		.boundingClientRect((rect) => {
			if (rect) {
				const x = touch.clientX - rect.left;
				const y = touch.clientY - rect.top;
				const size = Math.max(rect.width, rect.height) * 2;
				ripples[key].push({
					id: Date.now(),
					style: {
						width: `${size}px`,
						height: `${size}px`,
						top: `${y - size / 2}px`,
						left: `${x - size / 2}px`
					}
				});
				setTimeout(() => {
					if (ripples[key] && ripples[key].length > 0) ripples[key].shift();
				}, 600);
			}
		})
		.exec();
};
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';

.advanced-filter-bar-container {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 10px 15px;
}

.pills-container {
	position: relative;
	flex: 1;
	min-width: 0;
}

.fade-edge {
	position: absolute;
	top: 0;
	bottom: 0;
	width: 20px;
	z-index: 2;
	pointer-events: none;

	&.left {
		left: 0;
		background: linear-gradient(to right, var(--bg-color, #fdf8f2), rgba(253, 248, 242, 0));
	}

	&.right {
		right: 0;
		background: linear-gradient(to left, var(--bg-color, #fdf8f2), rgba(253, 248, 242, 0));
	}
}

.pills-scroll-view {
	width: 100%;
	white-space: nowrap;

	&::-webkit-scrollbar {
		display: none;
	}
}

.pills-wrapper {
	display: inline-flex;
	gap: 10px;
}

.dropdown-pill {
	display: inline-flex;
	position: relative;
	overflow: hidden;
	transform: translateZ(0);
	border-radius: 20px;
	background-color: #f3e9e3;
	transition: transform 0.15s ease-out;
	padding: 6px 12px;
	cursor: pointer;
	-webkit-tap-highlight-color: transparent;
	/* [核心修正] 强制胶囊内的内容不换行 */
	white-space: nowrap;
}

.pill-content {
	display: flex;
	align-items: center;
	gap: 6px;
	z-index: 1;
	position: relative;
}

.pill-text {
	font-size: 14px;
	font-weight: 500;
	color: var(--text-secondary);
	/* 新增：确保文本在任何情况下都不换行，解决 H5 端的显示问题 */
	white-space: nowrap;
}

.arrow-down {
	width: 0;
	height: 0;
	border-left: 5px solid transparent;
	border-right: 5px solid transparent;
	border-top: 6px solid var(--text-secondary);
}

.ripple {
	background-color: rgba(0, 0, 0, 0.1);
}

.search-btn-wrapper {
	flex-shrink: 0;
	width: 34px;
	height: 34px;
	border-radius: 50%;
	background-color: #f3e9e3;
	display: flex;
	justify-content: center;
	align-items: center;
	margin-left: 10px;
	position: relative;
	overflow: hidden;
	transform: translateZ(0);
	cursor: pointer;
	-webkit-tap-highlight-color: transparent;
}

.search-icon {
	width: 16px;
	height: 16px;
	position: relative;
	z-index: 1;

	&::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 10px;
		height: 10px;
		border: 2px solid var(--text-secondary);
		border-radius: 50%;
	}

	&::after {
		content: '';
		position: absolute;
		bottom: 1px;
		right: 1px;
		width: 6px;
		height: 2px;
		background-color: var(--text-secondary);
		transform: rotate(45deg);
	}
}
</style>
