import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Get the auth token from localStorage (if available)
 */
function getAuthToken(): string | null {
	if (typeof window === 'undefined') return null;
	return localStorage.getItem('accessToken');
}

function createHttpClient(baseURL?: string): AxiosInstance {
	const instance = axios.create({
		baseURL: baseURL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '',
		headers: { 'Content-Type': 'application/json' },
		withCredentials: true
	});

	// Inject auth token on every request
	instance.interceptors.request.use((config) => {
		const token = getAuthToken();
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	});

	// Handle 401 responses — redirect to login
	instance.interceptors.response.use(
		(response: AxiosResponse) => response,
		(error) => {
			if (error.response?.status === 401 && typeof window !== 'undefined') {
				localStorage.removeItem('accessToken');
				localStorage.removeItem('user');
				window.location.href = '/login';
			}
			return Promise.reject(error);
		}
	);

	return instance;
}

const defaultClient = createHttpClient();

export function get<T>(url: string, config?: AxiosRequestConfig) {
	return defaultClient.get<T>(url, config);
}

export function post<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
	return defaultClient.post<T>(url, data, config);
}

export function put<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
	return defaultClient.put<T>(url, data, config);
}

export function del<T>(url: string, config?: AxiosRequestConfig) {
	return defaultClient.delete<T>(url, config);
}

export function createHttp(baseURL?: string) {
	const client = createHttpClient(baseURL);
	return {
		get: <T>(url: string, config?: AxiosRequestConfig) => client.get<T>(url, config),
		post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => client.post<T>(url, data, config),
		put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => client.put<T>(url, data, config),
		delete: <T>(url: string, config?: AxiosRequestConfig) => client.delete<T>(url, config)
	};
}

export const http = { get, post, put, delete: del };
