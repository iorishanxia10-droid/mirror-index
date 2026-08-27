import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MIRROR INDEX — E.G.Oギフト逆引き",
  description: "Limbus Company 鏡ダンジョン用 E.G.Oギフト逆引き・単騎サポートパッシブ推薦ツール"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
