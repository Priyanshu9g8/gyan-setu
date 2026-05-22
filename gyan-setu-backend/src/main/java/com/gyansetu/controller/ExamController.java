package com.gyansetu.controller;

import com.gyansetu.model.Exam;
import com.gyansetu.model.ExamSubmission;
import com.gyansetu.model.User;
import com.gyansetu.repository.ExamRepository;
import com.gyansetu.repository.ExamSubmissionRepository;
import com.gyansetu.repository.UserRepository;
import com.gyansetu.service.AITeacherService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Exam endpoints:
 *   POST   /api/exam/create          — Teacher: generate + save an AI exam
 *   GET    /api/exam/active/{class}  — Student: get active exams for their class
 *   GET    /api/exam/{id}            — Anyone authenticated: get exam details (pool included)
 *   POST   /api/exam/submit          — Student: submit answers
 *   GET    /api/exam/{id}/result     — Student: get their submission result
 *   GET    /api/exam/my-exams        — Teacher: list their created exams
 *   DELETE /api/exam/{id}            — Teacher: deactivate exam
 */
@RestController
@RequestMapping("/api/exam")
@CrossOrigin("*")
public class ExamController {

    private final ExamRepository examRepository;
    private final ExamSubmissionRepository submissionRepository;
    private final UserRepository userRepository;
    private final AITeacherService aiTeacherService;

    public ExamController(ExamRepository examRepository,
                          ExamSubmissionRepository submissionRepository,
                          UserRepository userRepository,
                          AITeacherService aiTeacherService) {
        this.examRepository = examRepository;
        this.submissionRepository = submissionRepository;
        this.userRepository = userRepository;
        this.aiTeacherService = aiTeacherService;
    }

    /* ──────────────────────────────────────────────
       POST /api/exam/create
       Body: { topic, classLevel, questionCount, timeLimitMinutes }
       Teacher only.
    ────────────────────────────────────────────── */
    @PostMapping("/create")
    public ResponseEntity<?> createExam(@RequestBody Map<String, Object> body,
                                        Authentication auth) {
        try {
            String topic      = (String) body.get("topic");
            String classLevel = (String) body.get("classLevel");

            // Safe integer parsing — Jackson deserializes numbers as Integer or Long
            int questionCount = body.get("questionCount") != null
                    ? ((Number) body.get("questionCount")).intValue() : 0;
            int timeLimitMins = body.get("timeLimitMinutes") != null
                    ? ((Number) body.get("timeLimitMinutes")).intValue() : 0;

            // Validate inputs
            if (topic == null || topic.isBlank())
                return ResponseEntity.badRequest().body(Map.of("message", "Topic is required"));
            if (classLevel == null || classLevel.isBlank())
                return ResponseEntity.badRequest().body(Map.of("message", "Class level is required"));
            if (questionCount < 1 || questionCount > 20)
                return ResponseEntity.badRequest().body(Map.of("message", "Question count must be between 1 and 20"));
            if (timeLimitMins < 1 || timeLimitMins > 180)
                return ResponseEntity.badRequest().body(Map.of("message", "Time limit must be between 1 and 180 minutes"));

            // Fetch authenticated teacher — throw if not found
            User teacher = userRepository.findByUsername(auth.getName())
                    .orElseThrow(() -> new IllegalArgumentException("Authenticated teacher not found"));

            // Generate pool (2× the question count; min 10, max 35)
            // Capped at 35 to ensure AI generation safely fits within the strict 4096 Groq API limit
            int poolSize = Math.min(Math.max(questionCount * 2, 10), 35);

            // Call Groq AI
            String questionPool = aiTeacherService.generateExamQuestions(topic, classLevel, poolSize);

            // Validate JSON array
            String trimmedPool = questionPool.trim();
            if (!trimmedPool.startsWith("[")) {
                System.err.println("[ExamController] AI returned non-JSON: " + trimmedPool.substring(0, Math.min(200, trimmedPool.length())));
                return ResponseEntity.status(500)
                        .body(Map.of("message", "AI failed to generate valid questions. Please try again."));
            }

            // Validate that the pool has AT LEAST questionCount questions
            // (AI can truncate — reject before saving a broken exam)
            int actualPoolSize;
            try {
                com.fasterxml.jackson.databind.ObjectMapper om = new com.fasterxml.jackson.databind.ObjectMapper();
                actualPoolSize = om.readTree(trimmedPool).size();
            } catch (Exception parseEx) {
                System.err.println("[ExamController] Pool JSON parse failed: " + parseEx.getMessage());
                return ResponseEntity.status(500)
                        .body(Map.of("message", "AI returned malformed questions. Please try again."));
            }

            if (actualPoolSize < questionCount) {
                System.err.println("[ExamController] Pool too small: got " + actualPoolSize + " questions, need " + questionCount);
                return ResponseEntity.status(500)
                        .body(Map.of("message",
                            "AI generated only " + actualPoolSize + " questions but " + questionCount + " are required. "
                            + "Please try a smaller count or try again."));
            }

            // Build and persist exam
            Exam exam = new Exam();
            exam.setTopic(topic.trim());
            exam.setClassLevel(classLevel.trim());
            exam.setQuestionCount(questionCount);
            exam.setTimeLimitMinutes(timeLimitMins);
            exam.setQuestionPool(trimmedPool);
            exam.setCreatedByTeacherId(teacher.getId());  // guaranteed non-null
            exam.setActive(true);

            Exam saved = examRepository.save(exam);
            System.out.println("[ExamController] Exam saved: ID=" + saved.getId()
                    + " teacherId=" + saved.getCreatedByTeacherId()
                    + " topic=" + saved.getTopic()
                    + " poolSize=" + actualPoolSize + " questionCount=" + questionCount);

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("id",               saved.getId());
            resp.put("topic",            saved.getTopic());
            resp.put("classLevel",       saved.getClassLevel());
            resp.put("questionCount",    saved.getQuestionCount());
            resp.put("timeLimitMinutes", saved.getTimeLimitMinutes());
            resp.put("poolSize",         actualPoolSize);
            resp.put("createdAt",        saved.getCreatedAt());
            resp.put("active",           saved.isActive());
            return ResponseEntity.ok(resp);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500)
                    .body(Map.of("message", "Exam creation failed: " + e.getMessage()));
        }
    }


    /* ──────────────────────────────────────────────
       GET /api/exam/active/{classLevel}
       Returns active exams for a class (used by Student Dashboard).
       ✅ Only returns exams created by THIS student's teacher.
    ────────────────────────────────────────────── */
    @GetMapping("/active/{classLevel}")
    public ResponseEntity<List<Map<String, Object>>> getActiveExams(
            @PathVariable String classLevel,
            Authentication auth) {

        // Look up the authenticated student to find their teacher
        User student = auth != null
                ? userRepository.findByUsername(auth.getName()).orElse(null)
                : null;
        Long studentId = student != null ? student.getId() : null;
        Long teacherId = student != null ? student.getCreatedById() : null;

        // ✅ FIX: Only fetch exams created by THIS student's teacher.
        // Students should NOT see exams from other teachers.
        // Legacy students (no createdById) fall back to all class exams.
        List<Exam> exams;
        if (teacherId != null) {
            exams = examRepository.findByClassLevelAndActiveTrueAndCreatedByTeacherId(classLevel, teacherId);
        } else {
            // Fallback for legacy students without a teacher link
            exams = examRepository.findByClassLevelAndActiveTrue(classLevel);
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Exam e : exams) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",               e.getId());
            m.put("topic",            e.getTopic());
            m.put("classLevel",       e.getClassLevel());
            m.put("questionCount",    e.getQuestionCount());
            m.put("timeLimitMinutes", e.getTimeLimitMinutes());
            m.put("createdAt",        e.getCreatedAt());
            m.put("reactivatedAt",    e.getReactivatedAt());
            // Tell student if they've already submitted
            boolean submitted = studentId != null &&
                    submissionRepository.existsByExamIdAndStudentId(e.getId(), studentId);
            m.put("alreadySubmitted", submitted);
            result.add(m);
        }
        return ResponseEntity.ok(result);
    }

    /* ──────────────────────────────────────────────
       GET /api/exam/{id}
       Full exam detail including question pool.
       Student uses this to start the exam.
    ────────────────────────────────────────────── */
    @GetMapping("/{id}")
    public ResponseEntity<?> getExam(@PathVariable Long id, Authentication auth) {
        Exam exam = examRepository.findById(id).orElse(null);
        if (exam == null)
            return ResponseEntity.status(404).body(Map.of("message", "Exam not found"));

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("id",               exam.getId());
        resp.put("topic",            exam.getTopic());
        resp.put("classLevel",       exam.getClassLevel());
        resp.put("questionCount",    exam.getQuestionCount());
        resp.put("timeLimitMinutes", exam.getTimeLimitMinutes());
        resp.put("questionPool",     exam.getQuestionPool());   // raw JSON string
        resp.put("active",           exam.isActive());
        resp.put("createdAt",        exam.getCreatedAt());
        return ResponseEntity.ok(resp);
    }

    /* ──────────────────────────────────────────────
       POST /api/exam/submit
       Body: { examId, score, totalQuestions, answersJson }
       studentId is ALWAYS taken from the JWT — never from the request body.
    ────────────────────────────────────────────── */
    @PostMapping("/submit")
    public ResponseEntity<?> submitExam(@RequestBody Map<String, Object> body,
                                        Authentication auth) {
        try {
            // ⚠ SECURITY: always derive studentId from the JWT, NEVER trust the request body
            Long studentId = getStudentId(auth);
            if (studentId == null)
                return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

            Long examId        = Long.valueOf(body.get("examId").toString());
            int  score         = ((Number) body.get("score")).intValue();
            int  total         = ((Number) body.get("totalQuestions")).intValue();
            String answersJson = (String) body.get("answersJson");

            Exam exam = examRepository.findById(examId).orElse(null);
            if (exam == null) {
                return ResponseEntity.status(404).body(Map.of("message", "Exam not found"));
            }

            // Prevent double submission — check if latest submission is newer than the exam's reactivatedAt
            java.util.List<ExamSubmission> existing = submissionRepository.findByExamIdAndStudentIdOrderBySubmittedAtDesc(examId, studentId);
            if (!existing.isEmpty()) {
                ExamSubmission sub = existing.get(0);
                // If they already submitted in the current "active" window
                if (!sub.getSubmittedAt().isBefore(exam.getReactivatedAt())) {
                    Map<String, Object> resp = new LinkedHashMap<>();
                    resp.put("id",              sub.getId());
                    resp.put("examId",          sub.getExamId());
                    resp.put("score",           sub.getScore());
                    resp.put("totalQuestions",  sub.getTotalQuestions());
                    resp.put("answersJson",     sub.getAnswersJson() != null ? sub.getAnswersJson() : "{}");
                    resp.put("submittedAt",     sub.getSubmittedAt());
                    resp.put("alreadySubmitted", true);
                    return ResponseEntity.ok(resp);
                }
            }

            // Save new submission permanently to MySQL
            ExamSubmission sub = new ExamSubmission();
            sub.setExamId(examId);
            sub.setStudentId(studentId);   // from JWT — guaranteed correct
            sub.setScore(score);
            sub.setTotalQuestions(total);
            sub.setAnswersJson(answersJson);
            ExamSubmission saved = submissionRepository.save(sub);

            System.out.println("[ExamController] Submission saved: examId=" + examId
                    + " studentId=" + studentId + " score=" + score + "/" + total);

            // Return full data including answersJson so frontend can show review immediately
            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("id",             saved.getId());
            resp.put("examId",         saved.getExamId());
            resp.put("score",          saved.getScore());
            resp.put("totalQuestions", saved.getTotalQuestions());
            resp.put("answersJson",    saved.getAnswersJson() != null ? saved.getAnswersJson() : "{}");
            resp.put("submittedAt",    saved.getSubmittedAt());
            return ResponseEntity.ok(resp);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "Submit failed: " + e.getMessage()));
        }
    }


    /* ──────────────────────────────────────────────
       GET /api/exam/{id}/result
       Returns the student's submission for a given exam.
    ────────────────────────────────────────────── */
    @GetMapping("/{id}/result")
    public ResponseEntity<?> getResult(@PathVariable Long id, Authentication auth) {
        Long studentId = getStudentId(auth);
        if (studentId == null)
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        java.util.List<ExamSubmission> subs = submissionRepository.findByExamIdAndStudentIdOrderBySubmittedAtDesc(id, studentId);
        if (subs.isEmpty())
            return ResponseEntity.status(404).body(Map.of("message", "No submission found"));

        ExamSubmission s = subs.get(0);
        return ResponseEntity.ok(Map.of(
                "id",             s.getId(),
                "examId",         s.getExamId(),
                "score",          s.getScore(),
                "totalQuestions", s.getTotalQuestions(),
                "answersJson",    s.getAnswersJson() != null ? s.getAnswersJson() : "[]",
                "submittedAt",    s.getSubmittedAt()
        ));
    }

    /* ──────────────────────────────────────────────
       GET /api/exam/my-submissions
       Student: list all exams THEY have submitted,
       including their score and exam metadata.
    ────────────────────────────────────────────── */
    @GetMapping("/my-submissions")
    public ResponseEntity<?> getMySubmissions(Authentication auth) {
        Long studentId = getStudentId(auth);
        if (studentId == null)
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        java.util.List<ExamSubmission> subs = submissionRepository.findByStudentIdOrderBySubmittedAtDesc(studentId);
        List<Map<String, Object>> result = new ArrayList<>();

        for (ExamSubmission s : subs) {
            // Safety check: skip any submission that somehow doesn't belong to this student
            if (!studentId.equals(s.getStudentId())) {
                System.err.println("[ExamController] WARN: submission " + s.getId()
                        + " has studentId=" + s.getStudentId()
                        + " but JWT student is " + studentId + " — skipping");
                continue;
            }

            Exam exam = examRepository.findById(s.getExamId()).orElse(null);
            int pct = s.getTotalQuestions() > 0
                    ? (int) Math.round((s.getScore() * 100.0) / s.getTotalQuestions()) : 0;
            String grade = pct >= 90 ? "A+" : pct >= 75 ? "A" : pct >= 60 ? "B" : pct >= 45 ? "C" : "D";

            Map<String, Object> m = new LinkedHashMap<>();
            m.put("submissionId",    s.getId());
            m.put("examId",          s.getExamId());
            m.put("studentId",       s.getStudentId());   // included for client-side validation
            m.put("score",           s.getScore());
            m.put("totalQuestions",  s.getTotalQuestions());
            m.put("percentage",      pct);
            m.put("grade",           grade);
            m.put("submittedAt",     s.getSubmittedAt());
            // Enrich with exam metadata
            if (exam != null) {
                m.put("topic",            exam.getTopic());
                m.put("classLevel",       exam.getClassLevel());
                m.put("timeLimitMinutes", exam.getTimeLimitMinutes());
            } else {
                m.put("topic",            "(Deleted exam)");
                m.put("classLevel",       "");
                m.put("timeLimitMinutes", 0);
            }
            result.add(m);
        }
        // Most recent first
        result.sort((a, b) -> b.get("submittedAt").toString().compareTo(a.get("submittedAt").toString()));
        return ResponseEntity.ok(result);
    }

    /* ──────────────────────────────────────────────
       GET /api/exam/my-exams
       Teacher: list all exams they created.
       ✅ Auto-adopts orphaned exams (NULL teacher) permanently.
    ────────────────────────────────────────────── */
    @GetMapping("/my-exams")
    public ResponseEntity<?> getMyExams(Authentication auth) {
        User teacher = userRepository.findByUsername(auth.getName()).orElse(null);
        if (teacher == null)
            return ResponseEntity.status(404).body(Map.of("message", "Teacher not found"));

        // ✅ AUTO-ADOPT: Find orphaned exams (created before auth was fixed, NULL teacher)
        // and permanently assign them to this teacher so they're never lost.
        List<Exam> orphaned = examRepository.findByCreatedByTeacherIdIsNull();
        if (!orphaned.isEmpty()) {
            for (Exam orphan : orphaned) {
                orphan.setCreatedByTeacherId(teacher.getId());
                examRepository.save(orphan);
            }
            System.out.println("[ExamController] Auto-adopted " + orphaned.size()
                    + " orphaned exams for teacher " + teacher.getUsername()
                    + " (id=" + teacher.getId() + ")");
        }

        // Now return ALL exams for this teacher (including newly adopted ones)
        List<Exam> exams = examRepository.findByCreatedByTeacherIdOrderByCreatedAtDesc(teacher.getId());
        List<Map<String, Object>> result = new ArrayList<>();
        for (Exam e : exams) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",               e.getId());
            m.put("topic",            e.getTopic());
            m.put("classLevel",       e.getClassLevel());
            m.put("questionCount",    e.getQuestionCount());
            m.put("timeLimitMinutes", e.getTimeLimitMinutes());
            m.put("active",           e.isActive());
            m.put("createdAt",        e.getCreatedAt());
            m.put("reactivatedAt",    e.getReactivatedAt());
            // Count unique students who submitted (not total attempts — retakes don't inflate count)
            long submissionCount = submissionRepository.countDistinctStudentsByExamId(e.getId());
            m.put("submissions",      submissionCount);
            result.add(m);
        }
        return ResponseEntity.ok(result);
    }

    /* ──────────────────────────────────────────────
       GET /api/exam/{id}/submissions
       Teacher: get all student results for a specific exam.
    ────────────────────────────────────────────── */
    @GetMapping("/{id}/submissions")
    public ResponseEntity<?> getExamSubmissions(@PathVariable Long id, Authentication auth) {
        try {
            Exam exam = examRepository.findById(id).orElse(null);
            if (exam == null)
                return ResponseEntity.status(404).body(Map.of("message", "Exam not found"));

            java.util.List<ExamSubmission> subs = submissionRepository.findByExamIdOrderBySubmittedAtDesc(id);
            List<Map<String, Object>> result = new ArrayList<>();

            // Track last accepted timestamp per student to filter out double-click duplicate bugs
            Map<Long, java.time.LocalDateTime> lastSeenMap = new LinkedHashMap<>();

            for (ExamSubmission s : subs) {
                // Check for double-submission bug (same student, within 10 seconds)
                java.time.LocalDateTime lastSeen = lastSeenMap.get(s.getStudentId());
                if (lastSeen != null && java.time.Duration.between(s.getSubmittedAt(), lastSeen).abs().getSeconds() < 10) {
                    continue; // Skip this duplicate
                }
                lastSeenMap.put(s.getStudentId(), s.getSubmittedAt());

                try {
                    int pct = s.getTotalQuestions() > 0
                            ? (int) Math.round((s.getScore() * 100.0) / s.getTotalQuestions()) : 0;
                    String grade = pct >= 90 ? "A+" : pct >= 75 ? "A" : pct >= 60 ? "B" : pct >= 45 ? "C" : "D";

                    // Try to find student — use fallback name if not found
                    User student = s.getStudentId() != null
                            ? userRepository.findById(s.getStudentId()).orElse(null)
                            : null;

                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("submissionId",    s.getId());
                    m.put("studentId",       s.getStudentId());
                    m.put("submissionId",    s.getId());
                    m.put("studentName",     student != null ? student.getFullName() : "Unknown Student");
                    m.put("studentUsername", student != null ? student.getUsername() : "—");
                    m.put("score",           s.getScore());
                    m.put("totalQuestions",  s.getTotalQuestions());
                    m.put("percentage",      pct);
                    m.put("grade",           grade);
                    m.put("submittedAt",     s.getSubmittedAt());
                    result.add(m);
                } catch (Exception inner) {
                    System.err.println("[ExamController] Error processing submission " + s.getId() + ": " + inner.getMessage());
                }
            }

            // Sort by percentage descending (top scorers first)
            result.sort((a, b) -> Integer.compare(
                    (Integer) b.get("percentage"),
                    (Integer) a.get("percentage")
            ));

            return ResponseEntity.ok(Map.of(
                    "examId",     exam.getId(),
                    "topic",      exam.getTopic(),
                    "classLevel", exam.getClassLevel() != null ? exam.getClassLevel() : "",
                    "total",      result.size(),
                    "results",    result
            ));
        } catch (Exception e) {
            System.err.println("[ExamController] getExamSubmissions error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "Failed to load results: " + e.getMessage()));
        }
    }

    /* ──────────────────────────────────────────────
       DELETE /api/exam/{id}
       Teacher: deactivate (close) an exam.
    ────────────────────────────────────────────── */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deactivateExam(@PathVariable Long id, Authentication auth) {
        Exam exam = examRepository.findById(id).orElse(null);
        if (exam == null)
            return ResponseEntity.status(404).body(Map.of("message", "Exam not found"));
        exam.setActive(false);
        examRepository.save(exam);
        return ResponseEntity.ok(Map.of("message", "Exam deactivated"));
    }

    /* ──────────────────────────────────────────────
       PUT /api/exam/{id}/reactivate
       Teacher: reopen a closed exam so students can retake it.
    ────────────────────────────────────────────── */
    @PutMapping("/{id}/reactivate")
    public ResponseEntity<?> reactivateExam(@PathVariable Long id, Authentication auth) {
        Exam exam = examRepository.findById(id).orElse(null);
        if (exam == null)
            return ResponseEntity.status(404).body(Map.of("message", "Exam not found"));
        
        // Preserve old submissions but update reactivatedAt so students can take it again
        exam.setReactivatedAt(java.time.LocalDateTime.now());
        
        exam.setActive(true);
        examRepository.save(exam);
        System.out.println("[ExamController] Exam " + id + " reactivated by " + auth.getName() + " (cleared submissions)");
        return ResponseEntity.ok(Map.of("message", "Exam reactivated", "id", id));
    }

    /* ──────────────────────────────────────────────
       POST /api/exam/repair-submissions
       Admin/Teacher: reassign a submission that was saved with
       the wrong student_id to the correct student.
       Body: { submissionId, correctStudentId }
       Also supports: { examId, wrongStudentId, correctStudentId }
    ────────────────────────────────────────────── */
    @PostMapping("/repair-submissions")
    public ResponseEntity<?> repairSubmissions(@RequestBody Map<String, Object> body,
                                               Authentication auth) {
        try {
            List<String> fixed = new ArrayList<>();

            if (body.containsKey("submissionId") && body.containsKey("correctStudentId")) {
                // Fix a single submission by ID
                Long submissionId     = Long.valueOf(body.get("submissionId").toString());
                Long correctStudentId = Long.valueOf(body.get("correctStudentId").toString());

                ExamSubmission sub = submissionRepository.findById(submissionId).orElse(null);
                if (sub == null)
                    return ResponseEntity.status(404).body(Map.of("message", "Submission not found"));

                User student = userRepository.findById(correctStudentId).orElse(null);
                if (student == null)
                    return ResponseEntity.status(404).body(Map.of("message", "Student not found: " + correctStudentId));

                Long oldId = sub.getStudentId();
                sub.setStudentId(correctStudentId);
                submissionRepository.save(sub);
                fixed.add("Submission #" + submissionId + ": studentId changed from " + oldId + " to " + correctStudentId
                        + " (" + student.getFullName() + ")");

            } else if (body.containsKey("examId") && body.containsKey("wrongStudentId") && body.containsKey("correctStudentId")) {
                // Fix all submissions for an exam that have the wrong studentId
                Long examId           = Long.valueOf(body.get("examId").toString());
                Long wrongStudentId   = Long.valueOf(body.get("wrongStudentId").toString());
                Long correctStudentId = Long.valueOf(body.get("correctStudentId").toString());

                java.util.List<ExamSubmission> subs = submissionRepository.findByExamIdAndStudentIdOrderBySubmittedAtDesc(examId, wrongStudentId);
                if (subs.isEmpty())
                    return ResponseEntity.status(404).body(Map.of("message",
                            "No submission found for examId=" + examId + " studentId=" + wrongStudentId));

                User student = userRepository.findById(correctStudentId).orElse(null);
                if (student == null)
                    return ResponseEntity.status(404).body(Map.of("message", "Correct student not found: " + correctStudentId));

                for (ExamSubmission s : subs) {
                    s.setStudentId(correctStudentId);
                    submissionRepository.save(s);
                }
                fixed.add("Exam #" + examId + " submission reassigned to studentId=" + correctStudentId
                        + " (" + student.getFullName() + ")");
            }

            System.out.println("[ExamController] repair-submissions by " + auth.getName() + ": " + fixed);
            return ResponseEntity.ok(Map.of("repaired", fixed.size(), "details", fixed));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "Repair failed: " + e.getMessage()));
        }
    }

    /* ──────────────────────────────────────────────
       GET /api/exam/all-submissions
       Admin/Teacher: list ALL submissions in the DB with student info.
       Used to diagnose and find submissions with wrong student_ids.
    ────────────────────────────────────────────── */
    @GetMapping("/all-submissions")
    public ResponseEntity<?> getAllSubmissions(Authentication auth) {
        try {
            List<ExamSubmission> all = submissionRepository.findAll();
            List<Map<String, Object>> result = new ArrayList<>();
            for (ExamSubmission s : all) {
                User student = s.getStudentId() != null
                        ? userRepository.findById(s.getStudentId()).orElse(null) : null;
                Exam exam = examRepository.findById(s.getExamId()).orElse(null);
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("submissionId",    s.getId());
                m.put("examId",          s.getExamId());
                m.put("examTopic",       exam != null ? exam.getTopic() : "(deleted)");
                m.put("studentId",       s.getStudentId());
                m.put("studentName",     student != null ? student.getFullName() : "⚠ NO USER FOUND");
                m.put("studentUsername", student != null ? student.getUsername() : "—");
                m.put("score",           s.getScore());
                m.put("totalQuestions",  s.getTotalQuestions());
                m.put("submittedAt",     s.getSubmittedAt());
                result.add(m);
            }
            return ResponseEntity.ok(Map.of("total", result.size(), "submissions", result));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    /* ── Helper ── */
    private Long getStudentId(Authentication auth) {
        if (auth == null) return null;
        User user = userRepository.findByUsername(auth.getName()).orElse(null);
        return user != null ? user.getId() : null;
    }
}
