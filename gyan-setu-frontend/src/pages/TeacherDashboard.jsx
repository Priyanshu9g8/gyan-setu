import React, { useEffect, useState, useCallback } from "react"
import api from "../api/axios"
import { askAI, generateLesson, createExam, getMyExams, deactivateExam, reactivateExam, getExamSubmissions } from "../api/axios"
import { useAuth } from "../hooks/useAuth.js"
import { useTranslation } from "react-i18next"
import i18n from "../i18n.js"

/* ─────────────────────────────────────────────
}

/* ─────────────────────────────────────────────
   TOAST Component
───────────────────────────────────────────── */
function Toast({ toasts }) {
    return (
        <div style={{
            position: "fixed", top: 20, right: 20, zIndex: 9999,
            display: "flex", flexDirection: "column", gap: 10
        }}>
            {toasts.map(t => (
                <div key={t.id} style={{
                    background: t.type === "success" ? "#16a34a" : t.type === "error" ? "#dc2626" : "#1d4ed8",
                    color: "#fff", padding: "12px 18px", borderRadius: 10,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                    fontSize: 14, fontWeight: 500,
                    animation: "slideIn 0.3s ease",
                    display: "flex", alignItems: "center", gap: 8, minWidth: 260
                }}>
                    <span>{t.type === "success" ? "✅" : t.type === "error" ? "❌" : "ℹ️"}</span>
                    {t.msg}
                </div>
            ))}
        </div>
    )
}

/* ─────────────────────────────────────────────
   CONFIRM DIALOG
───────────────────────────────────────────── */
function ConfirmDialog({ student, onConfirm, onCancel }) {
    if (!student) return null
    return (
        <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
            zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center"
        }}>
            <div style={{
                background: "#fff", borderRadius: 16, padding: 32,
                width: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
            }}>
                <div style={{ fontSize: 40, marginBottom: 12, textAlign: "center" }}>⚠️</div>
                <h3 style={{ textAlign: "center", marginBottom: 8, fontSize: 18, fontWeight: 700 }}>{t("deleteStudentQ")}</h3>
                <p style={{ textAlign: "center", color: "#6b7280", fontSize: 14, marginBottom: 24 }}>
                    {t("sureRemove")} <strong>{student.fullName}</strong> ({student.username})?
                    {t("cannotUndo")}
                </p>
                <div style={{ display: "flex", gap: 12 }}>
                    <button onClick={onCancel} style={{
                        flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid #e5e7eb",
                        background: "#f9fafb", cursor: "pointer", fontWeight: 600
                    }}>{t("cancel")}</button>
                    <button onClick={onConfirm} style={{
                        flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
                        background: "#dc2626", color: "#fff", cursor: "pointer", fontWeight: 600
                    }}>{t("yesDelete")}</button>
                </div>
            </div>
        </div>
    )
}

/* ─────────────────────────────────────────────
   VIEW STUDENT MODAL
───────────────────────────────────────────── */
function StudentDetailModal({ student, onClose }) {
    const { t } = useTranslation()
    const [details, setDetails] = useState(null)
    const [loading, setLoading] = useState(false)
    const [showPwd, setShowPwd] = useState(false)

    useEffect(() => {
        if (!student) return
        setDetails(null)
        setShowPwd(false)
        setLoading(true)
        api.get(`/teacher/students/${student.id}/details`)
            .then(r => setDetails(r.data))
            .catch(() => setDetails(null))
            .finally(() => setLoading(false))
    }, [student])

    if (!student) return null

    const data = details || student   // fallback while loading

    const pct = (score, total) => total > 0 ? Math.round((score / total) * 100) : 0
    const pctColor = (p) => p >= 75 ? "#16a34a" : p >= 50 ? "#d97706" : "#dc2626"

    return (
        <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16
        }}>
            <div style={{
                background: "#fff", borderRadius: 20,
                width: "100%", maxWidth: 560,
                maxHeight: "90vh", overflowY: "auto",
                boxShadow: "0 24px 64px rgba(0,0,0,0.3)"
            }}>
                {/* Header */}
                <div style={{
                    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    padding: "28px 28px 24px", borderRadius: "20px 20px 0 0",
                    color: "#fff", position: "relative"
                }}>
                    <button onClick={onClose} style={{
                        position: "absolute", top: 16, right: 16,
                        background: "rgba(255,255,255,0.2)", border: "none", color: "#fff",
                        width: 32, height: 32, borderRadius: "50%", cursor: "pointer", fontSize: 18
                    }}>×</button>
                    <div style={{
                        width: 64, height: 64, borderRadius: "50%",
                        background: "rgba(255,255,255,0.25)", border: "2px solid rgba(255,255,255,0.5)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 26, fontWeight: 700, marginBottom: 12
                    }}>
                        {data.fullName?.charAt(0).toUpperCase()}
                    </div>
                    <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{data.fullName}</h3>
                    <p style={{ margin: "4px 0 0", opacity: 0.85, fontSize: 14 }}>
                        {data.classLevel ? data.classLevel.replace("CLASS_", "Class ") : ""}
                    </p>
                </div>

                <div style={{ padding: 24 }}>

                    {/* ── Credentials Section ── */}
                    <div style={{
                        background: "#fef3c7", border: "1px solid #fde68a",
                        borderRadius: 12, padding: 16, marginBottom: 20
                    }}>
                        <p style={{ margin: "0 0 12px", fontWeight: 700, fontSize: 13, color: "#92400e" }}>
                            🔑 {t("studentCredentials")}
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {/* Username */}
                            <div style={{
                                display: "flex", justifyContent: "space-between", alignItems: "center",
                                background: "#fff", borderRadius: 8, padding: "8px 12px"
                            }}>
                                <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>👤 {t("usernameLabel")}</span>
                                <code style={{ fontSize: 14, fontWeight: 700, color: "#1e40af" }}>
                                    {data.username}
                                </code>
                            </div>
                            {/* Password */}
                            <div style={{
                                display: "flex", justifyContent: "space-between", alignItems: "center",
                                background: "#fff", borderRadius: 8, padding: "8px 12px"
                            }}>
                                <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>🔒 {t("passwordField")}</span>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <code style={{ fontSize: 14, fontWeight: 700, color: "#7c3aed" }}>
                                        {showPwd ? (data.rawPassword || "—") : "••••••••"}
                                    </code>
                                    <button
                                        onClick={() => setShowPwd(v => !v)}
                                        style={{
                                            background: "none", border: "1px solid #e5e7eb",
                                            borderRadius: 6, padding: "2px 8px", cursor: "pointer",
                                            fontSize: 11, color: "#6b7280"
                                        }}
                                    >{showPwd ? t("hidePassword") : t("showPassword")}</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Info Rows ── */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                        {[
                            { label: `📧 ${t("emailField")}`,  value: data.email || "—" },
                            { label: `🏫 ${t("colClass")}`,    value: data.classLevel ? data.classLevel.replace("CLASS_", "Class ") : "—" },
                            { label: `🗓 ${t("joinedField")}`,  value: data.createdAt ? new Date(data.createdAt).toLocaleDateString("en-IN") : "—" },
                        ].map(row => (
                            <div key={row.label} style={{
                                display: "flex", justifyContent: "space-between",
                                background: "#f9fafb", borderRadius: 10, padding: "10px 14px"
                            }}>
                                <span style={{ color: "#6b7280", fontSize: 13 }}>{row.label}</span>
                                <span style={{ fontWeight: 600, fontSize: 13 }}>{row.value}</span>
                            </div>
                        ))}
                    </div>

                    {/* ── Marks Section ── */}
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>📊 {t("marksPerTopic")}</p>
                            {details && (
                                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                                    <span style={{ fontSize: 12, color: "#6b7280" }}>
                                        {details.totalAttempts} {details.totalAttempts !== 1 ? t("attempts") : t("attempt")}
                                    </span>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: "#6366f1" }}>
                                        {t("avg")}: {Math.round(details.averageScore)}%
                                    </span>
                                    {details.classRank && (
                                        <span style={{
                                            background: "linear-gradient(135deg, #fbbf24, #d97706)",
                                            color: "#fff", padding: "3px 10px", borderRadius: 20,
                                            fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", gap: 4,
                                            boxShadow: "0 2px 8px rgba(217, 119, 6, 0.4)"
                                        }}>
                                            🏆 {t("rankNum")}{details.classRank} <span style={{opacity:0.85, fontWeight:600}}>{t("ofTotal")} {details.totalClassmatesWithScores}</span>
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {loading ? (
                            <div style={{ textAlign: "center", padding: "24px 0", color: "#9ca3af" }}>
                                ⏳ {t("loadingMarks")}
                            </div>
                        ) : details?.marks?.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {details.marks.map((m, i) => {
                                    const p = m.percentage ?? pct(m.score, m.totalQuestions)
                                    const color = pctColor(p)
                                    return (
                                        <div key={i} style={{
                                            background: "#f9fafb", borderRadius: 12,
                                            padding: "12px 14px", border: "1px solid #f3f4f6"
                                        }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                                <div>
                                                    <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>{m.subject}</p>
                                                    <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>{m.assignmentTitle}</p>
                                                </div>
                                                <div style={{ textAlign: "right" }}>
                                                    <span style={{
                                                        fontWeight: 800, fontSize: 16, color
                                                    }}>{p}%</span>
                                                    <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>
                                                        {m.score}/{m.totalQuestions} {t("correct")}
                                                    </p>
                                                </div>
                                            </div>
                                            {/* Progress bar */}
                                            <div style={{ background: "#e5e7eb", borderRadius: 999, height: 6 }}>
                                                <div style={{
                                                    width: `${p}%`, height: "100%", borderRadius: 999,
                                                    background: color, transition: "width 0.4s ease"
                                                }} />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div style={{
                                textAlign: "center", padding: "24px 0",
                                background: "#f9fafb", borderRadius: 12, color: "#9ca3af"
                            }}>
                                <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
                                <p style={{ margin: 0, fontSize: 13 }}>{t("noAttempts")}</p>
                            </div>
                        )}
                    </div>

                    <button onClick={onClose} style={{
                        marginTop: 24, width: "100%", padding: "12px 0", borderRadius: 12,
                        background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff",
                        border: "none", cursor: "pointer", fontWeight: 700, fontSize: 15
                    }}>{t("closeBtn")}</button>
                </div>
            </div>
        </div>
    )
}

/* ─────────────────────────────────────────────
   USERNAME PREVIEW HELPER (mirrors backend logic)
───────────────────────────────────────────── */
function previewUsername(fullName, classLevel) {
    const first = (fullName || "").split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, "") || "student"
    const cls = (classLevel || "")
        .toLowerCase().replace("class_", "").replace("class", "").replace(/[^a-z0-9]/g, "") || "student"
    return `${first}_${cls}`
}

const CLASS_OPTIONS = [
    { value: "CLASS_1", label: "Class 1" },
    { value: "CLASS_2", label: "Class 2" },
    { value: "CLASS_3", label: "Class 3" },
    { value: "CLASS_4", label: "Class 4" },
    { value: "CLASS_5", label: "Class 5" },
    { value: "CLASS_6", label: "Class 6" },
    { value: "CLASS_7", label: "Class 7" },
    { value: "CLASS_8", label: "Class 8" },
]

/* ─────────────────────────────────────────────
   ADD STUDENT SIDE PANEL
───────────────────────────────────────────── */
function AddStudentPanel({ open, onClose, onAdded, showToast }) {
    const { t } = useTranslation()
    const empty = { password: "", fullName: "", email: "", classLevel: "" }
    const [form, setForm] = useState(empty)
    const [busy, setBusy] = useState(false)

    const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

    // Live preview of what the backend will generate
    const usernamePreview = form.fullName
        ? previewUsername(form.fullName, form.classLevel)
        : null

    const submit = async (e) => {
        e.preventDefault()
        if (!form.password || !form.fullName || !form.classLevel) {
            showToast(t("fillAllReq"), "error")
            return
        }
        setBusy(true)
        try {
            const payload = {
                // No username field → backend auto-generates it
                password: form.password,
                name: form.fullName,
                classLevel: form.classLevel,
                email: form.email.trim() || null   // truly optional
            }
            const { data } = await api.post("/teacher/add-student", payload)
            showToast(`${t("colName")} "${data.fullName}" → @${data.username} 🎉`, "success")
            setForm(empty)
            onAdded()
            onClose()
        } catch (err) {
            showToast(err?.response?.data?.message || t("failedAddStudent"), "error")
        } finally {
            setBusy(false)
        }
    }

    const inp = {
        width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb",
        borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box",
        background: "#f9fafb"
    }
    const lbl = { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 4 }

    return (
        <>
            {/* Overlay */}
            {open && (
                <div onClick={onClose} style={{
                    position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 998
                }} />
            )}

            {/* Panel */}
            <div style={{
                position: "fixed", top: 0, right: 0, height: "100vh", width: 400,
                background: "#fff", boxShadow: "-8px 0 40px rgba(0,0,0,0.15)",
                zIndex: 999, display: "flex", flexDirection: "column",
                transform: open ? "translateX(0)" : "translateX(100%)",
                transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)"
            }}>
                {/* Header */}
                <div style={{
                    padding: "24px 24px 20px",
                    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    color: "#fff"
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{t("addNewStudent")}</h2>
                            <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.85 }}>
                                {t("autoUsernameHint")}
                            </p>
                        </div>
                        <button onClick={onClose} style={{
                            background: "rgba(255,255,255,0.2)", border: "none", color: "#fff",
                            width: 34, height: 34, borderRadius: "50%", cursor: "pointer", fontSize: 18
                        }}>×</button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={submit} style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>

                    {/* Full Name */}
                    <div>
                        <label style={lbl}>{t("fullName")} <span style={{ color: "#ef4444" }}>*</span></label>
                        <input name="fullName" required value={form.fullName} onChange={handle}
                            placeholder={t("fullNamePlaceholder")} style={inp} />
                    </div>

                    {/* Class Level */}
                    <div>
                        <label style={lbl}>{t("classLabel")} <span style={{ color: "#ef4444" }}>*</span></label>
                        <select name="classLevel" required value={form.classLevel} onChange={handle} style={inp}>
                            <option value="">{t("selectClass")}</option>
                            {CLASS_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Auto-generated username preview */}
                    {usernamePreview && (
                        <div style={{
                            background: "#eff6ff", border: "1px solid #bfdbfe",
                            borderRadius: 10, padding: "10px 14px",
                            display: "flex", alignItems: "center", gap: 10
                        }}>
                            <span style={{ fontSize: 18 }}>🏷️</span>
                            <div>
                                <p style={{ margin: 0, fontSize: 12, color: "#3b82f6", fontWeight: 600 }}>
                                    {t("autoGeneratedUsername")}
                                </p>
                                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1e40af" }}>
                                    @{usernamePreview}
                                    {form.classLevel && form.fullName &&
                                        <span style={{ fontSize: 11, fontWeight: 400, color: "#6b7280", marginLeft: 6 }}>
                                            ({t("suffixNote")} e.g. @{usernamePreview}_2)
                                        </span>
                                    }
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Email — optional */}
                    <div>
                        <label style={lbl}>
                            {t("emailOptional")}{" "}
                            <span style={{ color: "#9ca3af", fontWeight: 400, fontSize: 12 }}>{t("emailOptionalHint")}</span>
                        </label>
                        <input type="email" name="email" value={form.email} onChange={handle}
                            placeholder={t("emailPlaceholder")} style={inp} />
                    </div>

                    {/* Password */}
                    <div>
                        <label style={lbl}>{t("passwordLabel")} <span style={{ color: "#ef4444" }}>*</span></label>
                        <input type="password" name="password" required minLength={6} value={form.password} onChange={handle}
                            placeholder={t("passwordPlaceholder")} style={inp} />
                    </div>

                    <div style={{
                        background: "#fef9c3", border: "1px solid #fde047", borderRadius: 10,
                        padding: "10px 14px", fontSize: 13, color: "#92400e"
                    }}>
                        🎓 {t("roleNote")}
                    </div>

                    <button type="submit" disabled={busy} style={{
                        padding: "13px 0", borderRadius: 12, border: "none",
                        background: busy ? "#cbd5e1" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                        color: "#fff", fontWeight: 700, fontSize: 15, cursor: busy ? "not-allowed" : "pointer",
                        transition: "opacity 0.2s"
                    }}>
                        {busy ? t("creating") : `➕ ${t("addStudentBtn")}`}
                    </button>
                </form>
            </div>
        </>
    )
}

/* ─────────────────────────────────────────────
   MAIN TEACHER DASHBOARD
───────────────────────────────────────────── */
export default function TeacherDashboard() {

    const { user } = useAuth()
    const { t } = useTranslation()
    const [students, setStudents] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [panelOpen, setPanelOpen] = useState(false)
    const [viewStudent, setViewStudent] = useState(null)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [toasts, setToasts] = useState([])

    // AI section
    const [question, setQuestion] = useState("")
    const [answer, setAnswer] = useState("")
    const [aiLoading, setAiLoading] = useState(false)
    const [topic, setTopic] = useState("")
    const [lesson, setLesson] = useState("")
    const [lessonLoading, setLessonLoading] = useState(false)

    // AI Exam Creator
    const EXAM_DEFAULTS = { topic: "", classLevel: "", questionCount: 10, timeLimitMinutes: 20 }
    const [examForm, setExamForm] = useState(EXAM_DEFAULTS)
    const [examCreating, setExamCreating] = useState(false)
    const [createdExam, setCreatedExam] = useState(null)
    const [myExams, setMyExams] = useState([])
    const [examsLoading, setExamsLoading] = useState(false)
    const [examResultsModal, setExamResultsModal] = useState(null)  // null or { topic, classLevel, total, results, resultsLoading }

    /* ── Toast helper ── */
    const showToast = useCallback((msg, type = "success") => {
        const id = Date.now()
        setToasts(t => [...t, { id, msg, type }])
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
    }, [])

    /* ── Fetch students ── */
    const fetchStudents = useCallback(async () => {
        setLoading(true)
        try {
            const { data } = await api.get("/teacher/students")
            setStudents(data)
        } catch {
            showToast(t("failedLoad"), "error")
        } finally {
            setLoading(false)
        }
    }, [showToast])

    useEffect(() => { fetchStudents() }, [fetchStudents])

    /* ── Delete student ── */
    const confirmDelete = async () => {
        if (!deleteTarget) return
        try {
            await api.delete(`/teacher/students/${deleteTarget.id}`)
            showToast(`${deleteTarget.fullName} ${t("removedSuccess")}`, "success")
            setDeleteTarget(null)
            fetchStudents()
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || t("failedDelete")
            showToast(msg, "error")
            setDeleteTarget(null)
        }
    }

    /* ── AI Ask ── */
    const askTeacher = async () => {
        if (!question) return
        setAiLoading(true)
        try { setAnswer(await askAI(question)) }
        catch { showToast("AI request failed", "error") }
        finally { setAiLoading(false) }
    }

    /* ── AI Lesson ── */
    const handleLesson = async () => {
        if (!topic) return
        setLessonLoading(true)
        try { setLesson(await generateLesson(topic)) }
        catch { showToast("Lesson generation failed", "error") }
        finally { setLessonLoading(false) }
    }

    /* ── AI Exam Creator ── */
    const fetchMyExams = useCallback(async () => {
        setExamsLoading(true)
        try {
            const exams = await getMyExams()
            setMyExams(Array.isArray(exams) ? exams : [])
        } catch (err) {
            console.error("Failed to load exams:", err?.response?.data || err.message)
            // Don't wipe existing list on refresh failure
        } finally {
            setExamsLoading(false)
        }
    }, [])

    useEffect(() => { fetchMyExams() }, [fetchMyExams])

    const handleCreateExam = async () => {
        if (!examForm.topic.trim()) { showToast("Please enter a topic", "error"); return }
        if (!examForm.classLevel) { showToast("Please select a class", "error"); return }
        if (examForm.questionCount < 1) { showToast("Enter at least 1 question", "error"); return }
        if (examForm.timeLimitMinutes < 1) { showToast("Enter a valid time limit", "error"); return }

        setExamCreating(true)
        setCreatedExam(null)
        try {
            const result = await createExam({
                topic: examForm.topic.trim(),
                classLevel: examForm.classLevel,
                questionCount: examForm.questionCount,
                timeLimitMinutes: examForm.timeLimitMinutes
            })
            setCreatedExam(result)
            setExamForm(EXAM_DEFAULTS)
            showToast(t("examPublished"), "success")
            fetchMyExams()
        } catch (err) {
            const errMsg = err?.response?.data?.message || "Failed to create exam. Please try again."
            showToast(errMsg, "error")
            console.error("[ExamCreator] Error:", errMsg)
        } finally {
            setExamCreating(false)
        }
    }

    const handleDeactivateExam = async (id) => {
        try {
            await deactivateExam(id)
            showToast("Exam closed", "success")
            fetchMyExams()
        } catch { showToast("Failed to close exam", "error") }
    }

    const handleReactivateExam = async (id) => {
        try {
            await reactivateExam(id)
            showToast(`✅ Exam reopened!`, "success")
            fetchMyExams()
        } catch { showToast("Failed to reactivate exam", "error") }
    }

    const handleViewResults = async (exam) => {
        // Open modal immediately with loading state
        setExamResultsModal({
            examId: exam.id,
            topic: exam.topic,
            classLevel: exam.classLevel,
            total: exam.submissions,
            results: [],
            resultsLoading: true
        })
        try {
            const data = await getExamSubmissions(exam.id)
            setExamResultsModal(prev => ({
                ...prev,
                total: data.total,
                results: data.results || [],
                resultsLoading: false
            }))
        } catch (err) {
            showToast("Failed to load results", "error")
            setExamResultsModal(prev => ({ ...prev, resultsLoading: false }))
        }
    }

    /* ── Filtered students ── */
    const filtered = students.filter(s => {
        const q = search.toLowerCase()
        return (
            s.fullName?.toLowerCase().includes(q) ||
            s.username?.toLowerCase().includes(q) ||
            s.email?.toLowerCase().includes(q) ||
            s.classLevel?.toLowerCase().includes(q) ||
            s.classLevel?.replace("CLASS_", "Class ").toLowerCase().includes(q)
        )
    })

    /* ─────────────────────────────── */
    const card = { background: "#fff", borderRadius: 16, boxShadow: "0 2px 16px rgba(0,0,0,0.07)", padding: 24, marginBottom: 28 }
    const sectionTitle = { fontSize: 18, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }

    return (
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px", fontFamily: "Inter, sans-serif" }}>

            <Toast toasts={toasts} />
            <ConfirmDialog student={deleteTarget} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
            <StudentDetailModal student={viewStudent} onClose={() => setViewStudent(null)} />
            <AddStudentPanel
                open={panelOpen}
                onClose={() => setPanelOpen(false)}
                onAdded={fetchStudents}
                showToast={showToast}
            />

            {/* ── Page Header ── */}
            <div style={{
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                borderRadius: 20, padding: "28px 32px", marginBottom: 28, color: "#fff"
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>
                            👩‍🏫 {t("teacherDashboard")}
                        </h1>
                        <p style={{ margin: "6px 0 0", opacity: 0.85, fontSize: 15 }}>
                            {t("welcomeBack")}, {user?.fullName?.split(" ")[0] || "Teacher"}! {t("manageStudentsResources")}
                        </p>
                    </div>

                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                    {[
                        { label: t("totalStudents"), value: students.length, icon: "👨‍🎓" },
                        { label: t("activePlatform"), value: "Gyan Setu", icon: "🏫" },
                    ].map(stat => (
                        <div key={stat.label} style={{
                            background: "rgba(255,255,255,0.18)", borderRadius: 12,
                            padding: "12px 20px", flex: 1
                        }}>
                            <div style={{ fontSize: 22 }}>{stat.icon}</div>
                            <div style={{ fontSize: 22, fontWeight: 800 }}>{stat.value}</div>
                            <div style={{ fontSize: 12, opacity: 0.8 }}>{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Student Management ── */}
            <div style={card}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                    <h2 style={{ ...sectionTitle, margin: 0 }}>
                        <span>👨‍🎓</span> {t("studentManagement")}
                    </h2>
                    <button
                        onClick={() => setPanelOpen(true)}
                        style={{
                            background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff",
                            border: "none", borderRadius: 10, padding: "10px 20px",
                            cursor: "pointer", fontWeight: 700, fontSize: 14,
                            display: "flex", alignItems: "center", gap: 8,
                            boxShadow: "0 4px 12px rgba(99,102,241,0.4)"
                        }}
                    >
                        ➕ {t("addStudent")}
                    </button>
                </div>

                {/* Search */}
                <div style={{ position: "relative", marginBottom: 16 }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>🔍</span>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={t("searchPlaceholder")}
                        style={{
                            width: "100%", padding: "10px 12px 10px 38px", border: "1px solid #e5e7eb",
                            borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#f9fafb"
                        }}
                    />
                </div>

                {/* Student Table */}
                {loading ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af" }}>
                        <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>
                        {t("loadingStudents")}
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{
                        textAlign: "center", padding: "48px 0",
                        background: "#f9fafb", borderRadius: 12
                    }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>👤</div>
                        <p style={{ color: "#6b7280", margin: 0, fontWeight: 600 }}>
                            {search ? t("noStudentsMatch") : t("noStudentsYet")}
                        </p>
                        {!search && (
                            <button onClick={() => setPanelOpen(true)} style={{
                                marginTop: 16, padding: "10px 24px", borderRadius: 10,
                                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                                color: "#fff", border: "none", cursor: "pointer", fontWeight: 700
                            }}>
                                {t("addFirstStudent")}
                            </button>
                        )}
                    </div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                            <thead>
                                <tr style={{ background: "#f3f4f6" }}>
                                    {["#", t("colName"), t("colUsername"), t("colClass"), t("colEmail"), t("colJoined"), t("colActions")].map(h => (
                                        <th key={h} style={{
                                            padding: "10px 14px", textAlign: "left",
                                            fontWeight: 700, color: "#374151",
                                            fontSize: 13, borderBottom: "2px solid #e5e7eb"
                                        }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((s, idx) => (
                                    <tr key={s.id} style={{
                                        borderBottom: "1px solid #f3f4f6",
                                        transition: "background 0.15s"
                                    }}
                                        onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                                        onMouseLeave={e => e.currentTarget.style.background = ""}
                                    >
                                        <td style={{ padding: "12px 14px", color: "#9ca3af", fontWeight: 600 }}>{idx + 1}</td>
                                        <td style={{ padding: "12px 14px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                <div style={{
                                                    width: 36, height: 36, borderRadius: "50%",
                                                    background: `hsl(${(s.fullName?.charCodeAt(0) || 0) * 40},65%,55%)`,
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    color: "#fff", fontWeight: 700, fontSize: 14, flexShrink: 0
                                                }}>
                                                    {s.fullName?.charAt(0).toUpperCase()}
                                                </div>
                                                <span style={{ fontWeight: 600 }}>{s.fullName}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: "12px 14px", color: "#6b7280" }}>@{s.username}</td>
                                        <td style={{ padding: "12px 14px" }}>
                                            {s.classLevel
                                                ? <span style={{
                                                    background: "#ede9fe", color: "#6d28d9",
                                                    padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700
                                                  }}>{s.classLevel.replace("CLASS_", "Class ")}</span>
                                                : <span style={{ color: "#9ca3af" }}>—</span>}
                                        </td>
                                        <td style={{ padding: "12px 14px", color: "#6b7280" }}>{s.email || "—"}</td>
                                        <td style={{ padding: "12px 14px", color: "#6b7280" }}>
                                            {s.createdAt ? new Date(s.createdAt).toLocaleDateString("en-IN") : "—"}
                                        </td>
                                        <td style={{ padding: "12px 14px" }}>
                                            <div style={{ display: "flex", gap: 8 }}>
                                                <button
                                                    onClick={() => setViewStudent(s)}
                                                    title="View Details"
                                                    style={{
                                                        padding: "6px 14px", borderRadius: 8, border: "1px solid #e5e7eb",
                                                        background: "#f9fafb", cursor: "pointer", fontSize: 13, fontWeight: 600
                                                    }}
                                                >👁 {t("viewBtn")}</button>
                                                <button
                                                    onClick={() => setDeleteTarget(s)}
                                                    title="Delete Student"
                                                    style={{
                                                        padding: "6px 14px", borderRadius: 8, border: "none",
                                                        background: "#fee2e2", color: "#dc2626",
                                                        cursor: "pointer", fontSize: 13, fontWeight: 600
                                                    }}
                                                >🗑 {t("deleteBtn")}</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <p style={{ marginTop: 12, color: "#9ca3af", fontSize: 13 }}>
                            {t("showingOf")} {filtered.length} {t("of")} {students.length} {t("students")}
                        </p>
                    </div>
                )}
            </div>

            {/* ── AI Teaching Assistant ── */}
            <div style={{ ...card, background: "linear-gradient(to bottom right,#f0fdf4,#dcfce7)", border: "1px solid #bbf7d0" }}>
                <h2 style={sectionTitle}>🤖 {t("aiAssistant")}</h2>
                <div style={{ display: "flex", gap: 10 }}>
                    <input
                        value={question}
                        onChange={e => setQuestion(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && askTeacher()}
                        placeholder={t("aiPlaceholder")}
                        style={{
                            flex: 1, padding: "10px 14px", border: "1px solid #a7f3d0",
                            borderRadius: 10, fontSize: 14, outline: "none", background: "#fff"
                        }}
                    />
                    <button onClick={askTeacher} disabled={aiLoading} style={{
                        padding: "10px 22px", borderRadius: 10, border: "none",
                        background: "#16a34a", color: "#fff", cursor: aiLoading ? "wait" : "pointer",
                        fontWeight: 700, fontSize: 14
                    }}>
                        {aiLoading ? t("thinking") : t("askBtn")}
                    </button>
                </div>
                {answer && (
                    <div style={{ marginTop: 16, background: "#fff", borderRadius: 10, padding: 16, border: "1px solid #d1fae5" }}>
                        <p style={{ color: "#166534", margin: 0, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{answer}</p>
                    </div>
                )}
            </div>

            {/* ── AI Exam Creator ── */}
            <div style={{
                background: "linear-gradient(135deg,#1e1b4b,#312e81)",
                borderRadius: 20, padding: "28px 32px", marginBottom: 28,
                boxShadow: "0 8px 32px rgba(99,102,241,0.35)"
            }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: 14,
                        background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 24, boxShadow: "0 4px 16px rgba(99,102,241,0.5)"
                    }}>🎯</div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#fff" }}>
                            {t("aiExamCreator")}
                        </h2>
                        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                            {t("aiGeneratesUnique")}
                        </p>
                    </div>
                </div>

                {/* Form grid */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
                    {/* Topic */}
                    <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 6, letterSpacing: 1 }}>
                            {t("topicLabel")}
                        </label>
                        <input
                            id="exam-topic"
                            value={examForm.topic}
                            onChange={e => setExamForm(f => ({ ...f, topic: e.target.value }))}
                            placeholder={t("topicPlaceholder")}
                            style={{
                                width: "100%", padding: "11px 14px",
                                border: "1.5px solid rgba(255,255,255,0.2)",
                                borderRadius: 10, fontSize: 14, outline: "none",
                                background: "rgba(255,255,255,0.1)", color: "#fff",
                                boxSizing: "border-box"
                            }}
                        />
                    </div>

                    {/* Class */}
                    <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 6, letterSpacing: 1 }}>
                            {t("classLabelUpper")}
                        </label>
                        <select
                            id="exam-class"
                            value={examForm.classLevel}
                            onChange={e => setExamForm(f => ({ ...f, classLevel: e.target.value }))}
                            style={{
                                width: "100%", padding: "11px 14px",
                                border: "1.5px solid rgba(255,255,255,0.2)",
                                borderRadius: 10, fontSize: 14, outline: "none",
                                background: "rgba(255,255,255,0.1)", color: examForm.classLevel ? "#fff" : "rgba(255,255,255,0.5)",
                                boxSizing: "border-box"
                            }}
                        >
                            <option value="" style={{ background: "#312e81", color: "#fff" }}>{t("selectClass")}</option>
                            {CLASS_OPTIONS.map(o => (
                                <option key={o.value} value={o.value} style={{ background: "#312e81", color: "#fff" }}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Number of questions */}
                    <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 6, letterSpacing: 1 }}>
                            {t("numQuestionsLabel")}
                        </label>
                        <input
                            id="exam-qcount"
                            type="number"
                            min={1} max={20}
                            value={examForm.questionCount}
                            onChange={e => setExamForm(f => ({ ...f, questionCount: Number(e.target.value) }))}
                            style={{
                                width: "100%", padding: "11px 14px",
                                border: "1.5px solid rgba(255,255,255,0.2)",
                                borderRadius: 10, fontSize: 14, outline: "none",
                                background: "rgba(255,255,255,0.1)", color: "#fff",
                                boxSizing: "border-box"
                            }}
                        />
                    </div>

                    {/* Time limit */}
                    <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 6, letterSpacing: 1 }}>
                            {t("timeMinsLabel")}
                        </label>
                        <input
                            id="exam-time"
                            type="number"
                            min={1} max={180}
                            value={examForm.timeLimitMinutes}
                            onChange={e => setExamForm(f => ({ ...f, timeLimitMinutes: Number(e.target.value) }))}
                            style={{
                                width: "100%", padding: "11px 14px",
                                border: "1.5px solid rgba(255,255,255,0.2)",
                                borderRadius: 10, fontSize: 14, outline: "none",
                                background: "rgba(255,255,255,0.1)", color: "#fff",
                                boxSizing: "border-box"
                            }}
                        />
                    </div>
                </div>

                {/* Info chips */}
                <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
                    {[
                        { icon: "🤖", text: t("aiGeneratesChip") },
                        { icon: "⏱", text: `${examForm.timeLimitMinutes || "?"} ${t("timerChip")}` },
                        { icon: "📚", text: `${examForm.questionCount || "?"} ${t("mcqChip")}` },
                    ].map(chip => (
                        <div key={chip.text} style={{
                            display: "flex", alignItems: "center", gap: 6,
                            background: "rgba(255,255,255,0.1)", borderRadius: 20,
                            padding: "5px 12px", fontSize: 12, color: "rgba(255,255,255,0.8)"
                        }}>
                            <span>{chip.icon}</span>{chip.text}
                        </div>
                    ))}
                </div>

                {/* Generate button */}
                <button
                    onClick={handleCreateExam}
                    disabled={examCreating}
                    style={{
                        width: "100%", padding: "14px 0",
                        background: examCreating
                            ? "rgba(255,255,255,0.1)"
                            : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                        color: "#fff", border: examCreating ? "1px solid rgba(255,255,255,0.2)" : "none",
                        borderRadius: 12, fontWeight: 800, fontSize: 16,
                        cursor: examCreating ? "wait" : "pointer",
                        transition: "all 0.3s",
                        boxShadow: examCreating ? "none" : "0 4px 20px rgba(99,102,241,0.5)",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 10
                    }}
                >
                    {examCreating ? (
                        <>
                            <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⚡</span>
                            {t("generatingMsg")}
                        </>
                    ) : (
                        `⚡ ${t("generatePublishBtn")}`
                    )}
                </button>

                {/* Success card after creation */}
                {createdExam && (
                    <div style={{
                        marginTop: 20, background: "rgba(255,255,255,0.12)",
                        border: "1.5px solid rgba(134,239,172,0.5)",
                        borderRadius: 14, padding: "18px 20px"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                            <span style={{ fontSize: 22 }}>✅</span>
                            <span style={{ color: "#86efac", fontWeight: 700, fontSize: 16 }}>{t("examPublished")}</span>
                        </div>
                        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                            {[
                                { label: t("examId"), value: `#${createdExam.id}` },
                                { label: t("topic"), value: createdExam.topic },
                                { label: t("colClass"), value: createdExam.classLevel?.replace("CLASS_", "Class ") },
                                { label: t("questionsLabel"), value: `${createdExam.questionCount} ${t("questionsPerStudent")}` },
                                { label: t("poolSizeLabel"), value: `${createdExam.poolSize} ${t("poolSizeTotal")}` },
                                { label: t("timeLabel"), value: `${createdExam.timeLimitMinutes} ${t("minutesLabel")}` },
                            ].map(item => (
                                <div key={item.label} style={{
                                    background: "rgba(255,255,255,0.1)", borderRadius: 10,
                                    padding: "8px 14px"
                                }}>
                                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>{item.label}</div>
                                    <div style={{ fontSize: 14, color: "#fff", fontWeight: 600 }}>{item.value}</div>
                                </div>
                            ))}
                        </div>
                        <p style={{ margin: "12px 0 0", fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                            {t("studentsWillSee").replace("{class}", createdExam.classLevel?.replace("CLASS_", "Class ") || "")}
                        </p>
                    </div>
                )}
            </div>

            {/* ── Exam Results Modal ── */}
            {examResultsModal && (
                <div style={{
                    position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
                    zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
                    padding: 20
                }} onClick={() => setExamResultsModal(null)}>
                    <div style={{
                        background: "#fff", borderRadius: 20, width: "100%", maxWidth: 700,
                        maxHeight: "85vh", overflowY: "auto",
                        boxShadow: "0 24px 80px rgba(0,0,0,0.3)",
                        animation: "slideIn 0.3s ease"
                    }} onClick={e => e.stopPropagation()}>
                        {/* Modal header */}
                        <div style={{
                            background: "linear-gradient(135deg,#1e1b4b,#312e81)",
                            borderRadius: "20px 20px 0 0", padding: "24px 28px"
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#fff" }}>
                                        📊 {t("examResults")}
                                    </h2>
                                    <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
                                        {examResultsModal.topic} · {examResultsModal.classLevel?.replace("CLASS_", "Class ")}
                                    </p>
                                </div>
                                <button onClick={() => setExamResultsModal(null)} style={{
                                    background: "rgba(255,255,255,0.15)", border: "none",
                                    color: "#fff", width: 34, height: 34, borderRadius: "50%",
                                    cursor: "pointer", fontSize: 20, lineHeight: 1
                                }}>×</button>
                            </div>
                            {/* Summary chips */}
                            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                                {[
                                    { icon: "👥", label: t("submittedLabel"), val: examResultsModal.total },
                                    { icon: "📝", label: t("questionsLabel"), val: examResultsModal.results?.[0]?.totalQuestions || "—" },
                                    { icon: "🏆", label: t("topScoreLabel"), val: examResultsModal.results?.length > 0 ? `${examResultsModal.results[0].percentage}%` : "—" },
                                ].map(c => (
                                    <div key={c.label} style={{
                                        background: "rgba(255,255,255,0.15)", borderRadius: 10,
                                        padding: "8px 14px", textAlign: "center"
                                    }}>
                                        <div style={{ fontSize: 18 }}>{c.icon}</div>
                                        <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{c.val}</div>
                                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>{c.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Results body */}
                        <div style={{ padding: "20px 28px" }}>
                            {examResultsModal.resultsLoading ? (
                                <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af" }}>⏳ {t("loadingResults")}</div>
                            ) : !examResultsModal.results || examResultsModal.results.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "40px 0" }}>
                                    <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
                                    <p style={{ color: "#6b7280", margin: 0 }}>{t("noSubmissions")}</p>
                                </div>
                            ) : (() => {
                                // Group results by student
                                const grouped = {}
                                examResultsModal.results.forEach(r => {
                                    const key = String(r.studentId || r.studentUsername)
                                    if(!grouped[key]) grouped[key] = []
                                    grouped[key].push(r)
                                })
                                // Sort groups by highest percentage descending
                                const sortedGroups = Object.values(grouped).sort((a,b) => {
                                    const maxA = Math.max(...a.map(x => x.percentage))
                                    const maxB = Math.max(...b.map(x => x.percentage))
                                    return maxB - maxA
                                })
                                // Sort each student's attempts chronologically (oldest first) so Attempt 1, 2, 3...
                                sortedGroups.forEach(g => {
                                    g.sort((a,b) => new Date(a.submittedAt) - new Date(b.submittedAt))
                                })
                                
                                const medals = ["🥇", "🥈", "🥉"]
                                return (
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                                    <thead>
                                        <tr style={{ background: "#f3f4f6" }}>
                                            {[t("rankCol"), t("studentCol"), t("usernameCol"), t("scoreCol"), t("pctCol"), t("gradeCol"), t("submittedCol")].map(h => (
                                                <th key={h} style={{
                                                    padding: "10px 12px", textAlign: "left",
                                                    fontWeight: 700, color: "#374151", fontSize: 12,
                                                    borderBottom: "2px solid #e5e7eb"
                                                }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedGroups.map((group, groupIdx) => {
                                            const highestAttempt = group.reduce((max, r) => r.percentage > max.percentage ? r : max, group[0])
                                            return (
                                                <React.Fragment key={groupIdx}>
                                                    {/* Primary Student Row (Highest Score) */}
                                                    <tr style={{ borderBottom: group.length > 1 ? "none" : "1px solid #f3f4f6", background: "#f9fafb" }}>
                                                        <td style={{ padding: "12px", fontWeight: 700, fontSize: 16 }}>
                                                            {groupIdx < 3 ? medals[groupIdx] : `#${groupIdx + 1}`}
                                                        </td>
                                                        <td style={{ padding: "12px", fontWeight: 600 }}>
                                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                                <div style={{
                                                                    width: 32, height: 32, borderRadius: "50%",
                                                                    background: `hsl(${(highestAttempt.studentName?.charCodeAt(0) || 0) * 40},65%,55%)`,
                                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                                    color: "#fff", fontWeight: 700, fontSize: 12
                                                                }}>{highestAttempt.studentName?.charAt(0)}</div>
                                                                <div>
                                                                    <div>{highestAttempt.studentName}</div>
                                                                    {group.length > 1 && (
                                                                        <div style={{ fontSize: 11, color: "#6b7280" }}>{group.length} {t("attemptsTotal")}</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: "12px", color: "#6b7280" }}>@{highestAttempt.studentUsername}</td>
                                                        <td colSpan={4} style={{ padding: "12px" }}>
                                                            <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>
                                                                {t("bestScore")}: {highestAttempt.score}/{highestAttempt.totalQuestions} ({highestAttempt.percentage}%)
                                                            </span>
                                                        </td>
                                                    </tr>
                                                    {/* All Attempts */}
                                                    {group.map((r, attemptIdx) => {
                                                        const gradeColor = r.grade === "A+" || r.grade === "A" ? "#dcfce7" :
                                                                           r.grade === "B" ? "#fef9c3" :
                                                                           r.grade === "C" ? "#ffedd5" : "#fee2e2"
                                                        const gradeText = r.grade === "A+" || r.grade === "A" ? "#15803d" :
                                                                           r.grade === "B" ? "#854d0e" :
                                                                           r.grade === "C" ? "#9a3412" : "#dc2626"
                                                        const isBest = r.submissionId === highestAttempt.submissionId
                                                        return (
                                                            <tr key={r.submissionId}
                                                                style={{ borderBottom: attemptIdx === group.length - 1 ? "1px solid #e5e7eb" : "1px dashed #f3f4f6" }}
                                                                onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                                                                onMouseLeave={e => e.currentTarget.style.background = ""}>
                                                                <td style={{ padding: "8px 12px" }}></td>
                                                                <td style={{ padding: "8px 12px", color: "#6b7280", fontSize: 13 }}>
                                                                    {t("attemptLabel")} {attemptIdx + 1} {isBest && "✨"}
                                                                </td>
                                                                <td style={{ padding: "8px 12px" }}></td>
                                                                <td style={{ padding: "8px 12px", fontWeight: 700 }}>{r.score}/{r.totalQuestions}</td>
                                                                <td style={{ padding: "8px 12px" }}>
                                                                    <div style={{
                                                                        width: 80, background: "#f3f4f6",
                                                                        borderRadius: 20, overflow: "hidden", height: 8
                                                                    }}>
                                                                        <div style={{
                                                                            width: `${r.percentage}%`,
                                                                            background: r.percentage >= 75 ? "#16a34a" :
                                                                                        r.percentage >= 45 ? "#d97706" : "#dc2626",
                                                                            height: "100%", borderRadius: 20,
                                                                        }} />
                                                                    </div>
                                                                    <span style={{ fontSize: 11, color: "#6b7280" }}>{r.percentage}%</span>
                                                                </td>
                                                                <td style={{ padding: "8px 12px" }}>
                                                                    <span style={{
                                                                        background: gradeColor, color: gradeText,
                                                                        padding: "2px 10px", borderRadius: 20,
                                                                        fontSize: 12, fontWeight: 800
                                                                    }}>{r.grade}</span>
                                                                </td>
                                                                <td style={{ padding: "8px 12px", color: "#9ca3af", fontSize: 12 }}>
                                                                    {r.submittedAt ? new Date(r.submittedAt).toLocaleString("en-IN") : "—"}
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                </React.Fragment>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            )})()}
                        </div>
                    </div>
                </div>
            )}

            {/* ── My Exams Table ── */}
            <div style={{ ...card }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                    <h2 style={{ ...sectionTitle, margin: 0 }}>
                        <span>📋</span> {t("myExams")}
                    </h2>
                    <button onClick={fetchMyExams} style={{
                        background: "#f3f4f6", border: "none", borderRadius: 8,
                        padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600
                    }}>{t("refreshBtn")}</button>
                </div>

                {examsLoading ? (
                    <div style={{ textAlign: "center", padding: "24px 0", color: "#9ca3af" }}>⏳ {t("loadingExams")}</div>
                ) : myExams.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "32px 0", background: "#f9fafb", borderRadius: 12 }}>
                        <div style={{ fontSize: 40, marginBottom: 8 }}>🎯</div>
                        <p style={{ color: "#6b7280", margin: 0 }}>{t("noExamsYet")}</p>
                    </div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                            <thead>
                                <tr style={{ background: "#f3f4f6" }}>
                                    {["#", t("topic"), t("colClass"), t("questionsLabel"), t("timeLabel"), t("submittedLabel"), t("statusCol"), t("colActions")].map(h => (
                                        <th key={h} style={{
                                            padding: "10px 14px", textAlign: "left",
                                            fontWeight: 700, color: "#374151",
                                            fontSize: 12, borderBottom: "2px solid #e5e7eb"
                                        }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {myExams.map((ex, idx) => (
                                    <tr key={ex.id} style={{ borderBottom: "1px solid #f3f4f6" }}
                                        onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                                        onMouseLeave={e => e.currentTarget.style.background = ""}>
                                        <td style={{ padding: "12px 14px", color: "#9ca3af", fontWeight: 600 }}>{idx + 1}</td>
                                        <td style={{ padding: "12px 14px", fontWeight: 600 }}>{ex.topic}</td>
                                        <td style={{ padding: "12px 14px" }}>
                                            <span style={{
                                                background: "#ede9fe", color: "#6d28d9",
                                                padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700
                                            }}>{ex.classLevel?.replace("CLASS_", "Class ")}</span>
                                        </td>
                                        <td style={{ padding: "12px 14px", color: "#6b7280" }}>{ex.questionCount} {t("mcqsLabel")}</td>
                                        <td style={{ padding: "12px 14px", color: "#6b7280" }}>{ex.timeLimitMinutes} {t("minLabel")}</td>
                                        <td style={{ padding: "12px 14px", fontWeight: 700, color: "#6366f1" }}>
                                            {ex.submissions} {t("studentS")}
                                        </td>
                                        <td style={{ padding: "12px 14px" }}>
                                            <span style={{
                                                background: ex.active ? "#dcfce7" : "#fee2e2",
                                                color: ex.active ? "#15803d" : "#dc2626",
                                                padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700
                                            }}>
                                                {ex.active ? t("activeLabel") : t("closedLabel")}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px 14px" }}>
                                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                                <button
                                                    onClick={() => handleViewResults(ex)}
                                                    style={{
                                                        padding: "5px 12px", borderRadius: 8, border: "none",
                                                        background: "#ede9fe", color: "#6d28d9",
                                                        cursor: "pointer", fontSize: 12, fontWeight: 700
                                                    }}
                                                >{t("resultsBtn")}</button>
                                                {ex.active ? (
                                                    <button
                                                        onClick={() => handleDeactivateExam(ex.id)}
                                                        style={{
                                                            padding: "5px 12px", borderRadius: 8, border: "none",
                                                            background: "#fee2e2", color: "#dc2626",
                                                            cursor: "pointer", fontSize: 12, fontWeight: 600
                                                        }}
                                                    >{t("closeExamBtn")}</button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleReactivateExam(ex.id)}
                                                        style={{
                                                            padding: "5px 12px", borderRadius: 8, border: "none",
                                                            background: "#dcfce7", color: "#15803d",
                                                            cursor: "pointer", fontSize: 12, fontWeight: 700,
                                                            boxShadow: "0 1px 4px rgba(21,128,61,0.2)"
                                                        }}
                                                    >{t("reactivateBtn")}</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(40px); opacity: 0; }
                    to   { transform: translateX(0);    opacity: 1; }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }
                select option { background: #312e81; }
            `}</style>
        </div>
    )
}