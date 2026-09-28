const { connect } = require('../../../../lib/db');
const { hashPassword, jsonResponse } = require('../../../../lib/auth');
const User = require('../../../../models/User');
const { z } = require('zod');

const validRoles = ['ADMIN', 'EMPLOYEE', 'CLIENT'];

const bodySchema = z.object({
  name: z.string().trim().min(1, 'Name is required.'),
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
  confirmPassword: z.string().min(1, 'Please confirm your password.'),
  role: z.string().trim().transform((value) => value.toUpperCase()),
});

export async function POST(req) {
  let json;
  try {
    json = await req.json();
  } catch {
    return jsonResponse({ message: 'Please provide valid signup details.' }, 400);
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const issueMessage = parsed.error.issues[0]?.message || 'Please provide valid signup details.';
    return jsonResponse({ message: issueMessage }, 400);
  }

  const { name, email, password, confirmPassword, role } = parsed.data;

  if (!validRoles.includes(role)) {
    return jsonResponse({ message: 'Please select a valid role.' }, 400);
  }

  if (password !== confirmPassword) {
    return jsonResponse({ message: 'Passwords do not match.' }, 400);
  }

  try {
    await connect();
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail }).lean();
    if (existingUser) {
      return jsonResponse({ message: 'An account with this email already exists.' }, 409);
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role,
    });

    return jsonResponse(
      {
        message: 'Account created successfully. Please log in.',
        user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role },
      },
      201
    );
  } catch (error) {
    console.error('[auth/register] Signup failed', error);
    return jsonResponse({ message: 'Unable to create the account right now. Please try again.' }, 500);
  }
}
