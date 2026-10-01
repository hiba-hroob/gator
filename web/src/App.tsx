
import {
  useEffect,
  useState,
} from "react";

import type {
  FormEvent,
} from "react";

import "./App.css";

type User = {
  id: string;
  name: string;
};

type Stats = {
  feeds: number;
  posts: number;
  unread: number;
  saved: number;
  categories: Array<{
    category: string;
    count: number;
  }>;
};

type Post = {
  id: string;
  title: string;
  url: string;
  description: string | null;
  publishedAt: string | null;
  feedName: string;
  category: string;
  reason?: string;
};

type Story = {
  id: string;
  title: string;
  posts: Post[];
  sourceCount: number;
  feedCount: number;
  categories: string[];
  score: number;
};

type StoryBrief = {
  title: string;
  sourceCount: number;
  takeaways: string[];
  comparison: Array<{
    sourceHost: string;
    focus: string;
  }>;
  sources: Array<{
    id: string;
    title: string;
    url: string;
    feedName: string;
    sourceHost: string;
    category: string;
    summary: string;
  }>;
};

type DashboardData = {
  user: User;
  stats: Stats;
  recommendations: Post[];
};

async function api<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
  });

  const data = await response
    .json()
    .catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.error ?? "Request failed",
    );
  }

  return data as T;
}

function App() {
  const [user, setUser] =
    useState<User | null>(null);

  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null);

  /*
   * URLs of posts currently saved
   * by the logged-in user.
   */
  const [savedUrls, setSavedUrls] =
    useState<Set<string>>(
      new Set(),
    );

  const [stories, setStories] =
    useState<Story[]>([]);

  const [storyBrief, setStoryBrief] =
    useState<StoryBrief | null>(null);

  const [briefLoading, setBriefLoading] =
    useState(false);

  const [selectedPosts, setSelectedPosts] =
    useState<Post[]>([]);

  const [authMode, setAuthMode] =
    useState<"login" | "register">(
      "login",
    );

  const [name, setName] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [authError, setAuthError] =
    useState("");

  const [authLoading, setAuthLoading] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [activeView, setActiveView] =
    useState("dashboard");

  const [posts, setPosts] =
    useState<Post[]>([]);

  const [search, setSearch] =
    useState("");

  const [error, setError] =
    useState("");

  const [summary, setSummary] =
    useState("");

  const [summaryTitle, setSummaryTitle] =
    useState("");

  const loadStories =
    async () => {
      try {
        const data =
          await api<{
            stories: Story[];
          }>(
            "/api/stories",
          );

        setStories(
          data.stories,
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load stories",
        );
      }
    };

  /*
   * Load all saved post URLs for the
   * current user.
   *
   * A larger limit prevents old saved
   * posts from disappearing from the
   * local saved state when the account
   * has many saved items.
   */
  const loadSavedUrls =
    async () => {
      const data =
        await api<{
          posts: Post[];
        }>(
          "/api/saved?limit=1000",
        );

      setSavedUrls(
        new Set(
          data.posts.map(
            (post) => post.url,
          ),
        ),
      );
    };

  const showStoryBrief = async (
    story: Story,
  ) => {
    try {
      setBriefLoading(true);
      setError("");

      const data =
        await api<StoryBrief>(
          "/api/stories/brief",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              urls: story.posts.map(
                (post) => post.url,
              ),
            }),
          },
        );

      setStoryBrief(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to build story brief",
      );
    } finally {
      setBriefLoading(false);
    }
  };

  const toggleSourceSelection = (
    post: Post,
  ) => {
    setError("");

    const alreadySelected =
      selectedPosts.some(
        (selected) =>
          selected.id === post.id,
      );

    if (alreadySelected) {
      setSelectedPosts(
        selectedPosts.filter(
          (selected) =>
            selected.id !==
            post.id,
        ),
      );

      return;
    }

    if (
      selectedPosts.length >= 2
    ) {
      setError(
        "Choose exactly two sources to compare.",
      );

      return;
    }

    setSelectedPosts([
      ...selectedPosts,
      post,
    ]);
  };

  const compareSelectedSources =
    async () => {
      if (
        selectedPosts.length !== 2
      ) {
        setError(
          "Choose two sources first.",
        );

        return;
      }

      try {
        setBriefLoading(true);
        setError("");

        const data =
          await api<StoryBrief>(
            "/api/stories/brief",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                urls:
                  selectedPosts.map(
                    (post) =>
                      post.url,
                  ),
              }),
            },
          );

        setStoryBrief(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to compare sources",
        );
      } finally {
        setBriefLoading(false);
      }
    };

  const clearSelectedSources =
    () => {
      setSelectedPosts([]);
      setError("");
    };

  const loadCurrentUser =
    async () => {
      try {
        const currentUser =
          await api<User>(
            "/api/me",
          );

        setUser(currentUser);

        const data =
          await api<DashboardData>(
            "/api/dashboard",
          );

        setDashboard(data);

        /*
         * Important:
         * Load the saved state immediately
         * after the dashboard is loaded.
         */
        await loadSavedUrls();

        await loadStories();
      } catch {
        setUser(null);
        setDashboard(null);
        setSavedUrls(
          new Set(),
        );
        setStories([]);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const handleAuth = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    try {
      setAuthLoading(true);
      setAuthError("");

      const endpoint =
        authMode === "login"
          ? "/api/auth/login"
          : "/api/auth/register";

      const data =
        await api<{
          user: User;
        }>(endpoint, {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            password,
          }),
        });

      setUser(data.user);
      setName("");
      setPassword("");

      const dashboardData =
        await api<DashboardData>(
          "/api/dashboard",
        );

      setDashboard(
        dashboardData,
      );

      /*
       * Load saved posts after login
       * so buttons immediately reflect
       * the user's actual saved state.
       */
      await loadSavedUrls();

      await loadStories();
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : "Authentication failed",
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api(
        "/api/auth/logout",
        {
          method: "POST",
        },
      );
    } catch {
      // Clear local state even if
      // the server request fails.
    }

    setUser(null);
    setDashboard(null);
    setSavedUrls(
      new Set(),
    );
    setStories([]);
    setPosts([]);
    setSelectedPosts([]);
    setStoryBrief(null);
    setSummary("");
    setActiveView(
      "dashboard",
    );
  };

  const refreshDashboard =
    async () => {
      const data =
        await api<DashboardData>(
          "/api/dashboard",
        );

      setDashboard(data);
      setUser(data.user);

      await loadSavedUrls();
      await loadStories();
    };

  const loadPosts = async (
    mode: string,
  ) => {
    try {
      setLoading(true);
      setError("");

      if (
        mode === "saved"
      ) {
        const data =
          await api<{
            posts: Post[];
          }>(
            "/api/saved?limit=1000",
          );

        setPosts(
          data.posts,
        );

        /*
         * Keep local saved state in sync
         * with the Saved page.
         */
        setSavedUrls(
          new Set(
            data.posts.map(
              (post) => post.url,
            ),
          ),
        );

        return;
      }

      const params =
        new URLSearchParams();

      params.set(
        "limit",
        "20",
      );

      if (
        mode === "unread"
      ) {
        params.set(
          "unread",
          "true",
        );
      }

      const data =
        await api<{
          posts: Post[];
        }>(
          `/api/posts?${params.toString()}`,
        );

      setPosts(
        data.posts,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load posts",
      );
    } finally {
      setLoading(false);
    }
  };

  const runSearch = async () => {
    if (!search.trim()) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data =
        await api<{
          posts: Post[];
        }>(
          `/api/search?q=${encodeURIComponent(
            search.trim(),
          )}`,
        );

      setPosts(
        data.posts,
      );

      setSelectedPosts([]);
      setActiveView(
        "search",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Search failed",
      );
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (
    post: Post,
  ) => {
    try {
      await api(
        "/api/posts/read",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            url: post.url,
          }),
        },
      );

      await refreshDashboard();

      setSelectedPosts(
        selectedPosts.filter(
          (selected) =>
            selected.id !==
            post.id,
        ),
      );

      if (
        activeView ===
        "unread"
      ) {
        await loadPosts(
          "unread",
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to mark post as read",
      );
    }
  };

  /*
   * SAVE / UNSAVE TOGGLE
   *
   * The current saved state is read
   * from savedUrls.
   *
   * Saved:
   *   DELETE /api/posts/save?url=...
   *
   * Not saved:
   *   POST /api/posts/save
   */
  const toggleSave = async (
    post: Post,
  ) => {
    try {
      const isSaved =
        savedUrls.has(
          post.url,
        );

      if (isSaved) {
        await api(
          `/api/posts/save?url=${encodeURIComponent(
            post.url,
          )}`,
          {
            method: "DELETE",
          },
        );

        setSavedUrls(
          (current) => {
            const next =
              new Set(current);

            next.delete(
              post.url,
            );

            return next;
          },
        );

        /*
         * If we are currently on
         * Saved, remove the card
         * immediately.
         */
        if (
          activeView ===
          "saved"
        ) {
          setPosts(
            (current) =>
              current.filter(
                (item) =>
                  item.url !==
                  post.url,
              ),
          );
        }
      } else {
        await api(
          "/api/posts/save",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              url: post.url,
            }),
          },
        );

        setSavedUrls(
          (current) => {
            const next =
              new Set(current);

            next.add(
              post.url,
            );

            return next;
          },
        );
      }

      /*
       * Refresh dashboard stats
       * and server-backed state.
       */
      await refreshDashboard();

      /*
       * Keep the Saved page synchronized.
       */
      if (
        activeView ===
        "saved"
      ) {
        await loadPosts(
          "saved",
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update saved post",
      );
    }
  };

  const showSummary = async (
    post: Post,
  ) => {
    try {
      setSummaryTitle(
        post.title,
      );

      setSummary(
        "Loading summary...",
      );

      const data =
        await api<{
          title: string;
          summary: string;
        }>(
          `/api/posts/summary?url=${encodeURIComponent(
            post.url,
          )}`,
        );

      setSummary(
        data.summary,
      );
    } catch (err) {
      setSummary(
        err instanceof Error
          ? err.message
          : "Summary unavailable",
      );
    }
  };

  const navigate = (
    view: string,
  ) => {
    setActiveView(view);
    setSummary("");
    setStoryBrief(null);
    setSelectedPosts([]);
    setError("");

    if (
      view ===
      "dashboard"
    ) {
      refreshDashboard().catch(
        (err) => {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load dashboard",
          );
        },
      );

      return;
    }

    if (
      view === "latest" ||
      view === "unread" ||
      view === "saved"
    ) {
      loadPosts(view);
    }
  };

  const canCompare =
    selectedPosts.length === 2;

  if (loading) {
    return (
      <div className="loading">
        🐊 Loading Gator...
      </div>
    );
  }

  if (
    !user ||
    !dashboard
  ) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            🐊
          </div>

          <p className="eyebrow">
            PERSONAL NEWS ASSISTANT
          </p>

          <h1>
            Welcome to Gator
          </h1>

          <p className="auth-subtitle">
            Your feeds, recommendations,
            summaries, and saved stories
            in one place.
          </p>

          <div className="auth-tabs">
            <button
              type="button"
              className={
                authMode === "login"
                  ? "auth-tab active"
                  : "auth-tab"
              }
              onClick={() => {
                setAuthMode(
                  "login",
                );
                setAuthError("");
              }}
            >
              Login
            </button>

            <button
              type="button"
              className={
                authMode ===
                "register"
                  ? "auth-tab active"
                  : "auth-tab"
              }
              onClick={() => {
                setAuthMode(
                  "register",
                );
                setAuthError("");
              }}
            >
              Create account
            </button>
          </div>

          <form
            className="auth-form"
            onSubmit={
              handleAuth
            }
          >
            <label>
              Username

              <input
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value,
                  )
                }
                placeholder="Choose a username"
                autoComplete="username"
                required
              />
            </label>

            <label>
              Password

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value,
                  )
                }
                placeholder="At least 8 characters"
                autoComplete={
                  authMode ===
                  "login"
                    ? "current-password"
                    : "new-password"
                }
                minLength={8}
                required
              />
            </label>

            {authError && (
              <div className="error-banner">
                {authError}
              </div>
            )}

            <button
              className="auth-submit"
              type="submit"
              disabled={
                authLoading
              }
            >
              {authLoading
                ? "Please wait..."
                : authMode ===
                    "login"
                  ? "Login to Gator"
                  : "Create account"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">
            🐊
          </div>

          <div>
            <h1>
              Gator
            </h1>

            <span>
              Personal News Assistant
            </span>
          </div>
        </div>

        <nav>
          <button
            className={
              activeView ===
              "dashboard"
                ? "nav active"
                : "nav"
            }
            onClick={() =>
              navigate(
                "dashboard",
              )
            }
          >
            <span>⌂</span>
            Dashboard
          </button>

          <button
            className={
              activeView ===
              "latest"
                ? "nav active"
                : "nav"
            }
            onClick={() =>
              navigate(
                "latest",
              )
            }
          >
            <span>📰</span>
            Latest
          </button>

          <button
            className={
              activeView ===
              "unread"
                ? "nav active"
                : "nav"
            }
            onClick={() =>
              navigate(
                "unread",
              )
            }
          >
            <span>🔵</span>
            Unread
          </button>

          <button
            className={
              activeView ===
              "saved"
                ? "nav active"
                : "nav"
            }
            onClick={() =>
              navigate(
                "saved",
              )
            }
          >
            <span>⭐</span>
            Saved
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="avatar">
              {user.name
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <strong>
                {user.name}
              </strong>

              <span>
                Reader
              </span>
            </div>

            <button
              className="logout-button"
              onClick={
                logout
              }
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">
              YOUR PERSONAL FEED
            </p>

            <h2>
              Good to see you,{" "}
              {user.name}
            </h2>
          </div>

          <div className="search-box">
            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  runSearch();
                }
              }}
              placeholder="Search your news..."
            />

            <button
              onClick={
                runSearch
              }
              aria-label="Search"
            >
              🔎
            </button>
          </div>
        </header>

        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        {activeView !==
          "dashboard" &&
          posts.length > 0 && (
          <section className="compare-toolbar">
            <div>
              <strong>
                Compare sources
              </strong>

              <span>
                {selectedPosts.length}
                /2 selected
              </span>
            </div>

            <div className="compare-actions">
              <button
                className="compare-button"
                disabled={
                  !canCompare ||
                  briefLoading
                }
                onClick={
                  compareSelectedSources
                }
              >
                {briefLoading
                  ? "Comparing..."
                  : "🧠 Compare Sources"}
              </button>

              {selectedPosts.length >
                0 && (
                <button
                  className="clear-compare-button"
                  onClick={
                    clearSelectedSources
                  }
                >
                  Clear
                </button>
              )}
            </div>
          </section>
        )}

        {activeView ===
          "dashboard" && (
          <>
            <section className="stats-grid">
              <StatCard
                value={
                  dashboard.stats.posts
                }
                label="Total posts"
                icon="📰"
              />

              <StatCard
                value={
                  dashboard.stats.unread
                }
                label="Unread"
                icon="🔵"
              />

              <StatCard
                value={
                  dashboard.stats.saved
                }
                label="Saved"
                icon="⭐"
              />

              <StatCard
                value={
                  dashboard.stats.feeds
                }
                label="Feeds followed"
                icon="📡"
              />
            </section>

            <section className="content-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">
                    PERSONALIZED
                  </p>

                  <h3>
                    Recommended for you
                  </h3>
                </div>
              </div>

              {dashboard
                .recommendations
                .length === 0 ? (
                <div className="empty-state">
                  <div>
                    🎯
                  </div>

                  <h3>
                    No recommendations yet
                  </h3>

                  <p>
                    Save a few posts and Gator
                    will learn your interests.
                  </p>
                </div>
              ) : (
                <div className="post-grid">
                  {dashboard
                    .recommendations
                    .map(
                      (post) => (
                        <PostCard
                          key={
                            post.id
                          }
                          post={
                            post
                          }
                          onRead={
                            markRead
                          }
                          onSave={
                            toggleSave
                          }
                          saved={
                            savedUrls.has(
                              post.url,
                            )
                          }
                          onSummary={
                            showSummary
                          }
                          selected={false}
                          onSelect={() =>
                            undefined
                          }
                        />
                      ),
                    )}
                </div>
              )}
            </section>

            <section className="content-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">
                    STORY RADAR
                  </p>

                  <h3>
                    One story, multiple sources
                  </h3>
                </div>

                <span className="radar-count">
                  {stories.length}{" "}
                  stories
                </span>
              </div>

              {stories.length ===
              0 ? (
                <div className="loading-card">
                  No multi-source stories
                  detected yet.
                </div>
              ) : (
                <div className="story-grid">
                  {stories.map(
                    (story) => (
                      <StoryCard
                        key={
                          story.id
                        }
                        story={
                          story
                        }
                        onBrief={
                          showStoryBrief
                        }
                        briefLoading={
                          briefLoading
                        }
                      />
                    ),
                  )}
                </div>
              )}
            </section>

            <section className="content-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">
                    TOPICS
                  </p>

                  <h3>
                    Your categories
                  </h3>
                </div>
              </div>

              <div className="category-row">
                {dashboard
                  .stats
                  .categories
                  .map(
                    (category) => (
                      <div
                        className="category-chip"
                        key={
                          category.category
                        }
                      >
                        <span>
                          #
                          {
                            category.category
                          }
                        </span>

                        <strong>
                          {
                            category.count
                          }
                        </strong>
                      </div>
                    ),
                  )}
              </div>
            </section>
          </>
        )}

        {activeView !==
          "dashboard" && (
          <section className="content-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  {activeView ===
                  "search"
                    ? "SEARCH"
                    : "YOUR LIBRARY"}
                </p>

                <h3>
                  {activeView ===
                  "search"
                    ? `Results for "${search}"`
                    : activeView
                        .charAt(0)
                        .toUpperCase() +
                      activeView.slice(
                        1,
                      )}
                </h3>
              </div>
            </div>

            {loading ? (
              <div className="loading-card">
                Loading...
              </div>
            ) : (
              <div className="post-grid">
                {posts.map(
                  (post) => {
                    const selected =
                      selectedPosts.some(
                        (
                          item,
                        ) =>
                          item.id ===
                          post.id,
                      );

                    return (
                      <PostCard
                        key={
                          post.id
                        }
                        post={
                          post
                        }
                        onRead={
                          markRead
                        }
                        onSave={
                          toggleSave
                        }
                        saved={
                          savedUrls.has(
                            post.url,
                          )
                        }
                        onSummary={
                          showSummary
                        }
                        selected={
                          selected
                        }
                        onSelect={() =>
                          toggleSourceSelection(
                            post,
                          )
                        }
                      />
                    );
                  },
                )}
              </div>
            )}

            {!loading &&
              posts.length ===
                0 && (
                <div className="empty-state">
                  <div>
                    📭
                  </div>

                  <h3>
                    Nothing here yet
                  </h3>

                  <p>
                    Try another section or
                    search for something.
                  </p>
                </div>
              )}
          </section>
        )}
      </main>

      {summary && (
        <div
          className="modal-backdrop"
          onClick={() =>
            setSummary("")
          }
        >
          <div
            className="summary-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              className="close-button"
              onClick={() =>
                setSummary("")
              }
            >
              ×
            </button>

            <p className="eyebrow">
              SMART SUMMARY
            </p>

            <h3>
              {summaryTitle}
            </h3>

            <div className="summary-body">
              {summary
                .split("\n")
                .map(
                  (
                    line,
                    index,
                  ) => (
                    <p
                      key={
                        index
                      }
                    >
                      {
                        line
                      }
                    </p>
                  ),
                )}
            </div>
          </div>
        </div>
      )}

      {storyBrief && (
        <div
          className="modal-backdrop"
          onClick={() =>
            setStoryBrief(
              null,
            )
          }
        >
          <div
            className="brief-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              className="close-button"
              onClick={() =>
                setStoryBrief(
                  null,
                )
              }
            >
              ×
            </button>

            <div className="story-badge">
              🧠 STORY BRIEF
            </div>

            <h2>
              {storyBrief.title}
            </h2>

            <p className="brief-count">
              {storyBrief.sourceCount}{" "}
              sources compared
            </p>

            <section className="brief-section">
              <p className="eyebrow">
                KEY TAKEAWAYS
              </p>

              {storyBrief
                .takeaways.length ===
              0 ? (
                <div className="takeaways">
                  <div className="takeaway">
                    No shared takeaways
                    were extracted.
                  </div>
                </div>
              ) : (
                <div className="takeaways">
                  {storyBrief.takeaways.map(
                    (
                      takeaway,
                      index,
                    ) => (
                      <div
                        className="takeaway"
                        key={
                          index
                        }
                      >
                        {takeaway}
                      </div>
                    ),
                  )}
                </div>
              )}
            </section>

            <section className="brief-section">
              <p className="eyebrow">
                QUICK COMPARISON
              </p>

              <div className="comparison-grid">
                {storyBrief.comparison.map(
                  (item) => (
                    <div
                      className="comparison-item"
                      key={
                        item.sourceHost
                      }
                    >
                      <div className="comparison-host">
                        🌐{" "}
                        {item.sourceHost}
                      </div>

                      <p>
                        {item.focus}
                      </p>
                    </div>
                  ),
                )}
              </div>
            </section>

            <section className="brief-section">
              <p className="eyebrow">
                SOURCE PERSPECTIVES
              </p>

              <div className="brief-sources">
                {storyBrief
                  .sources
                  .map(
                    (source, index) => (
                      <article
                        className="brief-source"
                        key={
                          source.id
                        }
                      >
                        <div className="source-label">
                          SOURCE{" "}
                          {String.fromCharCode(
                            65 + index,
                          )}
                        </div>

                        <div className="post-meta">
                          <span className="category">
                            {
                              source.category
                            }
                          </span>

                          <span className="source-host">
                            🌐{" "}
                            {source.sourceHost}
                          </span>

                          <span className="source-feed">
                            via{" "}
                            {source.feedName}
                          </span>
                        </div>

                        <h3>
                          {
                            source.title
                          }
                        </h3>

                        <div className="source-summary">
                          {source.summary
                            .split(
                              "\n",
                            )
                            .map(
                              (
                                line,
                                index,
                              ) => (
                                <p
                                  key={
                                    index
                                  }
                                >
                                  {
                                    line
                                  }
                                </p>
                              ),
                            )}
                        </div>

                        <a
                          href={
                            source.url
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="read-link"
                        >
                          Open source ↗
                        </a>
                      </article>
                    ),
                  )}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  value,
  label,
  icon,
}: {
  value: number;
  label: string;
  icon: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon">
        {icon}
      </div>

      <div>
        <strong>
          {value}
        </strong>

        <span>
          {label}
        </span>
      </div>
    </div>
  );
}

function PostCard({
  post,
  onRead,
  onSave,
  onSummary,
  selected,
  onSelect,
  saved,
}: {
  post: Post;
  onRead: (
    post: Post,
  ) => void;
  onSave: (
    post: Post,
  ) => void;
  onSummary: (
    post: Post,
  ) => void;
  selected: boolean;
  onSelect: () => void;
  saved: boolean;
}) {
  return (
    <article
      className={
        selected
          ? "post-card selected-source"
          : "post-card"
      }
    >
      <div className="post-meta">
        <span className="category">
          {post.category}
        </span>

        <span>
          {post.feedName}
        </span>
      </div>

      {onSelect && (
        <button
          className="source-select-button"
          onClick={onSelect}
          type="button"
        >
          {selected
            ? "✓ Selected for comparison"
            : "☐ Select source"}
        </button>
      )}

      <h3>
        {post.title}
      </h3>

      {post.reason && (
        <p className="reason">
          ✦{" "}
          {post.reason}
        </p>
      )}

      <p className="post-date">
        {post.publishedAt
          ? new Date(
              post.publishedAt,
            ).toLocaleDateString()
          : "Recently"}
      </p>

      <div className="post-actions">
        <a
          href={post.url}
          target="_blank"
          rel="noreferrer"
          className="read-link"
        >
          Open article ↗
        </a>

        <button
          onClick={() =>
            onSummary(post)
          }
          type="button"
        >
          🤖 Summary
        </button>

        <button
          onClick={() =>
            onRead(post)
          }
          type="button"
        >
          ✓ Read
        </button>

        <button
          onClick={() =>
            onSave(post)
          }
          type="button"
          aria-pressed={saved}
          title={
            saved
              ? "Remove from saved"
              : "Save post"
          }
        >
          {saved
            ? "✅ Saved"
            : "⭐ Save"}
        </button>
      </div>
    </article>
  );
}

function StoryCard({
  story,
  onBrief,
  briefLoading,
}: {
  story: Story;
  onBrief: (
    story: Story,
  ) => void;
  briefLoading: boolean;
}) {
  return (
    <article className="story-card">
      <div className="story-badge">
        🧠 Story Radar
      </div>

      <h3>
        {story.title}
      </h3>

      <div className="story-meta">
        <span>
          {story.sourceCount}{" "}
          sources
        </span>

        <span>
          {story.feedCount}{" "}
          feeds
        </span>

        {story.categories.map(
          (category) => (
            <span
              key={category}
            >
              #{category}
            </span>
          ),
        )}
      </div>

      <div className="story-sources">
        {story.posts.map(
          (post) => (
            <a
              key={post.id}
              href={post.url}
              target="_blank"
              rel="noreferrer"
              className="source-item"
            >
              <strong>
                {post.feedName}
              </strong>

              <span>
                {post.title}
              </span>

              <small>
                Open source ↗
              </small>
            </a>
          ),
        )}
      </div>

      <button
        className="story-brief-button"
        onClick={() =>
          onBrief(story)
        }
        disabled={
          briefLoading
        }
        type="button"
      >
        {briefLoading
          ? "Building brief..."
          : "🧠 Build Story Brief"}
      </button>
    </article>
  );
}

export default App;

