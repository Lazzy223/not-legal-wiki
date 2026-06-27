import { NextResponse } from "next/server";
import {
  authCookieName,
  createSession,
  validateOwnerUser,
} from "@/lib/auth";
import { findManagedUserByCredentials } from "@/lib/users-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();

  const username = String(body.username || "");
  const password = String(body.password || "");

  const user =
    validateOwnerUser(username, password) ||
    (await findManagedUserByCredentials(username, password));

  if (!user) {
    return NextResponse.json(
      {
        message: "Неверный логин или пароль",
      },
      {
        status: 401,
      }
    );
  }

  const token = await createSession(user);

  const response = NextResponse.json({
    user,
  });

  response.cookies.set(authCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}