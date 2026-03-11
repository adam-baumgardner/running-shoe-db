import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stride Stack",
  description: "Running shoe comparison and review intelligence for real buyers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="site-shell">
            <Link className="brand-mark" href="/">
              Stride Stack
            </Link>
            <nav className="site-nav" aria-label="Primary">
              <Link href="/shoes">Shoes</Link>
              <Link href="/compare">Compare</Link>
              <Link href="/reviews">Reviews</Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
