/**
 * 文件路径: src/utils/format.ts
 * 文件描述: [新增] 提供统一的格式化函数，解决日期在不同设备上显示不一致的问题。
 */

/**
 * 格式化日期为 "YYYY/M/D" 的格式
 * @param dateInput - 可以是日期字符串或Date对象
 * @returns 格式化后的中文字符串，如果输入无效则返回空字符串
 */
export function formatChineseDate(dateInput : string | Date | null | undefined) : string {
	if (!dateInput) {
		return '';
	}
	try {
		const date = new Date(dateInput);
		// 验证日期是否有效
		if (isNaN(date.getTime())) {
			return '';
		}
		const year = date.getFullYear();
		const month = date.getMonth() + 1;
		const day = date.getDate();
		return `${year}/${month}/${day}`;
	} catch (error) {
		console.error('Invalid date input for formatChineseDate:', dateInput);
		return '';
	}
}