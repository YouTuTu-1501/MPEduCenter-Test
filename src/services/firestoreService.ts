import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { User, INITIAL_USERS } from "../types/auth";
import { Exam, StudentSubmission, LiveRoom } from "../types/exam";
import { initialSampleExams } from "../data/defaultExam";
import { initialSampleSubmissions } from "../data/sampleSubmissions";

/**
 * Hàm làm sạch đối tượng trước khi gửi lên Firestore
 * Loại bỏ toàn bộ giá trị undefined để tránh lỗi Firestore Unsupported Field Value
 */
export const cleanForFirestore = <T>(obj: T): T => {
  if (obj === undefined || obj === null) return null as unknown as T;
  return JSON.parse(
    JSON.stringify(obj, (k, v) => (v === undefined ? null : v))
  );
};

// ----------------------------------------------------
// 0. Quản lý Danh sách đối tượng đã bị xóa (Tombstones / Deleted IDs Tracking)
// ----------------------------------------------------
const DELETED_USERS_KEY = "mpeducenter_deleted_users";
const DELETED_EXAMS_KEY = "edutest_deleted_exams";
const DELETED_SUBMISSIONS_KEY = "edutest_deleted_submissions";

export const getDeletedUserIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {}
  return new Set();
};

export const addDeletedUserId = (userId: string): void => {
  try {
    const set = getDeletedUserIds();
    set.add(userId);
    localStorage.setItem(DELETED_USERS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
};

export const removeDeletedUserId = (userId: string): void => {
  try {
    const set = getDeletedUserIds();
    set.delete(userId);
    localStorage.setItem(DELETED_USERS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
};

export const getDeletedExamIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_EXAMS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {}
  return new Set();
};

export const addDeletedExamId = (examId: string): void => {
  try {
    const set = getDeletedExamIds();
    set.add(examId);
    localStorage.setItem(DELETED_EXAMS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
};

export const removeDeletedExamId = (examId: string): void => {
  try {
    const set = getDeletedExamIds();
    set.delete(examId);
    localStorage.setItem(DELETED_EXAMS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
};

export const getDeletedSubmissionIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_SUBMISSIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {}
  return new Set();
};

export const addDeletedSubmissionId = (subId: string): void => {
  try {
    const set = getDeletedSubmissionIds();
    set.add(subId);
    localStorage.setItem(DELETED_SUBMISSIONS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
};

export const removeDeletedSubmissionId = (subId: string): void => {
  try {
    const set = getDeletedSubmissionIds();
    set.delete(subId);
    localStorage.setItem(DELETED_SUBMISSIONS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
};

// ----------------------------------------------------
// 1. Quản lý Người dùng (Users & Roles)
// ----------------------------------------------------
const USERS_COLLECTION = "users";

export const subscribeUsers = (
  callback: (users: User[]) => void,
  onError?: (error: Error) => void
) => {
  const deletedUserIds = getDeletedUserIds();

  // 1. Nạp tức thì từ bộ nhớ cục bộ nếu có
  try {
    const local = localStorage.getItem("mpeducenter_users");
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((u: User) => u && u.id && !deletedUserIds.has(u.id));
        callback(filtered);
      }
    } else {
      // Chỉ dùng INITIAL_USERS nếu chưa từng có cache
      const initialFiltered = INITIAL_USERS.filter((u) => !deletedUserIds.has(u.id));
      callback(initialFiltered);
    }
  } catch {}

  try {
    const q = query(collection(db, USERS_COLLECTION));
    return onSnapshot(
      q,
      (snapshot) => {
        const currentDeleted = getDeletedUserIds();
        if (snapshot.empty) {
          // Khởi tạo người dùng mẫu nếu Firestore hoàn toàn trống và chưa có dữ liệu
          const local = localStorage.getItem("mpeducenter_users");
          if (!local && currentDeleted.size === 0) {
            seedInitialUsers().then(() => {
              callback(INITIAL_USERS);
            });
          } else {
            callback([]);
          }
          return;
        }

        // Đọc trực tiếp từ Firestore Snapshot, TUYỆT ĐỐI KHÔNG tự động chèn lại INITIAL_USERS
        const userMap = new Map<string, User>();
        snapshot.forEach((docSnap) => {
          const u = docSnap.data() as User;
          if (u && u.id && !currentDeleted.has(u.id)) {
            userMap.set(u.id, u);
          }
        });

        const users = Array.from(userMap.values());
        try {
          localStorage.setItem("mpeducenter_users", JSON.stringify(users));
        } catch {}
        callback(users);
      },
      (err) => {
        console.warn("Firestore subscribeUsers fallback to localStorage:", err);
        if (onError) onError(err);
      }
    );
  } catch (error) {
    console.warn("Firestore error:", error);
    return () => {};
  }
};

export const saveUserToFirestore = async (user: User): Promise<void> => {
  try {
    removeDeletedUserId(user.id);
    const cleanUser = cleanForFirestore(user);
    const ref = doc(db, USERS_COLLECTION, user.id);
    await setDoc(ref, cleanUser, { merge: true });
  } catch (err) {
    console.warn("Lỗi khi lưu người dùng lên Firestore (lưu cache local):", err);
  }
};

export const saveUsersBatchToFirestore = async (users: User[]): Promise<void> => {
  try {
    for (const u of users) {
      removeDeletedUserId(u.id);
      const cleanUser = cleanForFirestore(u);
      const ref = doc(db, USERS_COLLECTION, u.id);
      await setDoc(ref, cleanUser, { merge: true });
    }
  } catch (err) {
    console.warn("Lỗi khi lưu danh sách người dùng lên Firestore:", err);
  }
};

export const deleteUserFromFirestore = async (userId: string): Promise<void> => {
  try {
    // 1. Thêm vào danh sách xóa vĩnh viễn
    addDeletedUserId(userId);

    // 2. Xóa khỏi LocalStorage
    try {
      const local = localStorage.getItem("mpeducenter_users");
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          const updated = parsed.filter((u: User) => u && u.id !== userId);
          localStorage.setItem("mpeducenter_users", JSON.stringify(updated));
        }
      }
    } catch {}

    // 3. Xóa các bài làm liên quan của người dùng này để đồng bộ toàn bộ báo cáo
    try {
      await purgeUserSubmissions(userId);
    } catch {}

    // 4. Xóa trên Firestore Database
    const ref = doc(db, USERS_COLLECTION, userId);
    await deleteDoc(ref);
  } catch (err) {
    console.warn("Lỗi khi xóa người dùng trên Firestore:", err);
  }
};

export const seedInitialUsers = async (): Promise<void> => {
  try {
    const deleted = getDeletedUserIds();
    const toSeed = INITIAL_USERS.filter((u) => !deleted.has(u.id));
    for (const u of toSeed) {
      const cleanUser = cleanForFirestore(u);
      const ref = doc(db, USERS_COLLECTION, u.id);
      await setDoc(ref, cleanUser, { merge: true });
    }
  } catch (err) {
    console.warn("Lỗi nạp người dùng mẫu:", err);
  }
};

// ----------------------------------------------------
// 2. Quản lý Ngân hàng Đề thi (Exams)
// ----------------------------------------------------
const EXAMS_COLLECTION = "exams";

export const subscribeExams = (
  callback: (exams: Exam[]) => void,
  onError?: (error: Error) => void
) => {
  const deletedExamIds = getDeletedExamIds();

  // Nạp tức thì từ local cache nếu có
  try {
    const local = localStorage.getItem("edutest_exams");
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((e: Exam) => e && e.id && !deletedExamIds.has(e.id));
        callback(filtered);
      }
    } else {
      const initialFiltered = initialSampleExams.filter((e) => !deletedExamIds.has(e.id));
      callback(initialFiltered);
    }
  } catch {}

  try {
    const q = query(collection(db, EXAMS_COLLECTION));
    return onSnapshot(
      q,
      (snapshot) => {
        const currentDeleted = getDeletedExamIds();
        if (snapshot.empty) {
          const local = localStorage.getItem("edutest_exams");
          if (!local && currentDeleted.size === 0) {
            seedInitialExams().then(() => {
              callback(initialSampleExams);
            });
          } else {
            callback([]);
          }
          return;
        }

        const exams: Exam[] = [];
        snapshot.forEach((docSnap) => {
          const e = docSnap.data() as Exam;
          if (e && e.id && !currentDeleted.has(e.id)) {
            exams.push(e);
          }
        });

        try {
          localStorage.setItem("edutest_exams", JSON.stringify(exams));
        } catch {}
        callback(exams);
      },
      (err) => {
        console.warn("Firestore subscribeExams fallback to local:", err);
        if (onError) onError(err);
      }
    );
  } catch (error) {
    console.warn("Firestore subscribeExams error:", error);
    return () => {};
  }
};

export const saveExamToFirestore = async (exam: Exam): Promise<void> => {
  try {
    removeDeletedExamId(exam.id);
    const cleanExam = cleanForFirestore(exam);
    const ref = doc(db, EXAMS_COLLECTION, exam.id);
    await setDoc(ref, cleanExam, { merge: true });
  } catch (err) {
    console.warn("Lỗi khi lưu đề thi lên Firestore:", err);
  }
};

export const deleteExamFromFirestore = async (examId: string): Promise<void> => {
  try {
    addDeletedExamId(examId);

    try {
      const local = localStorage.getItem("edutest_exams");
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          const updated = parsed.filter((e: Exam) => e && e.id !== examId);
          localStorage.setItem("edutest_exams", JSON.stringify(updated));
        }
      }
    } catch {}

    const ref = doc(db, EXAMS_COLLECTION, examId);
    await deleteDoc(ref);
  } catch (err) {
    console.warn("Lỗi khi xóa đề thi trên Firestore:", err);
  }
};

export const seedInitialExams = async (): Promise<void> => {
  try {
    const deleted = getDeletedExamIds();
    const toSeed = initialSampleExams.filter((e) => !deleted.has(e.id));
    for (const exam of toSeed) {
      const cleanExam = cleanForFirestore(exam);
      const ref = doc(db, EXAMS_COLLECTION, exam.id);
      await setDoc(ref, cleanExam, { merge: true });
    }
  } catch (err) {
    console.warn("Lỗi nạp đề thi mẫu:", err);
  }
};

// ----------------------------------------------------
// 3. Quản lý Kết quả & Bài nộp Lịch sử làm bài (Submissions)
// ----------------------------------------------------
const SUBMISSIONS_COLLECTION = "submissions";

export const getLocalSubmissions = (): StudentSubmission[] => {
  const deletedSubs = getDeletedSubmissionIds();
  const deletedUsers = getDeletedUserIds();
  try {
    const raw = localStorage.getItem("edutest_submissions");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (s: StudentSubmission) =>
            s && s.id && !deletedSubs.has(s.id) && (!s.studentId || !deletedUsers.has(s.studentId))
        );
      }
    }
  } catch {}
  return [];
};

/**
 * Xóa sạch 100% kết quả thi (Submissions) trên cả Firestore và LocalStorage
 */
export const clearAllSubmissions = async (): Promise<void> => {
  try {
    localStorage.removeItem("edutest_submissions");
    localStorage.removeItem(DELETED_SUBMISSIONS_KEY);
    const subDocs = await getDocs(collection(db, SUBMISSIONS_COLLECTION));
    for (const d of subDocs.docs) {
      await deleteDoc(d.ref).catch(() => {});
    }
  } catch (err) {
    console.warn("Lỗi xóa toàn bộ submissions:", err);
  }
};

/**
 * Quét và loại bỏ vĩnh viễn các bản ghi submission không thuộc về bất kỳ userId nào đang tồn tại
 * Đồng bộ làm sạch triệt để cả trên Firestore và LocalStorage
 */
export const clearOrphanedData = async (existingUsers?: User[]): Promise<void> => {
  try {
    const validUserIds = new Set<string>();
    const validEmails = new Set<string>();
    const validNames = new Set<string>();

    if (existingUsers && existingUsers.length > 0) {
      existingUsers.forEach((u) => {
        if (u) {
          if (u.id) validUserIds.add(u.id);
          if (u.email) validEmails.add(u.email.toLowerCase());
          if (u.name) validNames.add(u.name.trim().toLowerCase());
        }
      });
    } else {
      // Truy vấn trực tiếp danh sách users từ Firestore và local cache
      const userDocs = await getDocs(collection(db, USERS_COLLECTION));
      userDocs.forEach((docSnap) => {
        validUserIds.add(docSnap.id);
        const data = docSnap.data() as User;
        if (data) {
          if (data.id) validUserIds.add(data.id);
          if (data.email) validEmails.add(data.email.toLowerCase());
          if (data.name) validNames.add(data.name.trim().toLowerCase());
        }
      });

      try {
        const local = localStorage.getItem("mpeducenter_users");
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed)) {
            parsed.forEach((u: User) => {
              if (u && u.id) validUserIds.add(u.id);
              if (u && u.email) validEmails.add(u.email.toLowerCase());
              if (u && u.name) validNames.add(u.name.trim().toLowerCase());
            });
          }
        }
      } catch {}
    }

    const deletedUserIds = getDeletedUserIds();

    // 1. Quét và loại bỏ vĩnh viễn trên Firestore
    const subDocs = await getDocs(collection(db, SUBMISSIONS_COLLECTION));
    for (const docSnap of subDocs.docs) {
      const sub = docSnap.data() as StudentSubmission;
      const studentId = sub.studentId || (sub as any).userId;

      const hasValidId = studentId && validUserIds.has(studentId) && !deletedUserIds.has(studentId);
      const hasValidEmail = sub.studentEmail && validEmails.has(sub.studentEmail.toLowerCase());
      const hasValidName = sub.studentName && validNames.has(sub.studentName.trim().toLowerCase());

      const isBelongingToExistingUser = Boolean(
        hasValidId || (validUserIds.size === 0 ? false : (hasValidEmail || hasValidName))
      );

      if (!isBelongingToExistingUser) {
        addDeletedSubmissionId(docSnap.id);
        await deleteDoc(docSnap.ref).catch(() => {});
      }
    }

    // 2. Dọn dẹp trên LocalStorage
    try {
      const raw = localStorage.getItem("edutest_submissions");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((s: StudentSubmission) => {
            const sid = s.studentId || (s as any).userId;
            const hasValidId = sid && validUserIds.has(sid) && !deletedUserIds.has(sid);
            const hasValidEmail = s.studentEmail && validEmails.has(s.studentEmail.toLowerCase());
            const hasValidName = s.studentName && validNames.has(s.studentName.trim().toLowerCase());
            return Boolean(hasValidId || (validUserIds.size === 0 ? false : (hasValidEmail || hasValidName)));
          });
          localStorage.setItem("edutest_submissions", JSON.stringify(cleaned));
        }
      }
    } catch {}
  } catch (err) {
    console.warn("Lỗi khi dọn dẹp submission mồ côi (clearOrphanedData):", err);
  }
};

/**
 * Tự động làm sạch các bài nộp mồ côi (không thuộc về bất kỳ tài khoản học sinh nào hiện có)
 */
export const cleanupOrphanedSubmissions = async (validUsers: User[]): Promise<void> => {
  return clearOrphanedData(validUsers);
};

export const purgeUserSubmissions = async (userId: string): Promise<void> => {
  try {
    const raw = localStorage.getItem("edutest_submissions");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const subsToDelete = parsed.filter(
          (s: StudentSubmission) => s && (s.studentId === userId)
        );
        subsToDelete.forEach((s) => addDeletedSubmissionId(s.id));
        const remaining = parsed.filter(
          (s: StudentSubmission) => s && s.studentId !== userId
        );
        localStorage.setItem("edutest_submissions", JSON.stringify(remaining));

        for (const sub of subsToDelete) {
          try {
            await deleteDoc(doc(db, SUBMISSIONS_COLLECTION, sub.id));
          } catch {}
        }
      }
    }
  } catch (err) {
    console.warn("Lỗi xóa bài nộp của người dùng:", err);
  }
};

export const syncUserToSubmissions = async (user: User): Promise<void> => {
  try {
    const raw = localStorage.getItem("edutest_submissions");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        let hasChanges = false;
        const updated = parsed.map((s: StudentSubmission) => {
          if (
            s.studentId === user.id ||
            (s.studentEmail && user.email && s.studentEmail.toLowerCase() === user.email.toLowerCase())
          ) {
            hasChanges = true;
            return {
              ...s,
              studentId: user.id,
              studentName: user.name,
              studentClass: user.schoolClass || s.studentClass,
              studentEmail: user.email || s.studentEmail,
              studentAvatar: user.avatar || s.studentAvatar,
            };
          }
          return s;
        });

        if (hasChanges) {
          localStorage.setItem("edutest_submissions", JSON.stringify(updated));
          for (const sub of updated) {
            if (sub.studentId === user.id) {
              const cleanSub = cleanForFirestore(sub);
              await setDoc(doc(db, SUBMISSIONS_COLLECTION, sub.id), cleanSub, { merge: true }).catch(() => {});
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn("Lỗi đồng bộ thông tin người dùng vào bài nộp:", err);
  }
};

export const subscribeSubmissions = (
  callback: (subs: StudentSubmission[]) => void,
  onError?: (error: Error) => void
) => {
  // 1. Nạp từ LocalStorage
  const initialLocal = getLocalSubmissions();
  callback(initialLocal);

  try {
    const q = query(collection(db, SUBMISSIONS_COLLECTION));
    return onSnapshot(
      q,
      (snapshot) => {
        const currentDeleted = getDeletedSubmissionIds();
        const currentDeletedUsers = getDeletedUserIds();
        if (snapshot.empty) {
          // Khi Database chưa có bài nộp nào, đồng bộ chính xác về 0 lượt thi
          try {
            localStorage.setItem("edutest_submissions", JSON.stringify([]));
          } catch {}
          callback([]);
          return;
        }

        const firestoreSubs: StudentSubmission[] = [];
        snapshot.forEach((docSnap) => {
          const sub = docSnap.data() as StudentSubmission;
          if (
            sub &&
            sub.id &&
            !currentDeleted.has(sub.id) &&
            (!sub.studentId || !currentDeletedUsers.has(sub.studentId))
          ) {
            firestoreSubs.push(sub);
          }
        });

        // Sắp xếp bài nộp mới nhất lên đầu (theo submittedAt)
        firestoreSubs.sort(
          (a, b) =>
            new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
        );

        // Lưu bền vững vào LocalStorage
        try {
          localStorage.setItem("edutest_submissions", JSON.stringify(firestoreSubs));
        } catch {}

        callback(firestoreSubs);
      },
      (err) => {
        console.warn("Firestore subscribeSubmissions fallback to local:", err);
        const fallback = getLocalSubmissions();
        callback(fallback);
        if (onError) onError(err);
      }
    );
  } catch (error) {
    console.warn("Firestore subscribeSubmissions error:", error);
    const fallback = getLocalSubmissions();
    callback(fallback);
    return () => {};
  }
};


export const saveSubmissionToFirestore = async (
  sub: StudentSubmission
): Promise<void> => {
  removeDeletedSubmissionId(sub.id);

  // 1. Cập nhật tức thì vào LocalStorage (Bảo đảm không bao giờ mất dù có ngắt mạng hay F5)
  try {
    const current = getLocalSubmissions();
    const filtered = current.filter((s) => s.id !== sub.id);
    const updated = [sub, ...filtered];
    localStorage.setItem("edutest_submissions", JSON.stringify(updated));
  } catch (err) {
    console.warn("Lỗi lưu LocalStorage:", err);
  }

  // 2. Gửi lên backend server Express
  try {
    fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub),
    }).catch(() => {});
  } catch {}

  // 3. Lưu bền vững vào Firebase Firestore
  try {
    const cleanSub = cleanForFirestore(sub);
    const ref = doc(db, SUBMISSIONS_COLLECTION, sub.id);
    await setDoc(ref, cleanSub, { merge: true });
  } catch (err) {
    console.warn("Lỗi khi lưu bài nộp lên Firestore (đã lưu cache an toàn):", err);
  }
};

export const deleteSubmissionFromFirestore = async (
  subId: string
): Promise<void> => {
  addDeletedSubmissionId(subId);

  try {
    const current = getLocalSubmissions();
    const updated = current.filter((s) => s.id !== subId);
    localStorage.setItem("edutest_submissions", JSON.stringify(updated));
  } catch {}

  try {
    const ref = doc(db, SUBMISSIONS_COLLECTION, subId);
    await deleteDoc(ref);
  } catch (err) {
    console.warn("Lỗi khi xóa bài nộp trên Firestore:", err);
  }
};

export const seedInitialSubmissions = async (): Promise<void> => {
  try {
    for (const sub of initialSampleSubmissions) {
      const cleanSub = cleanForFirestore(sub);
      const ref = doc(db, SUBMISSIONS_COLLECTION, sub.id);
      await setDoc(ref, cleanSub, { merge: true });
    }
    try {
      localStorage.setItem("edutest_submissions", JSON.stringify(initialSampleSubmissions));
    } catch {}
  } catch (err) {
    console.warn("Lỗi nạp bài nộp mẫu:", err);
  }
};

// ----------------------------------------------------
// 4. Phòng thi Live thời gian thực (LiveRooms)
// ----------------------------------------------------
const LIVEROOMS_COLLECTION = "liveRooms";

export const subscribeLiveRoom = (
  pin: string,
  callback: (room: LiveRoom | null) => void
) => {
  try {
    const ref = doc(db, LIVEROOMS_COLLECTION, pin);
    return onSnapshot(ref, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as LiveRoom);
      } else {
        callback(null);
      }
    });
  } catch (error) {
    console.warn("Firestore subscribeLiveRoom error:", error);
    return () => {};
  }
};

export const updateLiveRoomInFirestore = async (
  pin: string,
  data: Partial<LiveRoom>
): Promise<void> => {
  try {
    const cleanData = cleanForFirestore(data);
    const ref = doc(db, LIVEROOMS_COLLECTION, pin);
    await setDoc(ref, cleanData, { merge: true });
  } catch (err) {
    console.warn("Lỗi cập nhật LiveRoom lên Firestore:", err);
  }
};

/**
 * Xóa sạch 100% dữ liệu cũ (Tài khoản học sinh, bài làm, điểm số, đề thi)
 * và đưa hệ thống về trạng thái sạch sẽ trên Project mới MPEduCenter-Test.
 */
export const wipeAndResetAllData = async (): Promise<void> => {
  try {
    // 1. Dọn sạch toàn bộ LocalStorage
    localStorage.removeItem("mpeducenter_users");
    localStorage.removeItem("edutest_exams");
    localStorage.removeItem("edutest_submissions");
    localStorage.removeItem(DELETED_USERS_KEY);
    localStorage.removeItem(DELETED_EXAMS_KEY);
    localStorage.removeItem(DELETED_SUBMISSIONS_KEY);

    // 2. Xóa sạch submissions trên Firestore
    try {
      const subDocs = await getDocs(collection(db, SUBMISSIONS_COLLECTION));
      for (const d of subDocs.docs) {
        await deleteDoc(d.ref);
      }
    } catch (e) {
      console.warn("Lỗi xóa submissions:", e);
    }

    // 3. Xóa sạch exams trên Firestore
    try {
      const examDocs = await getDocs(collection(db, EXAMS_COLLECTION));
      for (const d of examDocs.docs) {
        await deleteDoc(d.ref);
      }
    } catch (e) {
      console.warn("Lỗi xóa exams:", e);
    }

    // 4. Xóa sạch live rooms
    try {
      const roomDocs = await getDocs(collection(db, LIVEROOMS_COLLECTION));
      for (const d of roomDocs.docs) {
        await deleteDoc(d.ref);
      }
    } catch (e) {
      console.warn("Lỗi xóa live rooms:", e);
    }

    // 5. Làm sạch danh sách người dùng và tạo lại duy nhất tài khoản Quản trị viên gốc
    try {
      const userDocs = await getDocs(collection(db, USERS_COLLECTION));
      for (const d of userDocs.docs) {
        await deleteDoc(d.ref);
      }
      const rootAdmin = INITIAL_USERS[0];
      if (rootAdmin) {
        const ref = doc(db, USERS_COLLECTION, rootAdmin.id);
        await setDoc(ref, cleanForFirestore(rootAdmin));
      }
    } catch (e) {
      console.warn("Lỗi reset users:", e);
    }
  } catch (err) {
    console.error("Lỗi xóa sạch dữ liệu:", err);
  }
};
