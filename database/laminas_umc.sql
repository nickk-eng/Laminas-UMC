CREATE DATABASE IF NOT EXISTS laminas_umc
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE laminas_umc;

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

INSERT IGNORE INTO especies (nome, criado_em) VALUES
  ('canino', NOW()),
  ('felino', NOW()),
  ('lagomorfo', NOW()),
  ('roedores', NOW()),
  ('aves', NOW());

INSERT IGNORE INTO racas (especie_id, nome, criado_em)
SELECT id, 'Golden Retriever', NOW() FROM especies WHERE nome = 'canino';
INSERT IGNORE INTO racas (especie_id, nome, criado_em)
SELECT id, 'Labrador', NOW() FROM especies WHERE nome = 'canino';
INSERT IGNORE INTO racas (especie_id, nome, criado_em)
SELECT id, 'Poodle', NOW() FROM especies WHERE nome = 'canino';
INSERT IGNORE INTO racas (especie_id, nome, criado_em)
SELECT id, 'Pug', NOW() FROM especies WHERE nome = 'canino';
INSERT IGNORE INTO racas (especie_id, nome, criado_em)
SELECT id, 'Bulldog Frances', NOW() FROM especies WHERE nome = 'canino';
INSERT IGNORE INTO racas (especie_id, nome, criado_em)
SELECT id, 'Shih Tzu', NOW() FROM especies WHERE nome = 'canino';
INSERT IGNORE INTO racas (especie_id, nome, criado_em)
SELECT id, 'Pastor Alemao', NOW() FROM especies WHERE nome = 'canino';
INSERT IGNORE INTO racas (especie_id, nome, criado_em)
SELECT id, 'SRD', NOW() FROM especies WHERE nome = 'canino';

INSERT IGNORE INTO racas (especie_id, nome, criado_em)
SELECT id, 'Persa', NOW() FROM especies WHERE nome = 'felino';
INSERT IGNORE INTO racas (especie_id, nome, criado_em)
SELECT id, 'Siames', NOW() FROM especies WHERE nome = 'felino';
INSERT IGNORE INTO racas (especie_id, nome, criado_em)
SELECT id, 'Maine Coon', NOW() FROM especies WHERE nome = 'felino';
INSERT IGNORE INTO racas (especie_id, nome, criado_em)
SELECT id, 'Sphynx', NOW() FROM especies WHERE nome = 'felino';
INSERT IGNORE INTO racas (especie_id, nome, criado_em)
SELECT id, 'SRD', NOW() FROM especies WHERE nome = 'felino';

INSERT IGNORE INTO racas (especie_id, nome, criado_em)
SELECT id, 'Mini Lop', NOW() FROM especies WHERE nome = 'lagomorfo';
INSERT IGNORE INTO racas (especie_id, nome, criado_em)
SELECT id, 'Angora', NOW() FROM especies WHERE nome = 'lagomorfo';
INSERT IGNORE INTO racas (especie_id, nome, criado_em)
SELECT id, 'Lionhead', NOW() FROM especies WHERE nome = 'lagomorfo';
INSERT IGNORE INTO racas (especie_id, nome, criado_em)
SELECT id, 'Holandes', NOW() FROM especies WHERE nome = 'lagomorfo';

INSERT IGNORE INTO racas (especie_id, nome, criado_em)
SELECT id, 'Hamster Sirio', NOW() FROM especies WHERE nome = 'roedores';
INSERT IGNORE INTO racas (especie_id, nome, criado_em)
SELECT id, 'Porquinho da India', NOW() FROM especies WHERE nome = 'roedores';
INSERT IGNORE INTO racas (especie_id, nome, criado_em)
SELECT id, 'Chinchila', NOW() FROM especies WHERE nome = 'roedores';
INSERT IGNORE INTO racas (especie_id, nome, criado_em)
SELECT id, 'Rato Twister', NOW() FROM especies WHERE nome = 'roedores';

INSERT IGNORE INTO racas (especie_id, nome, criado_em)
SELECT id, 'Calopsita', NOW() FROM especies WHERE nome = 'aves';
INSERT IGNORE INTO racas (especie_id, nome, criado_em)
SELECT id, 'Papagaio', NOW() FROM especies WHERE nome = 'aves';
INSERT IGNORE INTO racas (especie_id, nome, criado_em)
SELECT id, 'Canario', NOW() FROM especies WHERE nome = 'aves';
INSERT IGNORE INTO racas (especie_id, nome, criado_em)
SELECT id, 'Caturrita', NOW() FROM especies WHERE nome = 'aves';

INSERT IGNORE INTO lesoes_orgaos
  (regiao_corporal, parte_orgao, orgao_afetado, tipo_lesao, nome_lesao, criado_em)
VALUES
  ('Abdomen', 'Quadrante cranial', 'Figado', 'Inflamatoria', 'Hepatomegalia', NOW()),
  ('Torax', 'Mediastino', 'Pulmao', 'Respiratoria', 'Pneumonia', NOW()),
  ('Cabeca', 'Ouvido', 'Canal auditivo', 'Inflamatoria', 'Otite severa', NOW());

INSERT IGNORE INTO lesoes_osseas
  (nome_osso, regiao_ossea, tipo_lesao, nome_lesao, criado_em)
VALUES
  ('Femur', 'Membros pelvicos', 'Traumatica', 'Fratura ossea', NOW()),
  ('Mandibula', 'Cabeca', 'Traumatica', 'Fratura mandibular', NOW());
