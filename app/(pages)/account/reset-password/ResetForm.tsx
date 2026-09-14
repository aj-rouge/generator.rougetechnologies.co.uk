"use client";

import { useActionState } from "react";
import { resetOwnPassword } from "../../../utils/auth/actions";

export default function ResetForm() {
  const [state, action, pending] = useActionState(
    resetOwnPassword,
    {},
  );
  const input =
    "w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white";

  return (
    <form action={action} className="space-y-4">
      <input
        name="current"
        type="password"
        placeholder="Current password"
        required
        className={input}
      />
      <input
        name="next"
        type="password"
        placeholder="New password (min 12)"
        required
        minLength={12}
        className={input}
      />
      <input
        name="confirm"
        type="password"
        placeholder="Confirm new password"
        required
        minLength={12}
        className={input}
      />
      {state?.error && <p className="text-red-500 text-sm">{state.error}</p>}
      <button
        disabled={pending}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
      >
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
