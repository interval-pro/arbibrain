import { config as dotEnvConfig } from 'dotenv';

dotEnvConfig();
export const envConfig = {
    PORT: process.env.PORT,
}