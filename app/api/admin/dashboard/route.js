const { connect } = require('../../../../lib/db');
const { requireUser, jsonResponse } = require('../../../../lib/auth');
const Project = require('../../../../models/Project');
const Activity = require('../../../../models/Activity');
const Risk = require('../../../../models/Risk');
const EmployeeCheckIn = require('../../../../models/EmployeeCheckIn');
const ClientFeedback = require('../../../../models/ClientFeedback');
const User = require('../../../../models/User');
const { computeHealth } = require('../../../../lib/healthScore');

function formatProjectSummary(project, client, employees, checkins, feedbacks, risks) {
  const health = computeHealth({ project, checkins, feedbacks, risks });
  const latestCheckin = [...checkins].sort((a, b) => new Date(b.createdAt || b.weekStartDate || Date.now()) - new Date(a.createdAt || a.weekStartDate || Date.now()))[0] || null;
  const latestFeedback = [...feedbacks].sort((a, b) => new Date(b.createdAt || b.weekStartDate || Date.now()) - new Date(a.createdAt || a.weekStartDate || Date.now()))[0] || null;
  const openRisks = risks.filter((risk) => risk.status === 'OPEN');
  const highRiskCount = openRisks.filter((risk) => risk.severity === 'HIGH').length;
  const flaggedIssues = feedbacks.filter((feedback) => feedback.issueFlagged).length;
  const missingCheckin = employees.length > 0 && (!latestCheckin || new Date(latestCheckin.createdAt || latestCheckin.weekStartDate).getTime() < Date.now() - 1000 * 60 * 60 * 24 * 7);

  return {
    ...project,
    client,
    employees,
    healthScore: project.healthScore ?? health.score,
    computedStatus: project.status === 'COMPLETED' ? 'COMPLETED' : health.status,
    openRiskCount: openRisks.length,
    highRiskCount,
    flaggedIssueCount: flaggedIssues,
    lastCheckin: latestCheckin,
    lastFeedback: latestFeedback,
    missingCheckin,
  };
}

export async function GET(req) {
  try {
    const { user, response } = await requireUser(req, ['ADMIN']);
    if (response) return response;

    await connect();

    const projects = await Project.find().sort({ updatedAt: -1 }).lean();
    const projectIds = projects.map((project) => project._id);
    const [allRisks, allCheckins, allFeedback, allActivities, users] = await Promise.all([
      Risk.find({ projectId: { $in: projectIds } }).lean(),
      EmployeeCheckIn.find({ projectId: { $in: projectIds } }).lean(),
      ClientFeedback.find({ projectId: { $in: projectIds } }).lean(),
      Activity.find({ projectId: { $in: projectIds } }).sort({ createdAt: -1 }).limit(12).lean(),
      User.find({}).select('_id name email role').lean(),
    ]);

    const userMap = Object.fromEntries(users.map((entry) => [entry._id.toString(), entry]));
    const projectChecks = Object.fromEntries(projectIds.map((projectId) => [projectId.toString(), []]));
    const projectFeedback = Object.fromEntries(projectIds.map((projectId) => [projectId.toString(), []]));
    const projectRisks = Object.fromEntries(projectIds.map((projectId) => [projectId.toString(), []]));

    allCheckins.forEach((checkin) => {
      if (projectChecks[checkin.projectId.toString()]) projectChecks[checkin.projectId.toString()].push(checkin);
    });
    allFeedback.forEach((feedback) => {
      if (projectFeedback[feedback.projectId.toString()]) projectFeedback[feedback.projectId.toString()].push(feedback);
    });
    allRisks.forEach((risk) => {
      if (projectRisks[risk.projectId.toString()]) projectRisks[risk.projectId.toString()].push(risk);
    });

    const enrProjectList = projects.map((project) => {
      const client = project.clientId ? userMap[project.clientId.toString()] || null : null;
      const employees = (project.employeeIds || [])
        .map((employeeId) => userMap[employeeId.toString()])
        .filter(Boolean);
      const projectCheckins = projectChecks[project._id.toString()] || [];
      const projectFeedbacks = projectFeedback[project._id.toString()] || [];
      const projectRiskList = projectRisks[project._id.toString()] || [];
      return formatProjectSummary(project, client, employees, projectCheckins, projectFeedbacks, projectRiskList);
    });

    const totalProjects = enrProjectList.length;
    const onTrackProjects = enrProjectList.filter((project) => project.computedStatus === 'ON_TRACK').length;
    const atRiskProjects = enrProjectList.filter((project) => project.computedStatus === 'AT_RISK').length;
    const criticalProjects = enrProjectList.filter((project) => project.computedStatus === 'CRITICAL').length;
    const completedProjects = enrProjectList.filter((project) => project.computedStatus === 'COMPLETED').length;
    const openRisks = allRisks.filter((risk) => risk.status === 'OPEN');
    const highSeverityRisks = openRisks.filter((risk) => risk.severity === 'HIGH').length;
    const missingCheckins = enrProjectList.filter((project) => project.missingCheckin).length;
    const highRiskProjects = enrProjectList.filter((project) => project.computedStatus !== 'ON_TRACK' || project.openRiskCount > 0 || project.flaggedIssueCount > 0 || project.highRiskCount > 0).slice(0, 6);

    const recentFeedback = await ClientFeedback.find().sort({ createdAt: -1 }).limit(8).populate('projectId', 'name').populate('clientId', 'name').lean();
    const recentCheckins = await EmployeeCheckIn.find().sort({ createdAt: -1 }).limit(8).populate('projectId', 'name').populate('employeeId', 'name').lean();
    const recentActivitiesList = await Activity.find().sort({ createdAt: -1 }).limit(12).populate('projectId', 'name').populate('actorId', 'name').lean();
    const recentRisks = await Risk.find().sort({ createdAt: -1 }).limit(12).populate('projectId', 'name').populate('createdBy', 'name').lean();

    return jsonResponse({
      user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role },
      stats: {
        totalProjects,
        onTrackProjects,
        atRiskProjects,
        criticalProjects,
        completedProjects,
        openRisks: openRisks.length,
        highSeverityRisks,
        missingCheckins,
      },
      projects: enrProjectList,
      highRiskProjects,
      recentFeedback,
      recentCheckins,
      recentActivities: recentActivitiesList,
      recentRisks,
      refreshedAt: new Date().toISOString(),
    }, 200, { 'Cache-Control': 'no-store' });
  } catch (error) {
    console.error('[admin/dashboard] Failed to load admin dashboard', error);
    return jsonResponse({ message: 'Unable to load the admin dashboard right now.' }, 500);
  }
}
