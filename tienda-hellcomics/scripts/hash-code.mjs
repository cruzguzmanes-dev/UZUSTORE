// Uso: npm run hash-code -- "el-codigo-que-quieras"
// Imprime el hash bcrypt para pegar en config.acceso_admin_hash (migración o UPDATE directo en Supabase).
import bcrypt from "bcryptjs";

const codigo = process.argv[2];
if (!codigo) {
  console.error('Uso: npm run hash-code -- "el-codigo-que-quieras"');
  process.exit(1);
}

const hash = bcrypt.hashSync(codigo, 10);
console.log(hash);
