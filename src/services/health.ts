import { createHttp } from './http';

const base = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const http = createHttp(base);

export async function getHealth() {
	const res = await http.get<string>('/health');
	return res.data;
}
