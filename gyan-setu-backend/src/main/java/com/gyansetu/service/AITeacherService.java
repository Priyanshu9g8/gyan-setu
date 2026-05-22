package com.gyansetu.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

@Service
public class AITeacherService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    
    @Value("${groq.api.key:}")
    private String apiKey;

    public AITeacherService(@Value("${groq.api.key:}") String apiKey) {
        this.webClient = WebClient.builder()
                .baseUrl("https://api.groq.com/openai/v1")
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }

    private String postWithRetry(String requestBody, int maxRetries) {
        int attempt = 0;
        long backoffMs = 2000;

        while (true) {
            try {
                return webClient.post()
                        .uri("/chat/completions")
                        .bodyValue(requestBody)
                        .retrieve()
                        .bodyToMono(String.class)
                        .block();
            } catch (org.springframework.web.reactive.function.client.WebClientResponseException e) {
                if (e.getStatusCode().value() == 429 && attempt < maxRetries) {
                    attempt++;
                    System.err.println("[AITeacherService] 429 Rate Limit hit. Retrying in " + backoffMs + "ms... (Attempt " + attempt + ")");
                    try {
                        Thread.sleep(backoffMs);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                    }
                    backoffMs *= 2; // exponential backoff
                } else {
                    throw e;
                }
            } catch (Exception e) {
                if (attempt < maxRetries) {
                    attempt++;
                    System.err.println("[AITeacherService] API Error: " + e.getMessage() + ". Retrying... (Attempt " + attempt + ")");
                    try {
                        Thread.sleep(backoffMs);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                    }
                    backoffMs *= 2;
                } else {
                    throw e;
                }
            }
        }
    }

    public String askGroq(String prompt) {

        String requestBody = """
        {
          "model": "llama-3.1-8b-instant",
          "messages": [
            {
              "role": "user",
              "content": "%s"
            }
          ]
        }
        """.formatted(prompt.replace("\"", "\\\"").replace("\n", "\\n"));

        String raw = postWithRetry(requestBody, 3);

        return extractText(raw);
    }


    public String askTeacher(String question) {

        String prompt = "You are a friendly, enthusiastic AI teacher for children in classes KG to 5. "
                + "Explain concepts in very simple language with fun examples, analogies, and emojis. "
                + "Keep answers short (3-5 sentences). "
                + "Question: " + question;

        return askGroq(prompt);
    }

    public String generateQuiz(String topic, String langCode) {

        String langName = "English";
        if ("hi".equals(langCode)) langName = "Hindi";
        else if ("pa".equals(langCode)) langName = "Punjabi";

        String prompt = "Generate a fun quiz for young students (class 1-5) about: " + topic + ". "
                + "You must write the questions and options entirely in " + langName + ". "
                + "Return ONLY a valid JSON array of 3 objects, each with \\\"question\\\" (string) and "
                + "\\\"options\\\" (array of 4 strings). No extra text, no markdown fences, just the JSON array.";

        return askGroq(prompt);
    }

    public String generateLesson(String topic, String langCode) {

        String langName = "English";
        if ("hi".equals(langCode)) langName = "Hindi";
        else if ("pa".equals(langCode)) langName = "Punjabi";

        String prompt = "Create a short, engaging lesson plan for young students (class 1-5) about: " + topic + ". "
                + "You must write the lesson entirely in " + langName + ". "
                + "Include: Introduction, Explanation with examples, Fun activity, and Quick quiz (2 questions). "
                + "Use simple language and emojis.";

        return askGroq(prompt);
    }

    /**
     * Generates a pool of MCQ questions for an AI exam.
     * Generates poolSize questions (typically 3× what the student will see)
     * so each student gets a unique shuffled subset.
     *
     * Returns a raw JSON string: array of { question, optionA, optionB, optionC, optionD, correctAnswer }
     * correctAnswer is one of "A","B","C","D"
     */
    public String generateExamQuestions(String topic, String classLevel, int poolSize) {

        String classLabel = classLevel.replace("CLASS_", "Class ").replace("_", " ");

        // ── Step 1: Generate questions in English ──────────────────────────────
        String promptEn = ("Generate exactly " + poolSize + " unique multiple-choice questions for " + classLabel
                + " students about the topic: \"" + topic + "\". "
                + "Each question must have exactly 4 answer options (A, B, C, D) and one correct answer. "
                + "Return ONLY a valid JSON array with no extra text, no markdown fences, no explanation. "
                + "Each element must have these exact keys: "
                + "\"question\" (string), \"optionA\" (string), \"optionB\" (string), \"optionC\" (string), \"optionD\" (string), "
                + "\"correctAnswer\" (string, one of: \"A\", \"B\", \"C\", \"D\"). "
                + "Make questions age-appropriate, educational, and clearly worded. "
                + "Ensure all " + poolSize + " questions are distinct from each other.")
                .replace("\"", "\\\"")
                .replace("\n", "\\n");

        String body1 = """
        {
          "model": "llama-3.1-8b-instant",
          "messages": [
            {
              "role": "system",
              "content": "You are an expert educator. You ONLY output valid JSON arrays. Never add markdown, explanations, or any text outside the JSON array."
            },
            { "role": "user", "content": "%s" }
          ],
          "temperature": 0.8,
          "max_tokens": 4000
        }
        """.formatted(promptEn);

        String raw1 = postWithRetry(body1, 3);

        String englishJson = extractText(raw1).trim();
        int startEn = englishJson.indexOf('[');
        int endEn = englishJson.lastIndexOf(']');
        if (startEn != -1 && endEn != -1) {
            englishJson = englishJson.substring(startEn, endEn + 1);
        }

        // ── Step 2: Translate English questions to Hindi + Punjabi ─────────────
        // Adding a 2-second delay to avoid hitting the Free Tier RPM rate limit immediately
        try {
            Thread.sleep(2000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // Build a compact translation request — only the text strings, no structure logic needed
        String translationPrompt = ("You are given a JSON array of exam questions in English. "
                + "Translate ONLY the 'question', 'optionA', 'optionB', 'optionC', 'optionD' fields "
                + "into Hindi (हिंदी) and Punjabi (ਪੰਜਾਬੀ). "
                + "Return ONLY a valid JSON array (same length, same order) where each element has: "
                + "\"question_hi\", \"optionA_hi\", \"optionB_hi\", \"optionC_hi\", \"optionD_hi\", "
                + "\"question_pa\", \"optionA_pa\", \"optionB_pa\", \"optionC_pa\", \"optionD_pa\". "
                + "Do NOT include any other fields. No markdown, no explanation, just the JSON array. "
                + "Input JSON: " + englishJson)
                .replace("\"", "\\\"")
                .replace("\n", "\\n");

        String body2 = """
        {
          "model": "llama-3.1-8b-instant",
          "messages": [
            {
              "role": "system",
              "content": "You are a professional translator fluent in English, Hindi (Devanagari script), and Punjabi (Gurmukhi script). You ONLY output valid JSON arrays with exact translations. Never add markdown or extra text."
            },
            { "role": "user", "content": "%s" }
          ],
          "temperature": 0.3,
          "max_tokens": 4000
        }
        """.formatted(translationPrompt);

        String translationJson;
        try {
            String raw2 = postWithRetry(body2, 3);
            translationJson = extractText(raw2).trim();
            int startTr = translationJson.indexOf('[');
            int endTr = translationJson.lastIndexOf(']');
            if (startTr != -1 && endTr != -1) {
                translationJson = translationJson.substring(startTr, endTr + 1);
            }
        } catch (Exception ex) {
            System.err.println("[AITeacherService] Translation API call failed: " + ex.getMessage() + ". Falling back to English-only.");
            return englishJson;
        }

        // ── Step 3: Merge English + translations into final array ──────────────
        try {
            com.fasterxml.jackson.databind.node.ArrayNode english =
                    (com.fasterxml.jackson.databind.node.ArrayNode) objectMapper.readTree(englishJson);
            com.fasterxml.jackson.databind.node.ArrayNode translations =
                    (com.fasterxml.jackson.databind.node.ArrayNode) objectMapper.readTree(translationJson);

            com.fasterxml.jackson.databind.node.ArrayNode merged =
                    objectMapper.createArrayNode();

            for (int i = 0; i < english.size(); i++) {
                com.fasterxml.jackson.databind.node.ObjectNode q =
                        (com.fasterxml.jackson.databind.node.ObjectNode) english.get(i).deepCopy();
                if (i < translations.size()) {
                    com.fasterxml.jackson.databind.JsonNode t = translations.get(i);
                    q.set("question_hi",  t.path("question_hi"));
                    q.set("optionA_hi",   t.path("optionA_hi"));
                    q.set("optionB_hi",   t.path("optionB_hi"));
                    q.set("optionC_hi",   t.path("optionC_hi"));
                    q.set("optionD_hi",   t.path("optionD_hi"));
                    q.set("question_pa",  t.path("question_pa"));
                    q.set("optionA_pa",   t.path("optionA_pa"));
                    q.set("optionB_pa",   t.path("optionB_pa"));
                    q.set("optionC_pa",   t.path("optionC_pa"));
                    q.set("optionD_pa",   t.path("optionD_pa"));
                }
                merged.add(q);
            }
            return merged.toString();

        } catch (Exception e) {
            // Merge failed — fall back to English-only (still valid for existing logic)
            System.err.println("[AITeacherService] Merge failed, returning English-only: " + e.getMessage());
            return englishJson;
        }
    }

   
    private String extractText(String json) {

        try {

            JsonNode root = objectMapper.readTree(json);
            JsonNode choices = root.path("choices");

            if (choices.isArray() && !choices.isEmpty()) {
                return choices.get(0)
                        .path("message")
                        .path("content")
                        .asText();
            }

            return "Sorry, I couldn't understand that. Can you ask again?";

        } catch (Exception e) {
            e.printStackTrace();
            return "Oops! Something went wrong. Please try again.";
        }
    }
}