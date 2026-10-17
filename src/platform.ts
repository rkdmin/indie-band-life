// 네이티브(Capacitor) 기능과 웹 폴백을 한곳에 모은다.
// 모든 함수는 웹에서도 동작해야 한다 — `npm run dev` 와 웹 베타가 같은 코드를 쓴다.
import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export const isNative = (): boolean => Capacitor.isNativePlatform();

export type ShareResult = 'shared' | 'downloaded';

const safeName = (name: string) => name.replace(/[\\/:*?"<>|\n\r]+/g, '_').trim() || 'file';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).replace(/^data:[^,]*,/, ''));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
}

/** 앱 캐시에 파일을 쓰고 네이티브 공유 시트를 연다. 사용자가 취소하면 throw. */
async function nativeShare(blob: Blob, filename: string, text?: string, title?: string): Promise<void> {
  const { uri } = await Filesystem.writeFile({
    path: `share/${safeName(filename)}`,
    data: await blobToBase64(blob),
    directory: Directory.Cache,
    recursive: true,
  });
  await Share.share({ files: [uri], text, title, dialogTitle: title });
}

function webDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName(filename);
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * 파일을 공유한다. 네이티브 → Capacitor Share, 웹 → Web Share API(파일 지원 시), 아니면 다운로드.
 * 사용자가 공유를 취소하면 throw 한다.
 */
export async function shareFile(blob: Blob, filename: string, text?: string, title?: string): Promise<ShareResult> {
  if (isNative()) {
    await nativeShare(blob, filename, text, title);
    return 'shared';
  }
  const file = new File([blob], safeName(filename), { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    await nav.share({ files: [file], text, title });
    return 'shared';
  }
  webDownload(blob, filename);
  return 'downloaded';
}

/**
 * 파일을 저장한다. 웹 → 다운로드. 네이티브는 WebView 가 a[download] 를 처리하지 못하므로
 * 공유 시트를 열어 사용자가 저장 위치(파일·드라이브 등)를 고르게 한다 — 저장소 권한이 필요 없다.
 */
export async function saveFile(blob: Blob, filename: string): Promise<void> {
  if (isNative()) {
    await nativeShare(blob, filename, undefined, filename);
    return;
  }
  webDownload(blob, filename);
}

// ---- Android 하드웨어 뒤로가기 ----
// 나중에 등록된(= 위에 떠 있는) 핸들러부터 처리한다. 처리할 게 없으면 앱을 백그라운드로 보낸다
// (진행 중인 인생을 실수로 종료하지 않도록 exitApp 대신 minimizeApp).

const backStack: Array<{ current: () => void }> = [];
let backListening = false;

export function initBackButton(): void {
  if (backListening || !isNative()) return;
  backListening = true;
  void App.addListener('backButton', () => {
    const top = backStack[backStack.length - 1];
    if (top) top.current();
    else void App.minimizeApp();
  });
}

/** 마운트돼 있는 동안 하드웨어 뒤로가기를 가로챈다. 웹에서는 아무 일도 하지 않는다. */
export function useBackButton(handler: () => void, enabled = true): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!enabled) return;
    const entry = { current: () => ref.current() };
    backStack.push(entry);
    return () => {
      const i = backStack.lastIndexOf(entry);
      if (i >= 0) backStack.splice(i, 1);
    };
  }, [enabled]);
}
