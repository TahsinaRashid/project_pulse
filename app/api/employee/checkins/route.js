const { connect, ObjectId } = require('../../../../lib/db');
const { requireUser, jsonResponse } = require('../../../../lib/auth');
const EmployeeCheckIn = require('../../../../models/EmployeeCheckIn');
const {
  getIsoWeekStart,
  ensureCheckInUniqueIndex,
  getAssignedProject,
  recordActivity,
  recalculateProjectHealth,
} = require('../../../../lib/employee');
const { z } = require('zod');

const checkinSchema = z.object({
  projectId: z.string().refine((value) => ObjectId.isValid(value), 'Invalid project ID.'),
  progressSummary: z.string().trim().min(1, 'Progress summary is required.').max(2000),
  blockers: z.string().trim().max(2000).optional().default(''),
  confidenceLevel: z.number().int().min(1).max(5),
  completionPercentage: z.number().min(0).max(100),
});

export async function POST(req) {
  try {
    const { user, response } = await requireUser(req, ['EMPLOYEE']);
    if (response) return response;
    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ message: 'Request body must be valid JSON.' }, 400);
    }
    const parsed = checkinSchema.safeParse(body);
    if (!parsed.success) return jsonResponse({ message: parsed.error.issues[0]?.message || 'Invalid check-in.' }, 400);

    await connect();
    const access = await getAssignedProject(parsed.data.projectId, user._id);
    if (!access.project) return jsonResponse({ message: access.message }, access.status);
    await ensureCheckInUniqueIndex();

    const weekStartDate = getIsoWeekStart();
    const checkin = await EmployeeCheckIn.create({
      ...parsed.data,
      projectId: parsed.data.projectId,
      employeeId: user._id,
      weekStartDate,
      createdAt: new Date(),
    });
    await recordActivity({
      projectId: access.project._id,
      actorId: user._id,
      type: 'CHECKIN_SUBMITTED',
      description: 'Weekly check-in submitted.',
    });
    const health = await recalculateProjectHealth(access.project._id, user._id);
    return jsonResponse({ checkin, health }, 201);
  } catch (error) {
    if (error.code === 11000) {
      return jsonResponse({ message: 'You have already submitted this week’s check-in for this project.' }, 409);
    }
    console.error('[employee/checkins] Failed to submit check-in', error);
    return jsonResponse({ message: 'Unable to submit your check-in right now.' }, 500);
  }
}
