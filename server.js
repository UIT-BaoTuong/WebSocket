const express = require('express');
const WebSocket = require('ws');
const cors = require("cors");
const app = express();
app.use(cors()); // 🔥 Cho phép tất cả nguồn truy cập
const port = 8081;
const { Pool } = require("pg");
const pool = new Pool({
    connectionString: "postgresql://neondb_owner:npg_GgWlpFN8TyH1@ep-frosty-thunder-a87ud9bk-pooler.eastus2.azure.neon.tech/neondb?sslmode=require"
});
async function saveMessage(user_id,user_name, content) {
    await pool.query(
        "INSERT INTO messages (user_id, user_name, content, created_at) VALUES ($1, $2, NOW())",
        [user_id,user_name, content]
    );
}
// Tạo server HTTP để chạy Express
const server = app.listen(port, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${port}`);
});

// Tạo WebSocket server trên cùng server HTTP
const wss = new WebSocket.Server({ server });

wss.on('connection', ws => {
    console.log("🔗 Client kết nối!");

    ws.on('message',async  message => {
        console.log(`📩 Nhận tin nhắn: ${message}`);

        // Kiểm tra nếu dữ liệu nhận được là JSON hợp lệ
        try {
            const parsedMessage = JSON.parse(message);
            const responseMessage = {
                user_name: parsedMessage.user_name || "Server",
                content: `${parsedMessage.content}`,
                created_at: new Date().toISOString()
            };
            // Gửi tin nhắn đến tất cả client đang kết nối
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(responseMessage));
                }
            });
            await saveMessage(responseMessage.user_id, responseMessage.content);
        } catch (error) {
            console.error("❌ Lỗi khi phân tích JSON:", error);
            ws.send(JSON.stringify({ user_name: "Server", content: "Dữ liệu không hợp lệ!", created_at: new Date().toISOString() }));
        }
    });
    ws.on('close', () => {
        console.log("❌ Client ngắt kết nối");
    });
});

// API REST đơn giản
app.get('/', (req, res) => {
    res.send('Hello từ Express & WebSocket!');
});
app.get("/messages", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM messages ORDER BY created_at ASC");
        console.log("📩 Dữ liệu từ PostgreSQL:", result.rows); // 🔹 Kiểm tra dữ liệu
        res.json(result.rows);
    } catch (error) {
        console.error("❌ Lỗi khi lấy tin nhắn:", error);
        res.status(500).json({ error: "Lỗi server" });
    }
});
