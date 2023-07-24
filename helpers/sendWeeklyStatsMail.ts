import nodemailer from 'nodemailer';
import getConfig from 'next/config';
import {User} from '@/types/User';
import {logger} from './logger';
import {Account} from '@/types/Account';
import {KPI} from '@/types/KPI';
import weeklystats from '@/templates/weeklystats';
import accountFirst from '@/templates/weeklystats/account-first';
import accountAdditional from '@/templates/weeklystats/account-additional';

const {serverRuntimeConfig, publicRuntimeConfig} = getConfig();

const sendWeeklyStatsMail = async (user: User, stats: {account: Account; followers: KPI; replies: KPI; boosts: KPI; favorites: KPI}[], email?: string) => {
    logger.info(`Send weekly stats mail to ${user._id}`);

    const accounts = stats
        .map(({account, followers, replies, boosts, favorites}, index) =>
            index === 0
                ? accountFirst({accountName: account.name ?? '', followers, replies, boosts, favorites})
                : accountAdditional({accountName: account.name ?? '', followers, replies, boosts, favorites}),
        )
        .join('\n');

    const unsubscribeURL = `${publicRuntimeConfig.appURL}/unsubscribe/weekly?u=${encodeURIComponent(user._id)}&e=${encodeURIComponent(user.email)}`;

    try {
        const transporter = nodemailer.createTransport(serverRuntimeConfig.nodemailerTransport);
        await transporter.sendMail({
            from: {name: publicRuntimeConfig.emailSenderName, address: publicRuntimeConfig.supportEmail},
            to: email || user.email,
            subject: 'Your Week on Mastodon',
            html: weeklystats({accounts, unsubscribeURL}),
        });
    } catch (error: any) {
        logger.error(`Error while sending email verification mail: ${error?.message}`);
    }
};

export default sendWeeklyStatsMail;
