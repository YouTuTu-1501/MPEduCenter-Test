import { StudentSubmission, Exam } from "../types/exam";
import { User } from "../types/auth";

export type AuditCategory = "submission" | "user" | "exam" | "sync" | "security" | "system";
export type AuditSeverity = "info" | "success" | "warning" | "danger";

export interface AuditLogItem {
  id: string;
  timestamp: string;
  category: AuditCategory;
  action: string;
  details: string;
  actor?: string | {
    name: string;
    email?: string;
    role?: string;
  };
  target?: string;
  targetId?: string;
  severity: AuditSeverity;
  metadata?: Record<string, any>;
}

export interface SystemAnomaly {
  id: string;
  type: "speed_anomaly" | "spam_submission" | "orphan_identity" | "empty_exam" | "score_out_of_bounds" | "locked_user_active";
  severity: "critical" | "warning" | "notice";
  title: string;
  description: string;
  studentName?: string;
  studentClass?: string;
  examTitle?: string;
  score?: number;
  timeSpentSeconds?: number;
  timestamp: string;
  targetId?: string;
  suggestedAction?: string;
}

const AUDIT_STORAGE_KEY = "edutest_audit_logs";
const MAX_LOGS = 200;

export const getAuditLogs = (): AuditLogItem[] => {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Lỗi đọc audit logs:", err);
  }
  return [];
};

export const logAuditEvent = (
  event: Omit<AuditLogItem, "id" | "timestamp">
): AuditLogItem => {
  const newLog: AuditLogItem = {
    ...event,
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  try {
    const current = getAuditLogs();
    const updated = [newLog, ...current].slice(0, MAX_LOGS);
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("edutest:audit_log_updated", { detail: newLog }));
  } catch (err) {
    console.warn("Lỗi ghi audit log:", err);
  }

  return newLog;
};

export const clearAuditLogs = (): void => {
  try {
    localStorage.removeItem(AUDIT_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("edutest:audit_log_updated"));
  } catch {}
};

/**
 * Thuật toán phân tích và phát hiện dữ liệu bất thường trong hệ thống
 */
export const analyzeSystemAnomalies = (
  submissions: StudentSubmission[],
  exams: Exam[],
  users: User[]
): SystemAnomaly[] => {
  const anomalies: SystemAnomaly[] = [];
  const examMap = new Map<string, Exam>();
  exams.forEach((e) => examMap.set(e.id, e));

  const userMap = new Map<string, User>();
  const validEmails = new Set<string>();
  users.forEach((u) => {
    userMap.set(u.id, u);
    if (u.email) validEmails.add(u.email.toLowerCase());
  });

  // 1. Phân tích bài nộp (Submissions)
  const studentSubCountMap = new Map<string, { count: number; timestamps: number[] }>();

  submissions.forEach((sub) => {
    const exam = examMap.get(sub.examId);
    const examTitle = exam ? exam.title : (sub.examTitle || `Đề thi #${sub.examId}`);
    const timeSpent = sub.timeSpentSeconds || 0;
    const score = sub.score ?? 0;
    const qCount = (sub.answers ? Object.keys(sub.answers).length : 0) || (exam ? exam.questions.length : 10);

    // a) Điểm số ngoài biên hợp lệ (<0 hoặc >10)
    if (score < 0 || score > 10) {
      anomalies.push({
        id: `anom_score_${sub.id}`,
        type: "score_out_of_bounds",
        severity: "critical",
        title: "Điểm số ngoài thang điểm chuẩn",
        description: `Bài nộp của ${sub.studentName || "Học sinh"} có điểm ${score}đ không nằm trong thang 0 - 10.`,
        studentName: sub.studentName,
        studentClass: sub.studentClass,
        examTitle,
        score,
        timestamp: sub.submittedAt || new Date().toISOString(),
        targetId: sub.id,
        suggestedAction: "Kiểm tra lại công thức chấm hoặc điều chỉnh điểm số thủ công.",
      });
    }

    // b) Nộp bài siêu tốc với điểm cao bất thường (Làm < 15 giây cho đề >= 5 câu mà điểm >= 8.0)
    if (qCount >= 5 && timeSpent < 15 && score >= 8.0) {
      anomalies.push({
        id: `anom_speed_${sub.id}`,
        type: "speed_anomaly",
        severity: "critical",
        title: "Hoàn thành bài thi siêu tốc bất thường (Nghi vấn gian lận)",
        description: `${sub.studentName || "Học sinh"} (${sub.studentClass || "Chưa rõ lớp"}) hoàn thành đề thi ${qCount} câu chỉ trong ${timeSpent} giây với điểm số ${score}/10đ.`,
        studentName: sub.studentName,
        studentClass: sub.studentClass,
        examTitle,
        score,
        timeSpentSeconds: timeSpent,
        timestamp: sub.submittedAt || new Date().toISOString(),
        targetId: sub.id,
        suggestedAction: "Kiểm tra chi tiết từng câu trả lời trong lịch sử thi hoặc yêu cầu làm bài lại.",
      });
    } else if (qCount >= 10 && timeSpent < 30 && score >= 9.0) {
      anomalies.push({
        id: `anom_speed_fast_${sub.id}`,
        type: "speed_anomaly",
        severity: "warning",
        title: "Tốc độ làm bài nhanh đột biến",
        description: `${sub.studentName} làm ${qCount} câu trong ${timeSpent}s đạt ${score}đ. Tốc độ trung bình ${(timeSpent / qCount).toFixed(1)}s/câu.`,
        studentName: sub.studentName,
        studentClass: sub.studentClass,
        examTitle,
        score,
        timeSpentSeconds: timeSpent,
        timestamp: sub.submittedAt || new Date().toISOString(),
        targetId: sub.id,
        suggestedAction: "Xem lại biểu đồ phân bố thời gian làm bài của học sinh.",
      });
    }

    // c) Spam nộp bài liên tục
    const studentKey = sub.studentId || sub.studentEmail || sub.studentName || "unknown";
    const subTime = new Date(sub.submittedAt || 0).getTime();
    if (!studentSubCountMap.has(studentKey)) {
      studentSubCountMap.set(studentKey, { count: 1, timestamps: [subTime] });
    } else {
      const entry = studentSubCountMap.get(studentKey)!;
      entry.count += 1;
      entry.timestamps.push(subTime);
    }

    // d) Kiểm tra tài khoản đã bị khóa nhưng vẫn có bài nộp gần đây
    if (sub.studentId && userMap.has(sub.studentId)) {
      const u = userMap.get(sub.studentId)!;
      if (u.status === "locked") {
        anomalies.push({
          id: `anom_locked_${sub.id}`,
          type: "locked_user_active",
          severity: "warning",
          title: "Bài nộp phát sinh từ tài khoản đang bị khóa",
          description: `Tài khoản ${u.name} (${u.email}) đang ở trạng thái bị khóa nhưng có bản ghi nộp bài lúc ${new Date(sub.submittedAt).toLocaleString("vi-VN")}.`,
          studentName: u.name,
          studentClass: u.schoolClass,
          examTitle,
          timestamp: sub.submittedAt,
          targetId: sub.id,
          suggestedAction: "Kiểm tra lại phiên đăng nhập hoặc thu hồi quyền truy cập.",
        });
      }
    }
  });

  // Kiểm tra tần suất nộp bài dồn dập
  studentSubCountMap.forEach((entry, studentKey) => {
    if (entry.count >= 4) {
      entry.timestamps.sort((a, b) => b - a);
      const spanMinutes = (entry.timestamps[0] - entry.timestamps[entry.timestamps.length - 1]) / 60000;
      if (spanMinutes < 5) {
        anomalies.push({
          id: `anom_spam_${studentKey}`,
          type: "spam_submission",
          severity: "warning",
          title: "Tần suất nộp bài dồn dập (Spam Submissions)",
          description: `Phát hiện ${entry.count} lượt nộp bài chỉ trong vòng ${spanMinutes.toFixed(1)} phút từ mã định danh: ${studentKey}.`,
          timestamp: new Date(entry.timestamps[0]).toISOString(),
          suggestedAction: "Xem xét bật giới hạn thời gian làm bài tối thiểu cho đề thi.",
        });
      }
    }
  });

  // 2. Phân tích Đề thi (Exams)
  exams.forEach((exam) => {
    if (!exam.questions || exam.questions.length === 0) {
      anomalies.push({
        id: `anom_empty_exam_${exam.id}`,
        type: "empty_exam",
        severity: "notice",
        title: "Đề thi chưa có câu hỏi nào",
        description: `Đề thi "${exam.title}" (Khối ${exam.grade || "12"}) đang được mở nhưng không chứa câu hỏi nào bên trong.`,
        examTitle: exam.title,
        timestamp: exam.createdAt || new Date().toISOString(),
        targetId: exam.id,
        suggestedAction: "Bổ sung câu hỏi vào đề hoặc chuyển đề sang trạng thái tạm khóa.",
      });
    }
  });

  // Sắp xếp theo mức độ nghiêm trọng: critical -> warning -> notice
  const severityOrder: Record<string, number> = { critical: 1, warning: 2, notice: 3 };
  anomalies.sort((a, b) => {
    const sDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sDiff !== 0) return sDiff;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return anomalies;
};
