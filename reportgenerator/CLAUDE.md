# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

CoPatrulha é um protótipo de plataforma de inteligência criminal para a Prefeitura do Rio de Janeiro. O objetivo central é integrar cinco fontes de dados heterogêneas, cruzar mancha criminal com fatores urbanos e dinâmica criminal, e gerar automaticamente os **Relatórios Analíticos de Área** que hoje são produzidos manualmente. A cobertura operacional é sobre **22 áreas prioritárias da Força Municipal (FM)** no município do Rio de Janeiro.

## Commands

```bash
# Instalar dependências
uv sync

# Rodar um script
uv run python cruzamento_espacial.py

# Adicionar dependência
uv add <pacote>
```

## Data sources

| Arquivo | Formato | Separador | Observações críticas |
|---------|---------|-----------|----------------------|
| `dados/bronze/df_ocorrencias_tratado - Extração 1 .csv` | CSV | `,` | Colunas `longitude`/`latitude`; filtrar coordenadas fora de [-44,-43] × [-23.2,-22.7] antes de uso |
| `dados/bronze/disk_denuncia.csv` | CSV | `;` | Encoding Latin-1/UTF-8 corrompido; ~78% das linhas sem lat/lon; filtrar `municipio = 'RIO DE JANEIRO'` |
| `dados/bronze/fatores_urbanos.csv` | CSV | `,` | **`coordenada_x` = latitude, `coordenada_y` = longitude** (nomes trocados) |
| `dados/bronze/cameras_areas_fm.csv` | CSV | `,` | Geometria WKT `POINT(lon lat)` na coluna `geometry`; cobre 9 das 22 áreas FM |
| `dados/bronze/dominio_territorial - Extração 1.csv` | CSV | `,` | Geometria WKT na coluna `geometria`; cobre apenas favelas/morros (~8% das ocorrências do asfalto) |
| `dados/bronze/sh_area_forca/areas_forca_municipal.shp` | Shapefile | — | Polígonos das 22 áreas de atuação da FM; ler com `geopandas.read_file()` |
| `relints/*.docx` | Word | — | RELINTs (relatórios de inteligência) por área FM; fonte qualitativa de dinâmica criminal |
| `dados/Dicionário de dados.xlsx` | Excel | — | Referência canônica de todas as colunas de todos os datasets |

## Spatial analysis conventions

- CRS de armazenamento: **EPSG:4326** (WGS84 lat/lon)
- CRS para cálculos métricos (buffers, distâncias): **EPSG:31983** (SIRGAS 2000 / UTM zone 23S)
- Joins espaciais usam `geopandas.sjoin()` com `predicate="within"` (ponto × polígono) ou buffer prévio (ponto × ponto)
- Converter para Polars com `.to_pandas()` + `pl.from_pandas()` após operações espaciais (geopandas retorna pandas)

## Architecture

O fluxo analítico tem três camadas:

1. **Ingestão/limpeza** — cada dataset tem particularidades de encoding, separador e CRS (ver tabela acima)
2. **Cruzamento espacial** — `cruzamento_espacial.py` faz os dois joins principais:
   - Ocorrências × `dominio_territorial` (ponto dentro de polígono → facção/milícia)
   - Ocorrências × `cameras_areas_fm` (buffer 200m → área FM e flag `tem_camera`)
   - Outputs silver: `dados/silver/ocorrencias_com_dominio.csv`, `dados/silver/ocorrencias_com_camera.csv`
   - Outputs gold: `dados/gold/resumo_roubos_por_dominio.csv`, `dados/gold/resumo_roubos_por_area_fm.csv`
3. **Geração de relatório** — não implementado ainda; deve consumir os outputs do cruzamento espacial junto com o conteúdo dos RELINTs (`.docx`) e seguir o formato dos exemplos em `relints/`

## Key domain concepts

- **Área FM**: polígono de atuação da Força Municipal (Divisão de Elite da Guarda Municipal); há 22 áreas no total
- **RELINT**: Relatório de Inteligência produzido por área, base qualitativa da dinâmica criminal (modus operandi, rotas de fuga, grupos envolvidos)
- **Fatores urbanos**: 20 fatores ambientais mapeados em campo que favorecem o crime (vegetação cobrindo iluminação, PSR, retenção de tráfego etc.); cada fator tem um órgão municipal responsável pela resolução (ver tabela no README)
- **Mancha criminal**: concentração geoespacial de ocorrências de roubo/furto
- **Coincidência de alto risco**: sobreposição de mancha criminal + fator urbano + dinâmica criminal na mesma área — critério de priorização operacional
- **Domínio territorial**: apenas cobre áreas de favela/morro; a maioria das ocorrências acontece no "asfalto" e ficará sem correspondência nesse join
