/**
 * 文件路径: src/utils/predefinedIngredients.ts
 * 文件描述: [新增] 预定义的常用原料库，用于提升新用户体验。
 */

// 定义预定义原料的接口
interface PredefinedIngredient {
	name: string;
	isFlour: boolean;
	waterContent: number; // 小数形式，例如 0.75 代表 75%
}

export const predefinedIngredients: PredefinedIngredient[] = [
	// --- 面粉类 ---
	{ name: '面包粉', isFlour: true, waterContent: 0 },
	{ name: '高筋粉', isFlour: true, waterContent: 0 },
	{ name: '中筋粉', isFlour: true, waterContent: 0 },
	{ name: '全麦粉', isFlour: true, waterContent: 0 },
	{ name: '裸麦粉', isFlour: true, waterContent: 0 },
	{ name: '黑麦粉', isFlour: true, waterContent: 0 },
	{ name: 'T45', isFlour: true, waterContent: 0 },
	{ name: 'T55', isFlour: true, waterContent: 0 },
	{ name: 'T65', isFlour: true, waterContent: 0 },
	{ name: 'T80', isFlour: true, waterContent: 0 },
	{ name: 'T110', isFlour: true, waterContent: 0 },
	{ name: 'T150', isFlour: true, waterContent: 0 },
	{ name: 'T170', isFlour: true, waterContent: 0 },

	// --- 湿性材料 ---
	{ name: '水', isFlour: false, waterContent: 1 },
	{ name: '牛奶', isFlour: false, waterContent: 0.87 },
	{ name: '淡奶油', isFlour: false, waterContent: 0.6 },
	{ name: '蜂蜜', isFlour: false, waterContent: 0.17 },
	{ name: '炼乳', isFlour: false, waterContent: 0.27 },
	{ name: '鸡蛋', isFlour: false, waterContent: 0.75 },
	{ name: '全蛋', isFlour: false, waterContent: 0.75 },
	{ name: '蛋黄', isFlour: false, waterContent: 0.5 },
	{ name: '蛋清', isFlour: false, waterContent: 0.88 },
	{ name: '蛋白', isFlour: false, waterContent: 0.88 },

	// --- 其他常用干性材料 (保留以便于输入) ---
	{ name: '白砂糖', isFlour: false, waterContent: 0 },
	{ name: '盐', isFlour: false, waterContent: 0 },
	{ name: '即发干酵母', isFlour: false, waterContent: 0 },
	{ name: '鲜酵母', isFlour: false, waterContent: 0 },
	{ name: '黄油', isFlour: false, waterContent: 0 },
	{ name: '奶粉', isFlour: false, waterContent: 0 },
	{ name: '麦芽精', isFlour: false, waterContent: 0 }
];
