// コア（slot-flag-checker-core）の読み込み元
//
// コアを更新するときは CORE_VERSION を変更する。
// localhost で ?core=local を付けて開くと、隣のフォルダにある手元のコア（../slot-flag-checker-core）を使う。
const CORE_VERSION = '1.0.0';

const isLocalhost = ['localhost', '127.0.0.1'].includes(location.hostname);
const useLocalCore = isLocalhost && new URLSearchParams(location.search).get('core') === 'local';

const coreBase = useLocalCore
  ? new URL('../slot-flag-checker-core/src/', import.meta.url)
  : new URL(`https://cdn.jsdelivr.net/gh/tunhguod/slot-flag-checker-core@${CORE_VERSION}/src/`);

export function importCore(file) {
  return import(new URL(file, coreBase).href);
}
