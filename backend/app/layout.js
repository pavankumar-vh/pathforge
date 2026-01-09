export const metadata = {
  title: "PathForge API",
  description: "Career roadmap generation API powered by Google Gemini AI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
