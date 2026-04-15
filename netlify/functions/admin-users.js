const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    },
    body: JSON.stringify(payload)
  };
}

async function verifyAdmin(token) {
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

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    };
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { error: "Server is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." });
  }

  if (!ADMIN_EMAILS.length) {
    return json(500, { error: "Server is missing ADMIN_EMAILS allowlist." });
  }

  try {
    const authorization = event.headers.authorization || event.headers.Authorization || "";
    const token = authorization.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : "";

    const adminCheck = await verifyAdmin(token);
    if (!adminCheck.ok) {
      return json(adminCheck.status, { error: adminCheck.message });
    }

    if (event.httpMethod === "GET") {
      const data = await listUsers();
      return json(200, data);
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const email = String(body.email || "").trim();
      const password = String(body.password || "");
      const fullName = String(body.fullName || "").trim();
      const emailConfirm = Boolean(body.emailConfirm);

      if (!email || !password) {
        return json(400, { error: "Email and password are required." });
      }

      if (password.length < 8) {
        return json(400, { error: "Password must be at least 8 characters." });
      }

      const data = await createUser({
        email,
        password,
        email_confirm: emailConfirm,
        user_metadata: {
          full_name: fullName
        }
      });

      return json(201, data);
    }

    if (event.httpMethod === "DELETE") {
      const userId = String(event.queryStringParameters?.id || "").trim();
      if (!userId) {
        return json(400, { error: "User id is required." });
      }

      await deleteUser(userId);
      return json(200, { success: true });
    }

    return json(405, { error: "Method not allowed." });
  } catch (error) {
    return json(500, { error: error?.message || "Unexpected server error." });
  }
};
