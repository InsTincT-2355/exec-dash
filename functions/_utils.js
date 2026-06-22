export const VALID_ROLES = new Set(["Admin", "Executive", "Department Head"]);

export function sendJson(status, payload, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders
    }
  });
}

function getBearerToken(request) {
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : "";
}

function getSupabaseProjectUrl(env) {
  const rawUrl = env?.SUPABASE_URL || env?.NEXT_PUBLIC_SUPABASE_URL;
  if (!rawUrl) {
    throw new Error("Missing SUPABASE_URL environment variable.");
  }

  return String(rawUrl).replace(/\/rest\/v1\/?$/, "");
}

function getSupabaseAnonKey(env) {
  return String(env?.SUPABASE_ANON_KEY || env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");
}

function getSupabaseServiceRoleKey(env) {
  const key = env?.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable.");
  }
  return String(key);
}

export function getCorsHeaders(request) {
  const origin = request.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type"
  };
}

export async function parseJsonBody(request) {
  if (!request.body) {
    return {};
  }

  return await request.json();
}

export async function supabaseFetch(env, path, options = {}) {
  const baseUrl = getSupabaseProjectUrl(env);
  const serviceRoleKey = getSupabaseServiceRoleKey(env);

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
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    throw new Error(typeof data === "object" && data?.msg ? data.msg : `Supabase request failed: ${response.status}`);
  }

  return data;
}

export async function getRequesterProfile(request, env) {
  const accessToken = getBearerToken(request);
  if (!accessToken) {
    throw new Error("Missing access token.");
  }

  const baseUrl = getSupabaseProjectUrl(env);
  const anonKey = getSupabaseAnonKey(env) || getSupabaseServiceRoleKey(env);

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

  const profileList = await supabaseFetch(
    env,
    `/rest/v1/profiles?auth_user_id=eq.${userPayload.id}&select=id,auth_user_id,full_name,email,role,department_id`
  );
  const profile = Array.isArray(profileList) ? profileList[0] : null;

  if (!profile) {
    throw new Error("No matching profile was found for the authenticated user.");
  }

  return { user: userPayload, profile };
}

export function assertExecutive(profile) {
  if (profile.role !== "Executive") {
    throw new Error("This action is restricted to executive users.");
  }
}

export function assertAdmin(profile) {
  if (profile.role !== "Admin") {
    throw new Error("This action is restricted to admin users.");
  }
}
