const { connect } = require('../../../../lib/db');
const { requireUser, jsonResponse } = require('../../../../lib/auth');
const Project = require('../../../../models/Project');
const ClientFeedback = require('../../../../models/ClientFeedback');
const EmployeeCheckIn = require('../../../../models/EmployeeCheckIn');
const Risk = require('../../../../models/Risk');
const { getIsoWeekStart } = require('../../../../lib/employee');
const { computeHealth } = require('../../../../lib/healthScore');

export async function GET(req) {
  try {
    const { user, response } = await requireUser(req, ['CLIENT', 'Client']);
    if (response) return response;
    await connect();

    const projects = await Project.find({ clientId: user._id }).sort({ updatedAt: -1 }).lean();
    const projectIds = projects.map((project) => project._id);
    const weekStartDate = getIsoWeekStart();
    const [feedbacks, checkins, risks] = projectIds.length
      ? await Promise.all([
          ClientFeedback.find({ projectId: { $in: projectIds }, clientId: user._id }).sort({ createdAt: -1, _id: -1 }).lean(),
          EmployeeCheckIn.find({ projectId: { $in: projectIds } }).sort({ createdAt: -1, _id: -1 }).lean(),
          Risk.find({ projectId: { $in: projectIds } }).lean(),
        ])
      : [[], [], []];

    const currentWeekFeedback = new Set(
      feedbacks
        .filter((feedback) => new Date(feedback.weekStartDate).getTime() === weekStartDate.getTime())
        .map((feedback) => feedback.projectId.toString())
    );
    const latestFeedbackByProject = new Map();
    feedbacks.forEach((feedback) => {
      const projectId = feedback.projectId.toString();
      if (!latestFeedbackByProject.has(projectId)) latestFeedbackByProject.set(projectId, feedback);
    });

    const assignedProjects = projects.map((project) => {
      const projectId = project._id.toString();
      const projectCheckins = checkins.filter((checkin) => checkin.projectId.toString() === projectId);
      const health = computeHealth({
        project,
        checkins: projectCheckins,
        feedbacks: feedbacks.filter((feedback) => feedback.projectId.toString() === projectId),
        risks: risks.filter((risk) => risk.projectId.toString() === projectId),
      });
      const latestFeedback = latestFeedbackByProject.get(projectId);

      return {
        _id: projectId,
        name: project.name,
        description: project.description || '',
        startDate: project.startDate || null,
        endDate: project.endDate || null,
        status: project.status || health.status,
        healthScore: Number.isFinite(project.healthScore) ? project.healthScore : health.score,
        lastFeedbackAt: latestFeedback?.createdAt || latestFeedback?.weekStartDate || null,
        feedbackSubmittedThisWeek: currentWeekFeedback.has(projectId),
      };
    });

    return jsonResponse({
      user: { id: user._id.toString(), name: user.name, role: user.role },
      projects: assignedProjects,
      stats: {
        totalProjects: projects.length,
        submittedThisWeek: currentWeekFeedback.size,
        pendingFeedback: projects.length - currentWeekFeedback.size,
      },
      weekStartDate: weekStartDate.toISOString(),
    }, 200, { 'Cache-Control': 'no-store' });
  } catch (error) {
    console.error('[client/dashboard] Failed to load client dashboard', error);
    return jsonResponse({ message: 'Unable to load your dashboard right now.' }, 500);
  }
}
