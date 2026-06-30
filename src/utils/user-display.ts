export function maskPhone(phone?: string | null): string {
	if (!phone) return '新成员';
	if (!/^1\d{10}$/.test(phone)) return phone;
	return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

export function getUserDisplayName(user?: { name?: string | null; displayName?: string | null; phone?: string | null } | null): string {
	return user?.displayName?.trim() || user?.name?.trim() || maskPhone(user?.phone);
}

export function getAvatarVariant(userId?: string | null): number {
	if (!userId) return 0;
	let hash = 2166136261;
	for (let index = 0; index < userId.length; index += 1) {
		hash ^= userId.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return (hash >>> 0) % 6;
}
