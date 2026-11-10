const { connect } = require('../../../../lib/db');
const { requireUser, jsonResponse } = require('../../../../lib/auth');
const Project = require('../../../../models/Project');
const Activity = require('../../../../models/Activity');
const User = require('../../../../models/User');
const { z } = require('zod');

function isValidDate(value) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const projectDateSchema = z.string().optional().refine(isValidDate, 'Date must be a valid YYYY-MM-DD value.');

const projectSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Project name is required.'),
  description: z.string().trim().optional().or(z.literal('')),
  clientId: z.string().trim().optional().or(z.literal('')),
  employeeIds: z.array(z.string().trim()).default([]),
  startDate: projectDateSchema,
  endDate: projectDateSchema,
  status: z.enum(['ON_TRACK', 'AT_RISK', 'CRITICAL', 'COMPLETED']).optional(),
});

function normalizeProjectPayload(data) {
  const normalized = { ...data };
  if (!normalized.name) normalized.name = '';
  normalized.description = normalized.description || '';
  normalized.clientId = normalized.clientId || undefined;
  normalized.employeeIds = Array.isArray(normalized.employeeIds) ? normalized.employeeIds.filter(Boolean) : [];
  normalized.startDate = normalized.startDate || undefined;
  normalized.endDate = normalized.endDate || undefined;
  normalized.status = normalized.status || 'ON_TRACK';
  return normalized;
}

export async function GET(req) {
  try {
    const { user, response } = await requireUser(req, ['ADMIN']);
    if (response) return response;

    await connect();
    const projects = await Project.find().sort({ updatedAt: -1 }).lean();
    const userIds = new Set();
    projects.forEach((project) => {
      if (project.clientId) userIds.add(project.clientId.toString());
      (project.employeeIds || []).forEach((employeeId) => userIds.add(employeeId.toString()));
    });

    const users = await User.find({ _id: { $in: Array.from(userIds) } }).select('_id name email role').lean();
    const userMap = Object.fromEntries(users.map((entry) => [entry._id.toString(), entry]));

    const enrichedProjects = projects.map((project) => ({
      ...project,
      client: project.clientId ? userMap[project.clientId.toString()] || null : null,
      employees: (project.employeeIds || [])
        .map((employeeId) => userMap[employeeId.toString()])
        .filter(Boolean),
    }));

    return jsonResponse({ projects: enrichedProjects, user: { id: user._id.toString(), name: user.name, role: user.role } }, 200, { 'Cache-Control': 'no-store' });
  } catch (error) {
    console.error('[admin/projects] Failed to load projects', error);
    return jsonResponse({ message: 'Unable to load projects right now.' }, 500);
  }
}

export async function POST(req) {
  try {
    const { user, response } = await requireUser(req, ['ADMIN']);
    if (response) return response;

    const raw = await req.json();
    const payload = normalizeProjectPayload(raw);
    const parsed = projectSchema.safeParse(payload);
    if (!parsed.success) {
      return jsonResponse({ message: parsed.error.issues[0]?.message || 'Invalid project data.' }, 400);
    }

    await connect();

    if (parsed.data.clientId) {
      const client = await User.findById(parsed.data.clientId).lean();
      if (!client || client.role !== 'CLIENT') {
        return jsonResponse({ message: 'Please assign a valid client.' }, 400);
      }
    }

    const employeeIds = Array.isArray(parsed.data.employeeIds) ? parsed.data.employeeIds.filter(Boolean) : [];
    if (employeeIds.length) {
      const employeeUsers = await User.find({ _id: { $in: employeeIds }, role: 'EMPLOYEE' }).select('_id').lean();
      if (employeeUsers.length !== employeeIds.length) {
        return jsonResponse({ message: 'All assigned employees must be valid team members.' }, 400);
      }
    }

    const project = await Project.create({
      name: parsed.data.name,
      description: parsed.data.description || '',
      clientId: parsed.data.clientId || undefined,
      employeeIds,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
      status: parsed.data.status || 'ON_TRACK',
    });

    await Activity.create({
      projectId: project._id,
      actorId: user._id,
      type: 'PROJECT_CREATED',
      description: `Project created: ${project.name}`,
    });

    return jsonResponse({ project }, 201);
  } catch (error) {
    console.error('[admin/projects] Failed to create project', error);
    return jsonResponse({ message: 'Unable to create the project right now.' }, 500);
  }
}

export async function PUT(req) {
  try {
    const { user, response } = await requireUser(req, ['ADMIN']);
    if (response) return response;

    const raw = await req.json();
    const payload = normalizeProjectPayload(raw);
    const parsed = projectSchema.safeParse(payload);
    if (!parsed.success) {
      return jsonResponse({ message: parsed.error.issues[0]?.message || 'Invalid project data.' }, 400);
    }

    if (!parsed.data.id) {
      return jsonResponse({ message: 'Project ID is required to update a project.' }, 400);
    }

    await connect();

    if (parsed.data.clientId) {
      const client = await User.findById(parsed.data.clientId).lean();
      if (!client || client.role !== 'CLIENT') {
        return jsonResponse({ message: 'Please assign a valid client.' }, 400);
      }
    }

    const employeeIds = Array.isArray(parsed.data.employeeIds) ? parsed.data.employeeIds.filter(Boolean) : [];
    if (employeeIds.length) {
      const employeeUsers = await User.find({ _id: { $in: employeeIds }, role: 'EMPLOYEE' }).select('_id').lean();
      if (employeeUsers.length !== employeeIds.length) {
        return jsonResponse({ message: 'All assigned employees must be valid team members.' }, 400);
      }
    }

    const previousProject = await Project.findById(parsed.data.id).lean();
    if (!previousProject) {
      return jsonResponse({ message: 'Project not found.' }, 404);
    }

    const project = await Project.findByIdAndUpdate(
      parsed.data.id,
      {
        name: parsed.data.name,
        description: parsed.data.description || '',
        clientId: parsed.data.clientId || undefined,
        employeeIds,
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
        status: parsed.data.status || 'ON_TRACK',
      },
      { new: true }
    );

    if (previousProject.status !== project.status) {
      await Activity.create({
        projectId: project._id,
        actorId: user._id,
        type: 'PROJECT_STATUS_CHANGED',
        description: `Project status changed from ${previousProject.status} to ${project.status}.`,
        createdAt: new Date(),
      });
    }

    await Activity.create({
      projectId: project._id,
      actorId: user._id,
      type: 'PROJECT_UPDATED',
      description: `Project updated: ${project.name}`,
    });

    return jsonResponse({ project }, 200);
  } catch (error) {
    console.error('[admin/projects] Failed to update project', error);
    return jsonResponse({ message: 'Unable to update the project right now.' }, 500);
  }
}
