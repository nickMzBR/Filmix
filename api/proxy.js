// api/proxy.js — Vercel Serverless Function
// Busca o conteúdo do servidor de streaming server-side
// Remove TODOS os headers que causam redirect/popup

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).send('id required');

  const sources = [
    `https://vidsrc.xyz/embed/movie?tmdb=${id}`,
    `https://vidsrc.to/embed/movie/${id}`,
    `https://vidsrc.me/embed/movie?tmdb=${id}`,
    `https://embed.su/embed/movie/${id}`,
    `https://www.2embed.cc/embed/${id}`,
  ];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'iframe',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'cross-site',
    'Referer': 'https://www.google.com/',
  };

  for (const src of sources) {
    try {
      const resp = await fetch(src, { headers, redirect: 'follow' });
      if (!resp.ok) continue;

      let html = await resp.text();
      if (!html || html.length < 500) continue;

      // Injeta base para recursos relativos
      const baseUrl = new URL(src);
      const base = `${baseUrl.protocol}//${baseUrl.host}`;

      // Remove scripts de anúncio e redirect
      html = html
        // Remove popunders / pop ads
        .replace(/<script[^>]*>[^<]*(?:pop|redirect|window\.open|adblock|adsense|googletag)[^<]*<\/script>/gi, '')
        // Remove iframes de anúncio
        .replace(/<iframe[^>]*(?:ads?|banner|pop)[^>]*>[\s\S]*?<\/iframe>/gi, '')
        // Injeta base tag
        .replace(/<head([^>]*)>/i, `<head$1><base href="${base}/">`)
        // Injeta script anti-popup DENTRO do HTML servido
        .replace('</head>', `
<script>
// Anti-popup injetado pelo Filmix
(function(){
  var _open = window.open;
  window.open = function(){ return null; };
  // Bloqueia redirects
  Object.defineProperty(window,'location',{
    set: function(v){ console.log('redirect bloqueado:',v); },
    get: function(){ return window.location; },
    configurable: true
  });
  // Remove listeners de click que causam popup
  document.addEventListener('click', function(e){
    // Bloqueia apenas se for fora de elementos de controle do player
    var el = e.target;
    var isPlayer = el.closest('video,button,[class*="play"],[class*="ctrl"],[class*="control"]');
    if(!isPlayer){
      e.stopImmediatePropagation();
    }
  }, true);
})();
<\/script>
</head>`);

      // Headers que permitem iframe sem popup
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('Content-Security-Policy',
        "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; " +
        "frame-ancestors 'self'; " +
        "navigate-to 'none';"
      );
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-cache, no-store');
      res.setHeader('Referrer-Policy', 'no-referrer');
      // Remove headers que causam redirect do browser
      res.removeHeader('Location');

      return res.status(200).send(html);
    } catch (e) {
      continue;
    }
  }

  // Nenhuma fonte funcionou
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>body{background:#000;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:12px;text-align:center;padding:20px}
    .i{font-size:40px}.t{font-size:16px;font-weight:600}.s{font-size:13px;color:#555}</style>
    </head><body>
    <div class="i">😔</div>
    <div class="t">indisponível</div>
    <div class="s">Tente outro filme ou volte mais tarde</div>
    </body></html>`);
}
