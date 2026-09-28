const { connect } = require('../../../lib/db');
const Risk = require('../../../models/Risk');
const Activity = require('../../../models/Activity');
const Project = require('../../../models/Project');
const { requireUser, jsonResponse } = require('../../../lib/auth');
const { computeHealth } = require('../../../lib/healthScore');
const { z } = require('zod');

const bodySchema = z.object({ projectId: z.string().min(1), title: z.string().min(1), severity: z.enum(['LOW','MEDIUM','HIGH']), mitigationPlan: z.string().optional() });

export async function GET(req) {
  try {
    const { response } = await requireUser(req);
    if (response) return response;
    await connect();
    const list = await Risk.find().lean();
    return jsonResponse({ risks: list }, 200);
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Server error' }), { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { user, response } = await requireUser(req, ['ADMIN', 'EMPLOYEE']);
    if (response) return response;

    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return jsonResponse({ message: 'Invalid input' }, 400);
    const { projectId, title, severity, mitigationPlan } = parsed.data;
    await connect();
    const created = await Risk.create({ projectId, createdBy: user._id, title, severity, mitigationPlan });
    await Activity.create({ projectId, actorId: user._id, type: 'RISK_CREATED', description: 'Risk created' });

    const [project, checkins, feedbacks, risks] = await Promise.all([
      Project.findById(projectId).lean(),
      require('../../../models/EmployeeCheckIn').find({ projectId }).lean(),
      require('../../../models/ClientFeedback').find({ projectId }).lean(),
      Risk.find({ projectId }).lean(),
    ]);
    const { score, status } = computeHealth({ project, checkins, feedbacks, risks });
    await Project.findByIdAndUpdate(projectId, { healthScore: score, status });

    return jsonResponse({ risk: created }, 201);
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Server error' }), { status: 500 });
  }
}
