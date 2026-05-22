package com.gyansetu.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "exams")
public class Exam {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 500)
    private String topic;

    @Column(name = "class_level", nullable = false, length = 20)
    private String classLevel;

    @Column(name = "question_count", nullable = false)
    private int questionCount;

    @Column(name = "time_limit_minutes", nullable = false)
    private int timeLimitMinutes;

    /** Full AI-generated question pool stored as JSON string */
    @Column(name = "question_pool", columnDefinition = "TEXT", nullable = false)
    private String questionPool;

    /** ID of the teacher who created this exam — nullable so creation never fails */
    @Column(name = "created_by_teacher_id")
    private Long createdByTeacherId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "reactivated_at", nullable = false)
    private LocalDateTime reactivatedAt;

    /** Auto-set createdAt before first insert */
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (reactivatedAt == null) {
            reactivatedAt = createdAt;
        }
    }

    // ── Getters & Setters ──────────────────────────────────────

    public Long getId() { return id; }

    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }

    public String getClassLevel() { return classLevel; }
    public void setClassLevel(String classLevel) { this.classLevel = classLevel; }

    public int getQuestionCount() { return questionCount; }
    public void setQuestionCount(int questionCount) { this.questionCount = questionCount; }

    public int getTimeLimitMinutes() { return timeLimitMinutes; }
    public void setTimeLimitMinutes(int timeLimitMinutes) { this.timeLimitMinutes = timeLimitMinutes; }

    public String getQuestionPool() { return questionPool; }
    public void setQuestionPool(String questionPool) { this.questionPool = questionPool; }

    public Long getCreatedByTeacherId() { return createdByTeacherId; }
    public void setCreatedByTeacherId(Long createdByTeacherId) { this.createdByTeacherId = createdByTeacherId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public LocalDateTime getReactivatedAt() { return reactivatedAt; }
    public void setReactivatedAt(LocalDateTime reactivatedAt) { this.reactivatedAt = reactivatedAt; }
}
