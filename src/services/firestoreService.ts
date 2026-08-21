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

// ----------------------------------------------------
// 1. Quản lý Người dùng (Users & Roles)
// ----------------------------------------------------
const USERS_COLLECTION = "users";

export const subscribeUsers = (
  callback: (users: User[]) => void,
  onError?: (error: Error) => void
) => {
  try {
    const q = query(collection(db, USERS_COLLECTION));
    return onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          // Khởi tạo người dùng mẫu nếu Firestore trống
          seedInitialUsers().then(() => {
            callback(INITIAL_USERS);
          });
          return;
        }
        const users: User[] = [];
        snapshot.forEach((docSnap) => {
          users.push(docSnap.data() as User);
        });
        callback(users);
      },
      (err) => {
        console.warn("Firestore subscribeUsers fallback:", err);
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
    const ref = doc(db, USERS_COLLECTION, user.id);
    await setDoc(ref, user, { merge: true });
  } catch (err) {
    console.error("Lỗi khi lưu người dùng lên Firestore:", err);
    throw err;
  }
};

export const saveUsersBatchToFirestore = async (users: User[]): Promise<void> => {
  try {
    for (const u of users) {
      const ref = doc(db, USERS_COLLECTION, u.id);
      await setDoc(ref, u, { merge: true });
    }
  } catch (err) {
    console.error("Lỗi khi lưu danh sách người dùng lên Firestore:", err);
    throw err;
  }
};

export const deleteUserFromFirestore = async (userId: string): Promise<void> => {
  try {
    const ref = doc(db, USERS_COLLECTION, userId);
    await deleteDoc(ref);
  } catch (err) {
    console.error("Lỗi khi xóa người dùng trên Firestore:", err);
    throw err;
  }
};

export const seedInitialUsers = async (): Promise<void> => {
  try {
    for (const u of INITIAL_USERS) {
      const ref = doc(db, USERS_COLLECTION, u.id);
      await setDoc(ref, u, { merge: true });
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
  try {
    const q = query(collection(db, EXAMS_COLLECTION));
    return onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          seedInitialExams().then(() => {
            callback(initialSampleExams);
          });
          return;
        }
        const exams: Exam[] = [];
        snapshot.forEach((docSnap) => {
          exams.push(docSnap.data() as Exam);
        });
        callback(exams);
      },
      (err) => {
        console.warn("Firestore subscribeExams fallback:", err);
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
    const ref = doc(db, EXAMS_COLLECTION, exam.id);
    await setDoc(ref, exam, { merge: true });
  } catch (err) {
    console.error("Lỗi khi lưu đề thi lên Firestore:", err);
    throw err;
  }
};

export const deleteExamFromFirestore = async (examId: string): Promise<void> => {
  try {
    const ref = doc(db, EXAMS_COLLECTION, examId);
    await deleteDoc(ref);
  } catch (err) {
    console.error("Lỗi khi xóa đề thi trên Firestore:", err);
    throw err;
  }
};

export const seedInitialExams = async (): Promise<void> => {
  try {
    for (const exam of initialSampleExams) {
      const ref = doc(db, EXAMS_COLLECTION, exam.id);
      await setDoc(ref, exam, { merge: true });
    }
  } catch (err) {
    console.warn("Lỗi nạp đề thi mẫu:", err);
  }
};

// ----------------------------------------------------
// 3. Quản lý Kết quả & Bài nộp (Submissions)
// ----------------------------------------------------
const SUBMISSIONS_COLLECTION = "submissions";

export const subscribeSubmissions = (
  callback: (subs: StudentSubmission[]) => void,
  onError?: (error: Error) => void
) => {
  try {
    const q = query(collection(db, SUBMISSIONS_COLLECTION));
    return onSnapshot(
      q,
      (snapshot) => {
        const subs: StudentSubmission[] = [];
        snapshot.forEach((docSnap) => {
          subs.push(docSnap.data() as StudentSubmission);
        });
        // Sắp xếp bài nộp mới nhất lên đầu
        subs.sort(
          (a, b) =>
            new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );
        callback(subs);
      },
      (err) => {
        console.warn("Firestore subscribeSubmissions fallback:", err);
        if (onError) onError(err);
      }
    );
  } catch (error) {
    console.warn("Firestore subscribeSubmissions error:", error);
    return () => {};
  }
};

export const saveSubmissionToFirestore = async (
  sub: StudentSubmission
): Promise<void> => {
  try {
    const ref = doc(db, SUBMISSIONS_COLLECTION, sub.id);
    await setDoc(ref, sub, { merge: true });
  } catch (err) {
    console.error("Lỗi khi lưu bài nộp lên Firestore:", err);
    throw err;
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
    const ref = doc(db, LIVEROOMS_COLLECTION, pin);
    await setDoc(ref, data, { merge: true });
  } catch (err) {
    console.error("Lỗi cập nhật LiveRoom lên Firestore:", err);
  }
};
