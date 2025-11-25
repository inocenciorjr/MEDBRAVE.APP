import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Criar cliente Supabase com service role key para acesso admin
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function cleanAuthUsers() {
  try {
    console.log('🧹 Iniciando limpeza da tabela auth.users...');
    
    // Listar usuários antes da limpeza
    const { data: usersBefore, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('❌ Erro ao listar usuários:', listError);
      return;
    }
    
    console.log(`📊 Total de usuários antes da limpeza: ${usersBefore.users.length}`);
    
    // Filtrar usuários que não são admin
    const usersToDelete = usersBefore.users.filter(user => 
      user.email !== 'admin@medbrave.com'
    );
    
    console.log(`🗑️ Usuários a serem removidos: ${usersToDelete.length}`);
    
    // Deletar usuários um por um
    for (const user of usersToDelete) {
      console.log(`🔄 Removendo usuário: ${user.email} (${user.id})`);
      
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      if (deleteError) {
        console.error(`❌ Erro ao deletar usuário ${user.email}:`, deleteError);
      } else {
        console.log(`✅ Usuário ${user.email} removido com sucesso`);
      }
    }
    
    // Verificar resultado final
    const { data: usersAfter, error: listAfterError } = await supabase.auth.admin.listUsers();
    if (listAfterError) {
      console.error('❌ Erro ao listar usuários após limpeza:', listAfterError);
      return;
    }
    
    console.log(`📊 Total de usuários após a limpeza: ${usersAfter.users.length}`);
    console.log('🎉 Limpeza da tabela auth.users concluída!');
    
    if (usersAfter.users.length > 0) {
      console.log('👤 Usuários restantes:');
      usersAfter.users.forEach(user => {
        console.log(`  - ${user.email} (${user.id})`);
      });
    }
    
  } catch (error) {
    console.error('💥 Erro durante a limpeza:', error);
  }
}

// Executar o script
cleanAuthUsers().then(() => {
  console.log('🏁 Script finalizado');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});