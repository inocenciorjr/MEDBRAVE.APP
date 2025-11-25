import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Queries típicas que podem precisar de índices compostos
const typicalQueries = [
  // Flashcards queries
  {
    name: 'flashcards_by_deck_and_status',
    query: 'SELECT * FROM flashcards WHERE "deckId" = $1 AND status = $2 ORDER BY "createdAt" DESC LIMIT 20'
  },
  {
    name: 'flashcards_review_queue',
    query: 'SELECT * FROM flashcards WHERE "deckId" = $1 AND "nextReviewAt" <= $2 ORDER BY "nextReviewAt" ASC LIMIT 50'
  },
  {
    name: 'flashcards_by_difficulty_range',
    query: 'SELECT * FROM flashcards WHERE "deckId" = $1 AND difficulty BETWEEN $2 AND $3 ORDER BY difficulty ASC'
  },
  {
    name: 'flashcards_by_state_and_deck',
    query: 'SELECT * FROM flashcards WHERE "deckId" = $1 AND state = $2 AND status = $3'
  },
  
  // FSRS Cards queries
  {
    name: 'fsrs_cards_due_reviews',
    query: 'SELECT * FROM fsrs_cards WHERE user_id = $1 AND due_date <= $2 ORDER BY due_date ASC LIMIT 100'
  },
  {
    name: 'fsrs_cards_by_deck_and_state',
    query: 'SELECT * FROM fsrs_cards WHERE deck_id = $1 AND state = $2 AND user_id = $3'
  },
  
  // Study Sessions queries
  {
    name: 'study_sessions_by_user_and_date',
    query: 'SELECT * FROM study_sessions WHERE user_id = $1 AND created_at >= $2 ORDER BY created_at DESC'
  },
  {
    name: 'study_sessions_by_deck_and_user',
    query: 'SELECT * FROM study_sessions WHERE deck_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 10'
  },
  
  // Notifications queries
  {
    name: 'notifications_unread_by_user',
    query: 'SELECT * FROM notifications WHERE user_id = $1 AND is_read = false ORDER BY created_at DESC'
  },
  {
    name: 'notifications_by_type_and_user',
    query: 'SELECT * FROM notifications WHERE user_id = $1 AND type = $2 ORDER BY created_at DESC LIMIT 20'
  },
  
  // Performance Metrics queries
  {
    name: 'performance_metrics_by_user_and_date',
    query: 'SELECT * FROM performance_metrics WHERE user_id = $1 AND created_at >= $2 ORDER BY created_at DESC'
  },
  {
    name: 'performance_metrics_by_deck_and_user',
    query: 'SELECT * FROM performance_metrics WHERE deck_id = $1 AND user_id = $2 ORDER BY created_at DESC'
  },
  
  // Achievement Events queries
  {
    name: 'achievement_events_by_user_and_type',
    query: 'SELECT * FROM achievement_events WHERE user_id = $1 AND achievement_type = $2 ORDER BY created_at DESC'
  },
  
  // Unified Reviews queries
  {
    name: 'unified_reviews_due_by_user',
    query: 'SELECT * FROM unified_reviews WHERE user_id = $1 AND due <= $2 ORDER BY due ASC LIMIT 50'
  },
  {
    name: 'unified_reviews_by_content_and_user',
    query: 'SELECT * FROM unified_reviews WHERE user_id = $1 AND content_id = $2 ORDER BY reviewed_at DESC'
  }
];

async function analyzeQuery(queryInfo: { name: string; query: string }) {
  try {
    console.log(`\n🔍 Analisando: ${queryInfo.name}`);
    console.log(`Query: ${queryInfo.query}`);
    
    const { data, error } = await supabase.rpc('index_advisor', {
      query: queryInfo.query
    });
    
    if (error) {
      console.error(`❌ Erro ao analisar ${queryInfo.name}:`, error.message);
      return null;
    }
    
    if (data && data.length > 0) {
      const result = data[0];
      
      if (result.errors && result.errors.length > 0) {
        console.log(`⚠️  Erros encontrados:`, result.errors);
        return null;
      }
      
      if (result.index_statements && result.index_statements.length > 0) {
        console.log(`📈 Melhoria de performance:`);
        console.log(`   Custo antes: ${result.startup_cost_before} -> ${result.total_cost_before}`);
        console.log(`   Custo depois: ${result.startup_cost_after} -> ${result.total_cost_after}`);
        console.log(`   Índices recomendados:`);
        result.index_statements.forEach((stmt: string, i: number) => {
          console.log(`   ${i + 1}. ${stmt}`);
        });
        
        return {
          name: queryInfo.name,
          query: queryInfo.query,
          improvement: {
            startup_before: result.startup_cost_before,
            startup_after: result.startup_cost_after,
            total_before: result.total_cost_before,
            total_after: result.total_cost_after
          },
          recommended_indexes: result.index_statements
        };
      } else {
        console.log(`✅ Nenhum índice adicional recomendado`);
        return null;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Erro inesperado ao analisar ${queryInfo.name}:`, error);
    return null;
  }
}

async function generateCompositeIndexes() {
  console.log('🚀 Iniciando análise de índices compostos com Index Advisor...');
  
  const recommendations: any[] = [];
  
  for (const queryInfo of typicalQueries) {
    const result = await analyzeQuery(queryInfo);
    if (result) {
      recommendations.push(result);
    }
    
    // Pequena pausa para não sobrecarregar o Supabase
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  if (recommendations.length > 0) {
    console.log(`\n📊 RESUMO: ${recommendations.length} queries podem se beneficiar de novos índices`);
    
    // Gerar script SQL com os índices recomendados
    let sqlScript = '-- Índices Compostos Recomendados pelo Index Advisor\n';
    sqlScript += '-- Gerado automaticamente\n\n';
    
    const allIndexes = new Set<string>();
    
    recommendations.forEach(rec => {
      sqlScript += `-- Query: ${rec.name}\n`;
      sqlScript += `-- Melhoria: ${rec.improvement.total_before.toFixed(2)} -> ${rec.improvement.total_after.toFixed(2)} (${((rec.improvement.total_before - rec.improvement.total_after) / rec.improvement.total_before * 100).toFixed(1)}% melhoria)\n`;
      
      rec.recommended_indexes.forEach((index: string) => {
        if (!allIndexes.has(index)) {
          allIndexes.add(index);
          sqlScript += `${index};\n`;
        }
      });
      
      sqlScript += '\n';
    });
    
    // Salvar script
    const outputPath = path.join(__dirname, 'composite-indexes-recommendations.sql');
    fs.writeFileSync(outputPath, sqlScript);
    
    console.log(`\n📝 Script SQL salvo em: ${outputPath}`);
    console.log(`\n🎯 Total de índices únicos recomendados: ${allIndexes.size}`);
    
    // Salvar relatório detalhado
    const reportPath = path.join(__dirname, 'composite-indexes-analysis-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(recommendations, null, 2));
    
    console.log(`📋 Relatório detalhado salvo em: ${reportPath}`);
  } else {
    console.log('\n✅ Todas as queries analisadas já possuem índices adequados!');
  }
  
  console.log('\n🏁 Análise concluída!');
}

if (require.main === module) {
  generateCompositeIndexes().catch(console.error);
}

export { generateCompositeIndexes };