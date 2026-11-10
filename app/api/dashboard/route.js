const { connect } = require('../../../lib/db');
const { requireUser, jsonResponse } = require('../../../lib/auth');
const Project = require('../../../models/Project');
const Activity = require('../../../models/Activity');
const Risk = require('../../../models/Risk');
const EmployeeCheckIn = require('../../../models/EmployeeCheckIn');
const ClientFeedback = require('../../../models/ClientFeedback');

export async function GET(req) {
  try {
    const { user, response } = await requireUser(req, ['ADMIN', 'EMPLOYEE']);
    if (response) return response;

    await connect();
    const projectFilter = {};
    if (user.role === 'EMPLOYEE') projectFilter.employeeIds = user._id;
    else if (user.role === 'CLIENT') projectFilter.clientId = user._id;
    else if (user.role !== 'ADMIN') return jsonResponse({ message: 'Forbidden' }, 403);

    const projects = await Project.find(projectFilter).sort({ updatedAt: -1 }).lean();
    const projectIds = projects.map((project) => project._id);
    const [activities, risks, checkins, feedback, openRiskCount, checkInSummary, feedbackSummary] = projectIds.length
      ? await Promise.all([
          Activity.find({ projectId: { $in: projectIds } }).sort({ createdAt: -1 }).limit(8).lean(),
          Risk.find({ projectId: { $in: projectIds }, status: 'OPEN' }).sort({ createdAt: -1 }).limit(12).lean(),
          EmployeeCheckIn.find({ projectId: { $in: projectIds } }).sort({ createdAt: -1 }).limit(12).lean(),
          ClientFeedback.find({ projectId: { $in: projectIds } }).sort({ createdAt: -1 }).limit(12).lean(),
          Risk.countDocuments({ projectId: { $in: projectIds }, status: 'OPEN' }),
          EmployeeCheckIn.aggregate([
            { $match: { projectId: { $in: projectIds } } },
            { $group: { _id: null, count: { $sum: 1 }, averageConfidence: { $avg: '$confidenceLevel' } } },
          ]),
          ClientFeedback.aggregate([
            { $match: { projectId: { $in: projectIds } } },
            {
              $group: {
                _id: null,
                averageRating: { $avg: '$satisfactionRating' },
                flaggedCount: { $sum: { $cond: ['$issueFlagged', 1, 0] } },
              },
            },
          ]),
        ])
      : [[], [], [], [], 0, [], []];

    const activeProjects = projects.filter((project) => project.status !== 'COMPLETED');
    const healthScores = projects.map((project) => project.healthScore ?? 100);
    const averageConfidence = checkInSummary[0]?.averageConfidence;
    const averageClientRating = feedbackSummary[0]?.averageRating;

    return jsonResponse({
      user: { id: user._id.toString(), name: user.name, role: user.role },
      projects,
      activities,
      risks,
      checkins,
      feedback,
      stats: {
        totalProjects: projects.length,
        activeProjects: activeProjects.length,
        atRiskProjects: projects.filter((project) => ['AT_RISK', 'CRITICAL'].includes(project.status)).length,
        averageHealthScore: healthScores.length
          ? Math.round(healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length)
          : 0,
        openRisks: openRiskCount,
        checkInCount: checkInSummary[0]?.count ?? 0,
        averageConfidence: Number.isFinite(averageConfidence)
          ? Number(averageConfidence.toFixed(1))
          : null,
        averageClientRating: Number.isFinite(averageClientRating)
          ? Number(averageClientRating.toFixed(1))
          : null,
        flaggedFeedback: feedbackSummary[0]?.flaggedCount ?? 0,
      },
      refreshedAt: new Date().toISOString(),
    }, 200, { 'Cache-Control': 'no-store' });
  } catch (err) {
    console.error('[dashboard] Failed to load dashboard data', err);
    return jsonResponse({ message: 'Unable to load dashboard data right now.' }, 500);
  }
}