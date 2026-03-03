// Language middleware: derive a simple lang code ('en' | 'fr') from headers

function normalizeLang(code) {
  if (!code) return 'en';
  const c = String(code).toLowerCase();
  if (c.startsWith('fr')) return 'fr';
  return 'en';
}

module.exports = function langMiddleware(req, res, next) {
  const header =
    req.headers['accept-language'] ||
    req.headers['x-lang'] ||
    req.headers['x-language'];

  // Accept values like "fr", "fr-FR,en;q=0.8", etc.
  const first = header ? header.split(',')[0].trim() : 'en';
  req.lang = normalizeLang(first);
  next();
};

