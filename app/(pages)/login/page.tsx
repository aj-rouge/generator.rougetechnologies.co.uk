"use client";

import { useActionState } from "react";
import { login } from "../../actions/auth";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null);

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full flex flex-col items max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-800">
          <div className="mb-4">
            <img
              className="rounded-full bg-white mx-auto object-contain w-16 p-2"
              src="https://www.rougetechnologies.co.uk/hero-logo.svg"
            />
          </div>
          <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-8">
            Admin Login
          </h1>

          <form action={formAction} className="space-y-6">
            <div>
              <input
                name="name"
                type="text"
                placeholder="Name"
                required
                autoComplete="username"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <input
                name="passcode"
                type="password"
                placeholder="Passcode"
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Logging in..." : "Log in"}
            </button>

            {state && state.error && (
              <p className="text-red-500 dark:text-red-400 text-sm text-center mt-4">
                {state.error}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
