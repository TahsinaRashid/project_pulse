const { connect } = require('../../../../lib/db');
const User = require('../../../../models/User');
const { verifyPassword, signToken, jsonResponse, sessionCookie } = require('../../../../lib/auth');
const { z } = require('zod');

const bodySchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
  role: z.enum(['ADMIN', 'EMPLOYEE', 'CLIENT'], { message: 'Please select a valid role.' }),
});

export async function POST(req) {
  let json;
  try {
    json = await req.json();
  } catch {
    return jsonResponse({ message: 'Enter a valid email and password.' }, 400);
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const issueMessage = parsed.error.issues[0]?.message || 'Enter a valid email and password.';
    return jsonResponse({ message: issueMessage }, 400);
  }

  try {
    const { email, password, role } = parsed.data;
    await connect();
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).lean();
    if (!user) {
      return jsonResponse({ message: 'Invalid email or password.' }, 401);
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return jsonResponse({ message: 'Invalid email or password.' }, 401);
    }

    if (String(user.role).toUpperCase() !== role) {
      return jsonResponse({ message: 'The selected role does not match this account.' }, 401);
    }

    const token = signToken({ userId: user._id.toString(), role: user.role });
    return jsonResponse(
      { user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role } },
      200,
      { 'Set-Cookie': sessionCookie(token), 'Cache-Control': 'no-store' }
    );
  } catch (err) {
    console.error('[auth/login] Authentication request failed', err);
    return jsonResponse({ message: 'Unable to sign in right now. Please try again.' }, 500);
  }
}
