const VALID_ROLES = new Set(["Admin", "Executive", "Department Head"]);

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function getSupabaseProjectUrl(env) {
  const rawUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  if (!rawUrl) {
    throw new Error("Missing SUPABASE_URL environment variable.");
  }

  return rawUrl.replace(/\/rest\/v1\/?$/, "");
}

function getSupabaseAnonKey(env) {
  return env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
}

function getSupabaseServiceRoleKey(env) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable.");
  }
  return key;
}

function getBearerToken(request) {
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : "";
}

async function parseJsonBody(request) {
  const raw = await request.text();
  if (!raw) {
    return {};
  }

  return JSON.parse(raw);
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function supabaseFetch(env, path, options = {}) {
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

  const data = await readJsonResponse(response);
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

async function getRequesterProfile(request, env) {
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

  const userPayload = await readJsonResponse(userResponse);
  if (!userResponse.ok) {
    throw new Error(userPayload?.msg || userPayload?.message || "Unable to validate the current user.");
  }

  const profileList = await supabaseFetch(env, `/rest/v1/profiles?auth_user_id=eq.${userPayload.id}&select=id,auth_user_id,full_name,email,role,department_id`);
  const profile = Array.isArray(profileList) ? profileList[0] : null;

  if (!profile) {
    throw new Error("No matching profile was found for the authenticated user.");
  }

  return {
    user: userPayload,
    profile
  };
}

function assertAdmin(profile) {
  if (profile.role !== "Admin") {
    throw new Error("This action is restricted to admin users.");
  }
}

function assertExecutive(profile) {
  if (profile.role !== "Executive" && profile.role !== "Admin") {
    throw new Error("This action is restricted to executive users.");
  }
}

function formatMemoList(items, emptyText) {
  if (!items.length) {
    return `1. ${emptyText}`;
  }

  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function cleanMemoText(text, requesterName) {
  const cleaned = String(text || "")
    .replace(/\*/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^To:\s*\[.*\]\s*$/gim, "To: Executive Leadership")
    .replace(/^From:\s*\[.*\]\s*$/gim, `From: ${requesterName}`)
    .replace(/^Subject:\s*\[.*\]\s*$/gim, "Subject: Weekly Executive Memo")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned
    .replace(/^EXECUTIVE MEMO\s*$/gim, "")
    .replace(/^MEMORANDUM\s*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeTasks(tasks) {
  return tasks.map((task) => ({
    department: task.department,
    category: task.category,
    title: task.title,
    description: task.description
  }));
}

function createFallbackMemo(tasks, requesterName) {
  const departments = [...new Set(tasks.map((task) => task.department))];
  const activities = tasks.filter((task) => task.category === "activities").slice(0, 4);
  const priorities = tasks.filter((task) => task.category === "priorities").slice(0, 4);
  const risks = tasks.filter((task) => task.category === "risks").slice(0, 5);
  const recommendedActions = [];

  if (risks.length) {
    recommendedActions.push("Review cross-department mitigation plans for the active risks listed above.");
  }
  if (priorities.length) {
    recommendedActions.push("Confirm support needed for the selected next-week priorities.");
  }

  return cleanMemoText([
    "To: Executive Leadership",
    `From: ${requesterName}`,
    `Subject: Weekly Executive Memo - ${departments.join(", ") || "Selected Departments"}`,
    "",
    "Summary",
    `This memo covers ${tasks.length} selected update items across ${departments.join(", ") || "Selected Departments"}.`,
    "",
    "Key Highlights",
    formatMemoList(
      activities.map((task) => `${task.department}: ${task.title}${task.description ? ` - ${task.description}` : ""}`),
      "No new activities selected."
    ),
    "",
    "Next-Week Priorities",
    formatMemoList(
      priorities.map((task) => `${task.department}: ${task.title}${task.description ? ` - ${task.description}` : ""}`),
      "No new priorities selected."
    ),
    "",
    "Challenges And Risks",
    formatMemoList(
      risks.map((task) => `${task.department}: ${task.title}${task.description ? ` - ${task.description}` : ""}`),
      "No new risks selected."
    ),
    "",
    "Recommended Executive Actions",
    formatMemoList(recommendedActions, "No immediate executive action is required based on the selected items.")
  ].join("\n"), requesterName);
}

async function callAiProvider(tasks, requesterName, env) {
  const provider = (env.AI_PROVIDER || "gemini").toLowerCase();
  const apiKey = env.AI_API_KEY || env.GEMINI_API_KEY;
  const model = env.AI_MODEL || env.GEMINI_MODEL || "gemini-2.5-flash";
  const normalizedTasks = normalizeTasks(tasks);

  if (!apiKey) {
    return createFallbackMemo(normalizedTasks, requesterName);
  }

  const prompt = [
    "You are preparing a concise executive memo in plain text.",
    "Use a professional corporate tone.",
    "Use this structure exactly: To, From, Subject, Summary, Key Highlights, Next-Week Priorities, Challenges And Risks, Recommended Executive Actions.",
    "Do not use markdown, bullets with asterisks, bold formatting, placeholders, or bracketed names.",
    "Do not invent facts, dates, task owners, deadlines, recommendations, or departments beyond the provided tasks.",
    "Do not mention individual submitter names in the memo body.",
    "If a section has no matching items, write exactly one numbered line stating there are no new items for that section.",
    "If there is no clear executive action, write exactly: No immediate executive action is required based on the selected items.",
    "Keep it readable, decision-oriented, and under 220 words.",
    "",
    JSON.stringify({ requesterName, tasks: normalizedTasks }, null, 2)
  ].join("\n");

  if (provider === "gemini") {
    const apiUrl = env.AI_API_URL || `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: [
                  "Produce a clear executive memo. Do not invent facts beyond the provided tasks.",
                  prompt
                ].join("\n\n")
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2
        }
      })
    });

    const payload = await readJsonResponse(response);
    if (!response.ok) {
      throw new Error(payload?.error?.message || "Gemini request failed.");
    }

    return cleanMemoText(
      payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim() || createFallbackMemo(normalizedTasks, requesterName),
      requesterName
    );
  }

  const apiUrl = env.AI_API_URL || "https://api.openai.com/v1/chat/completions";
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "Produce a clear executive memo. Do not invent facts beyond the provided tasks."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2
    })
  });

  const payload = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error(payload?.error?.message || "AI provider request failed.");
  }

  return cleanMemoText(
    payload?.choices?.[0]?.message?.content || createFallbackMemo(normalizedTasks, requesterName),
    requesterName
  );
}

async function handleGenerateMemo(request, env) {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const body = await parseJsonBody(request);
    const tasks = Array.isArray(body.tasks) ? body.tasks : [];

    if (!tasks.length) {
      return jsonResponse({ error: "At least one task is required to generate a memo." }, 400);
    }

    let requesterName = "Local Executive";
    const bypassAuth = ["1", "true", "yes"].includes(String(env.LOCAL_DEV_BYPASS_AUTH || "").toLowerCase());

    if (!bypassAuth) {
      const { profile } = await getRequesterProfile(request, env);
      assertExecutive(profile);
      requesterName = profile.full_name;
    } else if (body.requesterName || body.requester) {
      requesterName = String(body.requesterName || body.requester).trim() || requesterName;
    }

    const memo = await callAiProvider(tasks, requesterName, env);
    return jsonResponse({
      memo,
      mode: (env.AI_API_KEY || env.GEMINI_API_KEY) ? "ai-provider" : "fallback"
    });
  } catch (error) {
    return jsonResponse({ error: error.message || "Memo generation failed." }, 500);
  }
}

async function deleteAuthUser(env, authUserId) {
  try {
    await supabaseFetch(env, `/auth/v1/admin/users/${authUserId}`, {
      method: "DELETE"
    });
  } catch (error) {
    console.error("Failed to delete auth user after profile insert failure", error);
  }
}

async function handleAdminUsers(request, env) {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
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
      return jsonResponse({ error: "Missing or invalid user fields." }, 400);
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

    const createdAuthUserId = authUser?.user?.id || authUser?.id;
    if (!createdAuthUserId) {
      throw new Error("Supabase admin user creation succeeded but returned no user id.");
    }

    try {
      const insertedProfiles = await supabaseFetch(env, "/rest/v1/profiles", {
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

      return jsonResponse({
        message: "User created successfully.",
        user: insertedProfiles[0]
      }, 201);
    } catch (error) {
      await deleteAuthUser(env, createdAuthUserId);
      throw error;
    }
  } catch (error) {
    return jsonResponse({ error: error.message || "Failed to create user." }, 500);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/generate-memo") {
      return handleGenerateMemo(request, env);
    }

    if (url.pathname === "/api/admin-users") {
      return handleAdminUsers(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};
