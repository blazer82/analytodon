import type {NextApiRequest, NextApiResponse} from 'next';
import {setNoCache} from '@/helpers/setNoCache';
import handleAuthentication from '@/helpers/handleAuthentication';
import {UserRole} from '@/types/UserRole';
import {AuthResponseType} from '@/types/AuthResponseType';
import dbConnect from '@/helpers/dbConnect';
import {logger} from '@/helpers/logger';
import accountSetupFormSchema from '@/schemas/accountSetupForm';
import {parse} from 'url';
import generator from 'megalodon';
import AccountModel from '@/models/AccountModel';
import AccountCredentialsModel from '@/models/AccountCredentialsModel';
import timezones from '@/helpers/timezones.json';
import getConfig from 'next/config';
import {v4 as uuid} from 'uuid';
import {stripSchema} from '@/helpers/stripSchema';
import UserModel from '@/models/UserModel';

const {publicRuntimeConfig} = getConfig();

const SCOPE = ['read:accounts', 'read:statuses', 'read:notifications'];

const handle = async (req: NextApiRequest, res: NextApiResponse): Promise<void | NextApiResponse> => {
    setNoCache(res);

    const {id: userID} = await handleAuthentication([UserRole.AccountOwner], AuthResponseType.Error, {req, res});

    if (!userID) {
        return;
    }

    switch (req.method) {
        case 'GET':
            // http://localhost:3000/api/accounts/connect?token=75d49919-7444-4479-a006-96c40062712e&code=0HA7_h2fldX2spU1osWA9xBAaxWJ0aeaHL1Gsz07WWE
            return await handleGet(req, res, userID);
        case 'POST':
            return await handlePost(req, res, userID);
        default:
            return res.status(405).end();
    }
};

const handleGet = async ({query}: NextApiRequest, res: NextApiResponse, userID: string): Promise<void | NextApiResponse> => {
    try {
        const {token, code} = query ?? {};

        if (token && code) {
            await dbConnect();

            const accountCredentials = await AccountCredentialsModel.findOne({connectionToken: token}).populate('account');
            const account = accountCredentials.account;

            if (accountCredentials && account) {
                const isReconnect = account.setupComplete;

                const client = generator('mastodon', account.serverURL);
                const {access_token} = await client.fetchAccessToken(
                    accountCredentials.clientID,
                    accountCredentials.clientSecret,
                    String(code),
                    `${publicRuntimeConfig.appURL}/api/accounts/connect?token=${token}`,
                );

                accountCredentials.connectionToken = null;
                accountCredentials.accessToken = access_token;
                await accountCredentials.save();

                const mastodon = generator('mastodon', account.serverURL, accountCredentials.accessToken);

                const {
                    data: {display_name, username, url, avatar},
                } = await mastodon.verifyAccountCredentials();

                account.name = display_name;
                account.username = username;
                account.accountURL = url;
                account.avatarURL = avatar;
                account.accountName = `@${username}@${stripSchema(account.serverURL)}`;
                account.setupComplete = true;
                account.requestedScope = SCOPE;
                await account.save();

                await UserModel.updateOne({_id: userID}, {$addToSet: {accounts: account._id}});

                logger.info(`Account connection complete for ${account.accountName}`);

                if (isReconnect) {
                    return res.redirect(`${publicRuntimeConfig.appURL}/settings/accounts`);
                }
                return res.redirect(`${publicRuntimeConfig.appURL}/settings/accounts/setup-complete`);
            }
            res.end();
        }
    } catch (error: any) {
        logger.error(`Error while completing account connection: ${error?.message}`);
        return res.redirect(publicRuntimeConfig.appURL);
    }
};

const handlePost = async ({body}: NextApiRequest, res: NextApiResponse, userID: string): Promise<void | NextApiResponse> => {
    try {
        const {value, error} = accountSetupFormSchema.validate(body, {errors: {render: false}});

        if ((error?.details?.length ?? 0) > 0) {
            return res.status(400).end();
        }

        await dbConnect();

        const {_id: accountID, serverURL, timezone} = value;

        const fullServerURL = String(serverURL).indexOf('://') > 0 ? serverURL : `https://${serverURL}`;
        const {protocol, host} = parse(fullServerURL);

        if (protocol?.indexOf('https') !== 0) {
            return res.status(400).send({error: 'Only secure https URLs allowed.'});
        }

        const finalServerURL = `https://${host}`;
        const connectionToken = uuid();

        try {
            logger.info(`Trying to register app on instance ${finalServerURL}`);

            const client = generator('mastodon', finalServerURL);
            const {url, client_id, client_secret} = await client.registerApp('Analytodon', {
                scopes: SCOPE,
                redirect_uris: `${publicRuntimeConfig.appURL}/api/accounts/connect?token=${connectionToken}`,
                website: publicRuntimeConfig.marketingURL,
            });

            try {
                const utcOffset = timezones.find(({name}) => name === timezone)?.utcOffset ?? '';

                if (!utcOffset) {
                    return res.status(400).send({error: 'Invalid timezone selected.'});
                }

                const account = accountID
                    ? await AccountModel.findById(accountID)
                    : new AccountModel({
                          owner: userID,
                          serverURL: finalServerURL,
                          isActive: true,
                          setupComplete: false,
                          timezone,
                          utcOffset,
                      });

                if (!account) {
                    throw new Error('Existing account not found');
                }

                await account.save();

                const accountCredentials =
                    (accountID && (await AccountCredentialsModel.findOne({account: account._id}))) || new AccountCredentialsModel({account: account._id});

                accountCredentials.clientID = client_id;
                accountCredentials.clientSecret = client_secret;
                accountCredentials.connectionToken = connectionToken;

                await accountCredentials.save();

                account.credentials = accountCredentials._id;
                await account.save();

                return res.json({url, account: `${account._id}`});
            } catch (error: any) {
                logger.error(`Error while connecting account: ${error?.message}`);
                logger.error(error?.message);
                return res.status(500).end();
            }
        } catch (error: any) {
            logger.warn(`Failed to register app on instance ${finalServerURL}: ${error?.message}`);
            return res.status(400).send({error: 'Unable to connect to Mastodon instance. Please make sure the entered server URL is correct.'});
        }
    } catch (error: any) {
        logger.error(`Error while connecting account: ${error?.message}`);
        return res.status(500).end();
    }
};

export default handle;
