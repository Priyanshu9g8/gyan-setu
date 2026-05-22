import { useState, useEffect } from 'react'
import api from '../api/axios'
import { useAuth } from '../hooks/useAuth'
import { useTranslation } from 'react-i18next'

const CLASS_OPTIONS = [
  { value: '', label: 'All Classes (no restriction)' },  // for teachers only
  { value: 'CLASS_1', label: 'Class 1' },
  { value: 'CLASS_2', label: 'Class 2' },
  { value: 'CLASS_3', label: 'Class 3' },
  { value: 'CLASS_4', label: 'Class 4' },
  { value: 'CLASS_5', label: 'Class 5' },
  { value: 'CLASS_6', label: 'Class 6' },
  { value: 'CLASS_7', label: 'Class 7' },
  { value: 'CLASS_8', label: 'Class 8' },
]

export default function AdminDashboard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [teachers, setTeachers] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('teachers')
  const [selectedUser, setSelectedUser] = useState(null)
  const [error, setError] = useState(null)
  const [showPwd, setShowPwd] = useState(false)

  // Add Teacher form
  const [showAddTeacher, setShowAddTeacher] = useState(false)
  const [teacherForm, setTeacherForm] = useState({ username: '', password: '', fullName: '', email: '', classLevel: '' })
  const [teacherBusy, setTeacherBusy] = useState(false)
  const [teacherError, setTeacherError] = useState(null)

  // Add Student form
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [studentForm, setStudentForm] = useState({ name: '', password: '', email: '', classLevel: '' })
  const [studentBusy, setStudentBusy] = useState(false)
  const [studentError, setStudentError] = useState(null)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsRes, teachersRes, studentsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/teachers'),
        api.get('/admin/students')
      ])
      setStats(statsRes.data)
      setTeachers(teachersRes.data)
      setStudents(studentsRes.data)
    } catch (err) {
      setError(t("failedLoadDash") + " " + (err.response?.data?.message || ""))
    } finally {
      setLoading(false)
    }
  }

  const deleteUser = async (id, fullName) => {
    if (!window.confirm(`${t("confirmDelete")} ${fullName}?`)) return
    try {
      await api.delete(`/admin/users/${id}`)
      fetchData()
      if (selectedUser?.id === id) setSelectedUser(null)
    } catch (err) {
      alert(t("deleteFailed") + " " + (err.response?.data?.message || ""))
    }
  }

  const viewDetails = async (id) => {
    try {
      const res = await api.get(`/admin/users/${id}/details`)
      setSelectedUser(res.data)
      setShowPwd(false)
    } catch {
      alert(t("failedFetchDetails"))
    }
  }

  const submitAddTeacher = async (e) => {
    e.preventDefault()
    setTeacherBusy(true)
    setTeacherError(null)
    try {
      await api.post('/admin/teachers', {
        username: teacherForm.username,
        password: teacherForm.password,
        fullName: teacherForm.fullName,
        email: teacherForm.email || null,
        classLevel: teacherForm.classLevel || null
      })
      setTeacherForm({ username: '', password: '', fullName: '', email: '', classLevel: '' })
      setShowAddTeacher(false)
      fetchData()
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || t("failedAddTeacher")
      setTeacherError(msg)
    } finally {
      setTeacherBusy(false)
    }
  }

  const submitAddStudent = async (e) => {
    e.preventDefault()
    setStudentBusy(true)
    setStudentError(null)
    try {
      await api.post('/admin/students', {
        name: studentForm.name,
        password: studentForm.password,
        email: studentForm.email || null,
        classLevel: studentForm.classLevel
      })
      setStudentForm({ name: '', password: '', email: '', classLevel: '' })
      setShowAddStudent(false)
      fetchData()
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || t("failedAddStudent")
      setStudentError(msg)
    } finally {
      setStudentBusy(false)
    }
  }

  if (loading && !stats) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display text-brand-900">🛡️ {t("adminDash")}</h1>
          <p className="text-brand-600 mt-1">{t("welcomeAdmin")}<strong>{user?.fullName}</strong>. {t("adminControlMsg")}</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard title={t("totalTeachers")} value={stats?.totalTeachers || 0} icon="👩‍🏫" color="blue" />
        <StatCard title={t("totalStudents")} value={stats?.totalStudents || 0} icon="🎒" color="purple" />
        <StatCard title={t("quizzesTaken")} value={stats?.totalQuizzes || 0} icon="📝" color="green" />
        <StatCard title={t("avgScore")} value={(stats?.averageScore || 0) + '%'} icon="🏆" color="orange" />
      </div>

      {/* Permission Notice */}
      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex gap-3 items-start">
        <span className="text-lg">ℹ️</span>
        <div>
          <p className="font-semibold">{t("adminCaps")}</p>
          <p className="text-amber-700 text-xs mt-1">{t("adminCapsDesc")}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-brand-100 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-brand-100 bg-brand-50/30">
          {[
            { key: 'teachers', label: `👩‍🏫 ${t("teachersTab")} (${teachers.length})` },
            { key: 'students', label: `🎒 ${t("studentsTab")} (${students.length})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-6 py-4 font-semibold text-sm transition-all ${activeTab === tab.key ? 'text-brand-700 border-b-2 border-brand-500 bg-white' : 'text-brand-500 hover:text-brand-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* List Section */}
            <div className="lg:col-span-2">

              {/* Teachers Tab */}
              {activeTab === 'teachers' && (
                <section>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-brand-800">{t("teachersTab")}</h2>
                    <button
                      onClick={() => setShowAddTeacher(v => !v)}
                      className="px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 transition-colors"
                    >
                      {showAddTeacher ? t("cancelBtn") : t("addTeacherBtn")}
                    </button>
                  </div>

                  {/* Add Teacher Form */}
                  {showAddTeacher && (
                    <form onSubmit={submitAddTeacher} className="mb-6 p-5 bg-brand-50 rounded-2xl border border-brand-100 space-y-3">
                      <h3 className="font-bold text-brand-800 text-sm">{t("regNewTeacher")}</h3>
                      {teacherError && <div className="text-red-600 text-xs bg-red-50 p-2 rounded-lg">{teacherError}</div>}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-brand-700 mb-1">{t("fullNameReq")}</label>
                          <input required value={teacherForm.fullName}
                            onChange={e => setTeacherForm(f => ({ ...f, fullName: e.target.value }))}
                            className="w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-brand-700 mb-1">{t("usernameReq")}</label>
                          <input required value={teacherForm.username}
                            onChange={e => setTeacherForm(f => ({ ...f, username: e.target.value }))}
                            className="w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-brand-700 mb-1">{t("passwordReq")}</label>
                          <input required type="password" minLength={6} value={teacherForm.password}
                            onChange={e => setTeacherForm(f => ({ ...f, password: e.target.value }))}
                            className="w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-brand-700 mb-1">{t("emailOpt")}</label>
                          <input type="email" value={teacherForm.email}
                            onChange={e => setTeacherForm(f => ({ ...f, email: e.target.value }))}
                            className="w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-semibold text-brand-700 mb-1">{t("assignClassOpt")}</label>
                          <select value={teacherForm.classLevel}
                            onChange={e => setTeacherForm(f => ({ ...f, classLevel: e.target.value }))}
                            className="w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300">
                            {CLASS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          <p className="text-xs text-brand-400 mt-1">{t("teacherClassNote")}</p>
                        </div>
                      </div>
                      <button type="submit" disabled={teacherBusy}
                        className="w-full py-2 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors">
                        {teacherBusy ? t("registering") : t("regTeacherBtn")}
                      </button>
                    </form>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-brand-50 text-brand-400 text-xs uppercase tracking-wider">
                          <th className="pb-3 px-2">{t("nameCol")}</th>
                          <th className="pb-3 px-2">{t("usernameCol")}</th>
                          <th className="pb-3 px-2">{t("assignClassCol")}</th>
                          <th className="pb-3 px-2">{t("actionsCol")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-50">
                        {teachers.map(teacher => (
                          <tr key={teacher.id} className="hover:bg-brand-50/50 transition-colors">
                            <td className="py-3 px-2">
                              <div className="font-semibold text-brand-800">{teacher.fullName}</div>
                              <div className="text-xs text-brand-500">{teacher.email || '—'}</div>
                            </td>
                            <td className="py-3 px-2 text-sm text-brand-600">@{teacher.username}</td>
                            <td className="py-3 px-2">
                              {teacher.classLevel
                                ? <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{teacher.classLevel.replace('CLASS_', 'Class ').replace('KG', 'KG')}</span>
                                : <span className="text-xs text-brand-400 italic">{t("allClassesLabel")}</span>}
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex gap-2">
                                <button onClick={() => viewDetails(teacher.id)} className="text-xs px-3 py-1 text-brand-600 hover:bg-brand-100 rounded-lg transition-colors">{t("detailsBtn")}</button>
                                <button onClick={() => deleteUser(teacher.id, teacher.fullName)} className="text-xs px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors">{t("deleteBtn")}</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {teachers.length === 0 && (
                          <tr><td colSpan="4" className="py-8 text-center text-brand-400 text-sm">{t("noTeachersYet")}</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Students Tab */}
              {activeTab === 'students' && (
                <section>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-brand-800">{t("studentsTab")}</h2>
                    <button
                      onClick={() => setShowAddStudent(v => !v)}
                      className="px-4 py-2 bg-purple-500 text-white rounded-xl text-sm font-semibold hover:bg-purple-600 transition-colors"
                    >
                      {showAddStudent ? t("cancelBtn") : t("addStudentBtn")}
                    </button>
                  </div>

                  {/* Add Student Form */}
                  {showAddStudent && (
                    <form onSubmit={submitAddStudent} className="mb-6 p-5 bg-purple-50 rounded-2xl border border-purple-100 space-y-3">
                      <h3 className="font-bold text-purple-800 text-sm">{t("addNewStudent")}</h3>
                      {studentError && <div className="text-red-600 text-xs bg-red-50 p-2 rounded-lg">{studentError}</div>}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-purple-700 mb-1">{t("fullNameReq")}</label>
                          <input required value={studentForm.name}
                            onChange={e => setStudentForm(f => ({ ...f, name: e.target.value }))}
                            className="w-full border border-purple-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-purple-700 mb-1">{t("passwordReq")}</label>
                          <input required type="password" minLength={6} value={studentForm.password}
                            onChange={e => setStudentForm(f => ({ ...f, password: e.target.value }))}
                            className="w-full border border-purple-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-purple-700 mb-1">{t("emailOpt")}</label>
                          <input type="email" value={studentForm.email}
                            onChange={e => setStudentForm(f => ({ ...f, email: e.target.value }))}
                            className="w-full border border-purple-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-purple-700 mb-1">{t("classReq")}</label>
                          <select required value={studentForm.classLevel}
                            onChange={e => setStudentForm(f => ({ ...f, classLevel: e.target.value }))}
                            className="w-full border border-purple-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                            <option value="">{t("selectClassPH")}</option>
                            {CLASS_OPTIONS.filter(o => o.value !== '').map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                      </div>
                      <button type="submit" disabled={studentBusy}
                        className="w-full py-2 bg-purple-500 text-white rounded-xl text-sm font-semibold hover:bg-purple-600 disabled:opacity-50 transition-colors">
                        {studentBusy ? t("addingBtn") : t("addStudentConfirmBtn")}
                      </button>
                    </form>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-brand-50 text-brand-400 text-xs uppercase tracking-wider">
                          <th className="pb-3 px-2">{t("nameCol")}</th>
                          <th className="pb-3 px-2">{t("usernameCol")}</th>
                          <th className="pb-3 px-2">{t("gradeCol")}</th>
                          <th className="pb-3 px-2">{t("actionsCol")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-50">
                        {students.map(s => (
                          <tr key={s.id} className="hover:bg-brand-50/50 transition-colors">
                            <td className="py-3 px-2">
                              <div className="font-semibold text-brand-800">{s.fullName}</div>
                              <div className="text-xs text-brand-500">{s.email || '—'}</div>
                            </td>
                            <td className="py-3 px-2 text-sm text-brand-600">@{s.username}</td>
                            <td className="py-3 px-2">
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                                {s.classLevel?.replace('CLASS_', 'Class ').replace('KG', 'KG') || '—'}
                              </span>
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex gap-2">
                                <button onClick={() => viewDetails(s.id)} className="text-xs px-3 py-1 text-brand-600 hover:bg-brand-100 rounded-lg transition-colors">{t("detailsBtn")}</button>
                                <button onClick={() => deleteUser(s.id, s.fullName)} className="text-xs px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors">{t("deleteBtn")}</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {students.length === 0 && (
                          <tr><td colSpan="4" className="py-8 text-center text-brand-400 text-sm">{t("noStudentsYet")}</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>

            {/* Details Panel */}
            <div className="lg:border-l lg:border-brand-50 lg:pl-8">
              <h2 className="text-lg font-bold text-brand-800 mb-4">{t("userProfile")}</h2>
              {selectedUser ? (
                <div className="space-y-5">
                  <div className="p-4 bg-brand-50/50 rounded-2xl border border-brand-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-brand-500 text-white flex items-center justify-center text-xl font-bold">
                        {selectedUser.fullName?.[0]}
                      </div>
                      <div>
                        <div className="font-bold text-brand-900">{selectedUser.fullName}</div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${selectedUser.role === 'TEACHER' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {selectedUser.role}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      {[
                        [t("usernameCol"), '@' + selectedUser.username],
                        [t("passwordReq").replace(' *', ''), (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-purple-600">{showPwd ? (selectedUser.rawPassword || '—') : '••••••••'}</span>
                            <button onClick={() => setShowPwd(!showPwd)} className="text-[10px] bg-brand-100 text-brand-600 px-2 py-1 rounded">
                               {showPwd ? 'Hide' : 'Show'}
                            </button>
                          </div>
                        )],
                        [t("emailOpt").split(' ')[0], selectedUser.email || '—'],
                        [t("classReq").replace(' *', ''), selectedUser.classLevel?.replace('CLASS_', 'Class ') || (selectedUser.role === 'TEACHER' ? t("allClassesLabel") : '—')],
                        [t("joined"), selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString('en-IN') : '—'],
                      ].map(([label, val]) => (
                        <div key={label} className="flex justify-between items-center bg-white px-3 py-2 rounded-lg">
                          <span className="text-brand-400 text-xs">{label}</span>
                          <span className="text-brand-700 text-xs font-semibold">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedUser.role === 'STUDENT' && selectedUser.marks && (
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-brand-800 text-sm">{t("performance")}</h3>
                        <span className="text-xs text-brand-500">{t("avgLabel")} {Math.round(selectedUser.averageScore || 0)}%</span>
                      </div>
                      <div className="space-y-2">
                        {selectedUser.marks.map((m, idx) => (
                          <div key={idx} className="bg-white border border-brand-100 rounded-xl p-3 flex justify-between items-center text-xs">
                            <div>
                              <div className="font-medium text-brand-700">{m.subject || t("general")}</div>
                              <div className="text-brand-400">{m.assignmentTitle}</div>
                            </div>
                            <div className={`font-bold text-sm ${m.percentage >= 80 ? 'text-green-600' : m.percentage >= 40 ? 'text-blue-600' : 'text-red-600'}`}>
                              {m.percentage}%
                            </div>
                          </div>
                        ))}
                        {selectedUser.marks.length === 0 && (
                          <div className="text-center py-4 text-brand-300 text-xs italic">{t("noQuizResults")}</div>
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setSelectedUser(null)}
                    className="w-full text-center text-xs text-brand-400 hover:text-brand-600 py-2 transition-colors"
                  >
                    {t("closeBtn")}
                  </button>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-brand-50 rounded-2xl text-brand-400">
                  <div className="text-4xl mb-2">👤</div>
                  <p className="text-sm">{t("clickDetails")}</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100'
  }
  return (
    <div className={`p-5 rounded-2xl border shadow-sm hover:-translate-y-1 transition-transform ${colors[color]}`}>
      <div className="text-2xl mb-3">{icon}</div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-sm opacity-70">{title}</div>
    </div>
  )
}
