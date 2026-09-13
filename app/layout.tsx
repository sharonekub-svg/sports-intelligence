import type { Metadata } from "next";
import { IBM_Plex_Sans_Hebrew, IBM_Plex_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const plexSansHebrew = IBM_Plex_Sans_Hebrew({
  variable: "--font-sans",
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Sports Intelligence",
    template: "%s | Sports Intelligence",
  },
  description:
    "פלטפורמת אנליטיקת ספורט — השוואת הסתברויות מודל מול נתוני שוק. הערכות סטטיסטיות בלבד, ללא הבטחת תוצאה.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="he"
      dir="rtl"
      data-scroll-behavior="smooth"
      className={`${plexSansHebrew.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="bg-grain min-h-full flex flex-col bg-background text-foreground">
        <TooltipProvider delay={200}>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
