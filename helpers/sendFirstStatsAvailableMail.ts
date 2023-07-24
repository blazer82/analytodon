import nodemailer from 'nodemailer';
import getConfig from 'next/config';
import {User} from '@/types/User';
import {logger} from './logger';
import {Account} from '@/types/Account';

const {serverRuntimeConfig, publicRuntimeConfig} = getConfig();

const sendFirstStatsAvailablenMail = async (user: User, account: Account) => {
    logger.info(`Send first stats available mail to ${user._id}`);

    try {
        const transporter = nodemailer.createTransport(serverRuntimeConfig.nodemailerTransport);
        await transporter.sendMail({
            from: {name: publicRuntimeConfig.emailSenderName, address: publicRuntimeConfig.supportEmail},
            to: user.email,
            subject: 'Your Mastodon analytics data is ready on Analytodon! 🎉',
            text:
                `Hi and thanks again for signing up to Analytodon!\n\n` +
                `We completed the initial processing of your Mastodon account ${account.accountName} which means your analytics data is ready!\n\n` +
                `Here’s the link to your dashboard:\n` +
                `${publicRuntimeConfig.appURL}\n\n` +
                `Should you encounter any issues or have any questions don't hesitate to contact me directly by replying to this email.\n\n` +
                `Best regards,\n` +
                `Raphael Stäbler\n` +
                `Analytodon\n\n` +
                `Email: ${publicRuntimeConfig.supportEmail}\n` +
                `Website: ${publicRuntimeConfig.marketingURL}\n` +
                `Mastodon: https://undefined.social/@analytodon\n`,
        });
    } catch (error: any) {
        logger.error(`Error while sending first stats available mail: ${error?.message}`);
    }
};

export default sendFirstStatsAvailablenMail;
