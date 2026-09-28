const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { connect } = require('./db');
const User = require('../models/User');

const SESSION_COOKIE = 'project-pulse-session';

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return process.env.JWT_SECRET;
}

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function signToken(payload) {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }
}

function getTokenFromRequest(req) {
  const authorization = req.headers.get('authorization');
  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim() || null;
  }

  const cookieHeader = req.headers.get('cookie') || '';
  const sessionCookie = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${SESSION_COOKIE}=`));

  return sessionCookie ? sessionCookie.slice(SESSION_COOKIE.length + 1) : null;
}

async function getUserFromRequest(req) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  const data = verifyToken(token);
  if (!data || !data.userId) return null;
  await connect();
  const user = await User.findById(data.userId).select('-passwordHash').lean();
  if (!user) return null;
  return user;
}

function jsonResponse(payload, status, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers,
    },
  });
}

async function requireUser(req, allowedRoles) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return { user: null, response: jsonResponse({ message: 'Unauthorized' }, 401) };
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return { user, response: jsonResponse({ message: 'Forbidden' }, 403) };
  }
  return { user, response: null };
}

function sessionCookie(token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax${secure}`;
}

function clearSessionCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`;
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  getUserFromRequest,
  requireUser,
  jsonResponse,
  sessionCookie,
  clearSessionCookie,
  SESSION_COOKIE,
};
