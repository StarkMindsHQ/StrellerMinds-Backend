import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';

type TranslationValue = string | number | boolean | null | TranslationDictionary | TranslationValue[];
type TranslationDictionary = Record<string, TranslationValue>;

const projectRoot = resolve(__dirname, '../..');
const localeRoots = [join(projectRoot, 'i18n'), join(projectRoot, 'src', 'i18n')];
const translationExtensions = new Set(['.json']);

const readJson = <T>(filePath: string): T =>
  JSON.parse(readFileSync(filePath, 'utf8')) as T;

const packageJson = readJson<{
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}>(join(projectRoot, 'package.json'));

const dependencyNames = new Set([
  ...Object.keys(packageJson.dependencies ?? {}),
  ...Object.keys(packageJson.devDependencies ?? {}),
]);

const appModulePath = join(projectRoot, 'src', 'app.module.ts');
const appModuleSource = existsSync(appModulePath) ? readFileSync(appModulePath, 'utf8') : '';

const localeRoot = localeRoots.find((root) => existsSync(root) && statSync(root).isDirectory());
const hasI18nDependency = [...dependencyNames].some((dependency) =>
  ['nestjs-i18n', 'i18next', '@ngx-translate/core'].includes(dependency),
);
const hasI18nModule = /\bI18nModule\b/.test(appModuleSource);
const isI18nImplemented = Boolean(localeRoot || hasI18nDependency || hasI18nModule);

const describeIfI18n = isI18nImplemented ? describe : describe.skip;

const isTranslationFile = (fileName: string) =>
  [...translationExtensions].some((extension) => fileName.endsWith(extension));

const collectTranslationFiles = (root: string): string[] => {
  const entries = readdirSync(root, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const entryPath = join(root, entry.name);

    if (entry.isDirectory()) {
      return collectTranslationFiles(entryPath);
    }

    return entry.isFile() && isTranslationFile(entry.name) ? [entryPath] : [];
  });
};

const flattenKeys = (dictionary: TranslationDictionary, prefix = ''): string[] =>
  Object.entries(dictionary).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return flattenKeys(value, path);
    }

    return [path];
  });

const getValueByPath = (
  dictionary: TranslationDictionary,
  path: string,
): TranslationValue | undefined =>
  path.split('.').reduce<TranslationValue | undefined>((currentValue, key) => {
    if (!currentValue || typeof currentValue !== 'object' || Array.isArray(currentValue)) {
      return undefined;
    }

    return (currentValue as TranslationDictionary)[key];
  }, dictionary);

describeIfI18n('Internationalization support', () => {
  const translationFiles = localeRoot ? collectTranslationFiles(localeRoot) : [];
  const dictionaries = translationFiles.map((filePath) => ({
    filePath,
    locale: relative(localeRoot ?? projectRoot, filePath).replace(/\.json$/, ''),
    translations: readJson<TranslationDictionary>(filePath),
  }));

  it('provides translation files for multiple languages', () => {
    expect(translationFiles.length).toBeGreaterThanOrEqual(2);
  });

  it('uses valid non-empty JSON dictionaries for every locale', () => {
    for (const dictionary of dictionaries) {
      expect(dictionary.translations).toEqual(expect.any(Object));
      expect(Array.isArray(dictionary.translations)).toBe(false);
      expect(Object.keys(dictionary.translations)).not.toHaveLength(0);
    }
  });

  it('keeps translation keys consistent across locales', () => {
    const [defaultDictionary, ...localizedDictionaries] = dictionaries;
    expect(defaultDictionary).toBeDefined();

    if (!defaultDictionary) {
      return;
    }

    const defaultKeys = flattenKeys(defaultDictionary.translations).sort();

    for (const dictionary of localizedDictionaries) {
      expect(flattenKeys(dictionary.translations).sort()).toEqual(defaultKeys);
    }
  });

  it('does not leave required translations blank', () => {
    for (const dictionary of dictionaries) {
      for (const key of flattenKeys(dictionary.translations)) {
        const value = getValueByPath(dictionary.translations, key);

        if (typeof value === 'string') {
          expect(value.trim()).not.toHaveLength(0);
        }
      }
    }
  });
});
