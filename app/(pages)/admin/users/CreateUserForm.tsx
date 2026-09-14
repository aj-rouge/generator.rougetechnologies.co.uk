"use client";

import { useActionState, useEffect, useRef } from "react";
import { createUser, type ActionState } from "../actions";

export default function CreateUserForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createUser,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  const input =
    "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm";

  return (
    <form
      ref={formRef}
      action={action}
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-3"
    >
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
        Add user
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <input
          name="name"
          placeholder="Name (lowercase)"
          required
          pattern="[a-z0-9._-]{2,32}"
          className={input}
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className={input}
        />
        <input
          name="temp"
          type="text"
          placeholder="Temp password (min 12)"
          required
          minLength={12}
          className={input}
        />
        <select name="role" defaultValue="employee" className={input}>
          <option value="employee">Employee</option>
          <option value="dev">Dev</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div className="flex items-center gap-3">
        <button
          disabled={pending}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create user"}
        </button>
        {state?.error && (
          <span className="text-sm text-red-500">{state.error}</span>
        )}
        {state?.ok && (
          <span className="text-sm text-green-600 dark:text-green-400">
            User created. Hand them the temp password — they must change it on
            first login.
          </span>
        )}
      </div>
    </form>
  );
}
