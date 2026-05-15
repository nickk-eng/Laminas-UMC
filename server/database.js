import crypto from "node:crypto";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

const DEFAULT_SPECIES = {
  canino: ["Golden Retriever", "Labrador", "Poodle", "Pug", "Bulldog Frances", "Shih Tzu", "Pastor Alemao", "SRD"],
  felino: ["Persa", "Siames", "Maine Coon", "Sphynx", "SRD"],
  lagomorfo: ["Mini Lop", "Angora", "Lionhead", "Holandes"],
  roedores: ["Hamster Sirio", "Porquinho da India", "Chinchila", "Rato Twister"],
  aves: ["Calopsita", "Papagaio", "Canario", "Caturrita"],
};

const DEFAULT_ORGAN_LESIONS = [
  { bodyRegion: "Abdomen", organPart: "Quadrante cranial", affectedOrgan: "Figado", lesionType: "Inflamatoria", lesionName: "Hepatomegalia" },
  { bodyRegion: "Torax", organPart: "Mediastino", affectedOrgan: "Pulmao", lesionType: "Respiratoria", lesionName: "Pneumonia" },
  { bodyRegion: "Cabeca", organPart: "Ouvido", affectedOrgan: "Canal auditivo", lesionType: "Inflamatoria", lesionName: "Otite severa" },
];

const DEFAULT_BONE_LESIONS = [
  { boneName: "Femur", boneRegion: "Membros pelvicos", lesionType: "Traumatica", lesionName: "Fratura ossea" },
  { boneName: "Mandibula", boneRegion: "Cabeca", lesionType: "Traumatica", lesionName: "Fratura mandibular" },
];

const ROLE_TO_DB = {
  student: "aluno",
  teacher: "professor",
  admin: "admin",
};

const ROLE_FROM_DB = {
  aluno: "student",
  professor: "teacher",
  admin: "admin",
};

const STATUS_TO_DB = {
  pending: "pendente",
  approved: "aprovado",
  rejected: "rejeitado",
};

const STATUS_FROM_DB = {
  pendente: "pending",
  aprovado: "approved",
  rejeitado: "rejected",
};

const DEFAULT_PERMISSIONS = {
  deleteComparisonRecords: false,
  manageSpecies: false,
  manageLesions: false,
  manageAccess: false,
};

export async function createDatabase() {
  const config = getMysqlConfig();
  if (process.env.VERCEL !== "1") {
    await ensureMysqlDatabase(config);
  }

  const pool = mysql.createPool({
    ...config,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_LIMIT || 3),
    queueLimit: 0,
    multipleStatements: true,
    charset: "utf8mb4",
    timezone: "Z",
  });

  const database = new AppDatabase(pool);
  try {
    await database.migrate();
    await database.seed();
  } catch (error) {
    throw buildDatabaseError(error);
  }
  return database;
}

class AppDatabase {
  constructor(pool) {
    this.pool = pool;
  }

  async migrate() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id VARCHAR(64) PRIMARY KEY,
        nome VARCHAR(180) NOT NULL,
        email VARCHAR(180) NOT NULL UNIQUE,
        rgm VARCHAR(80) NULL UNIQUE,
        senha_hash VARCHAR(255) NOT NULL,
        perfil ENUM('aluno', 'professor', 'admin') NOT NULL,
        status_aprovacao ENUM('pendente', 'aprovado', 'rejeitado') NOT NULL,
        permissoes JSON NULL,
        criado_em DATETIME NOT NULL,
        atualizado_em DATETIME NOT NULL,
        INDEX idx_usuarios_email (email),
        INDEX idx_usuarios_status (status_aprovacao)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS codigos_confirmacao_email (
        email VARCHAR(180) PRIMARY KEY,
        codigo_hash VARCHAR(255) NOT NULL,
        expira_em BIGINT NOT NULL,
        criado_em DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS especies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(120) NOT NULL UNIQUE,
        criado_em DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS racas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        especie_id INT NOT NULL,
        nome VARCHAR(160) NOT NULL,
        criado_em DATETIME NOT NULL,
        UNIQUE KEY especie_raca_unica (especie_id, nome),
        CONSTRAINT fk_racas_especies FOREIGN KEY (especie_id) REFERENCES especies(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS lesoes_orgaos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        regiao_corporal VARCHAR(120) NOT NULL,
        parte_orgao VARCHAR(120) NOT NULL,
        orgao_afetado VARCHAR(120) NOT NULL,
        tipo_lesao VARCHAR(120) NOT NULL,
        nome_lesao VARCHAR(140) NOT NULL,
        criado_em DATETIME NOT NULL,
        UNIQUE KEY lesao_orgao_unica (regiao_corporal, parte_orgao, orgao_afetado, tipo_lesao, nome_lesao)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS lesoes_osseas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome_osso VARCHAR(120) NOT NULL,
        regiao_ossea VARCHAR(120) NOT NULL,
        tipo_lesao VARCHAR(120) NOT NULL,
        nome_lesao VARCHAR(140) NOT NULL,
        criado_em DATETIME NOT NULL,
        UNIQUE KEY lesao_ossea_unica (nome_osso, regiao_ossea, tipo_lesao, nome_lesao)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS exames (
        id_registro VARCHAR(120) PRIMARY KEY,
        chave_colecao VARCHAR(80) NOT NULL,
        modalidade ENUM('lamina') NOT NULL,
        estado_saude ENUM('saudavel', 'doente') NOT NULL,
        codigo_exame VARCHAR(120) NOT NULL,
        codigo_animal VARCHAR(120) NULL,
        peso VARCHAR(80) NULL,
        especie VARCHAR(120) NULL,
        raca VARCHAR(160) NULL,
        regiao_anatomica VARCHAR(180) NULL,
        idade VARCHAR(80) NULL,
        sexo VARCHAR(80) NULL,
        diagnostico VARCHAR(255) NULL,
        lesao VARCHAR(255) NULL,
        descricao TEXT NULL,
        gravidade VARCHAR(80) NULL,
        zoom VARCHAR(80) NULL,
        lesao_lamina VARCHAR(255) NULL,
        regiao_coleta VARCHAR(180) NULL,
        tipo_amostra VARCHAR(160) NULL,
        pigmentacao VARCHAR(160) NULL,
        exame_saudavel_vinculado_id VARCHAR(120) NULL,
        exame_saudavel_vinculado_rotulo VARCHAR(255) NULL,
        autor VARCHAR(180) NULL,
        autor_perfil ENUM('aluno', 'professor', 'admin') NULL,
        autor_rgm VARCHAR(80) NULL,
        criado_em DATETIME NOT NULL,
        atualizado_em DATETIME NOT NULL,
        INDEX idx_exames_colecao (chave_colecao),
        INDEX idx_exames_especie (especie),
        INDEX idx_exames_vinculo_saudavel (exame_saudavel_vinculado_id),
        CONSTRAINT fk_exames_vinculo_saudavel FOREIGN KEY (exame_saudavel_vinculado_id) REFERENCES exames(id_registro) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS imagens_exames (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        exame_id VARCHAR(120) NOT NULL,
        imagem_base64 LONGTEXT NOT NULL,
        ordem INT NOT NULL DEFAULT 0,
        criado_em DATETIME NOT NULL,
        INDEX idx_imagens_exame (exame_id),
        CONSTRAINT fk_imagens_exames FOREIGN KEY (exame_id) REFERENCES exames(id_registro) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS logs_auditoria (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        usuario_id VARCHAR(64) NULL,
        acao VARCHAR(120) NOT NULL,
        tipo_entidade VARCHAR(120) NOT NULL,
        entidade_id VARCHAR(160) NULL,
        detalhes JSON NULL,
        criado_em DATETIME NOT NULL,
        INDEX idx_auditoria_usuario (usuario_id),
        INDEX idx_auditoria_entidade (tipo_entidade, entidade_id),
        CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await this.ensureExamColumns();
    await this.ensureColumn("usuarios", "permissoes", "JSON NULL AFTER status_aprovacao");
    await this.ensureColumn("exames", "autor_perfil", "ENUM('aluno', 'professor', 'admin') NULL AFTER autor");
    await this.ensureColumn("exames", "autor_rgm", "VARCHAR(80) NULL AFTER autor_perfil");
  }

  async ensureExamColumns() {
    const [columns] = await this.pool.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exames' AND COLUMN_NAME = 'pigmentacao'`,
    );

    if (columns.length === 0) {
      await this.pool.query("ALTER TABLE exames ADD COLUMN pigmentacao VARCHAR(160) NULL AFTER tipo_amostra");
    }
  }

  async ensureColumn(tableName, columnName, definition) {
    try {
      await this.pool.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
    } catch (error) {
      if (error?.code !== "ER_DUP_FIELDNAME") {
        throw error;
      }
    }
  }

  async seed() {
    const now = mysqlDate();
    const admin = await this.findUserByEmail("admin@umc.br");
    if (!admin) {
      await this.pool.execute(
        `INSERT INTO usuarios (id, nome, email, rgm, senha_hash, perfil, status_aprovacao, permissoes, criado_em, atualizado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          "admin_001",
          "Coordenacao Veterinaria",
          "admin@umc.br",
          null,
          bcrypt.hashSync("admin", 12),
          "admin",
          "aprovado",
          JSON.stringify(DEFAULT_PERMISSIONS),
          now,
          now,
        ],
      );
    }

    for (const [speciesName, breeds] of Object.entries(DEFAULT_SPECIES)) {
      await this.addSpeciesWithBreeds(speciesName, breeds);
    }

    for (const entry of DEFAULT_ORGAN_LESIONS) {
      await this.addOrganLesion(entry);
    }

    for (const entry of DEFAULT_BONE_LESIONS) {
      await this.addBoneLesion(entry);
    }
  }

  async createUser({ name, email, rgm, password, role, status = "pending" }) {
    const user = {
      id: crypto.randomUUID(),
      name,
      email,
      rgm: rgm || null,
      passwordHash: bcrypt.hashSync(password, 12),
      role,
      status,
      createdAt: mysqlDate(),
      updatedAt: mysqlDate(),
    };

    await this.pool.execute(
      `INSERT INTO usuarios (id, nome, email, rgm, senha_hash, perfil, status_aprovacao, permissoes, criado_em, atualizado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.name,
        user.email,
        user.rgm,
        user.passwordHash,
        ROLE_TO_DB[user.role],
        STATUS_TO_DB[user.status],
        JSON.stringify(DEFAULT_PERMISSIONS),
        user.createdAt,
        user.updatedAt,
      ],
    );

    return this.toPublicUser(await this.findUserById(user.id));
  }

  async findUserById(id) {
    const [rows] = await this.pool.execute("SELECT * FROM usuarios WHERE id = ? LIMIT 1", [id]);
    return this.toJsUser(rows[0]);
  }

  async findUserByEmail(email) {
    const [rows] = await this.pool.execute("SELECT * FROM usuarios WHERE email = ? LIMIT 1", [email]);
    return this.toJsUser(rows[0]);
  }

  async findDuplicateUser({ email, rgm, role }) {
    if (role === "student" && rgm) {
      const [rows] = await this.pool.execute("SELECT * FROM usuarios WHERE email = ? OR rgm = ? LIMIT 1", [email, rgm]);
      return this.toJsUser(rows[0]);
    }
    return this.findUserByEmail(email);
  }

  async listPendingUsers() {
    const [rows] = await this.pool.execute("SELECT * FROM usuarios WHERE status_aprovacao = 'pendente' ORDER BY criado_em DESC");
    return rows.map((user) => this.toPublicUser(this.toJsUser(user)));
  }

  async searchStudentsByRgm(rgm) {
    const term = clean(rgm);
    if (!term) {
      return [];
    }

    const [rows] = await this.pool.execute(
      `SELECT * FROM usuarios
       WHERE perfil = 'aluno' AND status_aprovacao = 'aprovado' AND rgm LIKE ?
       ORDER BY rgm
       LIMIT 8`,
      [`${term}%`],
    );

    return rows.map((user) => this.toPublicUser(this.toJsUser(user)));
  }

  async updateUserStatus(id, status) {
    await this.pool.execute("UPDATE usuarios SET status_aprovacao = ?, atualizado_em = ? WHERE id = ?", [STATUS_TO_DB[status], mysqlDate(), id]);
    const user = await this.findUserById(id);
    return user ? this.toPublicUser(user) : null;
  }

  async updateStudentPermissions(id, permissions) {
    const normalizedPermissions = normalizePermissions(permissions);
    await this.pool.execute(
      "UPDATE usuarios SET permissoes = ?, atualizado_em = ? WHERE id = ? AND perfil = 'aluno' AND status_aprovacao = 'aprovado'",
      [JSON.stringify(normalizedPermissions), mysqlDate(), id],
    );
    const user = await this.findUserById(id);
    return user && user.role === "student" && user.status === "approved" ? this.toPublicUser(user) : null;
  }

  verifyPassword(password, passwordHash) {
    return bcrypt.compareSync(password, passwordHash || "");
  }

  async saveVerificationCode({ email, code, expiresAt }) {
    await this.pool.execute(
      `INSERT INTO codigos_confirmacao_email (email, codigo_hash, expira_em, criado_em)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE codigo_hash = VALUES(codigo_hash), expira_em = VALUES(expira_em), criado_em = VALUES(criado_em)`,
      [email, bcrypt.hashSync(code, 10), expiresAt, mysqlDate()],
    );
  }

  async verifyEmailCode({ email, code }) {
    const [rows] = await this.pool.execute("SELECT * FROM codigos_confirmacao_email WHERE email = ? LIMIT 1", [email]);
    const row = rows[0];
    if (!row) {
      return { ok: false, reason: "missing" };
    }
    if (Date.now() > Number(row.expira_em)) {
      await this.deleteVerificationCode(email);
      return { ok: false, reason: "expired" };
    }
    if (!bcrypt.compareSync(code, row.codigo_hash)) {
      return { ok: false, reason: "invalid" };
    }
    return { ok: true };
  }

  async deleteVerificationCode(email) {
    await this.pool.execute("DELETE FROM codigos_confirmacao_email WHERE email = ?", [email]);
  }

  async getSpeciesMap() {
    const [speciesRows] = await this.pool.execute("SELECT id, nome FROM especies ORDER BY nome");
    const [breedRows] = await this.pool.execute("SELECT especie_id, nome FROM racas ORDER BY nome");
    const speciesMap = {};
    speciesRows.forEach((species) => {
      speciesMap[species.nome] = breedRows
        .filter((breed) => breed.especie_id === species.id)
        .map((breed) => breed.nome);
    });
    return speciesMap;
  }

  async addSpeciesWithBreeds(speciesName, breeds) {
    const name = normalizeName(speciesName);
    if (!name) {
      return this.getSpeciesMap();
    }

    await this.pool.execute("INSERT IGNORE INTO especies (nome, criado_em) VALUES (?, ?)", [name, mysqlDate()]);
    const [speciesRows] = await this.pool.execute("SELECT id FROM especies WHERE nome = ? LIMIT 1", [name]);
    const species = speciesRows[0];
    for (const breed of uniqueNames(breeds)) {
      await this.pool.execute("INSERT IGNORE INTO racas (especie_id, nome, criado_em) VALUES (?, ?, ?)", [species.id, breed, mysqlDate()]);
    }
    return this.getSpeciesMap();
  }

  async getDiseases() {
    const [organLesions] = await this.pool.execute(`
      SELECT regiao_corporal AS bodyRegion, parte_orgao AS organPart, orgao_afetado AS affectedOrgan,
             tipo_lesao AS lesionType, nome_lesao AS lesionName
      FROM lesoes_orgaos
      ORDER BY regiao_corporal, orgao_afetado, tipo_lesao, nome_lesao
    `);
    const [boneLesions] = await this.pool.execute(`
      SELECT nome_osso AS boneName, regiao_ossea AS boneRegion,
             tipo_lesao AS lesionType, nome_lesao AS lesionName
      FROM lesoes_osseas
      ORDER BY regiao_ossea, nome_osso, tipo_lesao, nome_lesao
    `);
    return { organLesions, boneLesions };
  }

  async addOrganLesion(entry) {
    await this.pool.execute(
      `INSERT IGNORE INTO lesoes_orgaos
       (regiao_corporal, parte_orgao, orgao_afetado, tipo_lesao, nome_lesao, criado_em)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [clean(entry.bodyRegion), clean(entry.organPart), clean(entry.affectedOrgan), clean(entry.lesionType), clean(entry.lesionName), mysqlDate()],
    );
    return this.getDiseases();
  }

  async addBoneLesion(entry) {
    await this.pool.execute(
      `INSERT IGNORE INTO lesoes_osseas
       (nome_osso, regiao_ossea, tipo_lesao, nome_lesao, criado_em)
       VALUES (?, ?, ?, ?, ?)`,
      [clean(entry.boneName), clean(entry.boneRegion), clean(entry.lesionType), clean(entry.lesionName), mysqlDate()],
    );
    return this.getDiseases();
  }

  async getExamCollection(collectionKey) {
    const [rows] = await this.pool.execute("SELECT * FROM exames WHERE chave_colecao = ? ORDER BY criado_em DESC", [collectionKey]);
    const recordIds = rows.map((row) => row.id_registro);
    const imagesByRecord = new Map(recordIds.map((id) => [id, []]));

    if (recordIds.length > 0) {
      const placeholders = recordIds.map(() => "?").join(",");
      const [imageRows] = await this.pool.execute(
        `SELECT exame_id, imagem_base64 FROM imagens_exames WHERE exame_id IN (${placeholders}) ORDER BY ordem`,
        recordIds,
      );
      imageRows.forEach((image) => {
        imagesByRecord.get(image.exame_id)?.push(image.imagem_base64);
      });
    }

    return rows.map((row) => ({
      ...this.toExamItem(row),
      images: imagesByRecord.get(row.id_registro) || [],
    }));
  }

  async addExam(collectionKey, item, user = null) {
    const recordId = item.recordId || `${collectionKey}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const now = mysqlDate();
    const meta = getExamCollectionMeta(collectionKey);
    const authorName = clean(user?.name) || clean(item.author);
    const authorRole = clean(user?.role);
    const authorRgm = user?.role === "student" ? clean(user?.rgm) : null;
    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();
      await connection.execute(
        `INSERT INTO exames (
          id_registro, chave_colecao, modalidade, estado_saude, codigo_exame, codigo_animal, peso,
          especie, raca, regiao_anatomica, idade, sexo, diagnostico, lesao, descricao, gravidade,
          zoom, lesao_lamina, regiao_coleta, tipo_amostra, pigmentacao, exame_saudavel_vinculado_id,
          exame_saudavel_vinculado_rotulo, autor, autor_perfil, autor_rgm, criado_em, atualizado_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          recordId,
          collectionKey,
          meta.modality,
          meta.healthStatus,
          clean(item.id) || generateExamCode(meta.modality, meta.healthStatus),
          clean(item.internalRecordId),
          clean(item.weight),
          clean(item.species),
          clean(item.breed),
          clean(item.anatomyRegion),
          clean(item.age),
          clean(item.sex),
          clean(item.disease),
          clean(item.injury),
          clean(item.description),
          clean(item.severity),
          clean(item.zoom),
          clean(item.lesion),
          clean(item.region),
          clean(item.specimenType),
          clean(item.pigmentation),
          clean(item.linkedHealthyRecordId),
          clean(item.linkedHealthyLabel),
          authorName,
          ROLE_TO_DB[authorRole] || authorRole,
          authorRgm,
          now,
          now,
        ],
      );

      for (const [index, image] of (item.images || []).entries()) {
        await connection.execute(
          "INSERT INTO imagens_exames (exame_id, imagem_base64, ordem, criado_em) VALUES (?, ?, ?, ?)",
          [recordId, image, index, now],
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return this.getExamByRecordId(recordId);
  }

  async removeExam(recordId) {
    await this.pool.execute("DELETE FROM exames WHERE id_registro = ?", [recordId]);
  }

  async getExamByRecordId(recordId) {
    const [rows] = await this.pool.execute("SELECT * FROM exames WHERE id_registro = ? LIMIT 1", [recordId]);
    const row = rows[0];
    if (!row) {
      return null;
    }
    const [images] = await this.pool.execute("SELECT imagem_base64 FROM imagens_exames WHERE exame_id = ? ORDER BY ordem", [recordId]);
    return {
      ...this.toExamItem(row),
      images: images.map((image) => image.imagem_base64),
    };
  }

  toJsUser(user) {
    if (!user) {
      return null;
    }
    return {
      id: user.id,
      name: user.nome,
      email: user.email,
      rgm: user.rgm,
      password_hash: user.senha_hash,
      role: ROLE_FROM_DB[user.perfil] || user.perfil,
      status: STATUS_FROM_DB[user.status_aprovacao] || user.status_aprovacao,
      permissions: parsePermissions(user.permissoes),
    };
  }

  toExamItem(row) {
    const item = {
      recordId: row.id_registro,
      id: row.codigo_exame,
      internalRecordId: row.codigo_animal,
      weight: row.peso,
      species: row.especie,
      breed: row.raca,
      anatomyRegion: row.regiao_anatomica,
      age: row.idade,
      sex: row.sexo,
      disease: row.diagnostico,
      injury: row.lesao,
      description: row.descricao,
      severity: row.gravidade,
      zoom: row.zoom,
      lesion: row.lesao_lamina,
      region: row.regiao_coleta,
      specimenType: row.tipo_amostra,
      pigmentation: row.pigmentacao,
      linkedHealthyRecordId: row.exame_saudavel_vinculado_id,
      linkedHealthyLabel: row.exame_saudavel_vinculado_rotulo,
      author: row.autor,
      authorRole: ROLE_FROM_DB[row.autor_perfil] || row.autor_perfil,
      authorRgm: row.autor_rgm,
      createdAt: row.criado_em,
    };

    Object.keys(item).forEach((key) => {
      if (item[key] === null || item[key] === undefined) {
        delete item[key];
      }
    });
    return item;
  }

  toPublicUser(user) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      rgm: user.rgm,
      role: user.role,
      status: user.status,
      permissions: user.permissions || { ...DEFAULT_PERMISSIONS },
    };
  }
}

function parsePermissions(value) {
  if (!value) {
    return { ...DEFAULT_PERMISSIONS };
  }

  if (typeof value === "object") {
    return normalizePermissions(value);
  }

  try {
    return normalizePermissions(JSON.parse(value));
  } catch {
    return { ...DEFAULT_PERMISSIONS };
  }
}

function normalizePermissions(permissions = {}) {
  return Object.fromEntries(
    Object.keys(DEFAULT_PERMISSIONS).map((key) => [key, Boolean(permissions[key])]),
  );
}

function getMysqlConfig() {
  return {
    host: process.env.TIDB_HOST || process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.TIDB_PORT || process.env.DB_PORT || 4000),
    user: process.env.TIDB_USER || process.env.DB_USER || "root",
    password: process.env.TIDB_PASSWORD || process.env.DB_PASSWORD || "",
    database: process.env.TIDB_DATABASE || process.env.DB_NAME || "laminas_umc",
    ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true },
  };
}

async function ensureMysqlDatabase(config) {
  const { database, ...serverConfig } = config;
  const connection = await mysql.createConnection({
    ...serverConfig,
    multipleStatements: false,
  });

  try {
    const safeDatabase = database.replaceAll("`", "``");
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${safeDatabase}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  } finally {
    await connection.end();
  }
}

function getExamCollectionMeta(collectionKey) {
  const map = {
    vetumc_healthy: { modality: "lamina", healthStatus: "saudavel" },
    vetumc_sick: { modality: "lamina", healthStatus: "doente" },
    vetumc_slides_healthy: { modality: "lamina", healthStatus: "saudavel" },
    vetumc_slides_sick: { modality: "lamina", healthStatus: "doente" },
  };
  return map[collectionKey] || { modality: "lamina", healthStatus: "saudavel" };
}

function generateExamCode(modality, healthStatus) {
  const modalityPrefix = "LAM";
  const healthPrefix = healthStatus === "doente" ? "DOE" : "SAU";
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${modalityPrefix}-${healthPrefix}-${date}-${suffix}`;
}

function mysqlDate() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function clean(value) {
  return String(value || "").trim() || null;
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function uniqueNames(values) {
  const names = new Map();
  (values || []).forEach((value) => {
    const name = String(value || "").trim();
    if (!name) {
      return;
    }
    names.set(name.toLowerCase(), name);
  });
  return [...names.values()].sort((left, right) => left.localeCompare(right));
}

function buildDatabaseError(error) {
  const message = String(error?.message || "");
  const code = String(error?.code || "");
  const friendly = new Error(message);
  friendly.code = code;

  if (code === "ER_ACCESS_DENIED_ERROR") {
    friendly.message = [
      "MySQL recusou o login configurado no .env.",
      "Confira DB_USER e DB_PASSWORD.",
      "Se aparecer 'using password: NO', o DB_PASSWORD esta vazio, mas seu MySQL exige senha.",
    ].join(" ");
    return friendly;
  }

  if (code === "ER_BAD_DB_ERROR") {
    friendly.message = "O banco DB_NAME nao existe. Importe database/laminas_umc.sql no MySQL antes de iniciar o servidor.";
    return friendly;
  }

  if (code === "ECONNREFUSED") {
    friendly.message = "Nao foi possivel conectar ao MySQL. Verifique se o MySQL esta ligado e se DB_HOST/DB_PORT estao corretos.";
    return friendly;
  }

  return friendly;
}
