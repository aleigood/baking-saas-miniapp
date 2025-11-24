import { defineStore } from 'pinia';
import { ref, nextTick } from 'vue';

type ToastType = 'success' | 'error' | 'info';

export const useToastStore = defineStore('toast', () => {
	const isVisible = ref(false);
	const message = ref('');
	const type = ref<ToastType>('info');
	let timer: ReturnType<typeof setTimeout> | null = null;

	// 记录上一条消息，用于防抖/冷却
	let lastMessage = '';
	let hideTimestamp = 0;
	const COOLDOWN_PERIOD = 500;

	function show(options: { message: string; type?: ToastType; duration?: number }) {
		const now = Date.now();
		const incomingType = options.type || 'info';

		// [核心修复 1] 只有非 success 类型的消息才走冷却逻辑。
		// 这样保证了“保存成功”这种反馈永远不会被吞掉，哪怕状态乱了也能强制弹出来。
		if (incomingType !== 'success') {
			if (options.message === lastMessage && now - hideTimestamp < COOLDOWN_PERIOD) {
				return;
			}
		}

		// [核心修复 2] 清理“幽灵定时器”
		// 无论当前有没有定时器，先杀掉，防止旧页面的定时器干扰新页面
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}

		message.value = options.message;
		type.value = incomingType;

		// [核心修复 3] 强制响应式刷新
		// 如果当前已经是显示的，先关掉再打开，确保动画能重新触发
		// 这能解决“闪现后不显示”的组件状态死锁问题
		if (isVisible.value) {
			isVisible.value = false;
			// 使用 nextTick 确保 DOM 更新后再设为 true
			nextTick(() => {
				isVisible.value = true;
			});
		} else {
			isVisible.value = true;
		}

		// 设置新的定时器
		timer = setTimeout(() => {
			hide();
		}, options.duration || 2000);
	}

	function hide() {
		lastMessage = message.value;
		hideTimestamp = Date.now();
		isVisible.value = false;
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
	}

	return {
		isVisible,
		message,
		type,
		show,
		hide
	};
});
