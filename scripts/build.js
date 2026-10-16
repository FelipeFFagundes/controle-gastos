import fs from 'fs';
import { execSync } from 'child_process';

console.log('========================================');
console.log('🚀 Iniciando Build para Vercel');
console.log('📂 Diretório de execução:', process.cwd());
console.log('========================================');

const isRoot = fs.existsSync('client/package.json');

if (isRoot) {
  console.log('📦 Detectado diretório raiz. Instalando dependências e compilando...');
  execSync('npm --prefix client install && npm --prefix client run build', { stdio: 'inherit' });

  if (fs.existsSync('client/dist')) {
    fs.cpSync('client/dist', 'dist', { recursive: true, force: true });
    console.log('✅ Arquivos sincronizados para dist e client/dist');
  }
} else {
  console.log('📦 Detectado diretório client. Compilando...');
  execSync('npm install && npm run build', { stdio: 'inherit' });

  if (fs.existsSync('dist')) {
    fs.mkdirSync('client', { recursive: true });
    fs.cpSync('dist', 'client/dist', { recursive: true, force: true });
    console.log('✅ Arquivos sincronizados para dist e client/dist');
  }
}

console.log('🎉 Build finalizado com sucesso!');
