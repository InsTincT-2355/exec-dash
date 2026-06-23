const {
  VALID_ROLES,
  assertAdmin,
  getRequesterProfile,
  parseJsonBody,
  sendJson,
  supabaseFetch
} = require("./_utils");

async function deleteAuthUser(authUserId) {
  try {
    await supabaseFetch(`/auth/v1/admin/users/${authUserId}`, {
      method: "DELETE"
    });
  } catch (error) {
    console.error("Failed to delete auth user after profile insert failure", error);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  try {
    const { profile: requesterProfile } = await getRequesterProfile(req);
    assertAdmin(requesterProfile);

    const body = await parseJsonBody(req);
    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const role = String(body.role || "");
    const departmentId = String(body.departmentId || "");

    if (!fullName || !email || !password || !departmentId || !VALID_ROLES.has(role)) {
      return sendJson(res, 400, { error: "Missing or invalid user fields." });
    }

    const authUser = await supabaseFetch("/auth/v1/admin/users", {
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

    const createdAuthUserId = authUser?.user?.id || authUser?.id;
    if (!createdAuthUserId) {
      throw new Error("Supabase admin user creation succeeded but returned no user id.");
    }

    try {
      const insertedProfiles = await supabaseFetch("/rest/v1/profiles", {
        method: "POST",
        headers: {
          Prefer: "return=representation"
        },
        body: JSON.stringify([{
          auth_user_id: createdAuthUserId,
          full_name: fullName,
          email,
          role,
          department_id: departmentId
        }])
      });

      return sendJson(res, 201, {
        message: "User created successfully.",
        user: insertedProfiles[0]
      });
    } catch (error) {
      await deleteAuthUser(createdAuthUserId);
      throw error;
    }
  } catch (error) {
    return sendJson(res, 500, { error: error.message || "Failed to create user." });
  }
};
