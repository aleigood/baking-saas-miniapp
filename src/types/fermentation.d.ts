/**
 * 文件路径: src/types/fermentation.d.ts
 * 文件描述: [新增] 定义发酵计算器相关的类型。
 */

// 定义酵母/酵头类型的枚举
export enum FermentationType {
	COMMERCIAL_YEAST = 'COMMERCIAL_YEAST',
	LEVAIN = 'LEVAIN',
}

// 定义酵母品牌/种类的枚举
export enum YeastBrand {
	INSTANT_DRY = 'INSTANT_DRY',
	ACTIVE_DRY = 'ACTIVE_DRY',
	FRESH = 'FRESH',
	SEMI_DRY = 'SEMI_DRY',
	LEVAIN = 'LEVAIN',
}