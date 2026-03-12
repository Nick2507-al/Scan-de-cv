import React from "react";
import { Link } from "react-router";
import ThemeTogglerTwo from "../components/common/ThemeTogglerTwo";

export default function AuthLayoutGenesis({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-950">
      <div className="absolute top-4 right-4 z-10">
        <ThemeTogglerTwo />
      </div>
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <Link to="/" className="flex flex-col items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-white shadow-lg">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Genesis
            </span>
            <span className="text-sm font-medium text-brand-500">GRH</span>
          </Link>
          <div className="rounded-2xl border border-gray-200/80 bg-white p-8 shadow-xl dark:border-gray-700 dark:bg-gray-800/80">
            {title && (
              <h2 className="text-center text-lg font-semibold text-gray-800 dark:text-white mb-6">
                {title}
              </h2>
            )}
            {children}
          </div>
          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Application de gestion des ressources humaines
          </p>
        </div>
      </div>
    </div>
  );
}
