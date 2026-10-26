// Função serverless da Vercel. O frontend é servido estaticamente pela própria Vercel.
import { createApp } from '../server/app.js';

export default createApp({ serveClient: false });
