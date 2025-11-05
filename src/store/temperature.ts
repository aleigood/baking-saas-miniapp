/**
 * 文件路径: src/store/temperature.ts
 * 文件描述: [新增] 用于管理和持久化温度设置的 Pinia store
 */
import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';

// 定义温度设置的数据结构
export interface TemperatureSettings {
	mixerType: number;
	envTemp: number;
	flourTemp: number;
	waterTemp: number;
}

export const useTemperatureStore = defineStore('temperature', () => {
	// [核心修改] 更新摩擦系数(F)的预设值，并添加“自定义”选项
	const mixerTypes = ref([
		{ text: '家用 (9°C)', value: 9 },
		{ text: '商用-低速 (12°C)', value: 12 },
		{ text: '商用-中速 (16°C)', value: 16 },
		{ text: '商用-高速 (20°C)', value: 20 },
		{ text: '自定义 (已校准)', value: -1 } // -1 作为"自定义"的特殊标记
	]);

	// 使用 reactive 来管理设置对象
	const settings = reactive<TemperatureSettings>({
		mixerType: 16, // [核心修改] 默认值改为 16
		envTemp: 25,
		flourTemp: 25,
		waterTemp: 25
	});

	/**
	 * 从本地存储加载设置
	 */
	const initTemperatureSettings = () => {
		try {
			const storedSettings = uni.getStorageSync('temperature_settings');
			if (storedSettings) {
				const parsedSettings = JSON.parse(storedSettings);
				settings.mixerType = parsedSettings.mixerType ?? 16; // [核心修改] 备用值改为 16
				settings.envTemp = parsedSettings.envTemp ?? 25;
				settings.flourTemp = parsedSettings.flourTemp ?? 25;
				settings.waterTemp = parsedSettings.waterTemp ?? 25;
			}
		} catch (e) {
			console.error('加载温度设置失败', e);
		}
	};

	/**
	 * 保存设置到本地存储
	 * @param newSettings 新的温度设置
	 */
	const saveTemperatureSettings = (newSettings: Partial<TemperatureSettings>) => {
		Object.assign(settings, newSettings);
		try {
			uni.setStorageSync('temperature_settings', JSON.stringify(settings));
		} catch (e) {
			console.error('保存温度设置失败', e);
		}
	};

	return {
		settings,
		mixerTypes,
		initTemperatureSettings,
		saveTemperatureSettings
	};
});
