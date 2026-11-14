import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider, initReactI18next } from 'react-i18next';

import { createInstance } from 'i18next';
import { describe, expect, it } from 'vitest';

import i18nConfig from '../../services/i18n/i18n';
import SupportContactNote from './index';

const KEY = 'persistentIssueContactSupport';
const localesDir = join(__dirname, '..', '..', '..', 'public', 'locales');
const supportedLngs: string[] = i18nConfig.supportedLngs;

function commonMessages(lang: string): Record<string, Record<string, string>> {
  return JSON.parse(readFileSync(join(localesDir, lang, 'common.json'), 'utf8'));
}

// Server-render the component the way entry.server does: an initialised i18next instance
// holding only the default `common` namespace, no Suspense.
async function render(lang: string): Promise<string> {
  const instance = createInstance();
  await instance.use(initReactI18next).init({
    ...i18nConfig,
    lng: lang,
    ns: ['common'],
    resources: { [lang]: { common: commonMessages(lang) } },
  });

  const html = renderToStaticMarkup(
    React.createElement(
      I18nextProvider,
      { i18n: instance },
      React.createElement(SupportContactNote, { supportEmail: 'help@example.com' }),
    ),
  );

  // Drop attributes so only the structure and the text remain.
  return html.replace(/<style[^>]*>.*?<\/style>/g, '').replace(/<(\w+)[^>]*>/g, '<$1>');
}

describe('SupportContactNote', () => {
  // The sentence used to be assembled in code ("<text> <link>."), which forced an ASCII space
  // and period onto every language. It must stay one translatable unit containing the link.
  it.each(supportedLngs)('%s defines the sentence as one string wrapping the link', (lang) => {
    const messages = commonMessages(lang).messages;

    expect(messages[KEY]).toMatch(/<supportLink>[^<]+<\/supportLink>/);
    expect(messages).not.toHaveProperty('persistentIssue');
    expect(messages).not.toHaveProperty('contactSupport');
  });

  it('renders English and German as before', async () => {
    expect(await render('en')).toBe('<span>If this message persists please <a>contact support</a>.</span>');
    expect(await render('de')).toBe(
      '<span>Falls das Problem weiterhin auftritt, bitte <a>Support kontaktieren</a>.</span>',
    );
  });

  it('renders Japanese without ASCII spacing or punctuation', async () => {
    expect(await render('ja')).toBe(
      '<span>このメッセージが引き続き表示される場合は、<a>サポートまでお問い合わせください</a>。</span>',
    );
  });

  it('links to the support mailbox', async () => {
    const instance = createInstance();
    await instance.use(initReactI18next).init({
      ...i18nConfig,
      lng: 'en',
      ns: ['common'],
      resources: { en: { common: commonMessages('en') } },
    });

    const html = renderToStaticMarkup(
      React.createElement(
        I18nextProvider,
        { i18n: instance },
        React.createElement(SupportContactNote, { supportEmail: 'help@example.com' }),
      ),
    );

    expect(html).toContain('href="mailto:help@example.com?subject=Support"');
  });
});
