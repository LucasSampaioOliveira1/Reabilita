# AGENTS.md — Projeto Reabilita Serra

## 📌 Visão Geral do Projeto

O **Reabilita Serra** é uma plataforma de teleassistência fisioterapêutica focada na reabilitação de pacientes com fratura de punho (rádio distal).

O sistema permite acompanhamento remoto, execução de exercícios guiados e monitoramento clínico, reduzindo a necessidade de atendimentos presenciais recorrentes.

---

## 🧠 Contexto do Domínio (IMPORTANTE)

Este é um sistema de saúde. Portanto:

- Dados são sensíveis (LGPD)
- Não tomar decisões clínicas automaticamente
- O sistema apenas **apoia o fisioterapeuta**, não substitui
- Evitar qualquer lógica que "prescreva" sem intervenção humana

---

## 🏗️ Arquitetura do Projeto

### Front-end
- Next.js (App Router)
- TypeScript
- TailwindCSS

### Back-end
- Node.js
- NestJS
- Prisma ORM

### Banco de Dados
- Supabase (PostgreSQL)

---

## 🎨 Design System

### Cores oficiais
- Primary: #2D82B8
- Secondary: #035D92
- Accent: #88CDF6
- Light: #BEE6FF
- Background: #FFFFFF

### Diretrizes
- Interface simples e acessível (público pode ser idoso)
- Botões grandes e claros
- Evitar excesso de informação na tela
- Priorizar usabilidade mobile-first

---

## 👥 Perfis do Sistema

### Paciente
- Visualiza exercícios
- Marca checklist diário
- Informa dor (EVA 0–10)
- Acessa chat

### Fisioterapeuta
- Gerencia pacientes
- Acompanha evolução
- Ajusta plano de exercícios
- Responde chat

---

## 🔄 Fluxo Principal

1. Avaliação presencial
2. Cadastro do paciente
3. Onboarding
4. Execução domiciliar
5. Monitoramento remoto
6. Alta

---

## ⚙️ Funcionalidades do MVP

### Paciente
- Checklist diário (boolean)
- Registro de dor (0–10)
- Lista de exercícios por fase
- Vídeos demonstrativos
- Notificações
- Chat

### Profissional
- Dashboard de pacientes
- Métricas de adesão
- Evolução de dor
- Ajustes simples de plano
- Histórico de interações

---

## 🧱 Estrutura de Código Esperada

### Backend (NestJS)
- Modules por domínio:
  - auth
  - users
  - patients
  - exercises
  - sessions (checklist + dor)
  - chat

- Seguir padrão:
  - Controller
  - Service
  - DTOs
  - Prisma (repository layer)

### Frontend (Next.js)
- App Router (obrigatório)
- Separação por domínio:
  - /dashboard
  - /patient
  - /auth

- Componentes reutilizáveis:
  - Button
  - Card
  - Progress
  - PainScale
  - ExerciseCard

---

## 📊 Modelagem Inicial (Referência)

### Patient
- id
- name
- age
- condition (ex: fratura punho)
- phase (1, 2, 3)

### Exercise
- id
- title
- videoUrl
- phase

### Session (registro diário)
- id
- patientId
- completed (boolean)
- painLevel (0–10)
- date

### Message (chat)
- id
- senderId
- receiverId
- content
- timestamp

---

## 🔐 Segurança

- Autenticação obrigatória (JWT)
- Separação de acesso por role (patient / physio)
- Nunca expor dados sensíveis no frontend
- Validar todos inputs com DTOs

---

## 🚫 Regras para IA (CRÍTICO)

A IA deve:

- NÃO inventar regras de negócio
- NÃO alterar arquitetura sem necessidade
- SEMPRE seguir NestJS modular
- SEMPRE tipar tudo com TypeScript
- SEMPRE validar dados (class-validator)

A IA NÃO deve:

- Criar lógica clínica complexa
- Tomar decisões médicas
- Ignorar separação de responsabilidades

---

## 🧪 Boas Práticas

- Código limpo (Clean Code)
- Nomeação clara
- Evitar duplicação
- Criar funções pequenas
- Preferir composição ao invés de herança

---

## 🚀 Objetivo do MVP

Validar:

- Adesão do paciente
- Redução de dor ao longo do tempo
- Engajamento com exercícios

---

## 📈 Futuro (não implementar agora)

- Integração com e-SUS
- IA para sugestão de progressão
- Wearables / sensores
- Gamificação

---

## 🧩 Diretriz Final

Este projeto deve ser:

- Simples
- Funcional
- Escalável
- Focado em validação rápida (MVP)

Evitar overengineering.