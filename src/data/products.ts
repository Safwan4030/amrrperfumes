import { Product } from '../types';

import khaelValleyImg from '../assets/images/amrr_khael_valley_bottle_exact_1787898923980.jpg';
import kaahfImg from '../assets/images/amrr_kaahf_bottle_exact_1787898893639.jpg';
import roseyOudImg from '../assets/images/amrr_rosey_oud_bottle_exact_1787898910173.jpg';
import akoyaImg from '../assets/images/amrr_akoya_bottle_1789571152599.jpg';
import alifEscalaImg from '../assets/images/amrr_alif_escala_1789571550285.jpg';
import muskRijaliImg from '../assets/images/amrr_musk_rijali_1789571573753.jpg';
import armaniStrongerImg from '../assets/images/amrr_armani_stronger_1789571589257.jpg';
import summerOudImg from '../assets/images/amrr_summer_oud_1789571608216.jpg';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'khael-valley',
    name: 'Khael Valley',
    subtitle: 'Eau de Parfum (50 ml)',
    category: 'Eau de Parfum',
    family: 'Woody Oud',
    shortDescription: 'Our signature masterpiece. A regal accord of rare Cambodian agarwood, crisp Italian bergamot, and warm Madagascar vanilla.',
    story: 'Khael Valley was formulated for those who leave an indelible presence without saying a word. Anchored by 20-year aged wild agarwood and lifted by botanical bergamot and French clary sage, it embodies understated power and timeless sophistication.',
    price50ml: 1199,
    originalPrice50ml: 1499,
    availableSizes: ['50 ml'],
    rating: 4.9,
    reviewCount: 184,
    inStock: true,
    stockQuantity: 18,
    isBestSeller: true,
    isNewArrival: false,
    image: khaelValleyImg,
    gallery: [
      khaelValleyImg
    ],
    notes: {
      top: ['Calabrian Bergamot', 'French Clary Sage', 'Pink Pepper'],
      heart: ['Taif Rose', 'White Suede', 'Guaiac Wood'],
      base: ['Aged Cambodian Oud', 'Bourbon Vanilla', 'Ambergris']
    },
    longevity: 5,
    projection: 5,
    sillage: 'Enveloping',
    gender: 'Unisex',
    season: ['Autumn', 'Winter', 'Cool Evenings'],
    occasion: ['Gala & Black Tie', 'Executive Boardroom', 'Intimate Evenings'],
    concentration: 'Eau de Parfum',
    ingredients: 'Alcohol Denat., Parfum (Fragrance), Aqua (Water), Limonene, Linalool, Alpha-Isomethyl Ionone, Eugenol, Citral.',
    reviews: [
      {
        id: 'rev-1',
        userName: 'Aarav M.',
        rating: 5,
        date: '2 days ago',
        comment: 'Khael Valley is truly unforgettable. The sage and oud balance is otherworldly. Received compliments in the elevator within 10 minutes of wearing it.',
        verified: true
      },
      {
        id: 'rev-2',
        userName: 'Eleanor Vance',
        rating: 5,
        date: '1 week ago',
        comment: 'The packaging and bottle feel like something from a private boutique in Paris. The 50ml flacon is heavy clear glass with a crisp fluted black cap and kraft label.',
        verified: true
      }
    ]
  },
  {
    id: 'kaahf',
    name: 'Kaahf',
    subtitle: 'Fresh Marine & Green Citrus (50 ml)',
    category: 'Eau de Parfum',
    family: 'Fresh Aquatic',
    shortDescription: 'Crisp coastal sea salt, sparkling pink grapefruit, and sun-drenched cedarwood. The ultimate uplifting luxury signature.',
    story: 'Inspired by early dawn over the Mediterranean coastline, Kaahf opens with an invigorating burst of sea spray and grapefruit, grounding smoothly into mossy oakwood and clean white musk.',
    price50ml: 799,
    originalPrice50ml: 1099,
    availableSizes: ['50 ml'],
    rating: 4.8,
    reviewCount: 146,
    inStock: true,
    stockQuantity: 12,
    isBestSeller: true,
    isNewArrival: false,
    image: kaahfImg,
    gallery: [
      kaahfImg
    ],
    notes: {
      top: ['Oceanic Air Accord', 'Pink Grapefruit', 'Cardamom'],
      heart: ['Lavender Essence', 'Sage Blossom', 'Geranium'],
      base: ['Virginia Cedar', 'Vetiver Root', 'Clean Amber']
    },
    longevity: 4,
    projection: 4,
    sillage: 'Moderate',
    gender: 'Unisex',
    season: ['Spring', 'Summer', 'All-Day Wear'],
    occasion: ['Daytime Elegance', 'Yacht & Resort', 'Business Casual'],
    concentration: 'Eau de Parfum',
    ingredients: 'Alcohol Denat., Parfum (Fragrance), Aqua (Water), Benzyl Salicylate, Citronellol, Coumarin, Geraniol.',
    reviews: [
      {
        id: 'rev-3',
        userName: 'Rohan K.',
        rating: 5,
        date: '3 days ago',
        comment: 'Kaahf is my new daily signature scent. So fresh yet noticeably opulent. Unbelievable longevity for an aquatic fragrance.',
        verified: true
      }
    ]
  },
  {
    id: 'rosey-oud',
    name: 'Rosey Oud',
    subtitle: 'Velvety Damask Rose & Smoky Oud (50 ml)',
    category: 'Eau de Parfum',
    family: 'Oriental Floral',
    shortDescription: 'Velvety Damask rose petals infused with smoky Assam agarwood, amber, and warm saffron. Seductive, romantic, and deeply opulent.',
    story: 'Rosey Oud is an enchanting symphony of contrast. Intoxicating Bulgarian and Damask roses bloom over a heart of dark Assam oud, wrapped in golden amber and creamy sandalwood for a sensual, long-lasting trail.',
    price50ml: 899,
    originalPrice50ml: 1199,
    availableSizes: ['50 ml'],
    rating: 5.0,
    reviewCount: 158,
    inStock: true,
    stockQuantity: 15,
    isBestSeller: true,
    isNewArrival: true,
    image: roseyOudImg,
    gallery: [
      roseyOudImg
    ],

    notes: {
      top: ['Damask Rose', 'Kashmir Saffron', 'Bergamot'],
      heart: ['Bulgarian Rose Essence', 'Smoky Guaiac Wood', 'Praline'],
      base: ['Assam Oud', 'Golden Amber', 'Mysore Sandalwood']
    },
    longevity: 5,
    projection: 5,
    sillage: 'Enveloping',
    gender: 'Unisex',
    season: ['Autumn', 'Winter', 'Special Evenings'],
    occasion: ['Romantic Dinners', 'Gala & Celebrations', 'Luxury Evening'],
    concentration: 'Eau de Parfum',
    ingredients: 'Alcohol Denat., Parfum (Fragrance), Aqua (Water), Citronellol, Geraniol, Eugenol, Linalool, Farnesol.',
    reviews: [
      {
        id: 'rev-4',
        userName: 'Ananya S.',
        rating: 5,
        date: '1 day ago',
        comment: 'The combination of fresh rose and rich dark oud is divine. It lasts all day and night.',
        verified: true
      }
    ]
  },
  {
    id: 'akoya',
    name: 'Akoya',
    subtitle: 'Luminous Pearl Amber & Solar Florals (50 ml)',
    category: 'Eau de Parfum',
    family: 'Solar Amber Floral',
    shortDescription: 'Inspired by the iridescence of Akoya pearls. A radiant union of crisp white neroli, sea salt crystals, creamy solar jasmine, and crystalline white amber.',
    story: 'Named after the rare saltwater pearl prized for its mirror-like luster, Akoya captures pure radiance. Opening with saline sea breeze and luminous Italian neroli, it unfurls into sun-warmed jasmine and velvety white iris before settling onto a decadent base of driftwood and crystalline ambergris.',
    price50ml: 999,
    originalPrice50ml: 1299,
    availableSizes: ['50 ml'],
    rating: 4.9,
    reviewCount: 92,
    inStock: true,
    stockQuantity: 16,
    isBestSeller: false,
    isNewArrival: true,
    image: akoyaImg,
    gallery: [
      akoyaImg
    ],
    notes: {
      top: ['Crisp Sea Salt', 'Italian Neroli', 'White Peach'],
      heart: ['Luminous Jasmine Sambac', 'Orris Root (White Iris)', 'Solar Lily'],
      base: ['Crystalline White Amber', 'Salted Driftwood', 'Cashmere Musk']
    },
    longevity: 5,
    projection: 4,
    sillage: 'Enveloping',
    gender: 'Unisex',
    season: ['All Seasons', 'Spring & Summer', 'Day into Evening'],
    occasion: ['Signature Daily Luxury', 'Garden Parties', 'Intimate Gatherings'],
    concentration: 'Eau de Parfum',
    ingredients: 'Alcohol Denat., Parfum (Fragrance), Aqua (Water), Benzyl Salicylate, Hydroxycitronellal, Limonene, Linalool, Alpha-Isomethyl Ionone.',
    reviews: [
      {
        id: 'rev-5',
        userName: 'Devika R.',
        rating: 5,
        date: 'Just now',
        comment: 'Akoya is pure understated luxury in a bottle. The salty white amber and radiant neroli make you feel pristine and elegant. Exceptional wear time!',
        verified: true
      }
    ]
  },
  {
    id: 'alif-escala',
    name: 'Alif Escala',
    subtitle: 'Prestige Saffron & Smoked Leather Accord (50 ml)',
    category: 'Eau de Parfum',
    family: 'Spicy Amber',
    shortDescription: 'An intoxicating statement of power and prestige. Saffron threads and wild raspberries meld with smoky Tuscan leather, black thyme, and opulent amber resin.',
    story: 'Alif Escala ascends to the apex of luxury perfumery. Conceived as an olfactory triumph of heritage and ambition, it blends fiery saffron threads with crushed night thyme and suede leather, grounded by the warmth of sacred amber and cedarwood.',
    price50ml: 999,
    originalPrice50ml: 1299,
    availableSizes: ['50 ml'],
    rating: 4.9,
    reviewCount: 78,
    inStock: true,
    stockQuantity: 18,
    isBestSeller: false,
    isNewArrival: true,
    image: alifEscalaImg,
    gallery: [
      alifEscalaImg
    ],
    notes: {
      top: ['Persian Saffron', 'Wild Black Raspberry', 'French Thyme'],
      heart: ['Night-Blooming Jasmine', 'Smoked Olibanum Frankincense', 'Orris'],
      base: ['Tuscan Suede Leather', 'Black Amber', 'Atlas Cedar']
    },
    longevity: 5,
    projection: 5,
    sillage: 'Intense',
    gender: 'Unisex',
    season: ['Autumn', 'Winter', 'Formal Evenings'],
    occasion: ['Gala Evenings', 'Executive Presence', 'VIP Gatherings'],
    concentration: 'Eau de Parfum',
    ingredients: 'Alcohol Denat., Parfum (Fragrance), Aqua (Water), Limonene, Linalool, Alpha-Isomethyl Ionone, Eugenol, Isoeugenol.',
    reviews: [
      {
        id: 'rev-6',
        userName: 'Hamdan A.',
        rating: 5,
        date: '2 days ago',
        comment: 'Alif Escala is majestic. The saffron and smoky leather project like royalty. Unbelievable quality and concentration.',
        verified: true
      }
    ]
  },
  {
    id: 'musk-rijali',
    name: 'Musk Rijali',
    subtitle: 'Pure Royal White Musk & Cashmere Silk (50 ml)',
    category: 'Eau de Parfum',
    family: 'Regal Musk',
    shortDescription: 'The quintessential essence of royal purity. Silken Arabian white musk kissed by powdery Taif rose petals, sweet almond blossoms, and creamy sandalwood.',
    story: 'Musk Rijali is an homage to timeless Arabian perfumery traditions. Distilled with pure white musk of majestic softness, it envelopes the wearer in an aura of refined nobility, cleanliness, and velvet sensuality that lingers seamlessly throughout the day.',
    price50ml: 999,
    originalPrice50ml: 1299,
    availableSizes: ['50 ml'],
    rating: 5.0,
    reviewCount: 114,
    inStock: true,
    stockQuantity: 20,
    isBestSeller: true,
    isNewArrival: false,
    image: muskRijaliImg,
    gallery: [
      muskRijaliImg
    ],
    notes: {
      top: ['Royal White Musk', 'Taif Rose Dew', 'Almond Blossom'],
      heart: ['Creamy Gardenia', 'Powdery Orris', 'Cashmere Accord'],
      base: ['Mysore Sandalwood', 'White Ambergris', 'Silken Musks']
    },
    longevity: 5,
    projection: 4,
    sillage: 'Enveloping',
    gender: 'Unisex',
    season: ['All Seasons', 'Signature Daily Wear'],
    occasion: ['Royal Daily Signature', 'Prayers & Meditation', 'Intimate Elegance'],
    concentration: 'Eau de Parfum',
    ingredients: 'Alcohol Denat., Parfum (Fragrance), Aqua (Water), Alpha-Isomethyl Ionone, Coumarin, Benzyl Benzoate, Linalool, Citronellol.',
    reviews: [
      {
        id: 'rev-7',
        userName: 'Zayd M.',
        rating: 5,
        date: 'Yesterday',
        comment: 'The cleanest, most luxurious white musk I have ever owned. Gentle yet it stays on my garments for days.',
        verified: true
      }
    ]
  },
  {
    id: 'armani-stronger',
    name: 'Armani Stronger',
    subtitle: 'Intense Cardamom, Glazed Chestnut & Warm Vanilla (50 ml)',
    category: 'Eau de Parfum',
    family: 'Warm Spicy Amber',
    shortDescription: 'An irresistible magnetic attraction. Spicy cardamom and crushed mint open into rich glazed chestnut, smoky sage, and Bourbon vanilla essence.',
    story: 'Armani Stronger radiates unapologetic confidence and magnetic charm. An intoxicating fusion of warm spices and gourmet glazed chestnuts wrapped in smoky French clary sage and seductive cedarwood, formulated as an enduring eau de parfum.',
    price50ml: 999,
    originalPrice50ml: 1299,
    availableSizes: ['50 ml'],
    rating: 4.9,
    reviewCount: 86,
    inStock: true,
    stockQuantity: 15,
    isBestSeller: false,
    isNewArrival: true,
    image: armaniStrongerImg,
    gallery: [
      armaniStrongerImg
    ],
    notes: {
      top: ['Pink Pepper', 'Green Cardamom', 'Frosted Violet Leaf'],
      heart: ['Smoky Clary Sage', 'Lavender Heart', 'Glazed Chestnut'],
      base: ['Bourbon Vanilla Extract', 'Cedarwood', 'Guaiac Smoke', 'Golden Amber']
    },
    longevity: 5,
    projection: 5,
    sillage: 'Intense',
    gender: 'Unisex',
    season: ['Autumn', 'Winter', 'Evening Dates'],
    occasion: ['Night Out', 'Romantic Evenings', 'Cold Weather Elegance'],
    concentration: 'Eau de Parfum',
    ingredients: 'Alcohol Denat., Parfum (Fragrance), Aqua (Water), Coumarin, Limonene, Linalool, Cinnamal, Eugenol.',
    reviews: [
      {
        id: 'rev-8',
        userName: 'Rohit K.',
        rating: 5,
        date: '3 days ago',
        comment: 'Warm, spicy, and compliment magnet! The chestnut and vanilla notes are intoxicating.',
        verified: true
      }
    ]
  },
  {
    id: 'summer-oud',
    name: 'Summer Oud',
    subtitle: 'Sun-Drenched Citrus & Airy Aquatic Oud (50 ml)',
    category: 'Eau de Parfum',
    family: 'Fresh Citrus Oud',
    shortDescription: 'The impossible made sublime: a vibrant, refreshing summer oud. Sunlit Mediterranean citrus and marine sea breeze fused with airy agarwood and golden vetiver.',
    story: 'Summer Oud defies convention by reimagining heavy Middle Eastern agarwood through a luminous coastal lens. Sparkling Sicilian bergamot, mandarin zest, and sea mineral spray illuminate a sheer, elegant white oud that breathes effortlessly in the warmest temperatures.',
    price50ml: 999,
    originalPrice50ml: 1299,
    availableSizes: ['50 ml'],
    rating: 4.9,
    reviewCount: 95,
    inStock: true,
    stockQuantity: 22,
    isBestSeller: true,
    isNewArrival: true,
    image: summerOudImg,
    gallery: [
      summerOudImg
    ],
    notes: {
      top: ['Sicilian Bergamot', 'Mandarin Zest', 'Marine Coastal Mist'],
      heart: ['Airy White Oud', 'Ginger Lily', 'Crisp Cypress'],
      base: ['Haitian Vetiver', 'Sun-bleached Driftwood', 'Clean Amber']
    },
    longevity: 5,
    projection: 4,
    sillage: 'Enveloping',
    gender: 'Unisex',
    season: ['Summer', 'Spring', 'Hot Sunny Days'],
    occasion: ['Coastal Holidays', 'Brunch & Yachting', 'Daytime Signature'],
    concentration: 'Eau de Parfum',
    ingredients: 'Alcohol Denat., Parfum (Fragrance), Aqua (Water), Limonene, Linalool, Citronellol, Geraniol, Citral.',
    reviews: [
      {
        id: 'rev-9',
        userName: 'Ayesha S.',
        rating: 5,
        date: 'Yesterday',
        comment: 'Finally an oud you can wear in 35-degree heat! Fresh, bright citrus with a gorgeous underlying woody base that never feels heavy.',
        verified: true
      }
    ]
  }
];

export const PRESET_IMAGES = [
  { name: 'Khael Valley', url: khaelValleyImg },
  { name: 'Kaahf', url: kaahfImg },
  { name: 'Rosey Oud', url: roseyOudImg },
  { name: 'Akoya', url: akoyaImg },
  { name: 'Alif Escala', url: alifEscalaImg },
  { name: 'Musk Rijali', url: muskRijaliImg },
  { name: 'Armani Stronger', url: armaniStrongerImg },
  { name: 'Summer Oud', url: summerOudImg }
];
