export interface LoginRes { access_token : string; }
export interface UserInfo { id : string; name : string; email : string; }
export interface RecipeIngredient { name : string; amount : string; cost : number; }
export interface Recipe { id : number; name : string; type : string; weight : number; rating : number; publicCount : number; ingredients : RecipeIngredient[]; }
export interface Ingredient { id : number; name : string; brand : string; price : number; stock : number; }
export interface Member { id : number; name : string; role : string; joinDate : string; }
export interface Tenant { id : string; name : string; }