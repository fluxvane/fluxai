export function getShiningTreeDomains(): string[] {
	const domains = process.env.NEXT_PUBLIC_SHININGTREE_DOMAINS || 'dev.shiningtree.co,shiningtree.co';
	return domains.split(',').map(d => d.trim());
}

export function getDefaultShiningTreeDomain(): string {
	return process.env.NEXT_PUBLIC_DEFAULT_ORGANIZATION_DOMAIN || 'dev.shiningtree.co';
}

export function isShiningTreeDomain(domain: string): boolean {
	const shiningTreeDomains = getShiningTreeDomains();
	return shiningTreeDomains.some(d => domain.includes(d));
}

export function getOrganizationDomain(currentDomain: string): string {
	if (currentDomain === 'localhost' || currentDomain.includes('127.0.0.1')) {
		return getDefaultShiningTreeDomain();
	}
	if (isShiningTreeDomain(currentDomain)) {
		return getDefaultShiningTreeDomain();
	}
	return currentDomain;
}
