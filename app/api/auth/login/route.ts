import { getPrisma } from "@/app/lib/db";
import { verifyPassword, signToken } from "@/app/lib/auth";
import { setSessionCookie } from "@/app/lib/session";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await getPrisma().user.findUnique({ where: { email } });

    if (!user || !user.passwordHash) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = await signToken(sessionUser);
    await setSessionCookie(token);

    return Response.json({ user: sessionUser });
  } catch (err) {
    console.error("[/api/auth/login] Error:", err);
    return Response.json(
      { error: "Login failed", details: String(err) },
      { status: 500 }
    );
  }
}
