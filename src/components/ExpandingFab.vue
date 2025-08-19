<template>
	<!-- [核心新增] 这是一个全新的、带展开菜单的FAB组件 -->
	<view class="fab-container" :class="{ 'is-open': isOpen }">
		<!-- 动作列表 -->
		<view class="fab-options">
			<!-- [核心修改] 调整 transition-delay 动画延迟，实现从下往上依次弹出的效果 -->
			<view v-for="(item, index) in actions" :key="index" class="fab-option-wrapper"
				:style="{ transitionDelay: `${isOpen ? index * 30 : (actions.length - 1 - index) * 30}ms` }">
				<view class="option-label">{{ item.text }}</view>
				<!-- [核心修改] 增加动态ID，用于精确获取元素位置 -->
				<view :id="`fab-ripple-${index}`" class="option-button ripple-container"
					@touchstart="handleTouchStart($event, index)" @click="selectAction(item.action)">
					<span v-for="ripple in ripples[index]" :key="ripple.id" class="ripple" :style="ripple.style"></span>
					<image class="option-icon" :src="item.icon" />
				</view>
			</view>
		</view>

		<!-- 主按钮 -->
		<!-- [核心修改] 增加动态ID -->
		<view :id="`fab-ripple-main`" class="fab-main ripple-container" @touchstart="handleTouchStart($event, 'main')"
			@click="toggleMenu">
			<span v-for="ripple in ripples['main']" :key="ripple.id" class="ripple" :style="ripple.style"></span>
			<image class="fab-icon" src="/static/icons/fab-add.svg" />
		</view>
	</view>
</template>

<script setup lang="ts">
	import { ref, reactive, getCurrentInstance, type PropType } from 'vue';

	// 定义组件的props
	const props = defineProps({
		actions: {
			type: Array as PropType<{ icon : string; text : string; action : () => void }[]>,
			default: () => []
		}
	});

	const instance = getCurrentInstance();
	const isOpen = ref(false); // 控制菜单的展开/收起状态

	// 为每个按钮（包括主按钮和选项按钮）维护独立的水波纹效果数组
	const ripples = reactive<Record<string | number, any[]>>({
		main: []
	});
	props.actions.forEach((_, index) => {
		ripples[index] = [];
	});

	// 切换菜单的显示状态
	const toggleMenu = () => {
		isOpen.value = !isOpen.value;
	};

	// 执行选项对应的动作
	const selectAction = (action : () => void) => {
		// [体验优化] 增加延迟，让水波纹动画播放完毕
		setTimeout(() => {
			action();
			isOpen.value = false; // 执行动作后自动收起菜单
		}, 200);
	};


	// 水波纹效果的触摸事件处理
	const handleTouchStart = (event : TouchEvent, key : string | number) => {
		const touch = event.touches[0];
		const viewId = `fab-ripple-${key}`;

		const query = uni.createSelectorQuery().in(instance);
		query.select('#' + viewId).boundingClientRect(rect => {
			if (rect) {
				const x = touch.clientX - rect.left;
				const y = touch.clientY - rect.top;
				const size = Math.max(rect.width, rect.height) * 2;
				const newRipple = {
					id: Date.now(),
					style: {
						width: `${size}px`,
						height: `${size}px`,
						top: `${y - size / 2}px`,
						left: `${x - size / 2}px`,
					}
				};
				if (!ripples[key]) ripples[key] = [];
				ripples[key].push(newRipple);
				setTimeout(() => {
					if (ripples[key] && ripples[key].length > 0) ripples[key].shift();
				}, 600);
			}
		}).exec();
	};
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	.fab-container {
		position: fixed;
		bottom: calc(30px + constant(safe-area-inset-bottom));
		bottom: calc(30px + env(safe-area-inset-bottom));
		right: 20px;
		z-index: 20;
		display: flex;
		/* [核心修改] 确保主按钮在下，选项在上 */
		flex-direction: column-reverse;
		align-items: center;
		gap: 15px;
	}

	.fab-main {
		width: 56px;
		height: 56px;
		background-color: var(--primary-color);
		color: white;
		border-radius: 50%;
		display: flex;
		justify-content: center;
		align-items: center;
		box-shadow: 0 6px 20px rgba(140, 90, 59, 0.3);
		z-index: 2;
		transform: translateZ(0);
		overflow: hidden;
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);

		.fab-icon {
			width: 28px;
			height: 28px;
			transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		}
	}

	.fab-container.is-open .fab-main {
		transform: rotate(135deg);
	}

	.fab-options {
		display: flex;
		/* [核心修改] 确保菜单项从下往上堆叠 */
		flex-direction: column-reverse;
		align-items: center;
		list-style: none;
		padding: 0;
		margin: 0;
		z-index: 1;
		gap: 15px;
	}

	.fab-option-wrapper {
		display: flex;
		align-items: center;
		opacity: 0;
		/* [核心修改] 初始状态从下方（正值）开始 */
		transform: translateY(10px) scale(0.8);
		transition: opacity 0.2s, transform 0.2s;
		transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
	}

	.fab-container.is-open .fab-option-wrapper {
		opacity: 1;
		/* [核心修改] 动画结束于原始位置（向上移动） */
		transform: translateY(0) scale(1);
	}

	.option-label {
		background-color: #fff;
		color: var(--text-primary);
		padding: 5px 12px;
		border-radius: 8px;
		margin-right: 12px;
		font-size: 14px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		white-space: nowrap;
	}

	.option-button {
		width: 44px;
		height: 44px;
		background-color: #fff;
		border-radius: 50%;
		display: flex;
		justify-content: center;
		align-items: center;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		overflow: hidden;
		transform: translateZ(0);

		.option-icon {
			width: 22px;
			height: 22px;
		}
	}

	.ripple {
		background-color: rgba(0, 0, 0, 0.1);
	}

	.fab-main .ripple {
		background-color: rgba(255, 255, 255, 0.4);
	}
</style>