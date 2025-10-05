Mizan Platform — System Architecture & Training Overview

⸻

1. Platform Structure
	•	Frontend (Client): Employee assessments, dashboards, admin views.
	•	Backend (Server): Multi-agent AI analysis, data storage, reporting.
	•	Database: PostgreSQL with Drizzle ORM.
	•	Agents: Each domain (culture, structure, skills, etc.) has its own AI agent built on the Three-Engine architecture.

⸻

2. Core Features
	•	Employee cultural assessments (values, engagement, recognition).
	•	Company structure & strategy analysis.
	•	Skills gap & workforce capability mapping.
	•	Performance & recognition analysis.
	•	Benchmarking across tenants & industries.
	•	Automated recommendations & triggers (LXP, training, interventions).
	•	Multi-role access (employee, admin, superadmin).

⸻

3. Three-Engine AI Architecture

Every agent runs through three AI “engines”:
	1.	Knowledge Engine — Loads frameworks & expert models.
	2.	Data Engine — Processes tenant data (CSV uploads, surveys, reviews).
	3.	Reasoning Engine — Connects knowledge + data → produces insights, scores, and recommendations.

This ensures outputs are:
	•	Grounded in validated frameworks.
	•	Evidence-based from tenant data.
	•	Actionable with clear scoring & triggers.

⸻

4. Agents & Their Training

🔹 Culture Agent
	•	Knowledge: Mizan 7-cylinder framework + OD culture models (Schein, Hofstede, Denison, etc.).
	•	Data: Employee assessments (values, engagement, recognition).
	•	Reasoning: Entropy, alignment to strategy, cylinder health.
	•	Superadmin Training: Update cylinders/values, approve entropy logic, curate OD models.

🔹 Structure Agent
	•	Knowledge: Org design models (Galbraith Star, McKinsey 7S, Mintzberg).
	•	Data: Org charts, department headcounts, spans & layers.
	•	Reasoning: Detect structure-strategy misalignments.
	•	Superadmin Training: Edit org design frameworks, validate rules, manage structure health scoring.

🔹 Skills Agent
	•	Knowledge: Skills taxonomies (O*NET, Bloom’s, competency modeling).
	•	Data: Employee profiles, resumes, required skills from strategies.
	•	Reasoning: Compare current vs required skills → coverage %, gaps, recommendations.
	•	Superadmin Training: Curate skill libraries, approve parsed skills, validate gap analyses.

🔹 Performance Agent
	•	Knowledge: Balanced Scorecard, OKRs, calibration frameworks.
	•	Data: Reviews, KPIs, OKR data.
	•	Reasoning: Alignment of incentives with strategy & values.
	•	Superadmin Training: Manage frameworks, configure thresholds, validate output reports.

🔹 Engagement Agent
	•	Knowledge: Gallup Q12, Maslow, Self-Determination Theory.
	•	Data: Engagement surveys, comments.
	•	Reasoning: Identify engagement drivers/blockers.
	•	Superadmin Training: Add new engagement models, adjust benchmarks, validate insights.

🔹 Recognition Agent
	•	Knowledge: Herzberg motivators, equity theory, recognition best practices.
	•	Data: Peer recognition data, reward program usage.
	•	Reasoning: Check fairness & inclusivity.
	•	Superadmin Training: Configure recognition models, review fairness outputs.

🔹 Benchmarking Agent
	•	Knowledge: Industry benchmarks (Gallup, McKinsey, Just Capital, internal).
	•	Data: Aggregated tenant metrics (anonymized).
	•	Reasoning: Compare tenant vs industry averages.
	•	Superadmin Training: Upload/manage benchmark datasets, control anonymization.

⸻

5. Data Flow
	1.	Employee inputs (values survey, engagement, recognition) → DB (cultureAssessments).
	2.	Admin inputs (company structure, strategy, required skills) → DB.
	3.	Agents run analyses: each pulls frameworks (knowledge), processes data, reasons → stores reports.
	4.	Reports stored in DB tables (cultureReports, skillsReports, etc.).
	5.	Dashboards render results for employees, managers, admins.

⸻

6. Analysis Outputs
	•	Culture Agent → entropy score, employee-company value gaps, fulfillment of strategy, triggers.
	•	Structure Agent → span/layer analysis, misalignment with strategy, restructuring recs.
	•	Skills Agent → skill coverage %, gaps, training recommendations, LXP triggers.
	•	Performance Agent → alignment of KPIs/OKRs with culture & strategy.
	•	Engagement Agent → drivers/blockers of engagement, survey analytics.
	•	Recognition Agent → fairness of recognition, inclusivity scores.
	•	Benchmarking Agent → tenant vs industry comparisons.

⸻

7. Entropy & Health Metrics
	•	Entropy Score = ratio of limiting to enabling values (+ engagement penalty).
	•	Cylinder Health = “healthy / moderate / unhealthy / missing” by enabling/limiting ratio.
	•	Employee Gap Analysis = compares desired vs company dominant cylinders.

⸻

8. Triggers & Recommendations

Agents can output triggers that feed into:
	•	LXP (Learning Experience Platform): coaching, training modules.
	•	Action Modules: hiring, succession, onboarding, rewards.
	•	Admin alerts: e.g., low strategy alignment → restructure.

⸻

9. Multi-Tenant Model
	•	Each tenant (company) has its own data, reports, and frameworks.
	•	Superadmin can view across tenants for benchmarking, dataset training, and support.

⸻

10. Roles & Permissions
	•	Employee: takes assessments, sees personal dashboards.
	•	Manager/Admin: uploads org data, views team & company dashboards, downloads reports.
	•	Superadmin:
	•	Curates frameworks (knowledge training).
	•	Reviews all reports & feeds corrections into AITrainingData.
	•	Configures provider mix & AI engines.
	•	Oversees benchmarking across tenants.
    •	create tenants and manage all aspects of the platform.

⸻

11. Storage & Logging
	•	Agent outputs stored in dedicated report tables.
	•	Audit logs in agentAnalyses.
	•	AI training feedback in AITrainingData.

⸻

12. Multi-Provider AI Setup
	•	Agents don’t rely on one LLM.
	•	Each engine can query multiple providers (OpenAI, Anthropic, Claude, Gemini, etc.).
	•	Results go through consensus logic → improves reliability.
	•	Superadmin can configure which providers are active.

⸻

13. Superadmin “Training” Interface
	•	Upload/edit frameworks (culture values, skill libraries, benchmarks).
	•	Review & correct outputs → stored as training data.
	•	Approve or reject new values/skills parsed by Data Engine.
	•	Configure thresholds (e.g. entropy cutoffs, span ratios).
	•	Manage provider settings (who runs knowledge/data/reasoning engines).

⸻

14. Flow of Control
	1.	Employee surveys → Culture Agent.
	2.	Org structure upload → Structure Agent.
	3.	Strategy upload → Skills Agent, Structure Agent, Culture Agent.
	4.	Performance reviews → Performance Agent.
	5.	Engagement surveys → Engagement Agent.
	6.	Recognition data → Recognition Agent.
	7.	Cross-tenant data → Benchmarking Agent.
	8.	Reports → Dashboards for employees/admins.
	9.	Triggers → Action Modules & LXP for interventions.
	10.	Superadmin curates frameworks, validates outputs, retrains system.