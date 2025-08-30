/**
 * 文件路径: src/types/api.d.ts
 * 文件描述: (已更新) 使用 deletedAt 字段判断配方状态，并恢复 productionCount 字段。
 */

// [核心修改] 为备料任务中的原料增加可选的 brand 和 isRecipe 字段
export interface CalculatedRecipeIngredient {
	name : string;
	weightInGrams : number;
	brand ?: string | null;
	isRecipe : boolean; // 新增字段，用于标识该原料是否为另一个配方
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
// [核心修改] 更新 ProductionDataPayload 类型，增加 stats 字段
export interface ProductionDataPayload {
	stats ?: {
		todayPendingCount : number;
	};
	tasks : ProductionTaskDto[];
	prepTask : PrepTask | null;
}
// [修改] 为任务详情增加 productionTaskSpoilageLogs 字段
export interface ProductionTaskDetailDto extends ProductionTaskDto {
	totalIngredients : {
		ingredientId : string;
		name : string;
		totalWeightInGrams : number;
	}[];
	stockWarning : string | null;
	// [核心新增] 为任务详情增加备料清单字段
	prepTask ?: PrepTask | null;
	productionTaskSpoilageLogs : {
		stage : string;
		quantity : number;
		product : {
			name : string;
		}
	}[];
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
	pricePerKg : number;
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

// [修改] 更新库存流水条目类型以包含损耗
export interface IngredientLedgerEntry {
	date : string;
	type : '采购入库' | '生产消耗' | '库存调整' | '生产损耗';
	change : number; // 单位: 克
	details : string;
	operator : string;
}

// [核心新增] 定义库存流水接口的完整响应类型
export interface IngredientLedgerResponse {
	data : IngredientLedgerEntry[];
	meta : {
		total : number;
		page : number;
		limit : number;
		hasMore : boolean;
	}
}


// --- 生产任务 ---
export interface ProductionTaskDto {
	id : string;
	status : 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
	// [修改] plannedDate -> startDate, 新增 endDate
	startDate : string;
	endDate : string | null;
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

// [核心新增] 为任务详情页增加一个类型，与后端的 TaskDetailResponseDto 对应
export interface ProductionTaskDetailDto {
	id : string;
	status : 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
	notes : string | null;
	stockWarning : string | null;
	prepTask : PrepTask | null;
	doughGroups : any[]; // 实际类型更复杂，这里用 any 简化
	items : {
		id : string;
		name : string;
		plannedQuantity : number;
	}[];
}

// [核心修改] 移除了不再使用的 ProductionDashboardPayload 类型