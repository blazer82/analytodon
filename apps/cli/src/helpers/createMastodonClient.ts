import axios from 'axios';
import generator, { MegalodonInterface } from 'megalodon';

// Keep in sync with apps/backend/src/shared/utils/mastodon-client.ts
export const MASTODON_USER_AGENT = 'Analytodon (+https://www.analytodon.com)';

// Megalodon pins its own axios version, so the instance types don't line up even though
// it only uses the instance's request methods at runtime.
type MegalodonAxiosInstance = Parameters<typeof generator>[4];

// Megalodon only applies its userAgent option to streaming connections, so REST calls
// would otherwise go out as "axios/x.y.z", which some instances (e.g. social.lol) reject.
export const createMastodonClient = (serverURL: string, accessToken?: string | null): MegalodonInterface =>
  generator(
    'mastodon',
    serverURL,
    accessToken ?? null,
    MASTODON_USER_AGENT,
    axios.create({ headers: { 'User-Agent': MASTODON_USER_AGENT } }) as unknown as MegalodonAxiosInstance,
  );
