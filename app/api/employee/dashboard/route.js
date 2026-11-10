const { connect } = require('../../../../lib/db');
const { requireUser, jsonResponse } = require('../../../../lib/auth');
const Project = require('../../../../models/Project');
const EmployeeCheckIn = require('../../../../models/EmployeeCheckIn');
const Risk = require('../../../../models/Risk');
const ClientFeedback = require('../../../../models/ClientFeedback');
const { getIsoWeekStart } = require('../../../../lib/employee');
const { computeHealth } = require('../../../../lib/healthScore');

export async function GET(req) {
  try {
    const { user, response } = await requireUser(req, ['EMPLOYEE']);
    if (response) return response;
    await connect();

    const projects = await Project.find({ employeeIds: user._id }).sort({ updatedAt: -1 }).lean();
    const projectIds = projects.map((project) => project._id);
    const weekStartDate = getIsoWeekStart();
    const [weekCheckins, allCheckins, allRisks, allFeedback] = projectIds.length
      ? await Promise.all([
          EmployeeCheckIn.find({ projectId: { $in: projectIds }, employeeId: user._id, weekStartDate }).lean(),
          EmployeeCheckIn.find({ projectId: { $in: projectIds } }).sort({ createdAt: -1, _id: -1 }).lean(),
          Risk.find({ projectId: { $in: projectIds } }).lean(),
          ClientFeedback.find({ projectId: { $in: projectIds } }).lean(),
        ])
      : [[], [], [], []];

    const weekCheckinIds = new Set(weekCheckins.map((checkin) => checkin.projectId.toString()));
    const latestByProject = new Map();
    for (const checkin of allCheckins) {
      const id = checkin.projectId.toString();
      if (!latestByProject.has(id)) latestByProject.set(id, checkin);
    }

    const assignedProjects = projects.map((project) => {
      const id = project._id.toString();
      const latestCheckin = latestByProject.get(id) || null;
      const health = computeHealth({
        project,
        checkins: allCheckins.filter((checkin) => checkin.projectId.toString() === id),
        feedbacks: allFeedback.filter((feedback) => feedback.projectId.toString() === id),
        risks: allRisks.filter((risk) => risk.projectId.toString() === id),
      });
      return {
        ...project,
        healthScore: Number.isFinite(project.healthScore) ? project.healthScore : health.score,
        status: project.status || health.status,
        checkInDone: weekCheckinIds.has(id),
        completionPercentage: latestCheckin?.completionPercentage ?? 0,
      };
    });

    return jsonResponse({
      user: { id: user._id.toString(), name: user.name, role: user.role },
      projects: assignedProjects,
      stats: {
        totalProjects: projects.length,
        pendingCheckins: projects.length - weekCheckinIds.size,
        openRisks: allRisks.filter((risk) => risk.status === 'OPEN').length,
      },
      weekStartDate: weekStartDate.toISOString(),
    }, 200, { 'Cache-Control': 'no-store' });
  } catch (error) {
    console.error('[employee/dashboard] Failed to load employee dashboard', error);
    return jsonResponse({ message: 'Unable to load your dashboard right now.' }, 500);
  }
}
