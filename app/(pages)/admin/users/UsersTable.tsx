"use client";

import { useActionState, useEffect, useState } from "react";
import {
  toggleUserActive,
  resetUserPassword,
  updateUser,
  deleteUser,
  restoreUser,
  type ActionState,
} from "../actions";
import type { UserRow } from "./page";

function fmt(ms: number | null) {
  if (!ms) return "—";
  return new Date(ms).toLocaleString();
}

function displayClean(str: string) {
  return str.replace(/__deleted_\d+$/, "");
}

export default function UsersTable({
  users,
  currentUserId,
  sessionCounts,
}: {
  users: UserRow[];
  currentUserId: string;
  sessionCounts: Record<string, number>;
}) {
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/50 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Last login</th>
            <th className="px-4 py-3 font-medium">Sessions</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                No users found.
              </td>
            </tr>
          ) : (
            users.map((u) => {
              const isMe = u.id === currentUserId;
              const isEditing = editing === u.id;
              const isDeleted = u.deleted_at !== null;

              return (
                <tr
                  key={u.id}
                  className={`border-t border-gray-100 dark:border-gray-800 ${
                    isDeleted
                      ? "opacity-60 bg-gray-50/50 dark:bg-gray-900/50"
                      : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <EditInline user={u} onDone={() => setEditing(null)} />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {displayClean(u.name)}
                        </span>
                        {isMe && (
                          <span className="text-xs text-gray-400">(you)</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {displayClean(u.email)}
                  </td>
                  <td className="px-4 py-3">{u.role}</td>
                  <td className="px-4 py-3">
                    {isDeleted ? (
                      <span className="text-gray-400 font-medium">Deleted</span>
                    ) : u.is_active ? (
                      <span className="text-green-600 dark:text-green-400">
                        Active
                      </span>
                    ) : (
                      <span className="text-red-500">Disabled</span>
                    )}
                    {!isDeleted && u.must_reset_pw ? (
                      <span className="ml-2 text-xs text-amber-500">
                        reset pending
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {fmt(u.last_login_at)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {sessionCounts[u.id] ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3 text-xs">
                      {isDeleted ? (
                        <form
                          action={async (fd) => {
                            await restoreUser(fd);
                          }}
                        >
                          <input type="hidden" name="id" value={u.id} />
                          <button className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                            Restore
                          </button>
                        </form>
                      ) : (
                        <>
                          {!isEditing && (
                            <button
                              onClick={() => setEditing(u.id)}
                              className="text-gray-600 dark:text-gray-300 hover:underline"
                            >
                              Edit
                            </button>
                          )}
                          {!isMe && <ResetPasswordButton id={u.id} />}
                          {!isMe && (
                            <form
                              action={async (fd) => {
                                await toggleUserActive(fd);
                              }}
                            >
                              <input type="hidden" name="id" value={u.id} />
                              <button
                                className={
                                  u.is_active
                                    ? "text-red-500 hover:underline"
                                    : "text-green-600 dark:text-green-400 hover:underline"
                                }
                              >
                                {u.is_active ? "Disable" : "Enable"}
                              </button>
                            </form>
                          )}
                          {!isMe && (
                            <form
                              action={async (fd) => {
                                await deleteUser(fd);
                              }}
                              onSubmit={(e) => {
                                if (
                                  !confirm(
                                    `Are you sure you want to soft-delete ${displayClean(u.name)}?`,
                                  )
                                ) {
                                  e.preventDefault();
                                }
                              }}
                            >
                              <input type="hidden" name="id" value={u.id} />
                              <button className="text-red-600 dark:text-red-400 hover:underline font-medium">
                                Delete
                              </button>
                            </form>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function EditInline({ user, onDone }: { user: UserRow; onDone: () => void }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateUser,
    null,
  );

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state?.ok, onDone]);

  const input =
    "px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm";

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={user.id} />
      <input
        name="name"
        defaultValue={user.name}
        required
        pattern="[a-z0-9._-]{2,32}"
        className={input}
      />
      <input
        name="email"
        type="email"
        defaultValue={user.email}
        required
        className={input}
      />
      <select name="role" defaultValue={user.role} className={input}>
        <option value="employee">employee</option>
        <option value="dev">dev</option>
        <option value="admin">admin</option>
      </select>
      <button
        disabled={pending}
        className="text-xs text-blue-600 hover:underline"
      >
        Save
      </button>
      <button
        type="button"
        onClick={onDone}
        className="text-xs text-gray-500 hover:underline"
      >
        Cancel
      </button>
      {state?.error && (
        <span className="text-xs text-red-500">{state.error}</span>
      )}
    </form>
  );
}

function ResetPasswordButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    resetUserPassword,
    null,
  );

  useEffect(() => {
    if (state?.tempPassword) {
      window.alert(
        `Temp password (shown once — copy it now):\n\n${state.tempPassword}\n\nUser must change it on first login.`,
      );
    }
  }, [state?.tempPassword]);

  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={id} />
      <button
        disabled={pending}
        className="text-amber-600 hover:underline disabled:opacity-50"
      >
        {pending ? "…" : "Reset PW"}
      </button>
    </form>
  );
}
