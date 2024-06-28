import 'dotenv/config';

const environment = process.env.ENVIRONMENT || 'development';

export const baseUrl =
  environment === 'production'
    ? 'https://www.cudis.xyz'
    : 'https://devtest.cudis.xyz';

export const DONATION_DESTINATION_WALLET =
  environment === 'production'
    ? 'D6Y6Zt4ViTEyT7UYRdrPzveTFjoo8dd7Bder3mZ2pExm'
    : 'EZ9hqy1RqLnkHPHvJtFH5wZfxDVDD5TQbeoKFYFkpjZt';
