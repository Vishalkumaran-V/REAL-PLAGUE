import express from "express";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

// MongoDB connection
const mongoURI = process.env.MONGODB_URI;
if (mongoURI) {
  mongoose.connect(mongoURI).catch(err => console.error("MongoDB error:", err));
}

// User Schema (Simplified for the API)
const UserSchema = new mongoose.Schema({ uid: { type: String, unique: true } }, { strict: false });
const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);

// --- Routes ---

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.post("/api/contact", async (req, res) => {
  const { name, email, message } = req.body;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (smtpUser && smtpPass) {
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.sendMail({
        from: `"Plague System" <${smtpUser}>`,
        to: "plaguesupport@gmail.com",
        subject: `Plague Inquiry from ${name}`,
        text: `Message: ${message}\n\nFrom: ${name} (${email})`,
      });
    } catch (error) {
      console.error("Email failed:", error);
    }
  }
  res.json({ success: true });
});

// User API
app.get("/api/users/:uid", async (req, res) => {
  try {
    const user = await UserModel.findOne({ uid: req.params.uid });
    if (!user) return res.status(404).json({ error: "Not found" });
    res.json(user);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/users/:uid", async (req, res) => {
  try {
    const user = await UserModel.findOneAndUpdate({ uid: req.params.uid }, { $set: req.body }, { upsert: true, new: true });
    res.json(user);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/users/:uid", async (req, res) => {
  try {
    const user = await UserModel.findOneAndUpdate({ uid: req.params.uid }, { $set: req.body }, { upsert: true, new: true });
    res.json(user);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --- Gemini API (Proxying to the server-side logic) ---
import { 
  generateLearningPath, 
  adaptContent, 
  generateSchedule, 
  generateStudyNotes, 
  generateAssessment, 
  summarizeContent, 
  scheduleStudyPlan, 
  analyzeResume, 
  solveDoubtStream, 
  regenerateBlueprint, 
  regenerateStepsFromBlueprint 
} from "../src/server/gemini.ts";

app.post("/api/gemini/generatePath", async (req, res) => {
  try { res.json(await generateLearningPath(req.body)); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/gemini/adaptContent", async (req, res) => {
  try { res.json(await adaptContent(req.body.step, req.body.feedback)); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/gemini/generateSchedule", async (req, res) => {
  try { res.json(await generateSchedule(req.body.profile, req.body.goals, req.body.selectedModules, req.body.studyDuration)); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/gemini/generateStudyNotes", async (req, res) => {
  try { res.json(await generateStudyNotes(req.body.subject, req.body.level)); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/gemini/generateAssessment", async (req, res) => {
  try { res.json(await generateAssessment(req.body.subject, req.body.level, req.body.notesContext, req.body.isSecondAttempt)); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/gemini/summarize", async (req, res) => {
  try { res.json({ text: await summarizeContent(req.body.content, req.body.depth, req.body.file) }); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/gemini/schedulePlan", async (req, res) => {
  try { res.json({ text: await scheduleStudyPlan(req.body.module, req.body.hours, req.body.days, req.body.context) }); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/gemini/analyzeResume", async (req, res) => {
  try { res.json(await analyzeResume(req.body.data, req.body.mimeType)); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/gemini/solveDoubtStream", async (req, res) => {
  const { context, userMessage, history, mode } = req.body;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  try {
    const stream = solveDoubtStream(context, userMessage, history, mode);
    for await (const chunk of stream) { res.write(chunk); }
    res.end();
  } catch (e: any) { res.write(`Error: ${e.message}`); res.end(); }
});

app.post("/api/gemini/regenerateBlueprint", async (req, res) => {
  try { res.json({ text: await regenerateBlueprint(req.body) }); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/gemini/regenerateSteps", async (req, res) => {
  try { res.json(await regenerateStepsFromBlueprint(req.body.blueprint, req.body.existingSteps)); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/gemini/mentorChat", async (req, res) => {
    try { res.json(await mentorChat(req.body.history, req.body.currentBlueprint)); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/gemini/assistantChat", async (req, res) => {
    try { res.json(await assistantChat(req.body.history, req.body.context)); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default app;
