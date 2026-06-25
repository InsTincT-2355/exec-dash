(function attachSupabaseService() {
  let client;

  function getConfig() {
    return window.APP_CONFIG || {};
  }

  function isEnabled() {
    const config = getConfig();
    return Boolean(
      config.useSupabase &&
      config.supabaseUrl &&
      config.supabaseAnonKey &&
      window.supabase &&
      typeof window.supabase.createClient === "function"
    );
  }

  function getClient() {
    if (!isEnabled()) {
      return null;
    }

    if (!client) {
      const config = getConfig();
      client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    }

    return client;
  }

  function mapProfileToUser(profile) {
    return {
      id: profile.id,
      name: profile.full_name,
      role: profile.role,
      department: profile.departments?.name || "Unassigned Department",
      email: profile.email
    };
  }

  async function getAuthSession() {
    const supabaseClient = getClient();
    if (!supabaseClient) {
      return null;
    }

    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      throw error;
    }

    return data.session;
  }

  async function getAccessToken() {
    const session = await getAuthSession();
    return session?.access_token || "";
  }

  async function hasActiveSession() {
    const session = await getAuthSession();
    return Boolean(session?.user);
  }

  async function signIn(email, password) {
    const supabaseClient = getClient();
    if (!supabaseClient) {
      throw new Error("Supabase is not configured.");
    }

    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }
  }

  async function signOut() {
    const supabaseClient = getClient();
    if (!supabaseClient) {
      return;
    }

    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      throw error;
    }
  }

  async function fetchCurrentProfile() {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      throw new Error("No active authenticated user.");
    }

    const supabaseClient = getClient();
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("id, auth_user_id, full_name, email, role, departments(name)")
      .eq("auth_user_id", session.user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error("No profile row exists for this account. Create the user profile from the Admin page or verify the profile insert succeeded.");
    }

    return data;
  }

  async function fetchDepartments() {
    const supabaseClient = getClient();
    const { data, error } = await supabaseClient
      .from("departments")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  }

  async function fetchProfiles(currentProfile, options = {}) {
    const supabaseClient = getClient();
    let query = supabaseClient
      .from("profiles")
      .select("id, auth_user_id, full_name, email, role, departments(name)")
      .order("full_name", { ascending: true });

    if (!options.includeAll && currentProfile.role === "Department Head") {
      query = query.eq("id", currentProfile.id);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  }

  async function fetchWeeklyUpdates(currentProfile) {
    const supabaseClient = getClient();
    let query = supabaseClient
      .from("weekly_updates")
      .select(`
        id,
        profile_id,
        week_ending,
        created_at,
        update_items (
          id,
          category,
          title,
          description,
          created_at
        )
      `)
      .order("week_ending", { ascending: false })
      .order("created_at", { ascending: false });

    if (currentProfile.role === "Department Head") {
      query = query.eq("profile_id", currentProfile.id);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  }

  async function fetchBootState() {
    const currentProfile = await fetchCurrentProfile();
    const [profiles, weeklyUpdates] = await Promise.all([
      fetchProfiles(currentProfile),
      fetchWeeklyUpdates(currentProfile)
    ]);

    return {
      users: profiles.map(mapProfileToUser),
      submissions: weeklyUpdates.map((update) => ({
        id: update.id,
        userId: update.profile_id,
        weekEnding: update.week_ending,
        createdAt: update.created_at,
        items: (update.update_items || []).map((item) => ({
          id: item.id,
          category: item.category,
          title: item.title,
          description: item.description
        }))
      })),
      currentUserId: currentProfile.id
    };
  }

  async function fetchAdminData() {
    const currentProfile = await fetchCurrentProfile();
    if (currentProfile.role !== "Admin") {
      throw new Error("Admin access is restricted to admin users.");
    }

    const [profiles, departments] = await Promise.all([
      fetchProfiles(currentProfile, { includeAll: true }),
      fetchDepartments()
    ]);

    return {
      users: profiles.map(mapProfileToUser),
      departments
    };
  }

  async function submitWeeklyUpdate(profileId, weekEnding, items) {
    const supabaseClient = getClient();
    if (!supabaseClient) {
      throw new Error("Supabase is not configured.");
    }

    const { data: existingUpdate, error: existingError } = await supabaseClient
      .from("weekly_updates")
      .select("id")
      .eq("profile_id", profileId)
      .eq("week_ending", weekEnding)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    let weeklyUpdateId = existingUpdate?.id;

    if (!weeklyUpdateId) {
      const { data: insertedUpdate, error: insertError } = await supabaseClient
        .from("weekly_updates")
        .insert({
          profile_id: profileId,
          week_ending: weekEnding
        })
        .select("id")
        .single();

      if (insertError) {
        throw insertError;
      }

      weeklyUpdateId = insertedUpdate.id;
    } else {
      const { error: deleteError } = await supabaseClient
        .from("update_items")
        .delete()
        .eq("weekly_update_id", weeklyUpdateId);

      if (deleteError) {
        throw deleteError;
      }
    }

    const { error: itemsError } = await supabaseClient
      .from("update_items")
      .insert(items.map((item) => ({
        weekly_update_id: weeklyUpdateId,
        category: item.category,
        title: item.title,
        description: item.description
      })));

    if (itemsError) {
      throw itemsError;
    }

    return weeklyUpdateId;
  }

  window.SupabaseService = {
    isEnabled,
    getAuthSession,
    getAccessToken,
    hasActiveSession,
    signIn,
    signOut,
    fetchBootState,
    fetchAdminData,
    fetchDepartments,
    submitWeeklyUpdate
  };
})();
