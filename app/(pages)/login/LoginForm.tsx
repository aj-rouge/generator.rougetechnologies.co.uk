"use client";

import { useActionState } from "react";
import { login, type LoginState } from "../../utils/auth/actions";

export default function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    login,
    null,
  );

  const input =
    "w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full flex flex-col items max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-800">
          <div className="mb-4">
            <img
              className="rounded-full bg-white mx-auto object-contain w-16 p-2"
              src="https://www.rougetechnologies.co.uk/hero-logo.svg"
              alt="Logo"
            />
          </div>
          <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-8">
            Login
          </h1>

          <form action={action} className="space-y-6">
            <input type="hidden" name="next" value={next} />
            <input
              name="email"
              type="email"
              placeholder="Email"
              required
              autoComplete="email"
              className={input}
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              required
              autoComplete="current-password"
              className={input}
            />
            <button
              type="submit"
              disabled={pending}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending ? "Logging in..." : "Log in"}
            </button>
            {state?.error && (
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
