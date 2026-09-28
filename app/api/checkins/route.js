const { connect } = require('../../../lib/db');
const EmployeeCheckIn = require('../../../models/EmployeeCheckIn');
const Activity = require('../../../models/Activity');
const Project = require('../../../models/Project');
const { requireUser, jsonResponse } = require('../../../lib/auth');
const { computeHealth } = require('../../../lib/healthScore');
const { z } = require('zod');

const bodySchema = z.object({
  projectId: z.string().min(1),
  progressSummary: z.string().optional(),
  blockers: z.string().optional(),
  confidenceLevel: z.number().min(1).max(5),
  completionPercentage: z.number().min(0).max(100),
  weekStartDate: z.string().optional(),
});

export async function GET(req) {
  try {
    const { response } = await requireUser(req);
    if (response) return response;
    await connect();
    const list = await EmployeeCheckIn.find().lean();
    return jsonResponse({ checkins: list }, 200);
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Server error' }), { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { user, response } = await requireUser(req, ['EMPLOYEE']);
    if (response) return response;

    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return jsonResponse({ message: 'Invalid input' }, 400);
    const { projectId, progressSummary, blockers, confidenceLevel, completionPercentage, weekStartDate } = parsed.data;
    await connect();
    const weekStart = weekStartDate ? new Date(weekStartDate) : new Date();
    try {
      const created = await EmployeeCheckIn.create({
        projectId,
        employeeId: user._id,
        weekStartDate: weekStart,
        progressSummary,
        blockers,
        confidenceLevel,
        completionPercentage,
      });
      await Activity.create({ projectId, actorId: user._id, type: 'CHECKIN_SUBMITTED', description: 'Weekly check-in submitted' });

      const [project, checkins, feedbacks, risks] = await Promise.all([
        Project.findById(projectId).lean(),
        EmployeeCheckIn.find({ projectId }).lean(),
        require('../../../models/ClientFeedback').find({ projectId }).lean(),
        require('../../../models/Risk').find({ projectId }).lean(),
      ]);
      const { score, status } = computeHealth({ project, checkins, feedbacks, risks });
      await Project.findByIdAndUpdate(projectId, { healthScore: score, status });

      return jsonResponse({ checkin: created }, 201);
    } catch (err) {
      if (err.code === 11000) {
        return jsonResponse({ message: 'Duplicate check-in for the week' }, 409);
      }
      throw err;
    }
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Server error' }), { status: 500 });
  }
}
