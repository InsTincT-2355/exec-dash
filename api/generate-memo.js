const {
  assertExecutive,
  getRequesterProfile,
  parseJsonBody,
  sendJson
} = require("./_utils");

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

async function callAiProvider(tasks, requesterName) {
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY;
  const model = process.env.AI_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash";
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
    const apiUrl = process.env.AI_API_URL || `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error?.message || "Gemini request failed.");
    }

    return cleanMemoText(
      payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim() || createFallbackMemo(normalizedTasks, requesterName),
      requesterName
    );
  }

  const apiUrl = process.env.AI_API_URL || "https://api.openai.com/v1/chat/completions";
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

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || "AI provider request failed.");
  }

  return cleanMemoText(
    payload?.choices?.[0]?.message?.content || createFallbackMemo(normalizedTasks, requesterName),
    requesterName
  );
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  try {
    const { profile } = await getRequesterProfile(req);
    assertExecutive(profile);

    const body = await parseJsonBody(req);
    const tasks = Array.isArray(body.tasks) ? body.tasks : [];

    if (!tasks.length) {
      return sendJson(res, 400, { error: "At least one task is required to generate a memo." });
    }

    const memo = await callAiProvider(tasks, profile.full_name);
    return sendJson(res, 200, {
      memo,
      mode: (process.env.AI_API_KEY || process.env.GEMINI_API_KEY) ? "ai-provider" : "fallback"
    });
  } catch (error) {
    return sendJson(res, 500, { error: error.message || "Memo generation failed." });
  }
};
