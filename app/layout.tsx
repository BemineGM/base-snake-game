import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

const appUrl = "https://base-snake.netlify.app";

export const metadata: Metadata = {
  title: "Base Snake",
  description: "Collect crystals, earn points, compete on Base!",
  openGraph: {
    title: "Base Snake",
    description: "Web3 Snake Game on Base",
    images: [`${appUrl}/splash.png`],
  },
  other: {
    "base:app_id": "69a1ed6d0504b72df703c1a5",
    "fc:frame": JSON.stringify({
      version: "next",
      imageUrl: `${appUrl}/splash.png`,
      button: {
        title: "Play Base Snake",
        action: {
          type: "launch_frame",
          name: "Base Snake",
          url: appUrl,
          splashImageUrl: `${appUrl}/splash.png`,
          splashBackgroundColor: "#0052FF",
        },
      },
    }),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="base:app_id" content="69a1ed6d0504b72df703c1a5" />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}