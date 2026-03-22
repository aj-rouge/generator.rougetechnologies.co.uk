"use client";

import { useActionState } from "react";
import { login } from "../../actions/auth";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null);

  return (
    <div
      style={{ maxWidth: "400px", margin: "100px auto", textAlign: "center" }}
    >
      <h1>Admin Login</h1>
      <form action={formAction}>
        <div>
          <input
            name="name"
            type="text"
            placeholder="Name"
            required
            style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
          />
        </div>
        <div>
          <input
            name="passcode"
            type="password"
            placeholder="Passcode"
            required
            style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          style={{ padding: "8px 16px" }}
        >
          {isPending ? "Logging in..." : "Log in"}
        </button>
        {state && state.error && (
          <p style={{ color: "red", marginTop: "10px" }}>{state.error}</p>
        )}
      </form>
    </div>
  );
}
