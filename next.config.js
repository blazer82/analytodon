const {PHASE_DEVELOPMENT_SERVER} = require('next/constants');

const {
    JWT_SECRET = 'change-this-secret',
    MONGODB_URI = '',
    SES_HOST = 'email-smtp.eu-central-1.amazonaws.com',
    SES_PORT = '465',
    SES_USER = '',
    SES_PASSWD = '',
    APP_URL = 'https://app.analytodon.com',
    MARKETING_URL = 'https://www.analytodon.com',
    SUPPORT_EMAIL = 'info@analytodon.com',
    EMAIL_SENDER_NAME = 'Analytodon',
    EMAIL_API_KEY = '',
} = process.env;

module.exports = (phase) => {
    let config = {
        reactStrictMode: true,
        swcMinify: true,
        serverRuntimeConfig: {
            jwtSecret: JWT_SECRET,
            mongodbUri: MONGODB_URI,
            mongodbOpts: {
                tls: true,
                tlsCAFile: 'rds-combined-ca-bundle.pem',
                replicaSet: 'rs0',
                readPreference: 'secondaryPreferred',
                retryWrites: false,
                dbName: 'analytodon',
            },
            nodemailerTransport: {
                host: SES_HOST,
                port: parseInt(SES_PORT),
                secure: true,
                auth: {
                    user: SES_USER,
                    pass: SES_PASSWD,
                },
            },
            emailAPIKey: EMAIL_API_KEY,
        },
        publicRuntimeConfig: {
            debug: false,
            marketingURL: MARKETING_URL,
            appURL: APP_URL,
            supportEmail: SUPPORT_EMAIL,
            emailSenderName: EMAIL_SENDER_NAME,
        },
    };

    if (phase === PHASE_DEVELOPMENT_SERVER) {
        config = {
            ...config,
            serverRuntimeConfig: {
                ...config.serverRuntimeConfig,
                mongodbUri: 'mongodb://localhost',
                mongodbOpts: {useNewUrlParser: true, useUnifiedTopology: true, dbName: 'analytodon'},
                nodemailerTransport: {
                    sendmail: true,
                },
            },
            publicRuntimeConfig: {
                ...config.publicRuntimeConfig,
                debug: true,
                appURL: 'http://localhost:3000',
            },
        };
    }

    return config;
};
