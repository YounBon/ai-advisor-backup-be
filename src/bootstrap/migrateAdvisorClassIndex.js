require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");

async function migrate() {
    await connectDB();
    const db = mongoose.connection.db;
    const collection = db.collection("advisor_classes");

    const indexes = await collection.indexes();
    console.log("Indexes hiện tại:", indexes.map((i) => i.name));

    const targetIndex = indexes.find(
        (i) => i.unique === true && i.key && i.key.advisor_user_id !== undefined
    );

    if (targetIndex) {
        console.log(`Đang xóa index: ${targetIndex.name} ...`);
        await collection.dropIndex(targetIndex.name);
        console.log("Đã xóa unique index advisor_user_id.");
    } else {
        console.log("Không tìm thấy unique index advisor_user_id — có thể đã được xóa trước đó.");
    }

    const hasNonUniqueIndex = indexes.find(
        (i) => !i.unique && i.key && i.key.advisor_user_id !== undefined
    );
    if (!hasNonUniqueIndex) {
        await collection.createIndex({ advisor_user_id: 1 });
        console.log("Đã tạo non-unique index advisor_user_id.");
    } else {
        console.log("Non-unique index advisor_user_id đã tồn tại.");
    }

    console.log("Migration hoàn tất.");
    await mongoose.disconnect();
    process.exit(0);
}

migrate().catch((err) => {
    console.error("Migration thất bại:", err);
    process.exit(1);
});
