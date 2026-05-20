import axios from "axios";

/* ======================
   AXIOS INSTANCE
====================== */

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080/api",
    withCredentials: true,
    headers: {
        "Content-Type": "application/json"
    }
});

/* ======================
   AUTH TOKEN INTERCEPTOR
====================== */

api.interceptors.request.use(
    (config) => {

        const token = sessionStorage.getItem("gs_token");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;

    },
    (error) => {
        return Promise.reject(error);
    }
);

/* ======================
   RESPONSE INTERCEPTOR
   Auto-clear stale auth on 401 so results never appear "lost"
   due to an expired / invalid token
====================== */
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error?.response?.status === 401) {
            // Token is expired or invalid — clear it so the user is
            // sent to login rather than seeing blank dashboards
            const hadToken = !!localStorage.getItem("gs_token");
            localStorage.removeItem("gs_token");
            localStorage.removeItem("gs_user");
            if (hadToken && !window.location.pathname.includes("/login")) {
                // Soft redirect to login preserving current path
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);

export default api;


/* ======================
   AI APIs
====================== */

// AI Teacher Chat
export const askAI = async (question) => {

    const res = await api.get(`/ai/chat?q=${encodeURIComponent(question)}`);

    return res.data.answer;

};


// AI Quiz Generator
export const generateQuiz = async (topic, lang = "en") => {

    const res = await api.get(`/ai/quiz?topic=${encodeURIComponent(topic)}&lang=${lang}`);

    return res.data;

};


// AI Lesson Generator
export const generateLesson = async (topic, lang = "en") => {

    const res = await api.get(`/ai/lesson?topic=${encodeURIComponent(topic)}&lang=${lang}`);

    return res.data.lesson;

};


/* ======================
   COURSE APIs
====================== */

// Get all courses or filtered courses
export const getCourses = async (classLevel = null) => {

    const url = classLevel
        ? `/courses?classLevel=${classLevel}`
        : `/courses`;

    const res = await api.get(url);

    return res.data;

};


// Get single course
export const getCourseById = async (id) => {

    const res = await api.get(`/courses/${id}`);

    return res.data;

};


/* ======================
   EXAM APIs
====================== */

// Teacher: Create an AI exam
export const createExam = async ({ topic, classLevel, questionCount, timeLimitMinutes }) => {
    const res = await api.post("/exam/create", { topic, classLevel, questionCount, timeLimitMinutes });
    return res.data;
};

// Student: Get active exams for a class
export const getActiveExams = async (classLevel) => {
    const res = await api.get(`/exam/active/${classLevel}`);
    return res.data;
};

// Anyone: Get full exam detail including question pool
export const getExamById = async (id) => {
    const res = await api.get(`/exam/${id}`);
    return res.data;
};

// Student: Submit exam answers
// NOTE: studentId is intentionally NOT sent — the backend derives it from the JWT token
export const submitExam = async ({ examId, score, totalQuestions, answersJson }) => {
    const res = await api.post("/exam/submit", { examId, score, totalQuestions, answersJson });
    return res.data;
};

// Student: Get their result for an exam
export const getExamResult = async (examId) => {
    const res = await api.get(`/exam/${examId}/result`);
    return res.data;
};

// Teacher: Get all their created exams
export const getMyExams = async () => {
    const res = await api.get("/exam/my-exams");
    return res.data;
};

// Teacher: Deactivate an exam
export const deactivateExam = async (examId) => {
    const res = await api.delete(`/exam/${examId}`);
    return res.data;
};

// Teacher: Reactivate a closed exam so students can retake it
export const reactivateExam = async (examId) => {
    const res = await api.put(`/exam/${examId}/reactivate`);
    return res.data;
};

// Student: Get all exams they have submitted (with scores + exam metadata)
export const getMySubmissions = async () => {
    const res = await api.get("/exam/my-submissions");
    return res.data;
};

// Teacher: Get all student submissions for a specific exam
export const getExamSubmissions = async (examId) => {
    const res = await api.get(`/exam/${examId}/submissions`);
    return res.data;
};

// Admin/Teacher: Get ALL submissions in DB (for diagnosis and repair)
export const getAllSubmissions = async () => {
    const res = await api.get("/exam/all-submissions");
    return res.data;
};

// Admin/Teacher: Repair a submission saved with the wrong studentId
export const repairSubmission = async ({ submissionId, correctStudentId }) => {
    const res = await api.post("/exam/repair-submissions", { submissionId, correctStudentId });
    return res.data;
};

// Student: Get all their course quiz results
export const getMyQuizResults = async () => {
    const res = await api.get("/results/my-results");
    return res.data;
};