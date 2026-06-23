const VALID_ROLES = new Set(["Admin", "Executive", "Department Head"]);

function getSupabaseProjectUrl() {
  const rawUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!rawUrl) {
    throw new Error("Missing SUPABASE_URL environment variable.");
  }

  return rawUrl.replace(/\/rest\/v1\/?$/, "");
}

function getSupabaseAnonKey() {
  return process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
}

function getSupabaseServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable.");
  }
  return key;
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : "";
}

async function parseJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

async function supabaseFetch(path, options = {}) {
  const baseUrl = getSupabaseProjectUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      data = text;
    }
  }

  if (!response.ok) {
    if (typeof data === "object" && data) {
      const detailParts = [];
      const message = data.msg || data.message || data.error_description || data.error;
      const details = data.details || data.detail;
      const hint = data.hint;
      const code = data.code;

      if (message) detailParts.push(String(message));
      if (details) detailParts.push(String(details));
      if (hint) detailParts.push(`hint: ${hint}`);
      if (code) detailParts.push(`code: ${code}`);

      throw new Error(`Supabase request failed (${response.status}) for ${path}${detailParts.length ? `: ${detailParts.join(" | ")}` : ""}`);
    }

    throw new Error(`Supabase request failed (${response.status}) for ${path}${data ? `: ${String(data)}` : ""}`);
  }

  return data;
}

async function getRequesterProfile(req) {
  const accessToken = getBearerToken(req);
  if (!accessToken) {
    throw new Error("Missing access token.");
  }

  const baseUrl = getSupabaseProjectUrl();
  const anonKey = getSupabaseAnonKey() || getSupabaseServiceRoleKey();
  const userResponse = await fetch(`${baseUrl}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`
    }
  });

  const userPayload = await userResponse.json();
  if (!userResponse.ok) {
    throw new Error(userPayload?.msg || "Unable to validate the current user.");
  }

  const profileList = await supabaseFetch(`/rest/v1/profiles?auth_user_id=eq.${userPayload.id}&select=id,auth_user_id,full_name,email,role,department_id`);
  const profile = Array.isArray(profileList) ? profileList[0] : null;

  if (!profile) {
    throw new Error("No matching profile was found for the authenticated user.");
  }

  return {
    user: userPayload,
    profile
  };
}

function assertExecutive(profile) {
  if (profile.role !== "Executive") {
    throw new Error("This action is restricted to executive users.");
  }
}

function assertAdmin(profile) {
  if (profile.role !== "Admin") {
    throw new Error("This action is restricted to admin users.");
  }
}

module.exports = {
  VALID_ROLES,
  assertAdmin,
  assertExecutive,
  getRequesterProfile,
  getSupabaseProjectUrl,
  parseJsonBody,
  sendJson,
  supabaseFetch
};
