import React, { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

const READING_LEVELS = [
  { value: "simple",   label: "Simple",   desc: "Easy language, great for anxious patients" },
  { value: "standard", label: "Standard", desc: "Clear and friendly for most patients" },
  { value: "detailed", label: "Detailed", desc: "More in-depth for patients who want full info" },
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

export default function App() {
  const [patientName, setPatientName]       = useState("");
  const [patientEmail, setPatientEmail]     = useState("");
  const [treatments, setTreatments]         = useState([""]);
  const [multiMode, setMultiMode]           = useState("combined"); // "combined" | "separate"
  const [readingLevel, setReadingLevel]     = useState("standard");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [explanations, setExplanations]     = useState([]); // [{treatment, text}]
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState(null);
  const [generated, setGenerated]           = useState(false);
  const outputRef = useRef(null);

  const activeTreatments = treatments.filter(t => t.trim());
  const hasMultiple = treatments.length > 1;

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
      body: JSON.stringify({ treatment: treatmentText, patientName, readingLevel, additionalNotes }),
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
        // Single or combined: join treatments into one prompt
        const combinedTreatment = activeTreatments.length === 1
          ? activeTreatments[0]
          : activeTreatments.map((t, i) => `${i + 1}. ${t}`).join("\n");
        const text = await fetchExplanation(combinedTreatment);
        setExplanations([{ treatment: activeTreatments.join(", "), text }]);
      } else {
        // Separate: generate one explanation per treatment
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
      `Kind regards,\nYour Dental Practice`
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
    setAdditionalNotes("");
    setReadingLevel("standard");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header no-print">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-logo">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect width="28" height="28" rx="8" fill="#0891b2"/>
                <path d="M8 14c0-3.314 2.686-6 6-6s6 2.686 6 6-2.686 6-6 6" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                <circle cx="14" cy="14" r="2" fill="white"/>
              </svg>
            </div>
            <div>
              <div className="brand-name">ClearPlan</div>
              <div className="brand-tagline">Patient treatment explainer</div>
            </div>
          </div>
          {generated && (
            <button className="btn-new no-print" onClick={handleNew}>
              + New explanation
            </button>
          )}
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
                {/* Patient name */}
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

                {/* Patient email */}
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

                {/* Treatments */}
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
                        <button
                          className="remove-treatment-btn"
                          onClick={() => removeTreatment(index)}
                          title="Remove"
                        >×</button>
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
                      >
                        {qt}
                      </button>
                    ))}
                  </div>

                  <button className="add-treatment-btn" onClick={addTreatment}>
                    + Add another treatment
                  </button>
                </div>

                {/* Combined / Separate toggle — only shown with multiple treatments */}
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

                {/* Reading level */}
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

                {/* Additional notes */}
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
            {/* Action bar */}
            <div className="action-bar no-print">
              <div className="action-meta">
                {patientName && <span className="meta-patient">For: <strong>{patientName}</strong></span>}
                <span className="meta-treatment">{activeTreatments.join(", ")}</span>
                <span className={`meta-level level-${readingLevel}`}>{readingLevel}</span>
              </div>
              <div className="action-btns">
                <button className="action-btn" onClick={handleCopy}>Copy text</button>
                {patientEmail && (
                  <button className="action-btn" onClick={handleEmail}>✉ Email to patient</button>
                )}
                <button className="action-btn action-btn-primary" onClick={handlePrint}>Print / Save PDF</button>
              </div>
            </div>

            {/* Printable cards — one per explanation */}
            {explanations.map((exp, index) => (
              <div key={index} className="explanation-card print-area">
                <div className="explanation-header">
                  <div className="print-brand">
                    <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
                      <rect width="28" height="28" rx="8" fill="#0891b2"/>
                      <path d="M8 14c0-3.314 2.686-6 6-6s6 2.686 6 6-2.686 6-6 6" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                      <circle cx="14" cy="14" r="2" fill="white"/>
                    </svg>
                    <span className="print-brand-name">ClearPlan</span>
                  </div>
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
                  <p>This explanation was prepared for you by your dental practice. Please ask us if you have any questions — we're happy to help.</p>
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
