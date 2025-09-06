<template>
	<view class="custom-tab-bar">
		<view class="active-indicator" :style="indicatorStyle"></view>

		<view v-for="(item, index) in list" :key="item.key" :id="'tab-item-' + index" class="tab-item"
			@click="switchTab(item)">
			<view class="tab-item-content">
				<image class="icon" :src="uiStore.activeTab === item.key ? item.selectedIconPath : item.iconPath" />
				<view class="text" :class="{ 'text-active': uiStore.activeTab === item.key }">{{ item.text }}</view>
			</view>
		</view>
	</view>
</template>

<script setup lang="ts">
	import { ref, watch, onMounted, nextTick, getCurrentInstance } from 'vue';
	import { useUiStore } from '@/store/ui';

	const uiStore = useUiStore();
	const instance = getCurrentInstance();

	const list = ref([{
		key: "production",
		text: "制作",
		iconPath: "/static/tabbar/production.svg",
		selectedIconPath: "/static/tabbar/production_active.svg"
	}, {
		key: "ingredients",
		text: "原料",
		iconPath: "/static/tabbar/ingredients.svg",
		selectedIconPath: "/static/tabbar/ingredients_active.svg"
	}, {
		key: "recipes",
		text: "配方",
		iconPath: "/static/tabbar/recipes.svg",
		selectedIconPath: "/static/tabbar/recipes_active.svg"
	}, {
		key: "personnel",
		text: "我的",
		iconPath: "/static/tabbar/personnel.svg",
		selectedIconPath: "/static/tabbar/personnel_active.svg"
	}]);

	const indicatorStyle = ref({});

	const tabItemWidth = ref(0);

	const updateIndicatorPosition = () => {
		if (tabItemWidth.value === 0) return;

		const activeIndex = list.value.findIndex(item => item.key === uiStore.activeTab);
		if (activeIndex !== -1) {
			const itemLeft = activeIndex * tabItemWidth.value;
			indicatorStyle.value = {
				width: `${tabItemWidth.value}px`,
				transform: `translateX(${itemLeft}px)`
			};
		}
	};

	onMounted(() => {
		nextTick(() => {
			const query = uni.createSelectorQuery().in(instance);
			query.select('.custom-tab-bar').boundingClientRect(data => {
				if (data && data.width > 0) {
					tabItemWidth.value = data.width / list.value.length;
					updateIndicatorPosition();
				} else {
					try {
						const systemInfo = uni.getSystemInfoSync();
						if (systemInfo && systemInfo.windowWidth > 0) {
							tabItemWidth.value = systemInfo.windowWidth / list.value.length;
							updateIndicatorPosition();
						}
					} catch (e) {
						console.error("降级方案：获取系统信息失败", e);
					}
				}
			}).exec();
		});
	});

	watch(() => uiStore.activeTab, () => {
		updateIndicatorPosition();
	});

	const switchTab = (item : { key : string }) => {
		uiStore.setActiveTab(item.key);
	};
</script>

<style scoped lang="scss">
	.custom-tab-bar {
		position: fixed;
		bottom: 0;
		left: constant(safe-area-inset-left);
		left: env(safe-area-inset-left);
		right: constant(safe-area-inset-right);
		right: env(safe-area-inset-right);
		padding-bottom: constant(safe-area-inset-bottom);
		padding-bottom: env(safe-area-inset-bottom);
		display: flex;
		/* [核心修复] 移除此行。子项的 flex: 1 会自动处理均分，此属性可能引入了不可预见的初始偏移 */
		/* justify-content: space-around; */
		align-items: center;
		backdrop-filter: saturate(180%) blur(20px);
		background-color: rgba(255, 255, 255, 0.85);
		border-top: 1px solid rgba(0, 0, 0, 0.08);
		box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
		z-index: 98;
	}

	/* [新增] 胶囊指示器的样式 */
	.active-indicator {
		position: absolute;
		top: 0px;
		/* 与顶部保持间距 */
		height: 60px;
		/* 指示器高度 */
		background-color: #f7f4ef;
		/* 使用一个柔和的背景色 */
		border-radius: 0px;
		/* 圆角使其成为胶囊状 */
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
		/* 添加轻微阴影增加立体感 */
		z-index: 0;
		/* [核心] 为 transform 和 width 属性添加平滑的过渡动画 */
		transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), width 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}

	.tab-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 60px;
		flex: 1;
		position: relative;
		overflow: hidden;
	}

	/* [修改] 移除原有的 active 背景色 */
	.tab-item.active {
		background-color: transparent;
	}

	/* [新增] tab 内容容器，确保它在指示器上方 */
	.tab-item-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		position: relative;
		z-index: 1;
	}

	.icon {
		width: 24px;
		height: 24px;
		margin-bottom: 4px;
	}

	.text {
		font-size: 11px;
		color: var(--text-secondary);
		transition: color 0.3s ease-in-out, font-weight 0.3s ease-in-out;
		/* [新增] 为文字颜色和字重变化添加过渡 */
	}

	.text-active {
		color: var(--primary-color);
		font-weight: 600;
		/* [优化] 选中时字体加粗更明显 */
	}

	.ripple {
		background-color: rgba(0, 0, 0, 0.1);
	}
</style>