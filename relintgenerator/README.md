# CoPatrulha

Protótipo de plataforma de inteligência criminal para a Prefeitura do Rio de Janeiro. Integra cinco fontes de dados heterogêneas, cruza mancha criminal com fatores urbanos e dinâmica criminal, e gera automaticamente os **Relatórios de Inteligência de Área (RELINTs)** sobre as **22 áreas prioritárias da Força Municipal (FM)**.

## Visão geral

```
Ocorrências + Domínio territorial + Câmeras + Fatores urbanos + Disk Denúncia
        │
        ▼
  cruzamento_espacial.py   →   dados/ocorrencias_com_*.csv
        │
        ▼
    gerar_relint.py  +  Claude API   →   relints_gerados/RI_*.docx
```

## Instalação

```bash
uv sync
```

Requer Python ≥ 3.13 e uma chave de API Anthropic em `ANTHROPIC_API_KEY`.

## Uso

```bash
# 1. Cruzamento espacial (pré-requisito para geração de relatórios)
uv run python cruzamento_espacial.py

# 2. Gerar todos os 8 RELINTs
uv run python gerar_relint.py

# Gerar apenas um relatório (substring do nome da área)
uv run python gerar_relint.py "Jardim"
```

Os relatórios são salvos em `relints_gerados/RI_<num>_2026_<slug>.docx`.

## Fontes de dados

**Bronze** (dados brutos de entrada):

| Arquivo | Formato | Sep | Observações |
|---------|---------|-----|-------------|
| `dados/bronze/df_ocorrencias_tratado - Extração 1 .csv` | CSV | `,` | Colunas `longitude`/`latitude`; filtrar coords fora de [-44,-43] × [-23.2,-22.7] |
| `dados/bronze/disk_denuncia.csv` | CSV | `;` | Encoding Latin-1; ~78% sem lat/lon; filtrar `municipio = 'RIO DE JANEIRO'` |
| `dados/bronze/fatores_urbanos.csv` | CSV | `,` | **`coordenada_x` = latitude, `coordenada_y` = longitude** (nomes trocados) |
| `dados/bronze/cameras_areas_fm.csv` | CSV | `,` | Geometria WKT `POINT(lon lat)`; cobre 9 das 22 áreas FM |
| `dados/bronze/dominio_territorial - Extração 1.csv` | CSV | `,` | Geometria WKT; cobre apenas favelas/morros |
| `dados/bronze/sh_area_forca/areas_forca_municipal.shp` | Shapefile | — | Polígonos das 22 áreas FM |
| `dados/bronze/Dicionário de dados.xlsx` | Excel | — | Referência canônica de todas as colunas |
| `relints/*.docx` | Word | — | RELINTs existentes (fonte qualitativa de dinâmica criminal) |

**Silver** (dados limpos e enriquecidos — gerados por `cruzamento_espacial.py`):

| Arquivo | Conteúdo |
|---------|----------|
| `dados/silver/ocorrencias_com_dominio.csv` | Ocorrências com `dominio_orcrim` |
| `dados/silver/ocorrencias_com_camera.csv` | Ocorrências com `nome_area_fm` e `tem_camera` |

**Gold** (agregações calculadas — geradas por `cruzamento_espacial.py`):

| Arquivo | Conteúdo |
|---------|----------|
| `dados/gold/resumo_roubos_por_dominio.csv` | Contagens por domínio × delito × ano |
| `dados/gold/resumo_roubos_por_area_fm.csv` | Contagens por área FM × câmera × delito |

## Arquitetura

### 1. Cruzamento espacial (`cruzamento_espacial.py`)

Realiza dois joins geoespaciais:

- **Ocorrências × Domínio territorial** — `sjoin` ponto-dentro-de-polígono; associa cada ocorrência à facção ou milícia que controla o território.
- **Ocorrências × Câmeras FM** — buffer de 200 m em EPSG:31983; associa cada ocorrência à área FM e marca `tem_camera = True/False`.

Saídas:

| Arquivo | Camada | Conteúdo |
|---------|--------|----------|
| `dados/silver/ocorrencias_com_dominio.csv` | silver | Ocorrências enriquecidas com `dominio_orcrim` |
| `dados/silver/ocorrencias_com_camera.csv` | silver | Ocorrências enriquecidas com `nome_area_fm` e `tem_camera` |
| `dados/gold/resumo_roubos_por_dominio.csv` | gold | Contagens por domínio × delito × ano |
| `dados/gold/resumo_roubos_por_area_fm.csv` | gold | Contagens por área FM × câmera × delito |

### 2. Geração de RELINTs (`gerar_relint.py`)

Para cada área configurada em `AREA_CONFIG`:

1. Extrai nomes de sub-áreas e rotas de fuga do RELINT original (`.docx`).
2. Filtra ocorrências, fatores urbanos, câmeras e relatos Disk Denúncia para a área.
3. Envia contexto estruturado à **Claude API** (`claude-sonnet-4-6`) com prompt de sistema cacheado.
4. Monta o `.docx` final usando o template do RELINT original.

## Convenções espaciais

- Armazenamento: **EPSG:4326** (WGS84)
- Cálculos métricos (buffers, distâncias): **EPSG:31983** (SIRGAS 2000 / UTM zone 23S)

## Fatores urbanos

20 fatores ambientais mapeados em campo, cada um com um órgão responsável pela resolução:

| Fator | Órgão responsável |
|-------|-------------------|
| Vegetação cobrindo iluminação | SEOP / RioLuz |
| Iluminação pública inoperante | RioLuz |
| Ponto de consumo de drogas (PSR) | SMAS / Prefeitura |
| Retenção de tráfego | CET-Rio |
| Obstáculo físico bloqueando visibilidade | SEOP |
| Banca/comércio informal estreitando calçada | SEOP / SMF |
| Terreno baldio / imóvel abandonado | SMU |
| Ausência de câmera de monitoramento | SEOP / Civitas |
| Rota de fuga para via expressa | CET-Rio / GM |
| Acesso facilitado a comunidade | SEOP / GM |

## Conceitos do domínio

| Termo | Definição |
|-------|-----------|
| **Área FM** | Polígono de atuação da Força Municipal (Divisão de Elite da Guarda Municipal); 22 áreas no município |
| **RELINT** | Relatório de Inteligência por área; fonte qualitativa de modus operandi, rotas de fuga e grupos envolvidos |
| **Mancha criminal** | Concentração geoespacial de ocorrências de roubo/furto |
| **Coincidência de alto risco** | Sobreposição de mancha criminal + fator urbano + dinâmica criminal — critério de priorização operacional |
| **Domínio territorial** | Cobertura de favelas/morros por facção ou milícia; ~8% das ocorrências (maioria no "asfalto") |
