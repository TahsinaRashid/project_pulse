const { connect, ObjectId } = require('../../../../../../lib/db');
const { requireUser, jsonResponse } = require('../../../../../../lib/auth');
const Risk = require('../../../../../../models/Risk');
const {
  getAssignedProject,
  recordActivity,
  recalculateProjectHealth,
} = require('../../../../../../lib/employee');
const { z } = require('zod');

const createRiskSchema = z.object({
  title: z.string().trim().min(1, 'Risk title is required.').max(200),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  mitigationPlan: z.string().trim().max(2000).optional().default(''),
});

export async function POST(req, { params }) {
  try {
    const { user, response } = await requireUser(req, ['EMPLOYEE']);
    if (response) return response;
    const { projectId } = await params;
    if (!ObjectId.isValid(projectId)) return jsonResponse({ message: 'Invalid project ID.' }, 400);
    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ message: 'Request body must be valid JSON.' }, 400);
    }
    const parsed = createRiskSchema.safeParse(body);
    if (!parsed.success) return jsonResponse({ message: parsed.error.issues[0]?.message || 'Invalid risk.' }, 400);

    await connect();
    const access = await getAssignedProject(projectId, user._id);
    if (!access.project) return jsonResponse({ message: access.message }, access.status);
    const risk = await Risk.create({
      projectId: access.project._id,
      createdBy: user._id,
      ...parsed.data,
      status: 'OPEN',
      createdAt: new Date(),
    });
    await recordActivity({
      projectId: access.project._id,
      actorId: user._id,
      type: 'RISK_CREATED',
      description: `Risk created: ${risk.title} (${risk.severity}).`,
    });
    const health = await recalculateProjectHealth(access.project._id, user._id);
    return jsonResponse({ risk, health }, 201);
  } catch (error) {
    console.error('[employee/risks] Failed to create risk', error);
    return jsonResponse({ message: 'Unable to create the risk right now.' }, 500);
  }
}
