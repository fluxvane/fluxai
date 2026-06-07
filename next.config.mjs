/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	outputFileTracingRoot: '/Users/thontm/workspaces/companies/fluxvane/flux-ai',
	compress: true,
	poweredByHeader: false,
	output: 'standalone',
	images: {
		formats: ['image/avif', 'image/webp'],
		minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
	},
	compiler: {
		removeConsole:
			process.env.NODE_ENV === 'production'
				? { exclude: ['error', 'warn'] }
				: false,
	},
};

export default nextConfig;
