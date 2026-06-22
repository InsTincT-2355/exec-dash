import {
  VALID_ROLES,
  assertAdmin,
  getCorsHeaders,
  getRequesterProfile,
  parseJsonBody,
  sendJson,
  supabaseFetch
} from "../_utils.js";

async function deleteAuthUser(env, authUserId) {
  try {
    await supabaseFetch(env, `/auth/v1/admin/users/${authUserId}`, {
      method: "DELETE"
    });
  } catch (error) {
    console.error("Failed to delete auth user after profile insert failure", error);
  }
}

export const onRequest = async (context) => {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request);

  if (request.method === "OPTIONS") {
    return sendJson(204, {}, corsHeaders);
  }

  if (request.method !== "POST") {
    return sendJson(405, { error: "Method not allowed." }, corsHeaders);
  }

  try {
    const { profile: requesterProfile } = await getRequesterProfile(request, env);
    assertAdmin(requesterProfile);

    const body = await parseJsonBody(request);
    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const role = String(body.role || "");
    const departmentId = String(body.departmentId || "");

    if (!fullName || !email || !password || !departmentId || !VALID_ROLES.has(role)) {
      return sendJson(400, { error: "Missing or invalid user fields." }, corsHeaders);
    }

    const authUser = await supabaseFetch(env, "/auth/v1/admin/users", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName
        }
      })
    });

    try {
      const insertedProfiles = await supabaseFetch(env, "/rest/v1/profiles", {
        method: "POST",
        headers: {
          Prefer: "return=representation"
        },
        body: JSON.stringify([{
          auth_user_id: authUser.user.id,
          full_name: fullName,
          email,
          role,
          department_id: departmentId
        }])
      });

      return sendJson(201, {
        message: "User created successfully.",
        user: insertedProfiles[0]
      }, corsHeaders);
    } catch (error) {
      await deleteAuthUser(env, authUser.user.id);
      throw error;
    }
  } catch (error) {
    return sendJson(500, { error: error?.message || "Failed to create user." }, corsHeaders);
  }
};
