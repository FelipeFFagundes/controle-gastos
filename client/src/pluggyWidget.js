// Widget oficial Pluggy Connect, carregado só quando for preciso (antes era baixado em toda abertura
// do app, bloqueando a tela). O modal de bancos chama loadPluggyConnect() ao abrir.
const SCRIPT_URL = 'https://cdn.pluggy.ai/pluggy-connect/v2.5.0/pluggy-connect.js';

let loading = null;

export function loadPluggyConnect() {
  if (window.PluggyConnect) return Promise.resolve(window.PluggyConnect);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_URL;
      script.async = true;
      script.onload = () => (window.PluggyConnect ? resolve(window.PluggyConnect) : reject(new Error('Widget da Pluggy indisponível.')));
      script.onerror = () => {
        loading = null;
        script.remove();
        reject(new Error('Não foi possível carregar o widget da Pluggy. Verifique sua conexão.'));
      };
      document.head.appendChild(script);
    });
  }
  return loading;
}
