"use server";

import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
// ---------- Your static users ----------
const users = [
  {
    name: "aj",
    passcodeHash:
      "$2a$12$uu/m6UTXlNDddLaqAbBWyOQ3fC6ojCg.cF433LTSB5Xma92cRTlGq",
  },
  {
    name: "uma",
    passcodeHash:
      "$2a$12$ZRbQTAaLxnyflPAyUxfJFOQQ242F4q9eWaQAg24E0C7um2OBCmqca",
  },
  {
    name: "ben",
    passcodeHash:
      "$2a$12$2qgm5JzcIKYanLODpqxlfu6FqiF0uEJYWT795/WKrZowU2aKltam6",
  },
  {
    name: "max",
    passcodeHash:
      "$2a$12$eKsZkTc/I5ldCxl44/gadu53QbAroiTgGTz7jDArA8Lgo.x3IQCHq",
  },
];
// ---------------------------------------

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function login(prevState, formData) {
  // ✅ Accept prevState
  const name = formData.get("name");
  const passcode = formData.get("passcode");

  // Find user by name
  const user = users.find((u) => u.name === name);
  if (!user) {
    return { error: "Invalid credentials" };
  }

  // Compare passcode
  const isValid = await bcrypt.compare(passcode, user.passcodeHash);
  if (!isValid) {
    return { error: "Invalid credentials" };
  }

  // Create JWT (valid for 3 days)
  const token = await new SignJWT({ name, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("3d")
    .sign(secret);

  // Set HTTP‑only cookie
  (await cookies()).set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 3 * 24 * 60 * 60, // 3 days
    path: "/",
  });

  // Redirect to the protected dashboard
  redirect("/");
}

export async function logout() {
  (await cookies()).delete("session");
  redirect("/login");
}
