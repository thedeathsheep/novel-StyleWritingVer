import "@/styles/globals.css";
import "@/styles/prosemirror.css";
import 'katex/dist/katex.min.css';

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Providers from "./providers";

const title = "StyleEvent — 风格写作";
const description =
  "StyleEvent is an inspiration-resonance writing assistant. It retrieves, never generates — surfacing sourced fragments to spark your creativity.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
  },
    twitter: {
      title,
      description,
      card: "summary_large_image",
    },
};

export const viewport: Viewport = {
  themeColor: "#0f0f0f",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
