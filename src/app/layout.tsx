import "./globals.css";

export const metadata = {
  title: "Arisan Web3 App",
  description: "Decentralized Arisan Application with Blockchain",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}