const { connect } = require('../../../lib/db');
const Activity = require('../../../models/Activity');
const { requireUser, jsonResponse } = require('../../../lib/auth');

export async function GET(req) {
  try {
    const { response } = await requireUser(req);
    if (response) return response;
    await connect();
    const list = await Activity.find().sort({ createdAt: -1 }).limit(200).lean();
    return jsonResponse({ activities: list }, 200);
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Server error' }), { status: 500 });
  }
}
