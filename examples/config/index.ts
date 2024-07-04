import 'dotenv/config';

const environment = process.argv[2];

export const baseUrl =
  environment === 'production'
    ? 'https://www.cudis.xyz'
    : 'https://devtest.cudis.xyz';

export const DONATION_DESTINATION_WALLET =
  environment === 'production'
    ? 'D6Y6Zt4ViTEyT7UYRdrPzveTFjoo8dd7Bder3mZ2pExm'
    : 'EZ9hqy1RqLnkHPHvJtFH5wZfxDVDD5TQbeoKFYFkpjZt';

export const mixpanel_id =
  environment === 'production'
    ? '30d2c38bff6818cca87aa64cadae7320'
    : '57c58fc13ede2cd748ad57ceaf72d1a2';
