const { connect, ObjectId } = require('../../../../../lib/db');
const { requireUser, jsonResponse } = require('../../../../../lib/auth');
const Project = require('../../../../../models/Project');
const EmployeeCheckIn = require('../../../../../models/EmployeeCheckIn');
const ClientFeedback = require('../../../../../models/ClientFeedback');
const Risk = require('../../../../../models/Risk');
const Activity = require('../../../../../models/Activity');
const User = require('../../../../../models/User');
const { getIsoWeekStart, getAssignedProject } = require('../../../../../lib/employee');
const { computeHealth } = require('../../../../../lib/healthScore');

export async function GET(req, { params }) {
  try {
    const { user, response } = await requireUser(req, ['EMPLOYEE']);
    if (response) return response;
    const { projectId } = await params;
    if (!ObjectId.isValid(projectId)) return jsonResponse({ message: 'Invalid project ID.' }, 400);

    await connect();
    const access = await getAssignedProject(projectId, user._id);
    if (!access.project) return jsonResponse({ message: access.message }, access.status);
    const project = access.project;
    const weekStartDate = getIsoWeekStart();

    const [checkins, ownCheckin, feedbacks, risks, activities] = await Promise.all([
      EmployeeCheckIn.find({ projectId }).sort({ createdAt: -1, _id: -1 }).lean(),
      EmployeeCheckIn.findOne({ projectId, employeeId: user._id, weekStartDate }).lean(),
      ClientFeedback.find({ projectId }).sort({ createdAt: -1 }).lean(),
      Risk.find({ projectId }).sort({ createdAt: -1 }).lean(),
      Activity.find({ projectId }).sort({ createdAt: -1 }).limit(200).lean(),
    ]);

    const actorIds = new Set();
    [...checkins, ...feedbacks, ...activities].forEach((item) => {
      if (item.employeeId) actorIds.add(item.employeeId.toString());
      if (item.clientId) actorIds.add(item.clientId.toString());
      if (item.actorId) actorIds.add(item.actorId.toString());
    });
    risks.forEach((risk) => {
      if (risk.createdBy) actorIds.add(risk.createdBy.toString());
    });
    const actors = actorIds.size
      ? await User.find({ _id: { $in: [...actorIds] } }).select('_id name role').lean()
      : [];
    const actorById = new Map(actors.map((actor) => [actor._id.toString(), actor]));
    const health = computeHealth({ project, checkins, feedbacks, risks });
    const timeline = [
      ...checkins.map((checkin) => {
        const actor = actorById.get(checkin.employeeId.toString());
        return {
          id: `checkin-${checkin._id}`,
          type: 'CHECKIN_SUBMITTED',
          date: checkin.createdAt || checkin.weekStartDate,
          actorName: actor?.name || 'Employee',
          actorRole: actor?.role || 'EMPLOYEE',
          description: `Weekly check-in submitted: ${checkin.progressSummary || 'Progress updated'}`,
        };
      }),
      ...feedbacks.map((feedback) => {
        const actor = actorById.get(feedback.clientId.toString());
        return {
          id: `feedback-${feedback._id}`,
          type: 'FEEDBACK_SUBMITTED',
          date: feedback.createdAt || feedback.weekStartDate,
          actorName: actor?.name || 'Client',
          actorRole: actor?.role || 'CLIENT',
          description: `Client feedback submitted (${feedback.satisfactionRating}/5 satisfaction)${feedback.issueFlagged ? ' · issue flagged' : ''}`,
        };
      }),
      ...risks.map((risk) => {
        const actor = actorById.get(risk.createdBy?.toString());
        return {
          id: `risk-${risk._id}`,
          type: 'RISK_CREATED',
          date: risk.createdAt || risk.updatedAt || risk._id.getTimestamp(),
          actorName: actor?.name || 'Employee',
          actorRole: actor?.role || 'EMPLOYEE',
          description: `Risk created: ${risk.title} (${risk.severity}).`,
        };
      }),
      ...activities.filter((activity) => !['CHECKIN_SUBMITTED', 'FEEDBACK_SUBMITTED', 'RISK_CREATED'].includes(activity.type)).map((activity) => {
        const actor = actorById.get(activity.actorId?.toString());
        return {
          id: `activity-${activity._id}`,
          type: activity.type,
          date: activity.createdAt || activity._id.getTimestamp(),
          actorName: actor?.name || 'Project team',
          actorRole: actor?.role || 'TEAM',
          description: activity.description || activity.type.replaceAll('_', ' ').toLowerCase(),
        };
      }),
    ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    return jsonResponse({
      project: {
        ...project,
        healthScore: Number.isFinite(project.healthScore) ? project.healthScore : health.score,
        status: project.status || health.status,
        completionPercentage: checkins[0]?.completionPercentage ?? 0,
      },
      checkin: ownCheckin,
      risks,
      timeline,
      weekStartDate: weekStartDate.toISOString(),
    }, 200, { 'Cache-Control': 'no-store' });
  } catch (error) {
    console.error('[employee/project] Failed to load project details', error);
    return jsonResponse({ message: 'Unable to load this project right now.' }, 500);
  }
}
