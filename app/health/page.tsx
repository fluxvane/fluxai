import { getHealth } from '@/services/health';

export default async function HealthPage() {
	const health = await getHealth().catch(() => 'unavailable');
	return <div>Health: {String(health)}</div>;
}
