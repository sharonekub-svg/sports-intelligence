import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";

const rubik = Rubik({
  variable: "--font-sans",
  subsets: ["hebrew", "latin"],
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
      className={`${rubik.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
