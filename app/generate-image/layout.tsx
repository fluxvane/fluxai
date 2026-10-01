import type { Metadata } from "next";

export const metadata: Metadata = { title: "Image studio" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
