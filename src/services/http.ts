import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

function createHttpClient(baseURL?: string): AxiosInstance {
	const instance = axios.create({
		baseURL: baseURL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '',
		headers: { 'Content-Type': 'application/json' },
		withCredentials: true // httpOnly cookies are sent automatically
	});

	// Handle 401 responses — redirect to login
	instance.interceptors.response.use(
		(response: AxiosResponse) => response,
		(error) => {
			if (error.response?.status === 401 && globalThis.window !== undefined) {
				localStorage.removeItem('auth_user');
				globalThis.window.location.href = '/login';
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
