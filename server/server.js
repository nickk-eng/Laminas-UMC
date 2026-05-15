import crypto from "node:crypto";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import nodemailer from "nodemailer";
import { createDatabase } from "./database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

loadEnvFile();

const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const CODE_TTL_MS = 10 * 60 * 1000;

let dbInstance = null;
let dbInitError = null;
const dbInitPromise = Promise.race([
  createDatabase(),
  new Promise((_, reject) => setTimeout(() => reject(new Error("Database initialization timed out after 15s")), 15000)),
]);
dbInitPromise
  .then((db) => { dbInstance = db; })
  .catch((err) => { dbInitError = err; console.error("[DATABASE] Init failed:", err); });

const SYNC_DB_METHODS = new Set(["verifyPassword", "toPublicUser", "toJsUser", "toExamItem"]);
const database = new Proxy({}, {
  get(target, prop) {
    if (SYNC_DB_METHODS.has(prop)) {
      return (...args) => {
        if (dbInitError) throw dbInitError;
        if (!dbInstance) throw new Error("Database is still initializing.");
        return dbInstance[prop](...args);
      };
    }
    return async (...args) => {
      if (dbInitError) throw dbInitError;
      const db = dbInstance || await dbInitPromise;
      return db[prop](...args);
    };
  },
});

const app = express();

app.use(express.json({ limit: "30mb" }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});
app.use(express.static(projectRoot, { extensions: ["html"], dotfiles: "ignore" }));

app.post("/api/auth/send-code", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!isInstitutionalEmail(email)) {
      return res.status(400).json({ message: "Informe um e-mail que contenha a palavra umc." });
    }

    if (await database.findUserByEmail(email)) {
      return res.status(409).json({ message: "Este e-mail ja esta registado no sistema." });
    }

    const code = generateVerificationCode();
    await sendConfirmationEmail(email, code);
    await database.saveVerificationCode({
      email,
      code,
      expiresAt: Date.now() + CODE_TTL_MS,
    });

    res.json({ message: "Codigo de confirmacao enviado para seu email." });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const name = cleanText(req.body.name);
    const email = normalizeEmail(req.body.email);
    const role = cleanText(req.body.role);
    const rgm = req.body.rgm ? cleanText(req.body.rgm) : null;
    const password = String(req.body.password || "");
    const verificationCode = cleanText(req.body.verificationCode);

    if (!name || !email || !role || !password) {
      return res.status(400).json({ message: "Preencha todos os campos obrigatorios." });
    }

    if (!isInstitutionalEmail(email)) {
      return res.status(400).json({ message: "Registo permitido apenas para e-mails que contenham a palavra umc." });
    }

    if (!["student", "teacher"].includes(role)) {
      return res.status(400).json({ message: "Perfil de cadastro invalido." });
    }

    if (role === "student" && !rgm) {
      return res.status(400).json({ message: "O campo RGM e obrigatorio para Aluno." });
    }

    if (await database.findDuplicateUser({ email, rgm, role })) {
      return res.status(409).json({ message: "Este E-mail ou RGM ja esta registado no sistema da clinica." });
    }

    const verification = await database.verifyEmailCode({ email, code: verificationCode });
    if (!verification.ok && verification.reason === "missing") {
      return res.status(400).json({ message: "Envie o codigo de confirmacao antes de criar a conta." });
    }
    if (!verification.ok && verification.reason === "expired") {
      return res.status(400).json({ message: "O codigo expirou. Envie um novo codigo de confirmacao." });
    }
    if (!verification.ok) {
      return res.status(400).json({ message: "Codigo de confirmacao invalido." });
    }

    await database.createUser({ name, email, rgm, password, role, status: "pending" });
    await database.deleteVerificationCode(email);

    res.status(201).json({
      message: "Registo efetuado com sucesso! A sua conta esta sob analise da coordenacao.",
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const selectedRole = cleanText(req.body.selectedRole);
    const email = normalizeEmail(req.body.email);
    const rgm = req.body.rgm ? cleanText(req.body.rgm) : "";
    const password = String(req.body.password || "");

    if (!selectedRole || !email || !password) {
      return res.status(400).json({ message: "Preencha todos os campos obrigatorios." });
    }

    if (!isInstitutionalEmail(email)) {
      return res.status(400).json({ message: "Insira um e-mail que contenha a palavra umc." });
    }

    if (selectedRole === "student" && !rgm) {
      return res.status(400).json({ message: "O RGM e obrigatorio para Aluno." });
    }

    const user = await database.findUserByEmail(email);
    if (!user || !database.verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ message: "E-mail ou palavra-passe incorretos." });
    }

    if ((selectedRole === "student" && user.role !== "student") || (selectedRole === "admin" && user.role === "student")) {
      return res.status(403).json({ message: "O perfil selecionado nao corresponde ao seu tipo de conta." });
    }

    if (user.role === "student" && user.rgm !== rgm) {
      return res.status(403).json({ message: "O RGM introduzido nao corresponde ao seu registo de aluno." });
    }

    if (user.status === "pending") {
      return res.status(403).json({ message: "A sua conta ainda aguarda aprovacao da coordenacao veterinaria." });
    }

    if (user.status === "rejected") {
      return res.status(403).json({ message: "A sua solicitacao de acesso foi rejeitada." });
    }

    const publicUser = database.toPublicUser(user);
    const token = signToken(publicUser);
    res.json({ token, user: publicUser });
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/me", requireAuth, async (req, res, next) => {
  try {
    const user = req.user?.id ? await database.findUserById(req.user.id) : null;
    if (!user || user.status !== "approved") {
      return res.status(401).json({ message: "Sessao invalida ou expirada." });
    }

    res.json({ user: database.toPublicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/pending-users", requirePermission("manageAccess"), async (req, res, next) => {
  try {
    res.json({ users: await database.listPendingUsers() });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/users/:id/status", requirePermission("manageAccess"), async (req, res, next) => {
  try {
    const status = cleanText(req.body.status);
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Estado de utilizador invalido." });
    }

    const user = await database.updateUserStatus(req.params.id, status);
    if (!user) {
      return res.status(404).json({ message: "Utilizador nao encontrado." });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/students/search", requireProfessorAccount, async (req, res, next) => {
  try {
    const rgm = cleanText(req.query.rgm);
    res.json({ users: rgm.length >= 2 ? await database.searchStudentsByRgm(rgm) : [] });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/students/:id/permissions", requireProfessorAccount, async (req, res, next) => {
  try {
    const password = String(req.body.password || "");
    const operator = await database.findUserById(req.user.id);

    if (!operator || !database.verifyPassword(password, operator.password_hash)) {
      return res.status(403).json({ message: "Senha incorreta. As permissoes nao foram alteradas." });
    }

    const user = await database.updateStudentPermissions(req.params.id, req.body.permissions || {});
    if (!user) {
      return res.status(404).json({ message: "Aluno nao encontrado." });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

app.get("/api/catalog", requireAuth, async (req, res, next) => {
  try {
    res.json({
      species: await database.getSpeciesMap(),
      diseases: await database.getDiseases(),
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/catalog/species", requirePermission("manageSpecies"), async (req, res, next) => {
  try {
    const species = await database.addSpeciesWithBreeds(req.body.speciesName, req.body.breeds || []);
    res.status(201).json({ species });
  } catch (error) {
    next(error);
  }
});

app.post("/api/catalog/organ-lesions", requirePermission("manageLesions"), async (req, res, next) => {
  try {
    const diseases = await database.addOrganLesion(req.body);
    res.status(201).json({ diseases });
  } catch (error) {
    next(error);
  }
});

app.post("/api/catalog/bone-lesions", requirePermission("manageLesions"), async (req, res, next) => {
  try {
    const diseases = await database.addBoneLesion(req.body);
    res.status(201).json({ diseases });
  } catch (error) {
    next(error);
  }
});

app.get("/api/exams", requireAuth, async (req, res, next) => {
  try {
    const collection = cleanText(req.query.collection);
    if (!collection) {
      return res.status(400).json({ message: "Colecao de exames nao informada." });
    }
    res.json({ items: await database.getExamCollection(collection) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/exams/:collection", requireAuth, async (req, res, next) => {
  try {
    const item = await database.addExam(req.params.collection, req.body, req.user);
    res.status(201).json({ item });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/exams/:recordId", requirePermission("deleteComparisonRecords"), async (req, res, next) => {
  try {
    await database.removeExam(req.params.recordId);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error("[API]", error);
  const status = error.status || 500;
  res.status(status).json({ message: error.publicMessage || "Erro interno do servidor." });
});

if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`Lâminas UMC rodando em http://localhost:${PORT}`);
    console.log(`Banco MySQL: ${process.env.DB_NAME || "laminas_umc"}`);
  });
}

export { app };

function cleanText(value) {
  return String(value || "").trim();
}

function normalizeEmail(email) {
  return cleanText(email).toLowerCase();
}

function isInstitutionalEmail(email) {
  return Boolean(email && email.includes("umc"));
}

function generateVerificationCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function signToken(user) {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({ ...user, exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60 }));
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

function verifyToken(token) {
  if (!token) {
    return null;
  }

  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) {
    return null;
  }

  const expected = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${payload}`).digest("base64url");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (!data.exp || Date.now() / 1000 > data.exp) {
    return null;
  }
  return data;
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function requireAuth(req, res, next) {
  const user = getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ message: "Sessao invalida ou expirada." });
    return;
  }
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== "admin") {
    res.status(401).json({ message: "Acesso restrito a administradores." });
    return;
  }
  req.user = user;
  next();
}

function requirePermission(permissionKey) {
  return async (req, res, next) => {
    try {
      const tokenUser = getUserFromRequest(req);
      const user = tokenUser?.id ? await database.findUserById(tokenUser.id) : null;
      if (!user || user.status !== "approved") {
        res.status(401).json({ message: "Sessao invalida ou expirada." });
        return;
      }

      if (!hasPermission(user, permissionKey)) {
        res.status(403).json({ message: "Acesso negado para esta permissao." });
        return;
      }

      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

function requireProfessorAccount(req, res, next) {
  const user = getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ message: "Sessao invalida ou expirada." });
    return;
  }

  if (user.role === "student") {
    res.status(403).json({ message: "Esta acao esta disponivel apenas para conta de professor." });
    return;
  }

  req.user = user;
  next();
}

function hasPermission(user, permissionKey) {
  if (!user) {
    return false;
  }

  if (user.role !== "student") {
    return true;
  }

  return Boolean(user.permissions?.[permissionKey]);
}

function getUserFromRequest(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  return verifyToken(token);
}

async function sendConfirmationEmail(email, code) {
  const smtpConfig = getSmtpConfig();

  if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
    const error = new Error("SMTP nao configurado.");
    error.status = 503;
    error.publicMessage = "Envio de e-mail nao configurado. Configure SMTP_HOST, SMTP_USER e SMTP_PASS no arquivo .env.";
    throw error;
  }

  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass,
    },
  });

  try {
    await transporter.sendMail({
      from: getMailFrom(smtpConfig),
      to: email,
      subject: "Codigo de confirmacao - Lâminas UMC",
      text: `O seu codigo de confirmacao e ${code}. Ele expira em 10 minutos.`,
      html: `<p>O seu codigo de confirmacao e <strong>${code}</strong>.</p><p>Ele expira em 10 minutos.</p>`,
    });
  } catch (error) {
    console.error("[SMTP]", error);
    const publicError = new Error("Falha ao enviar e-mail.");
    publicError.status = 502;
    publicError.publicMessage = getEmailDeliveryMessage(error);
    throw publicError;
  }

  return { sent: true };
}

function getMailFrom(smtpConfig) {
  if (!process.env.SMTP_FROM) {
    return smtpConfig.user;
  }

  if (smtpConfig.host === "smtp.gmail.com" && !process.env.SMTP_FROM.includes(smtpConfig.user)) {
    const displayName = process.env.SMTP_FROM.match(/^(.+?)\s*</)?.[1]?.trim().replace(/^["']|["']$/g, "");
    return displayName ? `${displayName} <${smtpConfig.user}>` : smtpConfig.user;
  }

  return process.env.SMTP_FROM;
}

function getSmtpConfig() {
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASS;
  const host = process.env.SMTP_HOST || (user && user.endsWith("@gmail.com") ? "smtp.gmail.com" : "");
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE).toLowerCase() === "true";

  return { host, port, secure, user, pass };
}

function getEmailDeliveryMessage(error) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toUpperCase();

  if (message.includes("username and password not accepted") || message.includes("invalid login") || code === "EAUTH") {
    return "Gmail recusou o login SMTP. Use uma senha de app do Google em SMTP_PASS, nao a senha normal da conta.";
  }

  if (code === "ECONNECTION" || code === "ETIMEDOUT" || code === "ESOCKET") {
    return "Nao foi possivel conectar ao servidor SMTP. Verifique SMTP_HOST, SMTP_PORT e sua conexao.";
  }

  if (message.includes("self signed") || message.includes("certificate")) {
    return "Falha de certificado no SMTP. Verifique SMTP_SECURE e a porta configurada.";
  }

  return "Falha ao enviar e-mail. Verifique as configuracoes SMTP no arquivo .env e reinicie o servidor.";
}

function loadEnvFile() {
  const envPath = path.join(projectRoot, ".env");
  if (!fsSync.existsSync(envPath)) {
    return;
  }

  const lines = fsSync.readFileSync(envPath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}
