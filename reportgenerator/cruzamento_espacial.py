"""
Cruzamento espacial:
  1. Ocorrências × Domínio territorial (ponto dentro de polígono)
  2. Ocorrências × Câmeras FM (buffer 200m — ponto próximo de ponto)

Saída:
  - dados/ocorrencias_com_dominio.csv
  - dados/ocorrencias_com_camera.csv
  - dados/resumo_roubos_por_dominio.csv
  - dados/resumo_roubos_por_area_fm.csv
"""

import geopandas as gpd
import polars as pl
from shapely import wkt
from shapely.geometry import Point
import pandas as pd

# ── Constantes ──────────────────────────────────────────────────────────────
CRS = "EPSG:4326"          # WGS84 (lat/lon)
CRS_UTM = "EPSG:31983"    # SIRGAS 2000 / UTM zone 23S (metros — Rio de Janeiro)
BUFFER_CAMERAS_M = 200    # raio de influência das câmeras em metros


# ── 1. Carrega ocorrências ───────────────────────────────────────────────────
print("Carregando ocorrências...")
ocorr = pl.read_csv(
    "dados/bronze/df_ocorrencias_tratado - Extração 1 .csv",
    infer_schema_length=10000,
)

# Filtra coordenadas aberrantes (Rio de Janeiro: lon ~-43 a -43.8, lat ~-22.7 a -23.1)
ocorr = ocorr.filter(
    (pl.col("longitude").is_between(-44.0, -43.0))
    & (pl.col("latitude").is_between(-23.2, -22.7))
)
print(f"  {len(ocorr):,} ocorrências com coordenadas válidas")

# Converte para GeoDataFrame
ocorr_pd = ocorr.to_pandas()
ocorr_gdf = gpd.GeoDataFrame(
    ocorr_pd,
    geometry=gpd.points_from_xy(ocorr_pd["longitude"], ocorr_pd["latitude"]),
    crs=CRS,
)


# ── 2. Carrega domínio territorial ───────────────────────────────────────────
print("Carregando domínio territorial...")
dom = pl.read_csv(
    "dados/bronze/dominio_territorial - Extração 1.csv",
    infer_schema_length=0,
)
dom_pd = dom.to_pandas()
dom_pd["geometry"] = dom_pd["geometria"].apply(wkt.loads)
dom_gdf = gpd.GeoDataFrame(dom_pd[["nome_territorio", "dominio_orcrim", "geometry"]], crs=CRS)

# Remove 16 polígonos com coords fora do Rio (georreferenciados no Oriente Médio)
n_antes = len(dom_gdf)
dom_gdf = dom_gdf[dom_gdf.geometry.bounds["maxx"] < -40].reset_index(drop=True)
n_removidos = n_antes - len(dom_gdf)
print(f"  {len(dom_gdf):,} territórios | {n_removidos} removidos (coords fora do Rio) | domínios: {dom_gdf['dominio_orcrim'].unique().tolist()}")


# ── 3. Carrega câmeras ───────────────────────────────────────────────────────
print("Carregando câmeras...")
cam = pl.read_csv("dados/bronze/cameras_areas_fm.csv", infer_schema_length=0)
cam_pd = cam.to_pandas()
cam_pd["geometry"] = cam_pd["geometry"].apply(wkt.loads)
cam_gdf = gpd.GeoDataFrame(cam_pd[["id_ponto", "nome_area_fm", "id_trecho", "geometry"]], crs=CRS)
print(f"  {len(cam_gdf):,} câmeras | {cam_gdf['nome_area_fm'].nunique()} áreas FM")


# ── 4. Cruzamento: Ocorrências × Domínio territorial ────────────────────────
print("\nCruzando ocorrências × domínio territorial...")

# sjoin: each occurrence gets the dominio it falls within
ocorr_dom = gpd.sjoin(
    ocorr_gdf,
    dom_gdf[["nome_territorio", "dominio_orcrim", "geometry"]],
    how="left",
    predicate="within",
)
# Remove coluna de índice do join
ocorr_dom = ocorr_dom.drop(columns=["index_right"])

n_matched = ocorr_dom["dominio_orcrim"].notna().sum()
print(f"  {n_matched:,} ocorrências dentro de algum território ({n_matched/len(ocorr_dom)*100:.1f}%)")

# Salva
ocorr_dom_out = pl.from_pandas(
    ocorr_dom.drop(columns=["geometry"]).reset_index(drop=True)
)
ocorr_dom_out.write_csv("dados/silver/ocorrencias_com_dominio.csv")
print("  -> dados/silver/ocorrencias_com_dominio.csv")


# ── 5. Cruzamento: Ocorrências × Câmeras (buffer 200m) ──────────────────────
print("\nCruzando ocorrências × câmeras (buffer 200m)...")

# Projeta para UTM para calcular distâncias em metros
ocorr_utm = ocorr_gdf.to_crs(CRS_UTM)
cam_utm = cam_gdf.to_crs(CRS_UTM)

# Buffer nas câmeras
cam_buffer = cam_utm.copy()
cam_buffer["geometry"] = cam_utm.geometry.buffer(BUFFER_CAMERAS_M)

# sjoin: ocorrência dentro de algum buffer de câmera?
ocorr_cam = gpd.sjoin(
    ocorr_utm,
    cam_buffer[["id_ponto", "nome_area_fm", "geometry"]],
    how="left",
    predicate="within",
)
ocorr_cam = ocorr_cam.drop(columns=["index_right"])

# Se uma ocorrência caiu em múltiplos buffers, mantém apenas o registro da área FM
# (pode ter múltiplas câmeras — agrupamos depois)
ocorr_cam["tem_camera"] = ocorr_cam["id_ponto"].notna()

n_com_camera = ocorr_cam["tem_camera"].sum()
print(f"  {n_com_camera:,} ocorrências a ≤{BUFFER_CAMERAS_M}m de câmera ({n_com_camera/len(ocorr_cam)*100:.1f}%)")

# Salva (deduplicando por ocorrência — mantém a primeira câmera associada)
ocorr_cam_dedup = (
    ocorr_cam
    .sort_values("id_ponto", na_position="last")
    .drop_duplicates(subset=["id_criptografado"])
    .drop(columns=["geometry"])
    .reset_index(drop=True)
)
n_com_camera_dedup = ocorr_cam_dedup["tem_camera"].sum()
total_dedup = len(ocorr_cam_dedup)
print(f"  {n_com_camera_dedup:,} ocorrências únicas a ≤{BUFFER_CAMERAS_M}m de câmera ({n_com_camera_dedup/total_dedup*100:.1f}% do total)")
ocorr_cam_out = pl.from_pandas(ocorr_cam_dedup)
ocorr_cam_out.write_csv("dados/silver/ocorrencias_com_camera.csv")
print("  -> dados/silver/ocorrencias_com_camera.csv")


# ── 6. Resumos analíticos ────────────────────────────────────────────────────
print("\nGerando resumos...")

# Resumo por domínio orcrim × tipo de delito
resumo_dom = (
    pl.from_pandas(ocorr_dom.drop(columns=["geometry"]))
    .filter(pl.col("dominio_orcrim").is_not_null())
    .group_by(["dominio_orcrim", "desc_delito", "ano"])
    .agg(pl.len().alias("n_ocorrencias"))
    .sort(["dominio_orcrim", "desc_delito", "ano"])
)
resumo_dom.write_csv("dados/gold/resumo_roubos_por_dominio.csv")
print("  -> dados/gold/resumo_roubos_por_dominio.csv")

# Resumo por área FM: com câmera vs sem câmera
resumo_cam = (
    pl.from_pandas(ocorr_cam_dedup)
    .group_by(["nome_area_fm", "tem_camera", "desc_delito"])
    .agg(pl.len().alias("n_ocorrencias"))
    .sort(["nome_area_fm", "desc_delito"])
)
resumo_cam.write_csv("dados/gold/resumo_roubos_por_area_fm.csv")
print("  -> dados/gold/resumo_roubos_por_area_fm.csv")


# ── 7. Imprime tabelas de resumo no console ──────────────────────────────────
print("\n" + "="*60)
print("ROUBOS POR DOMÍNIO CRIMINAL (total 2020–2024)")
print("="*60)
print(
    pl.from_pandas(ocorr_dom.drop(columns=["geometry"]))
    .filter(pl.col("dominio_orcrim").is_not_null())
    .group_by("dominio_orcrim")
    .agg(pl.len().alias("n_ocorrencias"))
    .sort("n_ocorrencias", descending=True)
)

print("\n" + "="*60)
print("ROUBOS POR ÁREA FM — com câmera (≤200m) vs sem câmera")
print("="*60)
print(
    pl.from_pandas(ocorr_cam_dedup)
    .group_by(["nome_area_fm", "tem_camera"])
    .agg(pl.len().alias("n_ocorrencias"))
    .sort(["nome_area_fm", "tem_camera"])
)

print("\nConcluído.")
