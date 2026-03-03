// Helper to pick localized field values from objects like:
// { title: { en: 'Title', fr: 'Titre' } } or just 'Title'

function pickLocalized(value, lang) {
  if (!value || typeof value !== 'object') return value;

  // If it's already structured like { en: '...', fr: '...' }
  if (Object.prototype.hasOwnProperty.call(value, lang)) {
    return value[lang] || value.en || value.fr;
  }

  return value;
}

function localizeNewsItem(item, lang) {
  if (!item) return item;
  const obj = item.toObject ? item.toObject() : item;
  if (obj.title) obj.title = pickLocalized(obj.title, lang);
  if (obj.description) obj.description = pickLocalized(obj.description, lang);
  if (obj.category) obj.category = pickLocalized(obj.category, lang);
  return obj;
}

function localizeHighlight(item, lang) {
  if (!item) return item;
  const obj = item.toObject ? item.toObject() : item;
  if (obj.title) obj.title = pickLocalized(obj.title, lang);
  if (obj.description) obj.description = pickLocalized(obj.description, lang);
  if (obj.category) obj.category = pickLocalized(obj.category, lang);
  return obj;
}

function localizeProduct(item, lang) {
  if (!item) return item;
  const obj = item.toObject ? item.toObject() : item;
  if (obj.name) obj.name = pickLocalized(obj.name, lang);
  if (obj.description) obj.description = pickLocalized(obj.description, lang);
  if (obj.category) obj.category = pickLocalized(obj.category, lang);
  return obj;
}

function localizeFanGroup(item, lang) {
  if (!item) return item;
  const obj = item.toObject ? item.toObject() : item;
  if (obj.name) obj.name = pickLocalized(obj.name, lang);
  if (obj.slogan) obj.slogan = pickLocalized(obj.slogan, lang);
  return obj;
}

module.exports = {
  pickLocalized,
  localizeNewsItem,
  localizeHighlight,
  localizeProduct,
  localizeFanGroup,
};

