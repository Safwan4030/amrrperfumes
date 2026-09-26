import dotenv from 'dotenv';

dotenv.config();

export const getDelhiveryToken = (): string => {
  const token = process.env.DELHIVERY_API_TOKEN || '';
  return token.trim().replace(/^["'\s]+|["'\s]+$/g, '');
};

export const getDelhiveryPickupLocation = (): string => {
  const loc = (process.env.DELHIVERY_PICKUP_LOCATION || 'amrparfumes').trim().replace(/^["'\s]+|["'\s]+$/g, '');
  // Normalize casing so registered pickup location amrparfumes is always matched
  if (loc.toLowerCase() === 'amrparfumes' || loc.toLowerCase() === 'amrrparfumes' || loc.toLowerCase() === 'amrrperfumes') {
    return 'amrparfumes';
  }
  return loc || 'amrparfumes';
};

export const getDelhiveryBaseUrl = (): string => {
  const env = (process.env.DELHIVERY_ENV || 'production').trim().toLowerCase();
  if (env === 'staging' || env === 'sandbox') {
    return 'https://staging-express.delhivery.com';
  }
  return 'https://track.delhivery.com';
};

export const getDelhiveryHeaders = (customHeaders?: Record<string, string>) => {
  const token = getDelhiveryToken();
  return {
    'Accept': 'application/json',
    'Authorization': token ? `Token ${token}` : '',
    ...customHeaders
  };
};
