// Notificações no celular (Web Push): ativa/desativa neste aparelho.
// Quem mostra a notificação é o Service Worker (public/sw.js); quem envia é o servidor, após o sync automático.
import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;

const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

// A chave pública VAPID vem em base64url; o navegador quer os bytes.
function base64UrlToBytes(value) {
  const base64 = (value + '='.repeat((4 - (value.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

async function currentSubscription() {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

// status: 'loading' | 'on' | 'off' | 'denied' | 'needs-install' (iPhone fora da tela inicial) | 'unsupported'
function initialStatus() {
  if (!supported()) return isIOS() && !isStandalone() ? 'needs-install' : 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  return 'loading';
}

export function usePushNotifications(enabled) {
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!enabled || !supported() || Notification.permission === 'denied') return;
    let cancelled = false;
    currentSubscription()
      .then(sub => { if (!cancelled) setStatus(sub ? 'on' : 'off'); })
      .catch(() => { if (!cancelled) setStatus('off'); });
    return () => { cancelled = true; };
  }, [enabled]);

  const run = useCallback(async (fn) => {
    setBusy(true);
    try {
      return await fn();
    } finally {
      setBusy(false);
    }
  }, []);

  // Devolve a mensagem para o aviso na tela.
  const enable = useCallback(() => run(async () => {
    if (status === 'needs-install') {
      throw new Error('No iPhone, adicione o app à tela de início (Compartilhar → Adicionar à Tela de Início) e ative por lá.');
    }
    if (status === 'unsupported') throw new Error('Este navegador não aceita notificações.');

    const { configured, publicKey } = await api.pushPublicKey();
    if (!configured) throw new Error('Notificações não configuradas no servidor (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).');

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setStatus(permission === 'denied' ? 'denied' : 'off');
      throw new Error('Permissão negada. Libere as notificações nas configurações do navegador.');
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToBytes(publicKey)
      });
    }
    await api.pushSubscribe(subscription.toJSON());
    setStatus('on');
    return 'Notificações ativadas. Você recebe o resumo depois de cada sincronização automática.';
  }), [run, status]);

  const disable = useCallback(() => run(async () => {
    const subscription = await currentSubscription();
    if (subscription) {
      await api.pushUnsubscribe(subscription.endpoint).catch(() => {});
      await subscription.unsubscribe();
    }
    setStatus('off');
    return 'Notificações desativadas neste aparelho.';
  }), [run]);

  const test = useCallback(() => run(async () => {
    const { sent } = await api.pushTest();
    if (!sent) throw new Error('Nenhum aparelho recebeu. Desative e ative as notificações de novo.');
    return 'Notificação de teste enviada.';
  }), [run]);

  return { status, busy, enable, disable, test };
}
