const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

async function verifyAdmin(req) {
  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";

  if (!token) {
    return { ok: false, status: 401, message: "Missing session token." };
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "GET",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${token}`
    }
  });

  const user = await response.json().catch(() => null);

  if (!response.ok || !user?.email) {
    return { ok: false, status: 401, message: "Invalid session." };
  }

  if (!ADMIN_EMAILS.includes(String(user.email).toLowerCase())) {
    return { ok: false, status: 403, message: "You are not allowed to access the admin panel." };
  }

  return { ok: true, user };
}

async function listUsers() {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=200`, {
    method: "GET",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.msg || data?.message || "Failed to load users.");
  }

  return data;
}

async function createUser(body) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.msg || data?.message || "Failed to create user.");
  }

  return data;
}

async function deleteUser(userId) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.msg || data?.message || "Failed to delete user.");
  }

  return data;
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    sendJson(res, 500, {
      error: "Server is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
    });
    return;
  }

  if (!ADMIN_EMAILS.length) {
    sendJson(res, 500, {
      error: "Server is missing ADMIN_EMAILS allowlist."
    });
    return;
  }

  try {
    const adminCheck = await verifyAdmin(req);

    if (!adminCheck.ok) {
      sendJson(res, adminCheck.status, { error: adminCheck.message });
      return;
    }

    if (req.method === "GET") {
      const data = await listUsers();
      sendJson(res, 200, data);
      return;
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const email = String(body.email || "").trim();
      const password = String(body.password || "");
      const fullName = String(body.fullName || "").trim();
      const emailConfirm = Boolean(body.emailConfirm);

      if (!email || !password) {
        sendJson(res, 400, { error: "Email and password are required." });
        return;
      }

      if (password.length < 8) {
        sendJson(res, 400, { error: "Password must be at least 8 characters." });
        return;
      }

      const data = await createUser({
        email,
        password,
        email_confirm: emailConfirm,
        user_metadata: {
          full_name: fullName
        }
      });

      sendJson(res, 201, data);
      return;
    }

    if (req.method === "DELETE") {
      const userId = String(req.query?.id || "").trim();

      if (!userId) {
        sendJson(res, 400, { error: "User id is required." });
        return;
      }

      await deleteUser(userId);
      sendJson(res, 200, { success: true });
      return;
    }

    sendJson(res, 405, { error: "Method not allowed." });
  } catch (error) {
    sendJson(res, 500, {
      error: error?.message || "Unexpected server error."
    });
  }
};
