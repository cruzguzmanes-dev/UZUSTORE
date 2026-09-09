-- Link de TikTok -- para la nueva página /nosotros (mini landing con todos los links,
-- pensada para un solo código QR en vez de uno por red social).
alter table config add column if not exists tiktok_url text;
