const { connect } = require('../../../../lib/db');
const { requireUser, jsonResponse } = require('../../../../lib/auth');
const User = require('../../../../models/User');

export async function GET(req) {
  try {
    const { user, response } = await requireUser(req, ['ADMIN']);
    if (response) return response;

    await connect();
    const users = await User.find().select('_id name email role').sort({ name: 1 }).lean();

    return jsonResponse(
      {
        user: { id: user._id.toString(), name: user.name, role: user.role },
        clients: users.filter((entry) => entry.role === 'CLIENT'),
        employees: users.filter((entry) => entry.role === 'EMPLOYEE'),
      },
      200,
      { 'Cache-Control': 'no-store' }
    );
  } catch (error) {
    console.error('[admin/users] Failed to load users', error);
    return jsonResponse({ message: 'Unable to load users right now.' }, 500);
  }
}
