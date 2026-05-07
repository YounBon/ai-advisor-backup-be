/**
 * helpers.js — Dữ liệu tiếng Việt, GPA logic, risk calc, feedback texts
 */

const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô'];
const TEN_NAM = ['Anh', 'Bình', 'Dũng', 'Hùng', 'Khoa', 'Minh', 'Nam', 'Phúc', 'Quân', 'Thành', 'Tuấn', 'Việt', 'Hải', 'Long', 'Đức', 'Tùng', 'Kiên', 'Mạnh'];
const TEN_NU = ['An', 'Chi', 'Giang', 'Hoa', 'Lan', 'Linh', 'Mai', 'Ngọc', 'Oanh', 'Phương', 'Thảo', 'Vy', 'Trang', 'Hằng', 'Nhung', 'Yến', 'Diệu', 'Quỳnh'];
const TEN_DEM_NAM = ['Văn', 'Đình', 'Quốc', 'Minh', 'Hữu', 'Công', 'Đức', 'Trọng', 'Xuân', 'Thanh'];
const TEN_DEM_NU = ['Thị', 'Ngọc', 'Thanh', 'Minh', 'Bích', 'Kim', 'Thu', 'Hồng', 'Phương'];

function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
}

function round2(n) {
    return Math.round(n * 100) / 100;
}

function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}

function randomName(gender) {
    const ho = randomItem(HO);
    if (gender === 'MALE') {
        const dem = randomItem(TEN_DEM_NAM);
        const ten = randomItem(TEN_NAM);
        return `${ho} ${dem} ${ten}`;
    } else {
        const dem = randomItem(TEN_DEM_NU);
        const ten = randomItem(TEN_NU);
        return `${ho} ${dem} ${ten}`;
    }
}

/**
 * Tạo username từ full_name (không dấu, lowercase, thêm số nếu cần)
 */
function nameToUsername(fullName, suffix = '') {
    const map = {
        à: 'a', á: 'a', ả: 'a', ã: 'a', ạ: 'a', ă: 'a', ắ: 'a', ặ: 'a', ằ: 'a', ẳ: 'a', ẵ: 'a',
        â: 'a', ấ: 'a', ầ: 'a', ẩ: 'a', ẫ: 'a', ậ: 'a',
        è: 'e', é: 'e', ẻ: 'e', ẽ: 'e', ẹ: 'e', ê: 'e', ế: 'e', ề: 'e', ể: 'e', ễ: 'e', ệ: 'e',
        ì: 'i', í: 'i', ỉ: 'i', ĩ: 'i', ị: 'i',
        ò: 'o', ó: 'o', ỏ: 'o', õ: 'o', ọ: 'o', ô: 'o', ố: 'o', ồ: 'o', ổ: 'o', ỗ: 'o', ộ: 'o',
        ơ: 'o', ớ: 'o', ờ: 'o', ở: 'o', ỡ: 'o', ợ: 'o',
        ù: 'u', ú: 'u', ủ: 'u', ũ: 'u', ụ: 'u', ư: 'u', ứ: 'u', ừ: 'u', ử: 'u', ữ: 'u', ự: 'u',
        ỳ: 'y', ý: 'y', ỷ: 'y', ỹ: 'y', ỵ: 'y',
        đ: 'd',
        À: 'A', Á: 'A', Ả: 'A', Ã: 'A', Ạ: 'A', Ă: 'A', Ắ: 'A', Ặ: 'A', Ằ: 'A', Ẳ: 'A', Ẵ: 'A',
        Â: 'A', Ấ: 'A', Ầ: 'A', Ẩ: 'A', Ẫ: 'A', Ậ: 'A',
        È: 'E', É: 'E', Ẻ: 'E', Ẽ: 'E', Ẹ: 'E', Ê: 'E', Ế: 'E', Ề: 'E', Ể: 'E', Ễ: 'E', Ệ: 'E',
        Ì: 'I', Í: 'I', Ỉ: 'I', Ĩ: 'I', Ị: 'I',
        Ò: 'O', Ó: 'O', Ỏ: 'O', Õ: 'O', Ọ: 'O', Ô: 'O', Ố: 'O', Ồ: 'O', Ổ: 'O', Ỗ: 'O', Ộ: 'O',
        Ơ: 'O', Ớ: 'O', Ờ: 'O', Ở: 'O', Ỡ: 'O', Ợ: 'O',
        Ù: 'U', Ú: 'U', Ủ: 'U', Ũ: 'U', Ụ: 'U', Ư: 'U', Ứ: 'U', Ừ: 'U', Ử: 'U', Ữ: 'U', Ự: 'U',
        Ỳ: 'Y', Ý: 'Y', Ỷ: 'Y', Ỹ: 'Y', Ỵ: 'Y',
        Đ: 'D',
    };
    const parts = fullName.split(' ');
    const lastName = parts[parts.length - 1];
    const firstInitial = parts[0];
    const middleInitials = parts.slice(1, -1).map(p => p[0]).join('');
    const normalized = (lastName + firstInitial[0] + middleInitials)
        .split('')
        .map(c => map[c] || c)
        .join('')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
    return normalized + (suffix ? suffix : '');
}

/**
 * GPA ban đầu theo tier
 */
function initialGPA(tier) {
    switch (tier) {
        case 'A': return round2(randomInRange(3.2, 3.6));
        case 'B': return round2(randomInRange(2.5, 3.0));
        case 'C': return round2(randomInRange(2.0, 2.6));
        case 'D': return round2(randomInRange(1.2, 2.2));
    }
}

/**
 * GPA kỳ tiếp theo — nhất quán theo tier
 */
function nextGPA(tier, prevGPA) {
    let delta;
    switch (tier) {
        case 'A':
            delta = randomInRange(-0.1, 0.25);
            break;
        case 'B':
            delta = randomInRange(-0.2, 0.2);
            break;
        case 'C':
            delta = randomInRange(-0.4, 0.35);
            break;
        case 'D':
            delta = randomInRange(-0.3, 0.1);
            break;
        default:
            delta = 0;
    }
    const bounds = {
        A: [2.8, 4.0],
        B: [2.2, 3.5],
        C: [1.5, 3.2],
        D: [0.5, 2.6],
    };
    const [lo, hi] = bounds[tier];
    return round2(clamp(prevGPA + delta, lo, hi));
}

/**
 * Risk tương quan GPA
 */
function calcRisk(gpa) {
    if (gpa < 2.0) return { risk_label: -1, risk_score: round2(randomInRange(0.70, 0.95)) };
    if (gpa < 2.8) return { risk_label: 0, risk_score: round2(randomInRange(0.40, 0.69)) };
    return { risk_label: 1, risk_score: round2(randomInRange(0.05, 0.39)) };
}

/**
 * Sentiment tương quan GPA + stress
 */
function calcSentiment(gpa, stressLevel) {
    if (gpa >= 3.0 && stressLevel <= 2) return 'POSITIVE';
    if (gpa < 2.0 || stressLevel >= 4) return 'NEGATIVE';
    return 'NEUTRAL';
}

/**
 * Feedback score từ sentiment
 */
function sentimentScore(label) {
    if (label === 'POSITIVE') return round2(randomInRange(0.4, 1.0));
    if (label === 'NEGATIVE') return round2(randomInRange(-1.0, -0.3));
    return round2(randomInRange(-0.2, 0.3));
}

const FEEDBACK_TEXTS = {
    POSITIVE: [
        'Thầy hướng dẫn rất tận tình, em hiểu bài hơn sau buổi gặp.',
        'Buổi họp rất bổ ích, em được giải đáp nhiều thắc mắc về kế hoạch học tập.',
        'Em cảm thấy có động lực hơn sau khi gặp cố vấn, cảm ơn thầy rất nhiều.',
        'Thầy cho em nhiều lời khuyên thiết thực, em sẽ cố gắng thực hiện.',
        'Em rất vui vì được thầy quan tâm và định hướng rõ ràng cho học kỳ này.',
        'Buổi gặp giúp em tự tin hơn vào kế hoạch học tập của mình.',
        'Thầy giải thích rất dễ hiểu, em biết mình cần làm gì tiếp theo.',
    ],
    NEUTRAL: [
        'Buổi gặp bình thường, em vẫn chưa rõ hướng giải quyết một số vấn đề.',
        'Em đang cố gắng cải thiện, nhưng vẫn còn nhiều khó khăn cần vượt qua.',
        'Thầy có lắng nghe, nhưng chưa có giải pháp cụ thể cho tình huống của em.',
        'Em hiểu được một phần, nhưng vẫn cần thêm thời gian để suy nghĩ.',
        'Buổi họp ổn, em sẽ cố gắng áp dụng những gì thầy chia sẻ.',
        'Em chưa chắc chắn về hướng đi, nhưng sẽ tiếp tục cố gắng.',
    ],
    NEGATIVE: [
        'Em không muốn đi học nữa, cảm thấy rất chán nản và mệt mỏi.',
        'Em thấy mệt mỏi, không có động lực học, hay bỏ lỡ các buổi học.',
        'Em cảm thấy áp lực lắm, không biết phải làm sao để cải thiện.',
        'Em đang rất stress, khó tập trung vào việc học và các bài tập.',
        'Em lo lắng về kết quả học tập, sợ không đủ điều kiện thi.',
        'Mọi thứ đang rất khó khăn, em không biết có thể tiếp tục không.',
        'Em cảm thấy bị bỏ lại phía sau so với các bạn trong lớp.',
    ],
};

function pickFeedbackText(sentiment) {
    const pool = FEEDBACK_TEXTS[sentiment];
    return pool[Math.floor(Math.random() * pool.length)];
}

function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Tạo attendance_rate tương quan GPA
 */
function calcAttendance(gpa) {
    if (gpa >= 3.2) return round2(randomInRange(0.85, 1.0));
    if (gpa >= 2.5) return round2(randomInRange(0.70, 0.90));
    if (gpa >= 2.0) return round2(randomInRange(0.55, 0.80));
    return round2(randomInRange(0.30, 0.65));
}

/**
 * Số môn trượt tương quan GPA
 */
function calcNumFailed(gpa) {
    if (gpa >= 3.0) return 0;
    if (gpa >= 2.5) return Math.random() < 0.1 ? 1 : 0;
    if (gpa >= 2.0) return Math.random() < 0.35 ? Math.floor(randomInRange(1, 3)) : 0;
    return Math.floor(randomInRange(1, 4));
}

/**
 * Stress level tương quan GPA (nghịch chiều)
 */
function calcStress(gpa) {
    if (gpa >= 3.2) return Math.floor(randomInRange(1, 2.5));
    if (gpa >= 2.5) return Math.floor(randomInRange(2, 3.5));
    if (gpa >= 2.0) return Math.floor(randomInRange(3, 4.5));
    return Math.floor(randomInRange(4, 5.5));
}

/**
 * Motivation score tương quan GPA
 */
function calcMotivation(gpa) {
    if (gpa >= 3.2) return Math.floor(randomInRange(3.5, 5.5));
    if (gpa >= 2.5) return Math.floor(randomInRange(2.5, 4.5));
    if (gpa >= 2.0) return Math.floor(randomInRange(2, 3.5));
    return Math.floor(randomInRange(1, 2.5));
}

/**
 * Severity của alert dựa trên risk_label
 */
function calcAlertSeverity(riskLabel, gpa) {
    if (riskLabel === -1) return gpa < 1.5 ? 'HIGH' : 'MEDIUM';
    if (riskLabel === 0) return 'LOW';
    return 'LOW';
}

module.exports = {
    randomItem,
    randomInRange,
    round2,
    clamp,
    randomName,
    nameToUsername,
    initialGPA,
    nextGPA,
    calcRisk,
    calcSentiment,
    sentimentScore,
    pickFeedbackText,
    randomDate,
    calcAttendance,
    calcNumFailed,
    calcStress,
    calcMotivation,
    calcAlertSeverity,
    FEEDBACK_TEXTS,
};
