import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

const READING_LEVELS = [
  { value: "simple",   label: "Simple",   desc: "Easy language, great for anxious patients" },
  { value: "standard", label: "Standard", desc: "Clear and friendly for most patients" },
  { value: "detailed", label: "Detailed", desc: "More in-depth for patients who want full info" },
];

const TONES = [
  { value: "warm",     label: "Warm & reassuring",  desc: "Gentle and comforting — ideal for anxious patients",    emoji: "🤝" },
  { value: "friendly", label: "Friendly & upbeat",  desc: "Light and positive — great for routine treatments",     emoji: "😊" },
  { value: "clinical", label: "Calm & clinical",    desc: "Straightforward facts — for patients who want clarity", emoji: "📋" },
];

const QUICK_TREATMENTS = [
  "Root canal treatment",
  "Dental implant",
  "Tooth extraction",
  "Composite filling",
  "Porcelain crown",
  "Teeth whitening",
  "Dental bridge",
  "Scale and polish",
  "Orthodontic assessment",
  "Zirconia crown",
];

const LANGUAGES = [
  { value: "English",    flag: "🇬🇧" },
  { value: "Polish",     flag: "🇵🇱" },
  { value: "Urdu",       flag: "🇵🇰" },
  { value: "Punjabi",    flag: "🇵🇰" },
  { value: "Hindi",      flag: "🇮🇳" },
  { value: "Bengali",    flag: "🇧🇩" },
  { value: "Gujarati",   flag: "🇮🇳" },
  { value: "Somali",     flag: "🇸🇴" },
  { value: "Arabic",     flag: "🇸🇦" },
  { value: "Romanian",   flag: "🇷🇴" },
  { value: "Portuguese", flag: "🇵🇹" },
  { value: "Spanish",    flag: "🇪🇸" },
  { value: "French",     flag: "🇫🇷" },
  { value: "Mandarin",   flag: "🇨🇳" },
];

const ClearPlanLogo = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 110 110" fill="none">
    <rect width="110" height="110" rx="24" fill="#0891b2"/>
    <rect x="18" y="16" width="76" height="56" rx="13" fill="white" opacity="0.95"/>
    <path d="M34 72 L26 88 L48 72Z" fill="white" opacity="0.95"/>
    <path d="M55 24 C46 24 40 30 40 37 C40 41 41.5 44.5 43 47.5 C44.5 50.5 44.5 54.5 46.5 57 C47.5 58.5 49 59 50.5 57.5 C52 56 52.5 52.5 55 52.5 C57.5 52.5 58 56 59.5 57.5 C61 59 62.5 58.5 63.5 57 C65.5 54.5 65.5 50.5 67 47.5 C68.5 44.5 70 41 70 37 C70 30 64 24 55 24Z" fill="#0891b2"/>
  </svg>
);

export default function App() {
  // Auth state
  const [session, setSession]             = useState(null);
  const [authView, setAuthView]           = useState("login"); // "login" | "sent" | "app" | "admin"
  const [authEmail, setAuthEmail]         = useState("");
  const [authLoading, setAuthLoading]     = useState(false);
  const [authError, setAuthError]         = useState(null);
  const [authChecking, setAuthChecking]   = useState(true);

  // Admin state
  const [adminPassword, setAdminPassword] = useState("");
  const [adminAuthed, setAdminAuthed]     = useState(false);
  const [adminError, setAdminError]       = useState(null);
  const [practices, setPractices]         = useState([]);
  const [newEmail, setNewEmail]           = useState("");
  const [newName, setNewName]             = useState("");
  const [adminMsg, setAdminMsg]           = useState(null);

  // Check for magic link token in URL or existing session on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      verifyToken(token);
    } else {
      checkSession();
    }
    // Check if admin route
    if (window.location.pathname === "/admin") setAuthView("admin");
  }, []);

  const verifyToken = async (token) => {
    try {
      const res = await fetch("/.netlify/functions/auth-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem("cp_session", data.sessionToken);
      localStorage.setItem("cp_practice", JSON.stringify(data.practice));
      setSession(data.practice);
      setAuthView("app");
      window.history.replaceState({}, "", "/");
    } catch (err) {
      setAuthError(err.message);
      setAuthView("login");
    } finally {
      setAuthChecking(false);
    }
  };

  const checkSession = async () => {
    const sessionToken = localStorage.getItem("cp_session");
    if (!sessionToken) { setAuthChecking(false); return; }
    try {
      const res = await fetch("/.netlify/functions/auth-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken }),
      });
      const data = await res.json();
      if (res.ok) {
        setSession(data.practice);
        setAuthView("app");
      } else {
        localStorage.removeItem("cp_session");
        localStorage.removeItem("cp_practice");
      }
    } catch (err) {}
    setAuthChecking(false);
  };

  const requestMagicLink = async () => {
    if (!authEmail.trim()) return;
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch("/.netlify/functions/auth-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAuthView("sent");
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("cp_session");
    localStorage.removeItem("cp_practice");
    setSession(null);
    setAuthView("login");
    setAuthEmail("");
  };

  // Admin functions
  const adminCall = async (action, extra = {}) => {
    const res = await fetch("/.netlify/functions/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, password: adminPassword, ...extra }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  };

  const adminLogin = async () => {
    setAdminError(null);
    try {
      const data = await adminCall("list");
      setPractices(data.practices);
      setAdminAuthed(true);
    } catch (err) {
      setAdminError("Invalid password");
    }
  };

  const adminAddPractice = async () => {
    if (!newEmail.trim()) return;
    try {
      await adminCall("add", { email: newEmail, name: newName });
      setNewEmail(""); setNewName("");
      setAdminMsg("Practice added successfully");
      const data = await adminCall("list");
      setPractices(data.practices);
    } catch (err) {
      setAdminMsg(`Error: ${err.message}`);
    }
  };

  const adminToggle = async (id) => {
    try {
      await adminCall("toggle", { practiceId: id });
      const data = await adminCall("list");
      setPractices(data.practices);
    } catch (err) {}
  };

  const adminRemove = async (id) => {
    if (!window.confirm("Remove this practice? This cannot be undone.")) return;
    try {
      await adminCall("remove", { practiceId: id });
      const data = await adminCall("list");
      setPractices(data.practices);
    } catch (err) {}
  };

  // Practice branding
  const [practiceName, setPracticeName]   = useState(() => localStorage.getItem("cp_practiceName") || "");
  const [practiceLogo, setPracticeLogo]   = useState(() => localStorage.getItem("cp_practiceLogo") || "");
  const [showSettings, setShowSettings]   = useState(false);
  const [settingsDraft, setSettingsDraft] = useState({ name: "", logo: "" });
  const logoInputRef = useRef(null);

  // Form state
  const [patientName, setPatientName]       = useState("");
  const [patientEmail, setPatientEmail]     = useState("");
  const [language, setLanguage]             = useState("English");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [costEstimate, setCostEstimate]       = useState("");
  const [treatments, setTreatments]         = useState([""]);
  const [multiMode, setMultiMode]           = useState("combined");
  const [readingLevel, setReadingLevel]     = useState("standard");
  const [tone, setTone]                     = useState("warm");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [explanations, setExplanations]     = useState([]);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState(null);
  const [generated, setGenerated]           = useState(false);
  const outputRef = useRef(null);

  const activeTreatments = treatments.filter(t => t.trim());
  const hasMultiple = treatments.length > 1;

  // Settings handlers
  const openSettings = () => {
    setSettingsDraft({ name: practiceName, logo: practiceLogo });
    setShowSettings(true);
  };

  const saveSettings = () => {
    setPracticeName(settingsDraft.name);
    setPracticeLogo(settingsDraft.logo);
    localStorage.setItem("cp_practiceName", settingsDraft.name);
    localStorage.setItem("cp_practiceLogo", settingsDraft.logo);
    setShowSettings(false);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setSettingsDraft(d => ({ ...d, logo: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setSettingsDraft(d => ({ ...d, logo: "" }));
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  // Treatment handlers
  const updateTreatment = (index, value) => {
    setTreatments(prev => prev.map((t, i) => i === index ? value : t));
  };
  const addTreatment = () => setTreatments(prev => [...prev, ""]);
  const removeTreatment = (index) => {
    setTreatments(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  };

  const fetchExplanation = async (treatmentText) => {
    const res = await fetch("/.netlify/functions/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ treatment: treatmentText, patientName, readingLevel, additionalNotes, language, tone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.explanation;
  };

  const generate = async () => {
    if (activeTreatments.length === 0) return;
    setLoading(true);
    setError(null);
    setExplanations([]);
    setGenerated(false);

    try {
      if (!hasMultiple || multiMode === "combined") {
        const combinedTreatment = activeTreatments.length === 1
          ? activeTreatments[0]
          : activeTreatments.map((t, i) => `${i + 1}. ${t}`).join("\n");
        const text = await fetchExplanation(combinedTreatment);
        setExplanations([{ treatment: activeTreatments.join(", "), text }]);
      } else {
        const results = [];
        for (const t of activeTreatments) {
          const text = await fetchExplanation(t);
          results.push({ treatment: t, text });
        }
        setExplanations(results);
      }
      setGenerated(true);
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  const handleCopy = () => {
    const allText = explanations.map(e =>
      explanations.length > 1 ? `${e.treatment}\n\n${e.text}` : e.text
    ).join("\n\n---\n\n");
    navigator.clipboard.writeText(allText);
  };

  const handleEmail = () => {
    const name = patientName || "Patient";
    const practiceLabel = practiceName || "Your Dental Practice";
    const treatmentLabel = activeTreatments.join(", ");
    const subject = encodeURIComponent(`Your Treatment Plan — ${treatmentLabel}`);
    const allText = explanations.map(e =>
      explanations.length > 1 ? `${e.treatment}\n\n${e.text}` : e.text
    ).join("\n\n─────────────────────────────\n\n");
    const body = encodeURIComponent(
      `Dear ${name},\n\n` +
      `Please find your treatment plan explanation below.\n\n` +
      `─────────────────────────────\n\n` +
      allText +
      `\n\n─────────────────────────────\n\n` +
      `If you have any questions, please don't hesitate to get in touch with us.\n\n` +
      `Kind regards,\n${practiceLabel}`
    );
    window.location.href = `mailto:${patientEmail}?subject=${subject}&body=${body}`;
  };

  const handleNew = () => {
    setExplanations([]);
    setGenerated(false);
    setPatientName("");
    setPatientEmail("");
    setTreatments([""]);
    setMultiMode("combined");
    setLanguage("English");
    setTone("warm");
    setAppointmentDate("");
    setAppointmentTime("");
    setCostEstimate("");
    setAdditionalNotes("");
    setReadingLevel("standard");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Practice brand block — used in both header and printout
  const PracticeBrand = ({ forPrint = false }) => {
    if (practiceName || practiceLogo) {
      return (
        <div className={forPrint ? "print-brand" : "brand"}>
          {practiceLogo
            ? <img src={practiceLogo} alt={practiceName} className={forPrint ? "print-logo" : "practice-logo"} />
            : <ClearPlanLogo size={forPrint ? 22 : 28} />
          }
          <div>
            <div className={forPrint ? "print-brand-name" : "brand-name"}>{practiceName || "ClearPlan"}</div>
            {!forPrint && <div className="brand-tagline">Patient treatment explainer</div>}
          </div>
        </div>
      );
    }
    return (
      <div className={forPrint ? "print-brand" : "brand"}>
        <div className={forPrint ? "" : "brand-logo"}>
          <ClearPlanLogo size={forPrint ? 22 : 28} />
        </div>
        <div>
          <div className={forPrint ? "print-brand-name" : "brand-name"}>ClearPlan</div>
          {!forPrint && <div className="brand-tagline">Patient treatment explainer</div>}
        </div>
      </div>
    );
  };

  // ── Auth: checking session ──
  if (authChecking) {
    return (
      <div className="auth-screen">
        <ClearPlanLogo size={40} />
        <p className="auth-checking">Loading…</p>
      </div>
    );
  }

  // ── Auth: login screen ──
  if (authView === "login") {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-logo"><ClearPlanLogo size={44} /></div>
          <h1 className="auth-title">ClearPlan</h1>
          <p className="auth-sub">Enter your email to log in</p>
          {authError && <div className="error-msg" style={{marginBottom: 16}}>⚠ {authError}</div>}
          <input
            className="field-input"
            type="email"
            placeholder="your@practice.com"
            value={authEmail}
            onChange={e => setAuthEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && requestMagicLink()}
            style={{marginBottom: 12}}
          />
          <button className="generate-btn" onClick={requestMagicLink} disabled={!authEmail.trim() || authLoading}>
            {authLoading ? <><span className="spinner" /> Sending…</> : "Send login link"}
          </button>
        </div>
      </div>
    );
  }

  // ── Auth: link sent ──
  if (authView === "sent") {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-logo"><ClearPlanLogo size={44} /></div>
          <h1 className="auth-title">Check your email</h1>
          <p className="auth-sub">We've sent a login link to <strong>{authEmail}</strong>. Click the link in the email to log in.</p>
          <p className="auth-hint">The link expires in 15 minutes. Check your spam folder if you don't see it.</p>
          <button className="auth-back" onClick={() => { setAuthView("login"); setAuthError(null); }}>← Try a different email</button>
        </div>
      </div>
    );
  }

  // ── Admin screen ──
  if (authView === "admin") {
    return (
      <div className="app">
        <header className="header">
          <div className="header-inner">
            <div className="brand">
              <ClearPlanLogo size={28} />
              <div>
                <div className="brand-name">ClearPlan</div>
                <div className="brand-tagline">Admin panel</div>
              </div>
            </div>
            <button className="btn-settings" onClick={() => window.location.href = "/"}>← Back to app</button>
          </div>
        </header>
        <main className="main">
          {!adminAuthed ? (
            <div className="form-card" style={{maxWidth: 400, margin: "0 auto"}}>
              <div className="form-header"><h2 className="form-title">Admin login</h2></div>
              <div className="form-body">
                {adminError && <div className="error-msg">⚠ {adminError}</div>}
                <div className="field">
                  <label className="field-label">Admin password</label>
                  <input className="field-input" type="password" value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && adminLogin()} />
                </div>
                <button className="generate-btn" onClick={adminLogin}>Log in</button>
              </div>
            </div>
          ) : (
            <div style={{display: "flex", flexDirection: "column", gap: 24}}>
              {/* Add practice */}
              <div className="form-card">
                <div className="form-header"><h2 className="form-title">Add a practice</h2></div>
                <div className="form-body">
                  {adminMsg && <div className={adminMsg.startsWith("Error") ? "error-msg" : "success-msg"}>{adminMsg}</div>}
                  <div className="field">
                    <label className="field-label">Practice name</label>
                    <input className="field-input" type="text" placeholder="e.g. Smile Dental Practice"
                      value={newName} onChange={e => setNewName(e.target.value)} />
                  </div>
                  <div className="field">
                    <label className="field-label">Email address <span className="required">*</span></label>
                    <input className="field-input" type="email" placeholder="e.g. info@smiledental.co.uk"
                      value={newEmail} onChange={e => setNewEmail(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && adminAddPractice()} />
                  </div>
                  <button className="generate-btn" onClick={adminAddPractice} disabled={!newEmail.trim()}>Add practice</button>
                </div>
              </div>

              {/* Practice list */}
              <div className="form-card">
                <div className="form-header"><h2 className="form-title">All practices ({practices.length})</h2></div>
                <div className="form-body">
                  {practices.length === 0 && <p style={{color: "var(--text-3)"}}>No practices yet.</p>}
                  {practices.map(p => (
                    <div key={p.id} className="practice-row">
                      <div className="practice-info">
                        <div className="practice-name">{p.name || "—"}</div>
                        <div className="practice-email">{p.email}</div>
                        <div className="practice-date">Added {new Date(p.created_at).toLocaleDateString("en-GB")}</div>
                      </div>
                      <div className="practice-actions">
                        <span className={`practice-status ${p.is_active ? "active" : "inactive"}`}>
                          {p.is_active ? "Active" : "Disabled"}
                        </span>
                        <button className="admin-btn" onClick={() => adminToggle(p.id)}>
                          {p.is_active ? "Disable" : "Enable"}
                        </button>
                        <button className="admin-btn admin-btn-danger" onClick={() => adminRemove(p.id)}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Settings modal */}
      {showSettings && (
        <div className="settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-modal" onClick={e => e.stopPropagation()}>
            <div className="settings-header">
              <h2 className="settings-title">Practice settings</h2>
              <button className="settings-close" onClick={() => setShowSettings(false)}>×</button>
            </div>
            <div className="settings-body">
              <div className="field">
                <label className="field-label">Practice name</label>
                <input
                  className="field-input"
                  type="text"
                  placeholder="e.g. Smile Dental Practice"
                  value={settingsDraft.name}
                  onChange={e => setSettingsDraft(d => ({ ...d, name: e.target.value }))}
                />
              </div>
              <div className="field">
                <label className="field-label">Practice logo <span className="optional">(optional)</span></label>
                {settingsDraft.logo ? (
                  <div className="logo-preview-row">
                    <img src={settingsDraft.logo} alt="Logo preview" className="logo-preview" />
                    <button className="logo-remove-btn" onClick={removeLogo}>Remove logo</button>
                  </div>
                ) : (
                  <div className="logo-upload-area" onClick={() => logoInputRef.current?.click()}>
                    <span className="logo-upload-icon">↑</span>
                    <span className="logo-upload-text">Click to upload logo</span>
                    <span className="logo-upload-hint">PNG or JPG, ideally with a transparent background</span>
                  </div>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleLogoUpload}
                />
              </div>
            </div>
            <div className="settings-footer">
              <button className="settings-logout" onClick={handleLogout}>Log out</button>
              <div style={{display:"flex", gap:10}}>
                <button className="settings-cancel" onClick={() => setShowSettings(false)}>Cancel</button>
                <button className="settings-save" onClick={saveSettings}>Save settings</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="header no-print">
        <div className="header-inner">
          <PracticeBrand />
          <div className="header-actions">
            <button className="btn-settings" onClick={openSettings} title="Practice settings">
              ⚙ Settings
            </button>
            {generated && (
              <button className="btn-new" onClick={handleNew}>
                + New explanation
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="main">
        {/* Form */}
        {!generated && (
          <div className="form-section no-print">
            <div className="form-card">
              <div className="form-header">
                <h1 className="form-title">Generate a patient explanation</h1>
                <p className="form-sub">Fill in the treatment details and we'll create a clear, friendly explanation your patient can read and take home.</p>
              </div>

              <div className="form-body">
                <div className="field">
                  <label className="field-label">Patient name <span className="optional">(optional)</span></label>
                  <input
                    className="field-input"
                    type="text"
                    placeholder="e.g. Sarah Johnson"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label className="field-label">Patient email <span className="optional">(optional)</span></label>
                  <input
                    className="field-input"
                    type="email"
                    placeholder="e.g. sarah.johnson@email.com"
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label className="field-label">
                    Treatment{treatments.length > 1 ? "s" : ""} <span className="required">*</span>
                  </label>
                  {treatments.map((t, index) => (
                    <div key={index} className="treatment-row">
                      <input
                        className="field-input treatment-input"
                        type="text"
                        placeholder={index === 0 ? "e.g. Upper left molar root canal" : "e.g. Scale and polish"}
                        value={t}
                        onChange={(e) => updateTreatment(index, e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && generate()}
                      />
                      {treatments.length > 1 && (
                        <button className="remove-treatment-btn" onClick={() => removeTreatment(index)} title="Remove">×</button>
                      )}
                    </div>
                  ))}
                  <div className="quick-picks">
                    {QUICK_TREATMENTS.map((qt) => (
                      <button
                        key={qt}
                        className={`quick-pick ${treatments[treatments.length - 1] === qt ? "active" : ""}`}
                        onClick={() => {
                          const last = treatments[treatments.length - 1];
                          if (last.trim() === "") {
                            updateTreatment(treatments.length - 1, qt);
                          } else {
                            setTreatments(prev => [...prev, qt]);
                          }
                        }}
                      >{qt}</button>
                    ))}
                  </div>
                  <button className="add-treatment-btn" onClick={addTreatment}>+ Add another treatment</button>
                </div>

                {hasMultiple && (
                  <div className="field">
                    <label className="field-label">Explanation style</label>
                    <div className="multi-toggle">
                      <button
                        className={`multi-toggle-btn ${multiMode === "combined" ? "active" : ""}`}
                        onClick={() => setMultiMode("combined")}
                      >
                        <span className="toggle-title">Combined</span>
                        <span className="toggle-desc">One explanation covering all treatments together</span>
                      </button>
                      <button
                        className={`multi-toggle-btn ${multiMode === "separate" ? "active" : ""}`}
                        onClick={() => setMultiMode("separate")}
                      >
                        <span className="toggle-title">Separate</span>
                        <span className="toggle-desc">Individual explanation for each treatment</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="field">
                  <label className="field-label">Language</label>
                  <div className="language-grid">
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.value}
                        className={`language-btn ${language === l.value ? "active" : ""}`}
                        onClick={() => setLanguage(l.value)}
                      >
                        <span className="language-flag">{l.flag}</span>
                        <span className="language-name">{l.value}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="field">
                  <label className="field-label">Reading level</label>
                  <div className="level-grid">
                    {READING_LEVELS.map((l) => (
                      <button
                        key={l.value}
                        className={`level-card ${readingLevel === l.value ? "active" : ""}`}
                        onClick={() => setReadingLevel(l.value)}
                      >
                        <span className="level-name">{l.label}</span>
                        <span className="level-desc">{l.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tone */}
                <div className="field">
                  <label className="field-label">Tone</label>
                  <div className="tone-grid">
                    {TONES.map((t) => (
                      <button
                        key={t.value}
                        className={`tone-card ${tone === t.value ? "active" : ""}`}
                        onClick={() => setTone(t.value)}
                      >
                        <span className="tone-emoji">{t.emoji}</span>
                        <span className="tone-label">{t.label}</span>
                        <span className="tone-desc">{t.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="field">
                  <label className="field-label">Additional notes <span className="optional">(optional)</span></label>
                  <textarea
                    className="field-input field-textarea"
                    placeholder="e.g. Patient is nervous about injections. Also mention they'll need a follow-up in 2 weeks."
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Appointment + cost */}
                <div className="field">
                  <label className="field-label">Next appointment <span className="optional">(optional)</span></label>
                  <div className="appt-row">
                    <input
                      className="field-input"
                      type="date"
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                    />
                    <input
                      className="field-input"
                      type="time"
                      value={appointmentTime}
                      onChange={(e) => setAppointmentTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="field-label">Cost estimate <span className="optional">(optional)</span></label>
                  <div className="input-prefix-wrap">
                    <span className="input-prefix">£</span>
                    <input
                      className="field-input input-with-prefix"
                      type="text"
                      placeholder="e.g. 350 – 420"
                      value={costEstimate}
                      onChange={(e) => setCostEstimate(e.target.value)}
                    />
                  </div>
                </div>

                {error && <div className="error-msg">⚠ {error}</div>}

                <button
                  className="generate-btn"
                  onClick={generate}
                  disabled={activeTreatments.length === 0 || loading}
                >
                  {loading ? (
                    <><span className="spinner" /> Generating explanation…</>
                  ) : (
                    "Generate patient explanation"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Output */}
        {generated && explanations.length > 0 && (
          <div className="output-section" ref={outputRef}>
            <div className="action-bar no-print">
              <div className="action-meta">
                {patientName && <span className="meta-patient">For: <strong>{patientName}</strong></span>}
                <span className="meta-treatment">{activeTreatments.join(", ")}</span>
                <span className={`meta-level level-${readingLevel}`}>{readingLevel}</span>
                {language !== "English" && (
                  <span className="meta-level level-standard">{LANGUAGES.find(l => l.value === language)?.flag} {language}</span>
                )}
              </div>
              <div className="action-btns">
                <button className="action-btn" onClick={handleCopy}>Copy text</button>
                {patientEmail && (
                  <button className="action-btn" onClick={handleEmail}>✉ Email to patient</button>
                )}
                <button className="action-btn action-btn-primary" onClick={handlePrint}>Print / Save PDF</button>
              </div>
            </div>

            {explanations.map((exp, index) => (
              <div key={index} className="explanation-card print-area">
                <div className="explanation-header">
                  <PracticeBrand forPrint={true} />
                  {patientName && (
                    <div className="explanation-patient">Your treatment plan, {patientName}</div>
                  )}
                  <div className="explanation-treatment">{exp.treatment}</div>
                </div>
                <div className="explanation-body">
                  <ReactMarkdown
                    components={{
                      h2: ({ children }) => <h2 className="ex-heading">{children}</h2>,
                      p:  ({ children }) => <p className="ex-para">{children}</p>,
                      ul: ({ children }) => <ul className="ex-list">{children}</ul>,
                      li: ({ children }) => <li className="ex-item">{children}</li>,
                      strong: ({ children }) => <strong className="ex-strong">{children}</strong>,
                    }}
                  >
                    {exp.text}
                  </ReactMarkdown>
                </div>
                <div className="explanation-footer">
                  {(appointmentDate || costEstimate) && (
                    <div className="appt-summary">
                      {appointmentDate && (
                        <div className="appt-item">
                          <span className="appt-icon">📅</span>
                          <div>
                            <div className="appt-label">Next appointment</div>
                            <div className="appt-value">
                              {new Date(appointmentDate).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                              {appointmentTime && ` at ${appointmentTime}`}
                            </div>
                          </div>
                        </div>
                      )}
                      {costEstimate && (
                        <div className="appt-item">
                          <span className="appt-icon">💷</span>
                          <div>
                            <div className="appt-label">Estimated cost</div>
                            <div className="appt-value">£{costEstimate}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <p>{practiceName ? `This explanation was prepared for you by ${practiceName}.` : "This explanation was prepared for you by your dental practice."} Please ask us if you have any questions — we're happy to help.</p>
                </div>
              </div>
            ))}

            <div className="regenerate-row no-print">
              <button className="regenerate-btn" onClick={generate} disabled={loading}>
                {loading ? "Regenerating…" : "Regenerate"}
              </button>
              <button className="new-btn" onClick={handleNew}>Start new explanation</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
