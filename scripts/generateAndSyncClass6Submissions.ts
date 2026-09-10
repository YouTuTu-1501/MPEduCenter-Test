import fs from "fs";
import path from "path";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDocs } from "firebase/firestore";
import config from "../firebase-applet-config.json";

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

const correctAnswers: Record<string, string> = {
  q_part_1_1: "D",
  q_part_1_2: "B",
  q_part_1_3: "B",
  q_part_1_4: "A",
  q_part_1_5: "B",
  q_part_1_6: "A",
  q_part_1_7: "D",
  q_part_1_8: "A",
  q_part_1_9: "B",
  q_part_1_10: "D",
  q_part_1_11: "A",
  q_part_1_12: "C",
  q_part_1_13: "A",
  q_part_1_14: "B",
  q_part_1_15: "C",
  q_part_1_16: "A",
  q_part_1_17: "B",
  q_part_1_18: "B",
  q_part_1_19: "C",
};

const qKeys = Object.keys(correctAnswers);

function generateDetails(correctCount: number) {
  const details: Record<string, any> = {};
  const answers: Record<string, string> = {};

  qKeys.forEach((key, index) => {
    const isCorrect = index < correctCount;
    const correctAns = correctAnswers[key];
    let userAns = correctAns;
    if (!isCorrect) {
      const options = ["A", "B", "C", "D"].filter((o) => o !== correctAns);
      userAns = options[index % options.length];
    }
    answers[key] = userAns;
    details[key] = {
      isCorrect,
      earnedScore: isCorrect ? 0.25 : 0,
      maxScore: 0.25,
      userAnswer: userAns,
      correctAnswer: correctAns,
      feedback: isCorrect ? "Chính xác" : `Đáp án đúng là ${correctAns}`,
    };
  });

  return { details, answers };
}

const students = [
  {
    studentId: "usr_1788281798571_15_veex",
    studentName: "Lê Nguyễn Hoàng Linh",
    studentEmail: "linh.lnh@student.vn",
    candidateNumber: "SBD-10107",
    studentAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=L%C3%AA%20Nguy%E1%BB%85n%20Ho%C3%A0ng%20Linh",
    attempts: [
      { id: "sub_1788619100101_hoanglinh6_1", correctCount: 15, score: 3.75, submittedAt: "2026-09-04T08:15:00.000Z", timeSpentSeconds: 1500 },
      { id: "sub_1788619100102_hoanglinh6_2", correctCount: 17, score: 4.25, submittedAt: "2026-09-05T09:30:00.000Z", timeSpentSeconds: 1320 },
      { id: "sub_1788619100103_hoanglinh6_3", correctCount: 19, score: 4.75, submittedAt: "2026-09-05T15:20:00.000Z", timeSpentSeconds: 1150 },
    ],
  },
  {
    studentId: "usr_1788281798571_11_jip1",
    studentName: "Trần Hữu Tuệ Minh",
    studentEmail: "minh.tht@student.vn",
    candidateNumber: "SBD-10103",
    studentAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Tr%E1%BA%A7n%20H%E1%BB%AFu%20Tu%E1%BB%87%20Minh",
    attempts: [
      { id: "sub_1788619100104_tueminh6_1", correctCount: 14, score: 3.5, submittedAt: "2026-09-04T08:30:00.000Z", timeSpentSeconds: 1600 },
      { id: "sub_1788619100105_tueminh6_2", correctCount: 16, score: 4.0, submittedAt: "2026-09-04T16:00:00.000Z", timeSpentSeconds: 1480 },
      { id: "sub_1788619100123_tueminh6", correctCount: 18, score: 4.5, submittedAt: "2026-09-05T14:40:00.000Z", timeSpentSeconds: 1450 },
    ],
  },
  {
    studentId: "usr_1788281798571_2_7ebz",
    studentName: "Nguyễn Hoàng Lân",
    studentEmail: "lan.nh@student.vn",
    candidateNumber: "SBD-10112",
    studentAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Nguy%E1%BB%85n%20Ho%C3%A0ng%20L%C3%A2n",
    attempts: [
      { id: "sub_1788619100106_hoanglan6_1", correctCount: 14, score: 3.5, submittedAt: "2026-09-04T09:10:00.000Z", timeSpentSeconds: 1650 },
      { id: "sub_1788619100107_hoanglan6_2", correctCount: 16, score: 4.0, submittedAt: "2026-09-04T15:20:00.000Z", timeSpentSeconds: 1420 },
      { id: "sub_1788619100108_hoanglan6_3", correctCount: 17, score: 4.25, submittedAt: "2026-09-05T14:15:00.000Z", timeSpentSeconds: 1350 },
    ],
  },
  {
    studentId: "usr_1788281798571_1_g7al",
    studentName: "Nguyễn Thị Thu Hằng",
    studentEmail: "hang.ntt1@student.vn",
    candidateNumber: "SBD-10111",
    studentAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Nguy%E1%BB%85n%20Th%E1%BB%8B%20Thu%20H%E1%BA%B1ng",
    attempts: [
      { id: "sub_1788619100109_thuhang6_1", correctCount: 14, score: 3.5, submittedAt: "2026-09-04T09:45:00.000Z", timeSpentSeconds: 1680 },
      { id: "sub_1788619100110_thuhang6_2", correctCount: 16, score: 4.0, submittedAt: "2026-09-05T11:00:00.000Z", timeSpentSeconds: 1400 },
    ],
  },
  {
    studentId: "usr_1788281798571_10_x0ma",
    studentName: "Tôn Thất Hà Huy Minh",
    studentEmail: "minh.tthh@student.vn",
    candidateNumber: "SBD-10102",
    studentAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Calculator&backgroundColor=bae6fd",
    attempts: [
      { id: "sub_1788619100111_huyminh6_1", correctCount: 13, score: 3.25, submittedAt: "2026-09-04T10:15:00.000Z", timeSpentSeconds: 1700 },
      { id: "sub_1788619100112_huyminh6_2", correctCount: 15, score: 3.75, submittedAt: "2026-09-05T10:30:00.000Z", timeSpentSeconds: 1450 },
    ],
  },
  {
    studentId: "usr_1788281798571_12_klfh",
    studentName: "Trần Văn Quốc Việt",
    studentEmail: "viet.tvq@student.vn",
    candidateNumber: "SBD-10104",
    studentAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Tr%E1%BA%A7n%20V%C4%83n%20Qu%E1%BB%91c%20Vi%E1%BB%87t",
    attempts: [
      { id: "sub_1788619100113_quocviet6_1", correctCount: 12, score: 3.0, submittedAt: "2026-09-04T11:00:00.000Z", timeSpentSeconds: 1720 },
      { id: "sub_1788619100114_quocviet6_2", correctCount: 14, score: 3.5, submittedAt: "2026-09-05T09:00:00.000Z", timeSpentSeconds: 1500 },
    ],
  },
  {
    studentId: "usr_1788281798571_13_mpwy",
    studentName: "Nguyễn Nhật Vy Lam",
    studentEmail: "lam.nnv@student.vn",
    candidateNumber: "SBD-10105",
    studentAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Calculator&backgroundColor=bae6fd",
    attempts: [
      { id: "sub_1788619100115_vylam6_1", correctCount: 12, score: 3.0, submittedAt: "2026-09-04T14:20:00.000Z", timeSpentSeconds: 1740 },
      { id: "sub_1788619100116_vylam6_2", correctCount: 14, score: 3.5, submittedAt: "2026-09-05T08:45:00.000Z", timeSpentSeconds: 1510 },
    ],
  },
  {
    studentId: "usr_1788281798571_14_22ve",
    studentName: "Lê Hoàng Khánh An",
    studentEmail: "an.lhk@student.vn",
    candidateNumber: "SBD-10106",
    studentAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=L%C3%AA%20Ho%C3%A0ng%20Kh%C3%A1nh%20An",
    attempts: [
      { id: "sub_1788619100117_khanhan6_1", correctCount: 11, score: 2.75, submittedAt: "2026-09-04T15:00:00.000Z", timeSpentSeconds: 1760 },
      { id: "sub_1788619100118_khanhan6_2", correctCount: 13, score: 3.25, submittedAt: "2026-09-05T13:10:00.000Z", timeSpentSeconds: 1550 },
    ],
  },
  {
    studentId: "usr_1788281798571_16_8s6b",
    studentName: "Nguyễn Thị Thảo Nhi",
    studentEmail: "nhi.ntt@student.vn",
    candidateNumber: "SBD-10108",
    studentAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Nguy%E1%BB%85n%20Th%E1%BB%8B%20Th%E1%BA%A3o%20Nhi",
    attempts: [
      { id: "sub_1788619100119_thaonhi6_1", correctCount: 10, score: 2.5, submittedAt: "2026-09-04T15:45:00.000Z", timeSpentSeconds: 1780 },
      { id: "sub_1788619100120_thaonhi6_2", correctCount: 12, score: 3.0, submittedAt: "2026-09-05T13:40:00.000Z", timeSpentSeconds: 1560 },
    ],
  },
];

async function main() {
  console.log("=== BẮT ĐẦU TẠO VÀ ĐỒNG BỘ 21 BÀI NỘP LỚP 6 ===");

  const class6Submissions: any[] = [];

  students.forEach((st) => {
    st.attempts.forEach((att) => {
      const { details, answers } = generateDetails(att.correctCount);
      const sub = {
        id: att.id,
        examId: "exam_1788282481474",
        examTitle: "ĐỀ KIỂM TRA CHỦ ĐỀ TẬP HỢP SỐ TỰ NHIÊN",
        studentId: st.studentId,
        studentName: st.studentName,
        studentEmail: st.studentEmail,
        studentClass: "6",
        candidateNumber: st.candidateNumber,
        studentAvatar: st.studentAvatar,
        score: att.score,
        maxScore: 4.75,
        submittedAt: att.submittedAt,
        timeSpentSeconds: att.timeSpentSeconds,
        tabSwitchCount: 0,
        tabSwitchLogs: [],
        hasCheatingWarning: false,
        partScores: {
          part_1: { earned: att.score, max: 4.75 },
          part_2: { earned: 0, max: 0 },
          part_3: { earned: 0, max: 0 },
          part_4: { earned: 0, max: 0 },
        },
        answers,
        details,
      };
      class6Submissions.push(sub);
    });
  });

  console.log(`Đã tạo thành công ${class6Submissions.length} bài nộp của Lớp 6.`);

  // Đọc danh sách hiện tại từ data/submissions.json
  const subsFile = path.join(process.cwd(), "data", "submissions.json");
  let existingSubs: any[] = [];
  if (fs.existsSync(subsFile)) {
    try {
      existingSubs = JSON.parse(fs.readFileSync(subsFile, "utf-8"));
    } catch (e) {
      console.warn("Lỗi đọc file:", e);
    }
  }

  // Hợp nhất: Thay thế hoặc thêm vào
  const mergedMap = new Map<string, any>();
  existingSubs.forEach((s) => {
    if (s && s.id) mergedMap.set(s.id, s);
  });
  class6Submissions.forEach((s) => {
    mergedMap.set(s.id, s);
  });

  const finalSubmissions = Array.from(mergedMap.values());
  // Sắp xếp bài nộp mới nhất lên đầu
  finalSubmissions.sort(
    (a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
  );

  console.log(`Tổng số bài nộp sau hợp nhất: ${finalSubmissions.length}`);
  const classBreakdown: Record<string, number> = {};
  finalSubmissions.forEach((s) => {
    const c = s.studentClass || "unknown";
    classBreakdown[c] = (classBreakdown[c] || 0) + 1;
  });
  console.log("Phân bố lớp sau hợp nhất:", classBreakdown);

  // 1. Ghi vào data/submissions.json
  fs.writeFileSync(subsFile, JSON.stringify(finalSubmissions, null, 2), "utf-8");
  console.log("Đã cập nhật data/submissions.json!");

  // 2. Ghi vào src/data/sampleSubmissions.ts
  const sampleFile = path.join(process.cwd(), "src", "data", "sampleSubmissions.ts");
  const sampleTsContent = `import { StudentSubmission } from "../types/exam";

export const initialSampleSubmissions: StudentSubmission[] = ${JSON.stringify(
    finalSubmissions,
    null,
    2
  )};
`;
  fs.writeFileSync(sampleFile, sampleTsContent, "utf-8");
  console.log("Đã cập nhật src/data/sampleSubmissions.ts!");

  // 3. Đẩy lên Cloud Firestore
  console.log("Đang đồng bộ trực tiếp lên Cloud Firestore...");
  let uploadedCount = 0;
  for (const sub of class6Submissions) {
    try {
      await setDoc(doc(db, "submissions", sub.id), sub, { merge: true });
      uploadedCount++;
    } catch (e) {
      console.error(`Lỗi khi đẩy bài nộp ${sub.id} lên Firestore:`, e);
    }
  }
  console.log(`Đã đẩy thành công ${uploadedCount}/${class6Submissions.length} bài nộp lên Cloud Firestore!`);

  // Kiểm tra lại toàn bộ collection submissions trên Firestore
  const snap = await getDocs(collection(db, "submissions"));
  const fsClasses: Record<string, number> = {};
  snap.docs.forEach((d) => {
    const data = d.data();
    const c = data.studentClass || "unknown";
    fsClasses[c] = (fsClasses[c] || 0) + 1;
  });
  console.log(`Kiểm tra lại Firestore: Tổng ${snap.size} bài nộp.`);
  console.log("Phân bố lớp trên Firestore:", fsClasses);

  process.exit(0);
}

main().catch((err) => {
  console.error("Lỗi:", err);
  process.exit(1);
});
