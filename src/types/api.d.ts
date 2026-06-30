// [核心新增] 定义备料清单接口的响应类型
export interface BillOfMaterialsItem {
	ingredientId: string;
	ingredientName: string;
	brand?: string | null;
	totalRequired: number; // 总需求量 (g)
}

export interface BillOfMaterialsResponseDto {
	standardItems: BillOfMaterialsItem[];
	nonInventoriedItems: BillOfMaterialsItem[];
}

export type RecipeCategory = 'BREAD' | 'PASTRY' | 'DESSERT' | 'DRINK' | 'OTHER';

export interface CalculatedRecipeIngredient {
	name: string;
	weightInGrams: number;
	brand?: string | null;
	isRecipe: boolean;
	extraInfo?: string;
}

export interface CalculatedRecipeDetails {
	id: string;
	name: string;
	type: 'MAIN' | 'PRE_DOUGH' | 'EXTRA';
	totalWeight: number;
	targetWeight?: number;
	procedure: string[];
	ingredients: CalculatedRecipeIngredient[];
	isCompleted?: boolean;
}

export interface PrepTask {
	id: string;
	title: string;
	details: string;
	items: CalculatedRecipeDetails[];
	status?: 'PREP';
	billOfMaterials?: BillOfMaterialsResponseDto;
}

// [新增] 为任务列表创建的“前置任务摘要”类型，不包含 items 和 billOfMaterials
export type PrepTaskSummary = Omit<PrepTask, 'items' | 'billOfMaterials'>;

// [新增] 为任务列表创建的“普通任务摘要”类型，只包含列表展示所需的最少信息
export interface ProductionTaskSummaryDto {
	id: string;
	status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
	startDate: string;
	endDate: string | null;
	updatedAt: string;
	createdBy: {
		name: string | null;
		phone: string;
	};
	items: {
		quantity: number;
		product: {
			id: string;
			name: string;
			// [新增] 增加配方品类字段
			recipeVersion?: {
				family: {
					id: string;
					name: string;
					category: RecipeCategory;
				};
			};
		};
	}[];
}

export interface ProductionDataPayload {
	stats?: {
		pendingCount: number;
	};
	// [修改] tasks 数组现在是两种“摘要”类型的联合
	tasks: (
		| ProductionTaskSummaryDto
		| (PrepTaskSummary & {
				status: 'PREP';
		  })
	)[];
	prepTask: null;
}

// --- 认证与用户 ---
export interface LoginRes {
	accessToken: string;
	redirectTo?: string;
}

export interface UserInfo {
	id: string;
	phone: string;
	phoneVerifiedAt: string | null;
	name: string | null;
	displayName: string;
	avatarId: string | null;
	avatarUrl: string | null;
	globalRole: GlobalRole;
	status: string;
	createdAt: string;
	tenants: {
		tenant: Tenant;
		role: TenantRole;
	}[];
}

// --- 租户/店铺 ---
export interface Tenant {
	id: string;
	name: string;
	status: 'ACTIVE' | 'INACTIVE';
}

// --- 邀请 ---
export interface InvitationResponse {
	message: string;
	invitationId: string;
}

// --- 配方、产品与版本 ---
export interface RecipeFamily {
	id: string;
	name: string;
	type: 'MAIN' | 'PRE_DOUGH' | 'EXTRA';
	category: RecipeCategory;
	deletedAt: string | null;
	freeTierEnabled: boolean;
	readOnly: boolean;
	versions: RecipeVersion[];
	productionCount?: number;
	productionTaskCount?: number;
	productCount?: number;
	ingredientCount?: number;
	usageCount?: number;
	productNames?: string[];
	referencedByNames?: string[];
	versionCount?: number;
	activeVersion?: {
		id: string;
		version: number;
		notes: string | null;
		changeSummary: RecipeVersionChangeSummary | null;
	} | null;
}

export interface RecipeVersionChangeItem {
	kind:
		| 'INITIAL_VERSION'
		| 'NO_CHANGES'
		| 'LEGACY_TEXT'
		| 'INGREDIENT_ADDED'
		| 'INGREDIENT_REMOVED'
		| 'INGREDIENT_RATIO_CHANGED'
		| 'DEPENDENCY_VERSION_CHANGED'
		| 'PRODUCT_ADDED'
		| 'PRODUCT_REMOVED'
		| 'PRODUCT_WEIGHT_CHANGED'
		| 'PRODUCT_INGREDIENT_ADDED'
		| 'PRODUCT_INGREDIENT_REMOVED'
		| 'PRODUCT_INGREDIENT_AMOUNT_CHANGED'
		| 'PROCEDURE_CHANGED'
		| 'FIELD_CHANGED';
	name?: string;
	productName?: string;
	ingredientType?: 'MIX_IN' | 'FILLING' | 'TOPPING';
	basis?: 'FLOUR_SHARE' | 'RECIPE_RATIO';
	field?: string;
	scope?: 'RECIPE' | 'PRODUCT';
	before?: number;
	after?: number;
	beforeVersion?: number;
	afterVersion?: number;
	unit?: 'RATIO' | 'GRAM' | 'CELSIUS' | 'PERCENT';
	text?: string;
}

export interface RecipeVersionChangeSummary {
	schemaVersion: number;
	items: RecipeVersionChangeItem[];
}

export interface RecipesListResponse {
	mainRecipes: RecipeFamily[];
	preDoughs: RecipeFamily[];
	extras: RecipeFamily[];
}

export interface RecipeFormTemplate {
	name: string;
	type: 'MAIN' | 'PRE_DOUGH' | 'EXTRA';
	category?: RecipeCategory;
	notes: string;
	targetTemp?: number;
	components?: {
		id: string;
		name: string;
		type: 'MAIN_DOUGH' | 'PRE_DOUGH' | 'BASE_COMPONENT';
		lossRatio?: number;
		divisionLoss?: number;
		flourRatioInMainDough?: number;
		recipeVersionId?: string;
		ingredients: {
			id: string | null;
			name: string;
			ratio: number | null;
			isRecipe?: boolean;
			isFlour?: boolean;
			waterContent?: number;
			recipeVersionId?: string;
		}[];
		procedure: string[];
	}[];
	products?: {
		id?: string; // [核心修改] 增加可选的 id 字段
		name: string;
		baseDoughWeight: number;
		mixIns: {
			id: string | null;
			name: string;
			ratio: number | null;
			weightInGrams?: number | null;
			isRecipe?: boolean;
			waterContent?: number;
			recipeVersionId?: string;
		}[];
		fillings: {
			id: string | null;
			name: string;
			ratio: number | null;
			weightInGrams?: number | null;
			isRecipe?: boolean;
			waterContent?: number;
		}[];
		toppings: {
			id: string | null;
			name: string;
			ratio: number | null;
			weightInGrams?: number | null;
			isRecipe?: boolean;
			waterContent?: number;
		}[];
		procedure: string[];
	}[];
	ingredients?: {
		id: string | null;
		name: string;
		ratio: number | null;
		isRecipe?: boolean;
		isFlour?: boolean;
		waterContent?: number;
	}[];
	procedure?: string[];
}

// [G-Code-Note] [核心重构] 定义 DisplayIngredient 类型
// 这与 recipes.service.ts 中的 DisplayIngredient 接口匹配
// [核心修改] 更新 IngredientType，增加 SELF_MADE
export type IngredientType = 'STANDARD' | 'UNTRACKED' | 'NON_INVENTORIED' | 'SELF_MADE';
export type RecipeType = 'MAIN' | 'PRE_DOUGH' | 'EXTRA';

export interface DisplayIngredient {
	id: string;
	name: string;
	tenantId: string;
	type: IngredientType | RecipeType; // 'STANDARD', 'UNTRACKED', 'PRE_DOUGH', 'EXTRA'
	category?: RecipeCategory;
	isFlour: boolean;
	waterContent: number;
	activeSkuId: string | null;
	createdAt: Date;
	updatedAt: Date;
	deletedAt: Date | null;
	extraInfo?: string;
	// [核心新增] 自制原料字段
	recipeFamilyId?: string | null;
}

export interface RecipeVersion {
	id: string;
	familyId: string;
	version: number;
	notes: string | null;
	changeSummary: RecipeVersionChangeSummary | null;
	createdById: string | null;
	createdBy: { id: string; name: string | null; phone: string } | null;
	isActive: boolean;
	createdAt: string;
	products: Product[];
	components: {
		id: string;
		name: string;
		ingredients: ComponentIngredient[]; // [G-Code-Note] ComponentIngredient 类型被修改
		procedure: string[];
		// [核心新增] 补充详细信息字段，与服务端返回值对应
		targetTemp?: number;
		lossRatio?: number;
		divisionLoss?: number;
		customWaterContent?: number;
		_count: {
			ingredients: number;
		};
	}[];
}

export interface RecipeOperationLog {
	id: string;
	action:
		| 'RECIPE_CREATED'
		| 'RECIPE_DISCONTINUED'
		| 'RECIPE_RESTORED'
		| 'VERSION_CREATED'
		| 'VERSION_UPDATED'
		| 'VERSION_NOTES_UPDATED'
		| 'VERSION_ACTIVATED'
		| 'DEPENDENCY_UPDATED';
	description: string;
	createdAt: string;
	versionId: string | null;
	actor: { id: string; name: string | null; phone: string } | null;
	metadata: {
		targetVersion?: number | null;
		isActive?: boolean;
		previousVersion?: number | null;
		activatedVersion?: number | null;
		version?: number;
		before?: string | null;
		after?: string | null;
		changeSummary?: RecipeVersionChangeSummary;
	} | null;
}

export interface DependencyUpgradeItem {
	familyId: string;
	familyName: string;
	type: RecipeType;
	currentVersionId: string;
	updatedDependencyFamilyIds: string[];
	depth: number;
}

export interface DependencyUpgradePlan {
	sourceFamilyId: string;
	sourceVersionId: string;
	affectedRecipes: DependencyUpgradeItem[];
}

export interface ApplyDependencyUpgradeResult {
	upgradedRecipes: Array<{
		familyId: string;
		familyName: string;
		versionId: string;
		version: number;
	}>;
}

export interface PendingDependencyItem {
	familyId: string;
	familyName: string;
}

export interface PendingDependencyUpgradePlan {
	familyId: string;
	familyName: string;
	currentVersionId: string;
	dependencies: PendingDependencyItem[];
}

// [G-Code-Note] [核心重构] ComponentIngredient 现在反映 _sanitizeFamily 的输出
export interface ComponentIngredient {
	id: string;
	ratio: number | null;
	flourRatio: number | null;
	ingredientId: string | null;
	preDoughId: string | null; // [G-Code-Note] 增加 preDoughId
	preDoughVersionId?: string | null;
	extraId: string | null; // [G-Code-Note] 增加 extraId
	extraVersionId?: string | null;
	ingredient: DisplayIngredient | null; // [G-Code-Note] 使用新的 DisplayIngredient

	// [G-Code-Note] 这两个字段在 _sanitizeFamily 中被设为 null，但为安全起见保留
	linkedPreDough?: null;
	linkedExtra?: null;
}

export interface Product {
	id: string;
	recipeVersionId: string;
	name: string;
	baseDoughWeight: number;
	procedure: string[];
}

export interface ProductListItem {
	id: string;
	name: string;
}

export type ProductsForTaskResponse = Record<RecipeCategory, Record<string, ProductListItem[]>>;

export interface CalculatedIngredientInfo {
	id: string;
	name: string;
	ratio: number;
	weightInGrams: number;
	pricePerKg: number;
	cost: number;
	extraInfo?: string;
	isRecipe: boolean; // [G-Code-Note] [核心新增] 确保成本计算 API 也返回这个
}
export interface CalculatedDoughGroup {
	name: string;
	ingredients: CalculatedIngredientInfo[];
	procedure?: string[];
	totalCost: number;
}
export interface CalculatedExtraIngredientInfo {
	id: string;
	name: string;
	type: string;
	cost: number;
	weightInGrams: number;
	ratio?: number;
	isRecipe: boolean;
	ingredients?: CalculatedExtraIngredientInfo[]; // [核心新增] 递归展示子原料
}
export interface RecipeDetails {
	totalCost: number;
	// [G-Code-Note] [核心修复] doughGroups -> componentGroups
	componentGroups: CalculatedDoughGroup[];
	// [G-Code-Note] [需求修改] 移除 extraIngredients 字段，与后端 costing.service.ts 保持一致
	// extraIngredients: CalculatedExtraIngredientInfo[];
	groupedExtraIngredients: Record<string, CalculatedExtraIngredientInfo[]>;
	productProcedure: string[];
}

// --- 原料 ---
export interface Ingredient {
	id: string;
	name: string;
	type: IngredientType;
	isFlour: boolean;
	waterContent: number;
	activeSku: IngredientSKU | null;
	skus: IngredientSKU[];
	currentPricePerPackage: number;
	totalConsumptionInGrams: number;
	monthlyConsumptionInGrams?: number;
	monthlyProductionInGrams?: number;
	monthlyProductionCount?: number;

	unitPricePerGram?: number;
	productionRecords?: IngredientLedgerEntry[];
	recipeFamilyId?: string | null;
	recipeFamily?: {
		id: string;
		name: string;
		versions: {
			id: string;
			version: number;
			products: {
				id: string;
			}[];
		}[];
	} | null;
}

export interface IngredientsListResponse {
	allIngredients: Ingredient[];
}

export interface IngredientPreset {
	id: string;
	name: string;
	isFlour: boolean;
	waterContent: number;
}

export interface IngredientEditorCatalog {
	presets: IngredientPreset[];
	ingredients: Array<Pick<Ingredient, 'id' | 'name' | 'type' | 'isFlour' | 'waterContent'>>;
}

export interface IngredientLedgerEntry {
	id?: string;
	date: string;
	details: string;
	change: number;
	operator: string;
	type?: string;
}

export interface IngredientConsumptionLedgerEntry {
	id: string;
	date: string;
	taskId: string;
	operator: string;
	taskName: string;
	taskProducts: {
		name: string;
		quantity: number;
	}[];
	quantityInGrams: number;
	sku: {
		brand: string | null;
		specName: string;
	} | null;
}

export interface IngredientConsumptionLedgerResponse {
	data: IngredientConsumptionLedgerEntry[];
	meta: {
		total: number;
		page: number;
		limit: number;
		hasMore: boolean;
	};
}

export interface IngredientSKU {
	id: string;
	brand: string | null;
	specName: string;
	specWeightInGrams: number;
	status: 'ACTIVE' | 'INACTIVE';
	priceRecords?: PriceRecord[];
	createdAt: string;
}

export interface PriceRecord {
	id: string;
	packageCount: number;
	pricePerPackage: number;
	recordedAt: string;
}

// [核心新增] 定义 SKU 更新的数据类型
export interface UpdateSkuDto {
	brand?: string;
	specName?: string;
	specWeightInGGrams?: number;
}

// --- 生产任务 ---
// [修改] 这是“完整”的任务详情类型，仅用于详情页
export interface ProductionTaskDto {
	id: string;
	status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
	startDate: string;
	endDate: string | null;
	completedAt: string | null;
	updatedAt: string;
	notes: string | null;
	createdBy: {
		name: string | null;
		phone: string;
	};
	items: {
		id: string;
		quantity: number;
		product: {
			id: string;
			name: string;
			baseDoughWeight: number;
			recipeVersion: {
				family: {
					id: string;
					name: string;
				};
				components: {
					id: string;
					name: string;
					ingredients: ComponentIngredient[]; // [G-Code-Note] 已更新为新类型
				}[];
			};
		};
	}[];
}

export interface CreateTaskResponse {
	task: ProductionTaskDto;
	warning?: string;
}

// --- 团队成员 ---
export interface Member {
	id: string;
	name: string | null;
	displayName: string;
	phone: string;
	avatarUrl: string | null;
	role: TenantRole;
	status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
	joinDate: string;
}

export interface TenantWithMembers {
	tenantId: string;
	tenantName: string;
	members: Member[];
}

// --- 平台角色与店铺角色（作用域不同，不可混用） ---
export type GlobalRole = 'USER' | 'SUPER_ADMIN';
export type TenantRole = 'OWNER' | 'ADMIN' | 'MEMBER';

// --- 统计数据 ---
export interface RecipeStatDto {
	name: string;
	count: number;
}

export interface IngredientStatDto {
	name: string;
	consumedGrams: number;
}

export interface ProductionStatsResponse {
	totalTasks: number;
	productStats: RecipeStatDto[];
	ingredientConsumption: IngredientStatDto[];
}

export interface DashboardStats {
	totalTenants?: number;
	totalUsers: number;

	totalRecipes: number;
	totalTasks: number;
}

export interface TaskIngredientDetail {
	id: string;
	name: string;
	brand: string | null;
	weightInGrams: number;
	weightPerUnit?: number;
	isRecipe: boolean;
	extraInfo?: string | null;
}

export interface ProductComponentSummary {
	id: string;
	name: string;
	quantity: number;
	totalBaseComponentWeight: number;
	divisionWeight: number;
}

export interface ProductDetails {
	id: string;
	name: string;
	// [G-Code-Note] [需求修改] 新增 baseComponent 字段
	baseComponent: {
		name: string; // 根据品类显示 "面团" 或 "主料"
		quantity: number;
		totalBaseComponentWeight: number;
		divisionWeight: number;
	};
	mixIns: TaskIngredientDetail[];
	fillings: TaskIngredientDetail[];
	toppings: TaskIngredientDetail[];
	procedure: string[];
}

export interface ComponentGroup {
	familyId: string;
	familyName: string;
	version: number;
	category: RecipeCategory;
	productsDescription: string;
	totalComponentWeight: number;
	baseComponentIngredients: TaskIngredientDetail[];
	baseComponentProcedure: string[];
	// [G-Code-Note] [需求修改] 移除 products 字段
	// products: ProductComponentSummary[];
	productDetails: ProductDetails[];
}

export interface TaskCompletionItem {
	id: string;
	name: string;
	plannedQuantity: number;
}

export interface TaskRecipeVersionStatus {
	familyId: string;
	familyName: string;
	selectedVersionId: string;
	selectedVersion: number;
	currentVersionId: string;
	currentVersion: number;
	hasUpdate: boolean;
}

export interface ProductionTaskDetailDto {
	id: string;
	status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
	notes: string | null;
	// [G-Code-Note] [需求修改] 移除 prepTask 字段
	// prepTask: PrepTask | null;
	componentGroups: ComponentGroup[];
	items: TaskCompletionItem[];
	recipeVersions: TaskRecipeVersionStatus[];
	executionStartedAt: string | null;
}

