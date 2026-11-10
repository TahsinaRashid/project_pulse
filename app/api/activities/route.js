const { connect } = require('../../../lib/db');
const Activity = require('../../../models/Activity');
const Project = require('../../../models/Project');
const { requireUser, jsonResponse } = require('../../../lib/auth');

export async function GET(req) {
  try {
    const { user, response } = await requireUser(req, ['ADMIN', 'EMPLOYEE']);
    if (response) return response;
    await connect();
    const filter = {};
    if (user.role === 'EMPLOYEE') {
      const projects = await Project.find({ employeeIds: user._id }).select('_id').lean();
      filter.projectId = { $in: projects.map((project) => project._id) };
    }
    const activities = await Activity.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    return jsonResponse({ activities }, 200, { 'Cache-Control': 'no-store' });
  } catch (error) {
    console.error('[activities] Failed to load activity', error);
    return jsonResponse({ message: 'Unable to load activity right now.' }, 500);
  }
}
