import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('the i18n catalogue audit passes for all supported locales', () => {
  const output = execFileSync(process.execPath, [path.join(root, 'scripts/i18n-audit.mjs')], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.match(output, /i18n audit passed: 5 locales/);
});

test('all selectors share the exact central locale configuration', () => {
  const config = read('src/app/i18n/config.ts');
  const shell = read('src/app/components/SpicePublicShell.tsx');
  assert.match(config, /SUPPORTED_LOCALES\s*=\s*\['en', 'el', 'fi', 'pl', 'pt'\]/);
  assert.match(config, /nativeName: 'English'/);
  assert.match(config, /nativeName: 'Ελληνικά'/);
  assert.match(config, /nativeName: 'Suomi'/);
  assert.match(config, /nativeName: 'Polski'/);
  assert.match(config, /nativeName: 'Português'/);
  assert.match(config, /dateLocale: 'pt-PT'/);
  assert.match(config, /numberLocale: 'pt-PT'/);
  assert.match(shell, /import \{ LOCALES \} from '\.\.\/i18n\/config'/);
  assert.ok((shell.match(/LOCALES\.map/g) || []).length >= 2, 'desktop and mobile selectors must use LOCALES');
});

test('language changes persist without navigation or reload', () => {
  const context = read('src/app/context/I18nContext.tsx');
  const setLanguageBlock = context.slice(context.indexOf('const setLanguage ='), context.indexOf('const t ='));
  assert.match(setLanguageBlock, /setLanguageState\(next\)/);
  assert.match(context, /localStorage\.setItem\(STORAGE_KEY, language\)/);
  assert.match(context, /document\.documentElement\.lang = selected\.code/);
  assert.doesNotMatch(setLanguageBlock, /navigate|location\.|reload/);
});

test('canonical phases, roles, and statuses use translation mappings', () => {
  const framework = read('src/app/data/processFramework.ts');
  const permissions = read('src/app/auth/permissions.ts');
  const status = read('src/app/lib/statusLabel.ts');
  for (let phase = 1; phase <= 5; phase += 1) {
    assert.match(framework, new RegExp(`hub\\.phase${phase}`));
  }
  for (const roleKey of ['role.Citizen', 'role.Facilitator', 'role.MunicipalityStaff', 'role.PlatformAdministrator']) {
    assert.match(permissions, new RegExp(roleKey.replace('.', '\\.')));
  }
  for (const value of ['under_review', 'needs_revision', 'pending_approval', 'cancelled']) {
    assert.match(status, new RegExp(value));
  }
  assert.doesNotMatch(status, /replace\([^\n]*_['"]\s*,\s*['"]\s/);
});

test('pluralised catalogue counts use Intl plural rules', () => {
  const context = read('src/app/context/I18nContext.tsx');
  const repository = read('src/app/pages/RepositoryPublicPage.tsx');
  const analogue = read('src/app/pages/ExploreToolkitPage.tsx');
  const chatbot = read('src/app/components/AiChatbotWidget.tsx');
  assert.match(context, /new Intl\.PluralRules/);
  assert.match(repository, /repository\.found\.few/);
  assert.match(analogue, /analogue\.results\.many/);
  assert.match(chatbot, /chatbot\.articles\.few/);
});
