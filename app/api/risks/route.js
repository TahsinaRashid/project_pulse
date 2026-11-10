const { connect, ObjectId } = require('../../../lib/db');
const Risk = require('../../../models/Risk');
const Project = require('../../../models/Project');
const { requireUser, jsonResponse } = require('../../../lib/auth');
const { getAssignedProject, recordActivity, recalculateProjectHealth } = require('../../../lib/employee');
const { z } = require('zod');

const bodySchema = z.object({
  projectId: z.string().refine((value) => ObjectId.isValid(value), 'Invalid project ID.'),
  title: z.string().trim().min(1, 'Risk title is required.').max(200),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  mitigationPlan: z.string().trim().max(2000).optional().default(''),
});

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
    const risks = await Risk.find(filter).sort({ createdAt: -1 }).lean();
    return jsonResponse({ risks }, 200, { 'Cache-Control': 'no-store' });
  } catch (error) {
    console.error('[risks] Failed to load risks', error);
    return jsonResponse({ message: 'Unable to load risks right now.' }, 500);
  }
}

export async function POST(req) {
  try {
    const { user, response } = await requireUser(req, ['ADMIN', 'EMPLOYEE']);
    if (response) return response;
    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ message: 'Request body must be valid JSON.' }, 400);
    }
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return jsonResponse({ message: parsed.error.issues[0]?.message || 'Invalid risk.' }, 400);

    await connect();
    let project;
    if (user.role === 'EMPLOYEE') {
      const access = await getAssignedProject(parsed.data.projectId, user._id);
      if (!access.project) return jsonResponse({ message: access.message }, access.status);
      project = access.project;
    } else {
      project = await Project.findById(parsed.data.projectId).lean();
      if (!project) return jsonResponse({ message: 'Project not found.' }, 404);
    }

    const risk = await Risk.create({
      projectId: project._id,
      createdBy: user._id,
      title: parsed.data.title,
      severity: parsed.data.severity,
      mitigationPlan: parsed.data.mitigationPlan,
      status: 'OPEN',
      createdAt: new Date(),
    });
    await recordActivity({
      projectId: project._id,
      actorId: user._id,
      type: 'RISK_CREATED',
      description: `Risk created: ${risk.title} (${risk.severity}).`,
    });
    const health = await recalculateProjectHealth(project._id, user._id);
    return jsonResponse({ risk, health }, 201);
  } catch (error) {
    console.error('[risks] Failed to create risk', error);
    return jsonResponse({ message: 'Unable to create the risk right now.' }, 500);
  }
}
