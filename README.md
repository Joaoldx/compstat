# CoPatrulha — Desafio Impact Lab | Equipe 10

Tema: **Segurança**

Membros da equipe:

- João Domingos — [LinkedIn](https://www.linkedin.com/in/joaoldomingos/)
- Estéfany Rocha — [LinkedIn](https://www.linkedin.com/in/estefanyrocha/)
- Leandro Aveiro — [LinkedIn](https://www.linkedin.com/in/leandro-aveiro/)
- Leonardo Maciel — [LinkedIn](https://www.linkedin.com/in/leonardo-s-antunes-maciel-a4358ba0/)
- Vinicius Machado — [LinkedIn](https://www.linkedin.com/in/vinicius-ribeiro-ms)

**Demo:** https://compstat.vercel.app/

---

## Resumo

CoPatrulha é um protótipo de plataforma de inteligência criminal para a **Compstat Municipal do Rio de Janeiro**. A plataforma integra cinco fontes de dados heterogêneas (ocorrências, domínio territorial, câmeras de monitoramento, fatores urbanos e Disk Denúncia), cruza mancha criminal com fatores urbanos e dinâmica criminal, e gera automaticamente os **Relatórios de Inteligência de Área (RELINTs)** — documentos que hoje são produzidos manualmente — sobre as **22 áreas prioritárias da Força Municipal (FM)**, para subsidiar as reuniões semanais do Compstat.

---

## Como o Claude foi usado

O Claude (API `claude-sonnet-4-6`) atua em duas frentes no projeto:

**1. Geração automática de RELINTs (`relintgenerator/gerar_relint.py`)**

Para cada uma das 22 áreas prioritárias, o pipeline:
1. Extrai contexto qualitativo (sub-áreas, rotas de fuga, grupos criminosos) do RELINT original em `.docx`.
2. Filtra e agrega dados quantitativos da área: ocorrências por tipo/ano, presença de câmeras, fatores urbanos de risco e relatos Disk Denúncia.
3. Envia esse contexto estruturado ao Claude com um prompt de sistema cacheado (cache de prompt para reduzir custo em lotes).
4. Monta o `.docx` final preenchendo o template com o texto gerado pelo modelo.

O resultado é um relatório analítico completo gerado em segundos — trabalho que antes demandava horas de um analista.

**2. Auxílio no desenvolvimento (Claude Code)**

O Claude Code foi usado para construir toda a aplicação: pipeline de dados em Python, componentes React, mapa interativo com MapLibre GL, formulário de contato com Brevo, Dockerfile, e esta própria documentação.

O Claude Opus foi utilizado apenas como advisor na revisão do plano de implementação e em alguns momentos na exploração dos dados.

---

## Arquitetura

```
Ocorrências + Domínio territorial + Câmeras + Fatores urbanos + Disk Denúncia
        │
        ▼
  cruzamento_espacial.py   →   dados/silver/*.csv  +  dados/gold/*.csv
        │
        ▼
    gerar_relint.py  +  Claude API   →   relints_gerados/RI_*.docx
```

O repositório tem dois subprojetos:

| Subprojeto | Stack | Descrição |
|---|---|---|
| `/` (raiz) | Next.js 16, React 19, MapLibre GL, Tailwind CSS | Frontend web com mapa interativo de domínios territoriais e formulário de contato |
| `relintgenerator/` | Python 3.13, GeoPandas, Polars, Anthropic SDK | Pipeline de dados e geração automática de RELINTs |

---

## Frontend (Next.js)

### Instalação e execução

```bash
npm install
npm run dev
```

### Variáveis de ambiente

Crie um `.env.local` na raiz com as variáveis abaixo (ver `.env.example`):

| Variável | Descrição |
|---|---|
| `BREVO_API_KEY` | Chave de API transacional do Brevo |
| `BREVO_SENDER_EMAIL` | Remetente verificado na conta Brevo |

O destino das mensagens enviadas pelo formulário de contato está em `src/config/contact.ts`.

### Docker

```bash
docker build -t copatrulha .
docker run -p 3000:3000 \
  -e BREVO_API_KEY=<sua-chave> \
  -e BREVO_SENDER_EMAIL=<seu-email> \
  copatrulha
```

---

## Pipeline de dados e geração de RELINTs (`relintgenerator/`)

### Instalação

```bash
cd relintgenerator
uv sync
```

Requer Python ≥ 3.13 e `ANTHROPIC_API_KEY` no arquivo `.env`.

### Uso

```bash
# 1. Cruzamento espacial (necessário antes da geração de relatórios)
uv run python cruzamento_espacial.py

# 2. Gerar todos os RELINTs
uv run python gerar_relint.py

# Gerar apenas um relatório (substring do nome da área)
uv run python gerar_relint.py "Jardim"
```

Os relatórios são salvos em `relintgenerator/relints_gerados/RI_<num>_2026_<slug>.docx`.

### Fontes de dados (Bronze)

| Arquivo | Formato | Observações |
|---|---|---|
| `dados/bronze/df_ocorrencias_tratado - Extração 1 .csv` | CSV | Colunas `longitude`/`latitude`; filtrar coords fora de [-44,-43] × [-23.2,-22.7] |
| `dados/bronze/disk_denuncia.csv` | CSV sep=`;` | Encoding Latin-1; ~78% sem lat/lon |
| `dados/bronze/fatores_urbanos.csv` | CSV | `coordenada_x` = latitude, `coordenada_y` = longitude (nomes trocados) |
| `dados/bronze/cameras_areas_fm.csv` | CSV | Geometria WKT `POINT(lon lat)`; cobre 9 das 22 áreas FM |
| `dados/bronze/dominio_territorial - Extração 1.csv` | CSV | Geometria WKT; cobre apenas favelas/morros |
| `dados/bronze/sh_area_forca/areas_forca_municipal.shp` | Shapefile | Polígonos das 22 áreas FM |
| `relints/*.docx` | Word | RELINTs existentes — fonte qualitativa de dinâmica criminal |

### Camadas Silver e Gold (geradas pelo pipeline)

| Arquivo | Conteúdo |
|---|---|
| `dados/silver/ocorrencias_com_dominio.csv` | Ocorrências com `dominio_orcrim` |
| `dados/silver/ocorrencias_com_camera.csv` | Ocorrências com `nome_area_fm` e `tem_camera` |
| `dados/gold/resumo_roubos_por_dominio.csv` | Contagens por domínio × delito × ano |
| `dados/gold/resumo_roubos_por_area_fm.csv` | Contagens por área FM × câmera × delito |

---

## Conceitos do domínio

| Termo | Definição |
|---|---|
| **Área FM** | Polígono de atuação da Força Municipal (Divisão de Elite da Guarda Municipal); 22 áreas no município |
| **RELINT** | Relatório de Inteligência de Área; fonte qualitativa de modus operandi, rotas de fuga e grupos envolvidos |
| **Mancha criminal** | Concentração geoespacial de ocorrências de roubo/furto |
| **Coincidência de alto risco** | Sobreposição de mancha criminal + fator urbano + dinâmica criminal — critério de priorização operacional |
| **Domínio territorial** | Cobertura de favelas/morros por facção ou milícia; ~8% das ocorrências (maioria no "asfalto") |
