import { config } from 'dotenv';

config(); 
const emilConfig = {
    host: process.env.EMAIL_HOST || 'smtp.example.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure:  false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || '',
    },
    fromAddress: process.env.EMAIL_FROM_ADDRESS || ''
};

export default emilConfig;