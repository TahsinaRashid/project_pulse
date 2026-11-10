const { connect, ObjectId } = require('../../../../../lib/db');
const { requireUser, jsonResponse } = require('../../../../../lib/auth');
const EmployeeCheckIn = require('../../../../../models/EmployeeCheckIn');
const ClientFeedback = require('../../../../../models/ClientFeedback');
const Risk = require('../../../../../models/Risk');
const Activity = require('../../../../../models/Activity');
const User = require('../../../../../models/User');
const { getIsoWeekStart } = require('../../../../../lib/employee');
const { getAssignedClientProject } = require('../../../../../lib/client');
const { computeHealth } = require('../../../../../lib/healthScore');

export async function GET(req, { params }) {
  try {
    const { user, response } = await requireUser(req, ['CLIENT', 'Client']);
    if (response) return response;
    const { projectId } = await params;
    if (!ObjectId.isValid(projectId)) return jsonResponse({ message: 'Invalid project ID.' }, 400);

    await connect();
    const access = await getAssignedClientProject(projectId, user._id);
    if (!access.project) return jsonResponse({ message: access.message }, access.status);
    const project = access.project;
    const weekStartDate = getIsoWeekStart();

    const [checkins, feedbacks, risks, activities] = await Promise.all([
      EmployeeCheckIn.find({ projectId }).sort({ createdAt: -1, _id: -1 }).lean(),
      ClientFeedback.find({ projectId, clientId: user._id }).sort({ createdAt: -1, _id: -1 }).lean(),
      Risk.find({ projectId }).sort({ createdAt: -1, _id: -1 }).lean(),
      Activity.find({ projectId }).sort({ createdAt: -1, _id: -1 }).limit(200).lean(),
    ]);

    const actorIds = new Set();
    checkins.forEach((checkin) => {
      if (checkin.employeeId) actorIds.add(checkin.employeeId.toString());
    });
    feedbacks.forEach((feedback) => {
      if (feedback.clientId) actorIds.add(feedback.clientId.toString());
    });
    risks.forEach((risk) => {
      if (risk.createdBy) actorIds.add(risk.createdBy.toString());
    });
    activities.forEach((activity) => {
      if (activity.actorId) actorIds.add(activity.actorId.toString());
    });
    const actors = actorIds.size
      ? await User.find({ _id: { $in: [...actorIds] } }).select('_id name role').lean()
      : [];
    const actorById = new Map(actors.map((actor) => [actor._id.toString(), actor]));
    const timeline = [
      ...checkins.map((checkin) => {
        const actor = actorById.get(checkin.employeeId?.toString());
        return {
          id: `checkin-${checkin._id}`,
          type: 'CHECKIN_SUBMITTED',
          date: checkin.createdAt || checkin.weekStartDate,
          actorName: actor?.name || 'Project team',
          actorRole: actor?.role || 'EMPLOYEE',
          description: `Weekly check-in: ${(checkin.progressSummary || 'Progress updated').slice(0, 240)}`,
        };
      }),
      ...feedbacks.map((feedback) => {
        const actor = actorById.get(feedback.clientId?.toString());
        const issueText = feedback.issueFlagged && feedback.issueDescription
          ? ` Issue flagged: ${feedback.issueDescription.slice(0, 180)}`
          : feedback.issueFlagged ? ' An issue was flagged.' : '';
        return {
          id: `feedback-${feedback._id}`,
          type: 'FEEDBACK_SUBMITTED',
          date: feedback.createdAt || feedback.weekStartDate,
          actorName: actor?.name || user.name || 'Client',
          actorRole: actor?.role || 'CLIENT',
          description: `Client feedback submitted (${feedback.satisfactionRating}/5 satisfaction).${issueText}`,
        };
      }),
      ...risks.map((risk) => {
        const actor = actorById.get(risk.createdBy?.toString());
        return {
          id: `risk-${risk._id}`,
          type: 'RISK_CREATED',
          date: risk.createdAt || risk._id.getTimestamp(),
          actorName: actor?.name || 'Project team',
          actorRole: actor?.role || 'EMPLOYEE',
          description: `Risk reported: ${risk.title} (${risk.status || 'OPEN'}).`,
        };
      }),
      ...activities.flatMap((activity) => {
        const actor = actorById.get(activity.actorId?.toString());
        const date = activity.createdAt || activity._id.getTimestamp();
        if (activity.type === 'PROJECT_STATUS_CHANGED') {
          return [{
            id: `activity-${activity._id}`,
            type: activity.type,
            date,
            actorName: actor?.name || 'Project team',
            actorRole: actor?.role || 'TEAM',
            description: activity.description || 'Project status updated.',
          }];
        }
        if (activity.type === 'RISK_UPDATED') {
          const title = activity.description?.match(/^Risk "(.+)" /)?.[1];
          if (!title) return [];
          const statusChanged = activity.description.includes('status changed');
          return [{
            id: `activity-${activity._id}`,
            type: activity.type,
            date,
            actorName: actor?.name || 'Project team',
            actorRole: actor?.role || 'EMPLOYEE',
            description: statusChanged ? `Risk status updated: ${title}.` : `Risk details updated: ${title}.`,
          }];
        }
        return [];
      }),
    ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    const health = computeHealth({ project, checkins, feedbacks, risks });
    const weekFeedback = feedbacks.find(
      (feedback) => new Date(feedback.weekStartDate).getTime() === weekStartDate.getTime()
    ) || null;

    return jsonResponse({
      project: {
        _id: project._id.toString(),
        name: project.name,
        description: project.description || '',
        startDate: project.startDate || null,
        endDate: project.endDate || null,
        status: project.status || health.status,
        healthScore: Number.isFinite(project.healthScore) ? project.healthScore : health.score,
      },
      weekStartDate: weekStartDate.toISOString(),
      weekFeedback,
      feedbackHistory: feedbacks,
      timeline,
    }, 200, { 'Cache-Control': 'no-store' });
  } catch (error) {
    console.error('[client/project] Failed to load client project', error);
    return jsonResponse({ message: 'Unable to load this project right now.' }, 500);
  }
}
