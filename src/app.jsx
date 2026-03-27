import { useState, useEffect, useCallback } from "react";

// ============================================================
// SUPABASE CONFIG — fill these in after creating your project
// at https://supabase.com (free tier)
// ============================================================
const SUPABASE_URL = https://ftlabzdtppdjrdbdsdch.supabase.co;       // e.g. https://xxxx.supabase.co
const SUPABASE_ANON_KEY = sb_publishable_IhoPgvvqqIRFyzm9NwIXmA_OxNgo4TI;

async function sbGet(key) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/fitduo?key=eq.${encodeURIComponent(key)}&select=value`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  const data = await res.json();
  return data?.[0]?.value ?? null;
}

async function sbSet(key, value) {
  await fetch(`${SUPABASE_URL}/rest/v1/fitduo`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({ key, value }),
  });
}

// ============================================================

const USERS = {
  you: { name: "You", emoji: "⌚", device: "Amazfit", color: "#00E676" },
  wife: { name: "Wife", emoji: "⌚", device: "Apple Watch", color: "#FF6090" },
};

const CHALLENGES = [
  { id: "steps", label: "Step Showdown", icon: "👟", unit: "steps", goal: 10000, duration: "daily" },
  { id: "calories", label: "Calorie Crusher", icon: "🔥", unit: "kcal", goal: 500, duration: "daily" },
  { id: "active_min", label: "Move Minutes", icon: "⏱", unit: "min", goal: 30, duration: "daily" },
  { id: "workouts", label: "Workout Warrior", icon: "💪", unit: "workouts", goal: 5, duration: "weekly" },
];

const WORKOUT_TYPES = ["🏃 Run", "🚶 Walk", "🚴 Cycle", "🏊 Swim", "🧘 Yoga", "🏋️ Weights", "🥊 Boxing", "💃 Dance", "🧗 Climb", "⚽ Sport"];

const today = () => new Date().toISOString().slice(0, 10);
const defaultStats = () => ({ steps: 0, calories: 0, active_min: 0, workouts: [], date: today(), lastSync: null });

const fonts = `@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap');`;

export default function FitnessDuo() {
  const [currentUser, setCurrentUser] = useState(null);
  const [stats, setStats] = useState({ you: defaultStats(), wife: defaultStats() });
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showSyncInfo, setShowSyncInfo] = useState(false);
  const [activeChallenges, setActiveChallenges] = useState([]);
  const [trophies, setTrophies] = useState({ you: 0, wife: 0 });
  const [loaded, setLoaded] = useState(false);
  const [workoutForm, setWorkoutForm] = useState({ type: WORKOUT_TYPES[0], duration: "", calories: "" });
  const [celebration, setCelebration] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const syncUser = params.get("user");
        const syncSteps = parseInt(params.get("steps")) || null;
        const syncCals = parseInt(params.get("calories")) || null;
        const syncMin = parseInt(params.get("active_min")) || null;

        const raw = await sbGet("fitness-duo-data");
        let loadedStats = { you: defaultStats(), wife: defaultStats() };
        let loadedChallenges = [];
        let loadedTrophies = { you: 0, wife: 0 };

        if (raw) {
          const d = JSON.parse(raw);
          const todayStr = today();
          const fixStats = (s) => s && s.date === todayStr ? s : defaultStats();
          loadedStats = { you: fixStats(d.stats?.you), wife: fixStats(d.stats?.wife) };
          loadedChallenges = d.activeChallenges || [];
          loadedTrophies = d.trophies || { you: 0, wife: 0 };
        }

        if (syncUser && (syncSteps !== null || syncCals !== null || syncMin !== null)) {
          const todayStr = today();
          const userStats = loadedStats[syncUser]?.date === todayStr ? loadedStats[syncUser] : defaultStats();
          loadedStats = {
            ...loadedStats,
            [syncUser]: {
              ...userStats,
              steps: syncSteps ?? userStats.steps,
              calories: syncCals ?? userStats.calories,
              active_min: syncMin ?? userStats.active_min,
              date: todayStr,
              lastSync: new Date().toISOString(),
            },
          };
          await sbSet("fitness-duo-data", JSON.stringify({ stats: loadedStats, activeChallenges: loadedChallenges, trophies: loadedTrophies }));
          setSyncStatus(`Synced ${USERS[syncUser]?.name || syncUser}'s data from Health!`);
          setCurrentUser(syncUser);
          setTimeout(() => setSyncStatus(null), 4000);
          // Clean up URL params
          window.history.replaceState({}, "", window.location.pathname);
        }

        setStats(loadedStats);
        setActiveChallenges(loadedChallenges);
        setTrophies(loadedTrophies);
      } catch (e) {
        console.error("Load error", e);
      }
      setLoaded(true);
    })();
  }, []);

  const save = useCallback(async (newStats, newChallenges, newTrophies) => {
    try {
      await sbSet("fitness-duo-data", JSON.stringify({ stats: newStats, activeChallenges: newChallenges, trophies: newTrophies }));
    } catch (e) { console.error(e); }
  }, []);

  const updateStats = (user, updates) => {
    const newStats = { ...stats, [user]: { ...stats[user], ...updates, date: today(), lastSync: new Date().toISOString() } };
    setStats(newStats);
    save(newStats, activeChallenges, trophies);
  };

  const logWorkout = (user, workout) => {
    const w = { ...workout, id: Date.now(), timestamp: new Date().toISOString() };
    const newStats = {
      ...stats,
      [user]: {
        ...stats[user],
        workouts: [...stats[user].workouts, w],
        calories: stats[user].calories + (parseInt(workout.calories) || 0),
        active_min: stats[user].active_min + (parseInt(workout.duration) || 0),
        date: today(),
        lastSync: new Date().toISOString(),
      },
    };
    setStats(newStats);
    save(newStats, activeChallenges, trophies);
  };

  const startChallenge = (id) => {
    if (activeChallenges.find(c => c.id === id)) return;
    const newC = [...activeChallenges, { id, started: today() }];
    setActiveChallenges(newC);
    save(stats, newC, trophies);
  };

  const getAppUrl = () => window.location.origin + window.location.pathname;

  if (!loaded) return (
    <div style={S.loadScreen}><style>{fonts}</style><div style={{ fontSize: 48 }}>💪</div><div style={S.loadText}>FitDuo</div></div>
  );

  if (!currentUser) return (
    <div style={S.selectScreen}>
      <style>{fonts}</style>
      <div style={S.selectBg} />
      <div style={S.selectContent}>
        <div style={{ fontSize: 64, marginBottom: 8 }}>💪</div>
        <h1 style={S.appTitle}>FitDuo</h1>
        <p style={S.appSub}>Cross-platform fitness competitions</p>
        <div style={S.selectCards}>
          {Object.entries(USERS).map(([key, u]) => (
            <button key={key} style={{ ...S.selectCard, borderColor: u.color + "44" }} onClick={() => setCurrentUser(key)}>
              <div style={{ ...S.selectEmoji, background: `${u.color}22` }}>{u.emoji}</div>
              <div style={S.selectName}>{u.name}</div>
              <div style={{ color: u.color, fontSize: 13, fontWeight: 600 }}>{u.device}</div>
            </button>
          ))}
        </div>
        <button style={S.syncInfoBtn} onClick={() => setShowSyncInfo(true)}>🔗 Set up auto-sync from Apple Health</button>
      </div>
      {showSyncInfo && <SyncInfoModal appUrl={getAppUrl()} onClose={() => setShowSyncInfo(false)} />}
    </div>
  );

  const me = currentUser, partner = me === "you" ? "wife" : "you";
  const myColor = USERS[me].color, theirColor = USERS[partner].color;

  return (
    <div style={S.app}>
      <style>{fonts}</style>
      {celebration && <div style={S.celebration}><span style={{ fontSize: 22 }}>🎉</span><span>{celebration}</span></div>}
      {syncStatus && <div style={{ ...S.celebration, background: "linear-gradient(135deg, #2196F3, #1565C0)" }}><span style={{ fontSize: 22 }}>✅</span><span>{syncStatus}</span></div>}

      <div style={S.header}>
        <button style={S.backBtn} onClick={() => setCurrentUser(null)}>←</button>
        <div>
          <div style={S.headerTitle}>FitDuo</div>
          <div style={S.headerSub}>{USERS[me].name} ({USERS[me].device}){stats[me].lastSync && ` · Synced ${new Date(stats[me].lastSync).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}</div>
        </div>
        <div style={{ display: "flex", gap: 8, marginLeft: "auto", alignItems: "center" }}>
          <button style={S.syncSetupBtn} onClick={() => setShowSyncInfo(true)}>🔗</button>
          <div style={{ width: 10, height: 10, borderRadius: 5, background: myColor }} />
        </div>
      </div>

      <div style={S.content}>
        {activeTab === "dashboard" && <Dashboard me={me} partner={partner} stats={stats} myColor={myColor} theirColor={theirColor} onWorkout={() => setShowWorkoutModal(true)} activeChallenges={activeChallenges} trophies={trophies} />}
        {activeTab === "compete" && <Compete me={me} partner={partner} stats={stats} myColor={myColor} theirColor={theirColor} activeChallenges={activeChallenges} startChallenge={startChallenge} trophies={trophies} />}
        {activeTab === "activity" && <Activity me={me} partner={partner} stats={stats} />}
      </div>

      {showWorkoutModal && (
        <Modal onClose={() => setShowWorkoutModal(false)} title="Log Workout">
          <div style={S.workoutTypes}>
            {WORKOUT_TYPES.map(t => (
              <button key={t} style={{ ...S.workoutTypeBtn, ...(workoutForm.type === t ? { background: myColor + "33", borderColor: myColor } : {}) }} onClick={() => setWorkoutForm({ ...workoutForm, type: t })}>{t}</button>
            ))}
          </div>
          <div style={S.formGroup}><label style={S.label}>Duration (min)</label><input style={S.input} type="number" placeholder="30" value={workoutForm.duration} onChange={e => setWorkoutForm({ ...workoutForm, duration: e.target.value })} /></div>
          <div style={S.formGroup}><label style={S.label}>Calories burned</label><input style={S.input} type="number" placeholder="200" value={workoutForm.calories} onChange={e => setWorkoutForm({ ...workoutForm, calories: e.target.value })} /></div>
          <button style={{ ...S.primaryBtn, background: myColor }} onClick={() => { logWorkout(me, workoutForm); setWorkoutForm({ type: WORKOUT_TYPES[0], duration: "", calories: "" }); setShowWorkoutModal(false); setCelebration("Workout logged! 🔥"); setTimeout(() => setCelebration(null), 3000); }}>Log Workout</button>
        </Modal>
      )}

      {showSyncInfo && <SyncInfoModal appUrl={getAppUrl()} onClose={() => setShowSyncInfo(false)} />}

      <div style={S.tabBar}>
        {[{ id: "dashboard", icon: "📊", label: "Dashboard" }, { id: "compete", icon: "🏆", label: "Compete" }, { id: "activity", icon: "📋", label: "Activity" }].map(tab => (
          <button key={tab.id} style={{ ...S.tab, ...(activeTab === tab.id ? { color: myColor, borderTopColor: myColor } : {}) }} onClick={() => setActiveTab(tab.id)}>
            <span style={{ fontSize: 18 }}>{tab.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1 }}>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SyncInfoModal({ appUrl, onClose }) {
  const [copied, setCopied] = useState(null);
  const yourUrl = `${appUrl}?user=you&steps=STEPS&calories=CALORIES&active_min=ACTIVE_MIN`;
  const wifeUrl = `${appUrl}?user=wife&steps=STEPS&calories=CALORIES&active_min=ACTIVE_MIN`;
  const copyText = (text, label) => { navigator.clipboard.writeText(text).catch(() => {}); setCopied(label); setTimeout(() => setCopied(null), 2000); };

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={{ ...S.modal, maxHeight: "90vh" }} onClick={e => e.stopPropagation()}>
        <div style={S.modalHeader}><div style={S.modalTitle}>Auto-Sync Setup</div><button style={S.modalClose} onClick={onClose}>✕</button></div>
        <div style={S.modalBody}>
          <div style={S.syncExplainer}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🍎</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Sync via Apple Shortcuts</div>
            <p style={{ fontSize: 13, color: "#999", lineHeight: 1.6, margin: 0 }}>Both your Amazfit (via Zepp) and Apple Watch sync to Apple Health. Use Shortcuts to read that data and send it here.</p>
          </div>
          <div style={S.syncUrlBox}>
            <div style={{ fontSize: 11, color: "#00E676", marginBottom: 4, fontWeight: 700 }}>YOUR PHONE (Amazfit):</div>
            <code style={S.syncUrlCode}>{yourUrl}</code>
            <button style={S.copyBtn} onClick={() => copyText(yourUrl, "yours")}>{copied === "yours" ? "✓ Copied" : "Copy"}</button>
          </div>
          <div style={{ ...S.syncUrlBox, marginTop: 8 }}>
            <div style={{ fontSize: 11, color: "#FF6090", marginBottom: 4, fontWeight: 700 }}>WIFE'S PHONE (Apple Watch):</div>
            <code style={S.syncUrlCode}>{wifeUrl}</code>
            <button style={S.copyBtn} onClick={() => copyText(wifeUrl, "wife")}>{copied === "wife" ? "✓ Copied" : "Copy"}</button>
          </div>
          <div style={S.syncNote}><strong>In Shortcuts:</strong> Build a Text action with the URL above, replacing STEPS/CALORIES/ACTIVE_MIN with your Health Sample variables, then pass it to an Open URLs action.</div>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ me, partner, stats, myColor, theirColor, onWorkout, activeChallenges, trophies }) {
  const myStats = stats[me], theirStats = stats[partner];
  return (
    <div style={S.page}>
      <div style={S.quickActions}>
        <button style={{ ...S.actionBtn, background: "linear-gradient(135deg, #FF9100, #FF6D00)" }} onClick={onWorkout}>
          <span style={{ fontSize: 20 }}>🏋️</span><span>Log Workout</span>
        </button>
      </div>
      <div style={S.syncStatusRow}>
        {[me, partner].map(user => (
          <div key={user} style={{ ...S.syncStatusCard, borderColor: USERS[user].color + "44" }}>
            <div style={{ fontSize: 11, color: "#888" }}>{USERS[user].name}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: USERS[user].color, marginTop: 2 }}>
              {stats[user].lastSync ? `Synced ${new Date(stats[user].lastSync).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Not synced yet"}
            </div>
          </div>
        ))}
      </div>
      <div style={S.sectionTitle}>Today's Head-to-Head</div>
      {[
        { label: "Steps", icon: "👟", mine: myStats.steps, theirs: theirStats.steps, goal: 10000 },
        { label: "Calories", icon: "🔥", mine: myStats.calories, theirs: theirStats.calories, goal: 500 },
        { label: "Active Min", icon: "⏱", mine: myStats.active_min, theirs: theirStats.active_min, goal: 30 },
        { label: "Workouts", icon: "💪", mine: myStats.workouts.length, theirs: theirStats.workouts.length, goal: 1 },
      ].map(row => (
        <div key={row.label} style={S.h2hCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, fontSize: 14, fontWeight: 600 }}>
            <span>{row.icon} {row.label}</span>
            <span style={{ fontSize: 11, color: "#555", fontFamily: "'Space Mono', monospace" }}>Goal: {row.goal.toLocaleString()}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Space Mono', monospace" }}>{row.mine.toLocaleString()}</div>
              <div style={S.barTrack}><div style={{ ...S.barFill, width: `${Math.min(100, (row.mine / row.goal) * 100)}%`, background: myColor }} /></div>
            </div>
            <div style={{ fontSize: 11, color: "#444", fontWeight: 700, width: 24, textAlign: "center" }}>vs</div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
              <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Space Mono', monospace" }}>{row.theirs.toLocaleString()}</div>
              <div style={S.barTrack}><div style={{ ...S.barFill, width: `${Math.min(100, (row.theirs / row.goal) * 100)}%`, background: theirColor, marginLeft: "auto" }} /></div>
            </div>
          </div>
          {row.mine > row.theirs && row.mine > 0 && <div style={{ marginTop: 8, fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 8, display: "inline-block", background: myColor + "22", color: myColor }}>You're in the lead! 🏅</div>}
          {row.theirs > row.mine && row.theirs > 0 && <div style={{ marginTop: 8, fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 8, display: "inline-block", background: theirColor + "22", color: theirColor }}>{USERS[partner].name} is ahead! 👀</div>}
        </div>
      ))}
      <div style={S.sectionTitle}>Your Rings</div>
      <div style={S.ringsCard}>
        <div style={S.ringsRow}>
          {CHALLENGES.slice(0, 3).map(ch => {
            const val = ch.id === "workouts" ? myStats.workouts.length : myStats[ch.id];
            const pct = Math.min(100, (val / ch.goal) * 100);
            return (
              <div key={ch.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <RingProgress pct={pct} color={myColor} size={70} icon={ch.icon} />
                <div style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>{ch.label}</div>
                <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>{val}/{ch.goal}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={S.sectionTitle}>Scoreboard</div>
      <div style={S.scoreCard}>
        <div style={S.scoreRow}>
          {[me, partner].map((user, i) => (
            <div key={user} style={{ display: "flex", alignItems: "center", gap: 20 }}>
              {i === 1 && <div style={{ fontSize: 22, fontWeight: 900, color: "#333" }}>VS</div>}
              <div style={{ ...S.scoreUser, borderColor: USERS[user].color }}>
                <div style={{ fontSize: 28 }}>{USERS[user].emoji}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: USERS[user].color }}>{USERS[user].name}</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>🏆 {trophies[user]}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Compete({ me, partner, stats, myColor, theirColor, activeChallenges, startChallenge }) {
  return (
    <div style={S.page}>
      <div style={S.sectionTitle}>Active Challenges</div>
      {activeChallenges.length === 0 && <div style={S.emptyState}>No active challenges yet. Start one below!</div>}
      {activeChallenges.map(ac => {
        const ch = CHALLENGES.find(c => c.id === ac.id);
        if (!ch) return null;
        const vals = { [me]: ch.id === "workouts" ? stats[me].workouts.length : stats[me][ch.id], [partner]: ch.id === "workouts" ? stats[partner].workouts.length : stats[partner][ch.id] };
        const leading = vals[me] > vals[partner] ? me : vals[partner] > vals[me] ? partner : null;
        return (
          <div key={ac.id} style={S.challengeCard}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <span style={{ fontSize: 24 }}>{ch.icon}</span>
              <div><div style={{ fontSize: 16, fontWeight: 700 }}>{ch.label}</div><div style={{ fontSize: 11, color: "#666" }}>{ch.duration} · Goal: {ch.goal.toLocaleString()} {ch.unit}</div></div>
              {leading && <div style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "#fff", padding: "3px 10px", borderRadius: 20, background: USERS[leading].color }}>{leading === me ? "👑 You lead" : `👑 ${USERS[leading].name}`}</div>}
            </div>
            {[me, partner].map(user => (
              <div key={user} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ color: USERS[user].color, fontWeight: 700, fontSize: 13, width: 50 }}>{USERS[user].name}</span>
                <div style={S.barTrack}><div style={{ ...S.barFill, width: `${Math.min(100, (vals[user] / ch.goal) * 100)}%`, background: USERS[user].color }} /></div>
                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Space Mono', monospace", width: 60, textAlign: "right" }}>{vals[user].toLocaleString()}</span>
              </div>
            ))}
          </div>
        );
      })}
      <div style={S.sectionTitle}>Start a Challenge</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {CHALLENGES.map(ch => {
          const isActive = activeChallenges.find(a => a.id === ch.id);
          return (
            <button key={ch.id} style={{ ...S.startChallengeBtn, opacity: isActive ? 0.4 : 1 }} onClick={() => !isActive && startChallenge(ch.id)} disabled={!!isActive}>
              <span style={{ fontSize: 28 }}>{ch.icon}</span>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{ch.label}</div>
              <div style={{ fontSize: 11, color: "#666" }}>{ch.goal.toLocaleString()} {ch.unit}</div>
              {isActive ? <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>Active</div> : <div style={{ fontSize: 11, fontWeight: 700, color: "#fff", padding: "3px 14px", borderRadius: 20, marginTop: 4, background: myColor }}>Start</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Activity({ me, partner, stats }) {
  const all = [...stats[me].workouts.map(w => ({ ...w, user: me })), ...stats[partner].workouts.map(w => ({ ...w, user: partner }))].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return (
    <div style={S.page}>
      <div style={S.sectionTitle}>Today's Workouts</div>
      {all.length === 0 && <div style={S.emptyState}>No workouts yet. Get moving! 🏃</div>}
      {all.map(w => (
        <div key={w.id} style={{ ...S.workoutCard, borderLeftColor: USERS[w.user].color }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22 }}>{w.type.split(" ")[0]}</span>
            <div><div style={{ fontSize: 14, fontWeight: 700 }}>{w.type}</div><div style={{ fontSize: 11, color: "#666" }}>{USERS[w.user].name} · {new Date(w.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div></div>
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            {w.duration && <div style={S.workoutStat}><span style={S.workoutStatVal}>{w.duration}</span>min</div>}
            {w.calories && <div style={S.workoutStat}><span style={S.workoutStatVal}>{w.calories}</span>kcal</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function RingProgress({ pct, color, size = 70, icon }) {
  const r = (size - 8) / 2, circ = 2 * Math.PI * r, offset = circ - (pct / 100) * circ;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1a1a2e" strokeWidth={6} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{icon}</div>
    </div>
  );
}

function Modal({ onClose, title, children }) {
  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={S.modalHeader}><div style={S.modalTitle}>{title}</div><button style={S.modalClose} onClick={onClose}>✕</button></div>
        <div style={S.modalBody}>{children}</div>
      </div>
    </div>
  );
}

const S = {
  app: { fontFamily: "'Outfit', sans-serif", background: "#0a0a14", color: "#e8e8f0", minHeight: "100vh", display: "flex", flexDirection: "column", maxWidth: 480, margin: "0 auto", position: "relative" },
  loadScreen: { fontFamily: "'Outfit', sans-serif", background: "#0a0a14", color: "#e8e8f0", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 },
  loadText: { fontSize: 28, fontWeight: 800, letterSpacing: 4 },
  selectScreen: { fontFamily: "'Outfit', sans-serif", background: "#0a0a14", color: "#e8e8f0", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" },
  selectBg: { position: "absolute", inset: 0, background: "radial-gradient(ellipse at 30% 20%, #00E67611 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, #FF609011 0%, transparent 60%)" },
  selectContent: { position: "relative", zIndex: 1, textAlign: "center", padding: 24 },
  appTitle: { fontSize: 42, fontWeight: 900, letterSpacing: 3, margin: 0 },
  appSub: { fontSize: 15, color: "#888", marginTop: 4, marginBottom: 40 },
  selectCards: { display: "flex", gap: 16, justifyContent: "center" },
  selectCard: { background: "#12121e", border: "2px solid", borderRadius: 20, padding: "32px 28px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, minWidth: 140 },
  selectEmoji: { fontSize: 36, width: 64, height: 64, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center" },
  selectName: { fontSize: 18, fontWeight: 700 },
  syncInfoBtn: { marginTop: 32, background: "none", border: "1px solid #333", borderRadius: 12, padding: "12px 20px", color: "#888", fontSize: 14, fontFamily: "'Outfit', sans-serif", cursor: "pointer" },
  header: { display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid #1a1a2e", background: "#0d0d18" },
  backBtn: { background: "none", border: "none", color: "#888", fontSize: 22, cursor: "pointer", padding: "4px 8px" },
  headerTitle: { fontSize: 18, fontWeight: 800, letterSpacing: 2 },
  headerSub: { fontSize: 11, color: "#666", marginTop: 2 },
  syncSetupBtn: { background: "none", border: "none", fontSize: 18, cursor: "pointer", padding: 4 },
  content: { flex: 1, overflowY: "auto", paddingBottom: 80 },
  page: { padding: "12px 16px" },
  quickActions: { display: "flex", gap: 10, marginBottom: 8 },
  actionBtn: { flex: 1, border: "none", borderRadius: 14, padding: "14px 16px", color: "#fff", fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
  syncStatusRow: { display: "flex", gap: 8, marginBottom: 8 },
  syncStatusCard: { flex: 1, background: "#12121e", borderRadius: 10, padding: "8px 12px", border: "1px solid" },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: 2, marginTop: 20, marginBottom: 12, fontFamily: "'Space Mono', monospace" },
  h2hCard: { background: "#12121e", borderRadius: 16, padding: "14px 16px", marginBottom: 10 },
  barTrack: { height: 6, background: "#1a1a2e", borderRadius: 3, overflow: "hidden", width: "100%", flex: 1 },
  barFill: { height: "100%", borderRadius: 3, transition: "width 0.6s ease" },
  ringsCard: { background: "#12121e", borderRadius: 16, padding: 20, marginBottom: 10 },
  ringsRow: { display: "flex", justifyContent: "space-around" },
  scoreCard: { background: "#12121e", borderRadius: 16, padding: 20 },
  scoreRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: 20 },
  scoreUser: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, border: "2px solid", borderRadius: 16, padding: "16px 20px", minWidth: 100 },
  challengeCard: { background: "#12121e", borderRadius: 16, padding: 16, marginBottom: 10 },
  startChallengeBtn: { background: "#12121e", border: "1px solid #1a1a2e", borderRadius: 16, padding: 16, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: "#e8e8f0", fontFamily: "'Outfit', sans-serif" },
  workoutCard: { background: "#12121e", borderRadius: 14, padding: "14px 16px", marginBottom: 10, borderLeft: "4px solid", display: "flex", justifyContent: "space-between", alignItems: "center" },
  workoutStat: { fontSize: 11, color: "#888", display: "flex", flexDirection: "column", alignItems: "center" },
  workoutStatVal: { fontSize: 16, fontWeight: 800, color: "#e8e8f0", fontFamily: "'Space Mono', monospace" },
  emptyState: { textAlign: "center", padding: 40, color: "#444", fontSize: 14 },
  tabBar: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, display: "flex", background: "#0d0d18", borderTop: "1px solid #1a1a2e", zIndex: 100 },
  tab: { flex: 1, background: "none", border: "none", borderTop: "3px solid transparent", color: "#555", fontFamily: "'Outfit', sans-serif", padding: "10px 0 8px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200 },
  modal: { background: "#12121e", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 480, maxHeight: "80vh", overflowY: "auto" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 20px 0" },
  modalTitle: { fontSize: 20, fontWeight: 800 },
  modalClose: { background: "none", border: "none", color: "#666", fontSize: 20, cursor: "pointer" },
  modalBody: { padding: 20 },
  formGroup: { marginBottom: 16 },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 },
  input: { width: "100%", padding: "12px 14px", background: "#0a0a14", border: "1px solid #1a1a2e", borderRadius: 12, color: "#e8e8f0", fontSize: 16, fontFamily: "'Space Mono', monospace", outline: "none", boxSizing: "border-box" },
  primaryBtn: { width: "100%", padding: "14px", border: "none", borderRadius: 14, color: "#fff", fontSize: 16, fontWeight: 700, fontFamily: "'Outfit', sans-serif", cursor: "pointer", marginTop: 8 },
  workoutTypes: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  workoutTypeBtn: { background: "#0a0a14", border: "1px solid #1a1a2e", borderRadius: 10, padding: "8px 12px", color: "#e8e8f0", fontSize: 13, fontFamily: "'Outfit', sans-serif", cursor: "pointer" },
  celebration: { position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg, #00E676, #00C853)", color: "#000", padding: "12px 24px", borderRadius: 16, fontWeight: 700, fontSize: 15, zIndex: 300, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 8px 32px rgba(0,230,118,0.3)", whiteSpace: "nowrap" },
  syncExplainer: { textAlign: "center", marginBottom: 16, padding: "16px", background: "#0a0a14", borderRadius: 16 },
  syncUrlBox: { background: "#0a0a14", borderRadius: 10, padding: 12, position: "relative" },
  syncUrlCode: { fontSize: 10, color: "#888", wordBreak: "break-all", lineHeight: 1.5 },
  copyBtn: { position: "absolute", top: 8, right: 8, background: "#1a1a2e", border: "none", color: "#e8e8f0", padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit', sans-serif" },
  syncNote: { background: "#0a0a14", borderRadius: 10, padding: 12, fontSize: 12, color: "#888", lineHeight: 1.5, marginTop: 12 },
};
