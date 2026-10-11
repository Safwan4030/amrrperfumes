import { Product } from '../types';

export type Currency = 'INR';

export const CURRENCY_RATES: Record<Currency, { symbol: string; rate: number }> = {
  INR: { symbol: '₹', rate: 1 }
};

export function formatPrice(amountInINR: number, _currency?: Currency): string {
  return `₹${amountInINR.toLocaleString('en-IN')}`;
}

export function generateOrderId(): string {
  const timestamp = Date.now().toString().slice(-6);
  const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `FP-${timestamp}-${randomStr}`;
}

export function estimateDeliveryDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

const STOP_WORDS = new Set(['for', 'the', 'a', 'an', 'in', 'of', 'and', 'with', 'by', 'from', 'to', 'at', 'is', 'on']);

export function matchProductSearch(p: Product, query: string): boolean {
  const cleanQ = query.toLowerCase().trim();
  if (!cleanQ) return true;

  const rawTokens = cleanQ.split(/\s+/).filter(Boolean);
  if (rawTokens.length === 0) return true;

  // Filter stop words unless the query only contains stop words
  const tokens = rawTokens.filter(t => !STOP_WORDS.has(t));
  const activeTokens = tokens.length > 0 ? tokens : rawTokens;

  // Gender keywords: All AMRR perfumes are Unisex artisanal extracts
  const genderKeywords = 'unisex men man mens for men gents male women woman womens for women ladies female';

  const searchableParts: string[] = [
    p.name || '',
    p.subtitle || '',
    p.category || '',
    p.family || '',
    p.shortDescription || '',
    p.story || '',
    p.gender || '',
    genderKeywords,
    // Universal perfume and brand descriptors so searches like "perfume", "amrr", "fragrance" work
    'amrr perfumes amrrparfumes amrr extrait de parfum eau de parfum perfume perfumes parfum fragrance fragrances scent scents attar cologne luxury French artisanal pure oil 50ml 50 ml',
    p.concentration || '',
    p.sku || '',
    p.ingredients || '',
    ...(p.tags || []),
    ...(p.season || []),
    ...(p.occasion || []),
    ...(p.notes?.top || []),
    ...(p.notes?.heart || []),
    ...(p.notes?.base || []),
    p.isBestSeller ? 'bestseller best seller popular signature trending top hit' : '',
    p.isNewArrival ? 'new arrival latest just launched' : '',
    p.isLimitedEdition ? 'limited edition rare exclusive' : '',
    p.id === 'inperial' ? 'inperial imperial enperial royal mandarin green fresh woody citrus' : '',
    p.id === 'rosey-oud' ? 'rosey rosi rose rose oud gulab damask floral smoky agarwood' : '',
    p.id === 'kaahf' ? 'kaahf kahf aquatic sea salt marine citrus fresh water ocean blue' : '',
    p.id === 'khael-valley' ? 'khael khal valley agarwood amber bergamot sage royal valley woody' : '',
    p.id === 'armani-stronger' ? 'armani stronger with you swy intensely chestnut vanilla sweet warm spicy gourmand' : '',
    p.id === 'musk-rijali' ? 'musk rijal rijali white musk kasturi misk silk powdery clean soft sensual' : '',
    p.id === 'alif-escala' ? 'alif escala leather saffron raspberry suede dark luxury rich' : '',
    p.id === 'akoya' ? 'akoya pearl neroli jasmine solar amber luminous coastal glowing' : '',
    p.id === 'summer-oud' ? 'summer oud citrus coastal beach sunny oud warm fresh woody' : ''
  ];

  const fullCorpus = searchableParts.join(' ').toLowerCase();

  return activeTokens.every(token => {
    // Exact or substring match in corpus
    if (fullCorpus.includes(token)) return true;

    // Plural/singular handling (e.g. "perfumes" -> "perfume", "roses" -> "rose", "notes" -> "note")
    if (token.endsWith('s') && token.length > 3 && fullCorpus.includes(token.slice(0, -1))) {
      return true;
    }
    if (token.endsWith('es') && token.length > 4 && fullCorpus.includes(token.slice(0, -2))) {
      return true;
    }

    // Common synonyms and phonetic spelling corrections
    if ((token === 'imperial' || token === 'enperial') && fullCorpus.includes('inperial')) return true;
    if (token === 'kahf' && fullCorpus.includes('kaahf')) return true;
    if (token === 'khal' && fullCorpus.includes('khael')) return true;
    if (token === 'rose' && fullCorpus.includes('rosey')) return true;
    if (token === 'rijal' && fullCorpus.includes('rijali')) return true;
    if (token === 'swy' && fullCorpus.includes('stronger')) return true;
    if ((token === 'men' || token === 'mens' || token === 'women' || token === 'womens') && fullCorpus.includes('unisex')) return true;

    return false;
  });
}
