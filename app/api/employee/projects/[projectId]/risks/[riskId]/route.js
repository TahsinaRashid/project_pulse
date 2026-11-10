const { connect, ObjectId } = require('../../../../../../../lib/db');
const { requireUser, jsonResponse } = require('../../../../../../../lib/auth');
const Risk = require('../../../../../../../models/Risk');
const {
  getAssignedProject,
  recordActivity,
  recalculateProjectHealth,
} = require('../../../../../../../lib/employee');
const { z } = require('zod');

const updateRiskSchema = z.object({
  status: z.enum(['OPEN', 'RESOLVED']).optional(),
  mitigationPlan: z.string().trim().max(2000).optional(),
}).refine((value) => value.status !== undefined || value.mitigationPlan !== undefined, 'Provide a status or mitigation plan to update.');

export async function PATCH(req, { params }) {
  try {
    const { user, response } = await requireUser(req, ['EMPLOYEE']);
    if (response) return response;
    const { projectId, riskId } = await params;
    if (!ObjectId.isValid(projectId) || !ObjectId.isValid(riskId)) {
      return jsonResponse({ message: 'Invalid project or risk ID.' }, 400);
    }
    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ message: 'Request body must be valid JSON.' }, 400);
    }
    const parsed = updateRiskSchema.safeParse(body);
    if (!parsed.success) return jsonResponse({ message: parsed.error.issues[0]?.message || 'Invalid risk update.' }, 400);

    await connect();
    const access = await getAssignedProject(projectId, user._id);
    if (!access.project) return jsonResponse({ message: access.message }, access.status);
    const risk = await Risk.findById(riskId).lean();
    if (!risk) {
      return jsonResponse({ message: 'Risk not found in this project.' }, 404);
    }
    if (risk.projectId.toString() !== access.project._id.toString()) {
      return jsonResponse({ message: 'You are not allowed to access this project risk.' }, 403);
    }

    await Risk.findByIdAndUpdate(riskId, { ...parsed.data, updatedAt: new Date() });
    const changes = [];
    if (parsed.data.status && parsed.data.status !== risk.status) changes.push(`status changed from ${risk.status} to ${parsed.data.status}`);
    if (parsed.data.mitigationPlan !== undefined && parsed.data.mitigationPlan !== risk.mitigationPlan) changes.push('mitigation plan updated');
    if (changes.length) {
      await recordActivity({
        projectId: access.project._id,
        actorId: user._id,
        type: 'RISK_UPDATED',
        description: `Risk "${risk.title}" ${changes.join(' and ')}.`,
      });
    }
    const updatedRisk = await Risk.findById(riskId).lean();
    const health = await recalculateProjectHealth(access.project._id, user._id);
    return jsonResponse({ risk: updatedRisk, health }, 200);
  } catch (error) {
    console.error('[employee/risks] Failed to update risk', error);
    return jsonResponse({ message: 'Unable to update the risk right now.' }, 500);
  }
}
