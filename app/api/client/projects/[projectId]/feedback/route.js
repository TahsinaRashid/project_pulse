const { connect, ObjectId } = require('../../../../../../lib/db');
const { requireUser, jsonResponse } = require('../../../../../../lib/auth');
const ClientFeedback = require('../../../../../../models/ClientFeedback');
const {
  getIsoWeekStart,
  recalculateProjectHealth,
  recordActivity,
} = require('../../../../../../lib/employee');
const { ensureClientFeedbackUniqueIndex, getAssignedClientProject } = require('../../../../../../lib/client');
const { z } = require('zod');

const feedbackSchema = z.object({
  satisfactionRating: z.number().int().min(1).max(5),
  communicationRating: z.number().int().min(1).max(5),
  comments: z.string().trim().max(2000, 'Comments must be 2000 characters or fewer.').optional().default(''),
  issueFlagged: z.boolean().default(false),
  issueDescription: z.string().trim().max(500, 'Issue description must be 500 characters or fewer.').optional().default(''),
}).strict().refine(
  (feedback) => !feedback.issueFlagged || feedback.issueDescription.trim().length >= 5,
  'Please describe the issue in at least 5 characters.'
);

export async function POST(req, { params }) {
  try {
    const { user, response } = await requireUser(req, ['CLIENT', 'Client']);
    if (response) return response;
    const { projectId } = await params;
    if (!ObjectId.isValid(projectId)) return jsonResponse({ message: 'Invalid project ID.' }, 400);

    await connect();
    const access = await getAssignedClientProject(projectId, user._id);
    if (!access.project) return jsonResponse({ message: access.message }, access.status);

    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ message: 'Request body must be valid JSON.' }, 400);
    }
    const parsed = feedbackSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse({ message: parsed.error.issues[0]?.message || 'Invalid feedback.' }, 400);
    }

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
      const feedback = await ClientFeedback.create({
        projectId: access.project._id,
        clientId: user._id,
        weekStartDate,
        ...parsed.data,
        createdAt: new Date(),
      });
      await recordActivity({
        projectId: access.project._id,
        actorId: user._id,
        type: 'FEEDBACK_SUBMITTED',
        description: 'Client feedback submitted.',
      });
      const health = await recalculateProjectHealth(access.project._id, user._id);
      return jsonResponse({ feedback, health }, 201);
    } catch (error) {
      if (error.code === 11000) {
        return jsonResponse({ message: 'You have already submitted feedback for this project this week.' }, 409);
      }
      throw error;
    }
  } catch (error) {
    console.error('[client/feedback] Failed to submit client feedback', error);
    return jsonResponse({ message: 'Unable to submit your feedback right now.' }, 500);
  }
}
