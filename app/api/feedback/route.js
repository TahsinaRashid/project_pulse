const { connect, ObjectId } = require('../../../lib/db');
const ClientFeedback = require('../../../models/ClientFeedback');
const Project = require('../../../models/Project');
const { requireUser, jsonResponse } = require('../../../lib/auth');
const { z } = require('zod');
const {
  getIsoWeekStart,
  recordActivity,
  recalculateProjectHealth,
} = require('../../../lib/employee');
const { ensureClientFeedbackUniqueIndex, getAssignedClientProject } = require('../../../lib/client');

const bodySchema = z.object({
  projectId: z.string().refine((value) => ObjectId.isValid(value), 'Invalid project ID.'),
  satisfactionRating: z.number().int().min(1).max(5),
  communicationRating: z.number().int().min(1).max(5),
  comments: z.string().trim().max(2000).optional().default(''),
  issueFlagged: z.boolean().default(false),
  issueDescription: z.string().trim().max(500).optional().default(''),
}).strict().refine(
  (feedback) => !feedback.issueFlagged || feedback.issueDescription.trim().length >= 5,
  'Please describe the issue in at least 5 characters.'
);

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
    const list = await ClientFeedback.find(filter).sort({ createdAt: -1 }).lean();
    return jsonResponse({ feedback: list }, 200);
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Server error' }), { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { user, response } = await requireUser(req, ['CLIENT', 'Client']);
    if (response) return response;

    let json;
    try {
      json = await req.json();
    } catch {
      return jsonResponse({ message: 'Request body must be valid JSON.' }, 400);
    }
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return jsonResponse({ message: parsed.error.issues[0]?.message || 'Invalid input.' }, 400);
    const { projectId, satisfactionRating, communicationRating, comments, issueFlagged, issueDescription } = parsed.data;
    await connect();
    const access = await getAssignedClientProject(projectId, user._id);
    if (!access.project) return jsonResponse({ message: access.message }, access.status);
    const weekStartDate = getIsoWeekStart();
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 7);
    const existingFeedback = await ClientFeedback.findOne({
      projectId: access.project._id,
      clientId: user._id,
      weekStartDate: { $gte: weekStartDate, $lt: weekEndDate },
    }).lean();
    if (existingFeedback) {
      return jsonResponse({ message: 'You have already submitted feedback for this project this week.' }, 409);
    }
    await ensureClientFeedbackUniqueIndex();
    try {
      const created = await ClientFeedback.create({
        projectId: access.project._id,
        clientId: user._id,
        weekStartDate: getIsoWeekStart(),
        satisfactionRating,
        communicationRating,
        comments,
        issueFlagged,
        issueDescription,
        createdAt: new Date(),
      });
      await recordActivity({ projectId: access.project._id, actorId: user._id, type: 'FEEDBACK_SUBMITTED', description: 'Client feedback submitted.' });
      const health = await recalculateProjectHealth(access.project._id, user._id);

      return jsonResponse({ feedback: created, health }, 201);
    } catch (err) {
      if (err.code === 11000) {
        return jsonResponse({ message: 'Duplicate feedback for the week' }, 409);
      }
      throw err;
    }
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Server error' }), { status: 500 });
  }
}
