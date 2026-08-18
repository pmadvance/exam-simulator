import type { Metadata } from "next";
import type { ReactNode } from "react";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";
import "./globals.css";
import { ToastProvider } from "./components/Toast";
import { CurrencyProvider } from "../lib/currency";

export const metadata: Metadata = {
  title: "PM Exam Pro",
  description: "Practice exams for PMP®, CAPM®, PMI-RMP®, PMI-ACP® and project management training by PM Advance Sdn Bhd — PMI Authorized Training Partner #4930."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <CurrencyProvider>
          <ToastProvider>{children}</ToastProvider>
        </CurrencyProvider>
      </body>
    </html>
  );
}
