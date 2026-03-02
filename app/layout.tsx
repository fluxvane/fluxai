import type { Metadata } from 'next';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'NERA AI Dashboard',
  description: 'AI Chat & Analytics Dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body style={{ margin: 0 }}>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
