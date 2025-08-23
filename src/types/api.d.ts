/**
 * 文件路径: src/types/api.d.ts
 * 文件描述: (已更新) 使用 deletedAt 字段判断配方状态，并恢复 productionCount 字段。
 */

// [新增] 为前置准备任务功能新增的类型定义
export interface CalculatedRecipeIngredient {
	name : string;
	weightInGrams : number;
}
export interface CalculatedRecipeDetails {
	id : string;
	name : string;
	totalWeight : number;
	procedure : string[];
	ingredients : CalculatedRecipeIngredient[];
}
export interface PrepTask {
	id : string;
	title : string;
	details : string;
	items : CalculatedRecipeDetails[];
	status ?: 'PREP';
}
export interface ProductionDataPayload {
	tasks : ProductionTaskDto[];
	prepTask : PrepTask | null;
}
// [新增] 任务详情页需要额外的字段
export interface ProductionTaskDetailDto extends ProductionTaskDto {
	totalIngredients : {
		ingredientId : string;
		name : string;
		totalWeightInGrams : number;
	}[];
	stockWarning : string | null;
	// [核心新增] 为任务详情增加备料清单字段
	prepTask ?: PrepTask | null;
}


// --- 认证与用户 ---
export interface LoginRes {
	accessToken : string;
}

export interface UserInfo {
	id : string;
	phone : string;
	name : string | null;
	role : Role;
	status : string;
	createdAt : string;
	tenants : {
		tenant : Tenant;
		role : Role;
	}[];
}

// --- 租户/店铺 ---
export interface Tenant {
	id : string;
	name : string;
}

// --- 邀请 ---
export interface InvitationResponse {
	message : string;
	invitationId : string;
}

// --- 配方、产品与版本 ---
export interface RecipeFamily {
	id : string;
	name : string;
	type : 'MAIN' | 'PRE_DOUGH' | 'EXTRA';
	deletedAt : string | null; // [修复] 使用 deletedAt 判断状态
	versions : RecipeVersion[];
	productionCount ?: number; // [修复] 恢复误删除的字段
	productionTaskCount ?: number;
}

export interface RecipeVersion {
	id : string;
	familyId : string;
	version : number;
	notes : string | null;
	isActive : boolean;
	createdAt : string;
	products : Product[];
	doughs : {
		id : string;
		name : string;
		ingredients : DoughIngredient[];
		_count : {
			ingredients : number;
		};
	}[];
}

// [核心修改] 更新 DoughIngredient 类型以反映新的数据结构
export interface DoughIngredient {
	id : string;
	ratio : number;
	ingredientId : string;
	ingredient : {
		id : string;
		name : string;
		isFlour : boolean;
	};
}


export interface Product {
	id : string;
	recipeVersionId : string;
	name : string;
	baseDoughWeight : number;
}

export interface ProductListItem {
	id : string;
	name : string;
	type : string;
	familyId : string;
}

export interface CalculatedIngredientInfo {
	name : string;
	ratio : number;
	weightInGrams : number;
	pricePerKg : string;
	cost : number;
}
export interface CalculatedDoughGroup {
	name : string;
	ingredients : CalculatedIngredientInfo[];
	procedure ?: string[];
	totalCost : number;
}
export interface CalculatedExtraIngredientInfo {
	id : string;
	name : string;
	type : string;
	cost : number;
	weightInGrams : number;
	ratio ?: number;
}
export interface RecipeDetails {
	totalCost : number;
	doughGroups : CalculatedDoughGroup[];
	extraIngredients : CalculatedExtraIngredientInfo[];
	groupedExtraIngredients : Record<string, CalculatedExtraIngredientInfo[]>;
}


// --- 原料与库存 ---
export interface Ingredient {
	id : string;
	name : string;
	type : 'STANDARD' | 'UNTRACKED';
	isFlour : boolean;
	waterContent : number;
	activeSku : IngredientSKU | null;
	skus : IngredientSKU[];
	currentStockInGrams : number;
	currentPricePerPackage : number;
	avgConsumptionPerTask : number;
	daysOfSupply : number;
	avgDailyConsumption : number;
	totalConsumptionInGrams : number;
}

export interface IngredientSKU {
	id : string;
	brand : string | null;
	specName : string;
	specWeightInGrams : number;
	status : 'ACTIVE' | 'INACTIVE';
	procurementRecords ?: ProcurementRecord[];
	createdAt : string;
}

export interface ProcurementRecord {
	id : string;
	packagesPurchased : number;
	pricePerPackage : number;
	purchaseDate : string;
}

// [新增] 库存流水条目类型
export interface IngredientLedgerEntry {
	date : string;
	type : '采购入库' | '生产消耗' | '库存调整';
	change : number; // 单位: 克
	details : string;
	operator : string;
}


// --- 生产任务 ---
export interface ProductionTaskDto {
	id : string;
	status : 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
	plannedDate : string;
	// [新增] 任务的实际完成时间
	completedAt : string | null;
	updatedAt : string; // [新增] 任务最后更新时间
	notes : string | null;
	items : {
		id : string;
		quantity : number;
		product : {
			id : string;
			name : string;
			baseDoughWeight : number;
			recipeVersion : {
				family : {
					id : string;
					name : string;
				};
				doughs : {
					id : string;
					name : string;
					ingredients : DoughIngredient[];
				}[];
			};
		};
	}[];
	// [新增] 库存警告信息
	stockWarning ?: string;
}

// [新增] 创建生产任务的响应类型
export interface CreateTaskResponse {
	task : ProductionTaskDto;
	warning ?: string;
}


// --- 团队成员 ---
export interface Member {
	id : string;
	name : string;
	phone : string;
	role : Role;
	status : 'ACTIVE' | 'INACTIVE' | 'PENDING';
	joinDate : string;
}

// --- 角色枚举 (与后端保持一致) ---
export type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'SUPER_ADMIN';

// --- 统计数据 ---
export interface RecipeStatDto {
	name : string;
	count : number;
}

export interface IngredientStatDto {
	name : string;
	consumedGrams : number;
}

export interface ProductionStatsResponse {
	totalTasks : number;
	productStats : RecipeStatDto[];
	ingredientConsumption : IngredientStatDto[];
}

export interface ProductionTaskDetailDto extends ProductionTaskDto {
	totalIngredients : {
		ingredientId : string;
		name : string;
		totalWeightInGrams : number;
	}[];
	stockWarning : string | null;
	prepTask ?: PrepTask | null;
}

// 为生产主页聚合接口定义返回类型
export interface ProductionDashboardPayload {
	stats : {
		pendingCount : number;
		completedThisWeekCount : number;
	};
	tasks : ProductionTaskDto[];
	prepTask : PrepTask | null;
	hasHistory : boolean; // [核心新增]
}