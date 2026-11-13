const { version } = require('../package.json');

module.exports = (req, res) => {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    let { config } = req.query || {};
    if (Array.isArray(config)) config = config[0];

    let sourcesCount = 0;
    if (config && typeof config === 'string') {
      try {
        const b64 = config.replace(/-/g, '+').replace(/_/g, '/');
        const padded = b64 + '=='.slice(0, (4 - b64.length % 4) % 4);
        const cfg = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
        sourcesCount = cfg.sources?.length || 0;
      } catch { }
    }

    res.json({
      id: 'com.addtorr.addon',
      version,
      name: 'AddTORR',
      description: config
        ? `Agregador ativo com ${sourcesCount} fonte(s).\nActive agregator on ${sourcesCount} source(s).`
        : 'Smart filtering and stream customization for Stremio\nFiltragem inteligente e personalização de streams para Stremio.',
      logo:        `https://${req.headers['x-forwarded-host'] || req.headers.host || 'localhost'}/stremio-logo.png`,
      resources: ['stream'],
      types: ['movie', 'series'],
      idPrefixes: ['tt'],
      catalogs: [],
      behaviorHints: {
        configurable: true,
        configurationRequired: !config,
      },
    });
  } catch (err) {
    console.error('[AddTORR] Manifest error:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
};
