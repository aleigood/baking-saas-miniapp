import { request } from '@/utils/request';

export interface RecipeEditorScanPayload {
	type: 'RECIPE_EDITOR_LOGIN';
	sessionId: string;
	token: string;
}

export function approveRecipeEditorSession(sessionId: string, token: string) {
	return request<{ id: string; status: string; tenantId: string; expiresAt: string }>({
		url: `/recipe-editor/sessions/${sessionId}/approve`,
		method: 'POST',
		data: { token }
	});
}

export function approveRecipeEditorSessionByCode(code: string) {
	return request<{ id: string; status: string; tenantId: string; expiresAt: string }>({
		url: '/recipe-editor/sessions/approve-code',
		method: 'POST',
		data: { code }
	});
}
