const { jsonResponse, clearSessionCookie } = require('../../../../lib/auth');

export async function POST() {
  return jsonResponse({ message: 'Signed out' }, 200, {
    'Set-Cookie': clearSessionCookie(),
    'Cache-Control': 'no-store',
  });
}