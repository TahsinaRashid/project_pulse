const { requireUser, jsonResponse } = require('../../../../lib/auth');

export async function GET(req) {
  try {
    const { user, response } = await requireUser(req);
    return response || jsonResponse({ user }, 200);
  } catch (err) {
    console.error('[auth/me] Session lookup failed', err);
    return jsonResponse({ message: 'Unable to verify the session right now.' }, 500);
  }
}
