// Tiến trình con cho process-guard.test.ts: bật guard, tạo unhandled rejection giống nhánh
// luồng Gemini hỏng, rồi kiểm tra tiến trình vẫn sống.
import { installProcessGuard } from "../../src/lib/process-guard.js";

const withGuard = process.argv[2] === "guard";
if (withGuard) installProcessGuard((msg) => console.log("LOGGED", msg));

void Promise.reject(new Error("[GoogleGenerativeAI Error]: Failed to parse stream"));
setTimeout(() => console.log("ALIVE"), 100);
