// api/proxy.js — Vercel Serverless Function
// Busca o conteúdo do servidor de streaming server-side
// e remove os headers que bloqueiam iframe

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id required' });

  // Lista de fontes para tentar
  const sources = [
    `https://vidsrc.xyz/embed/movie?tmdb=${id}`,
    `https://vidsrc.to/embed/movie/${id}`,
    `https://vidsrc.me/embed/movie?tmdb=${id}`,
    `https://embed.su/embed/movie/${id}`,
  ];

  for (const src of sources) {
    try {
      const resp = await fetch(src, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
          'Referer': 'https://www.google.com/',
        },
        redirect: 'follow',
      });

      if (!resp.ok) continue;

      let html = await resp.text();
      if (!html || html.length < 500) continue;

      // Remove headers que bloqueiam embed
      // Injeta base tag para recursos relativos carregarem corretamente
      const baseUrl = new URL(src);
      const base = `${baseUrl.protocol}//${baseUrl.host}`;

      html = html.replace(
        /<head([^>]*)>/i,
        `<head$1><base href="${base}/">`
      );

      // Remove meta que bloqueia frame
      html = html.replace(/<meta[^>]*x-frame-options[^>]*>/gi, '');
      html = html.replace(/<meta[^>]*frame-options[^>]*>/gi, '');

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('Content-Security-Policy', '');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-cache');

      return res.status(200).send(html);
    } catch (e) {
      continue;
    }
  }

  // Nenhuma fonte funcionou — retorna página de erro
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(`
    <!DOCTYPE html>
    <html><head><meta charset="UTF-8">
    <style>body{background:#000;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:12px}
    .ico{font-size:40px}.t{font-size:16px;font-weight:600}.s{font-size:13px;color:#555}</style>
    </head><body>
    <div class="ico">😔</div>
    <div class="t">Filme indisponível no momento</div>
    <div class="s">Tente novamente mais tarde</div>
    </body></html>
  `);
}