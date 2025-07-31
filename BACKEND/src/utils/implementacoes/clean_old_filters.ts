import { firestore } from '../../config/firebaseAdmin';

async function cleanOldFilters() {
  console.log('🧹 Limpando filtros antigos...');
  
  try {
    // Buscar todos os filtros
    const filtersSnapshot = await firestore.collection('filters').get();
    console.log(`📊 Total de filtros encontrados: ${filtersSnapshot.size}`);
    
    // Filtros novos (com IDs legíveis)
    const newFilterIds = [
      'cirurgia',
      'clinica_medica', 
      'ginecologia',
      'medicina_preventiva',
      'obstetricia',
      'outros',
      'pediatria'
    ];
    
    console.log('✅ Filtros que devem ser mantidos:');
    newFilterIds.forEach(id => console.log(`  - ${id}`));
    
    // Identificar filtros para deletar
    const filtersToDelete: string[] = [];
    
    filtersSnapshot.docs.forEach(doc => {
      if (!newFilterIds.includes(doc.id)) {
        filtersToDelete.push(doc.id);
      }
    });
    
    console.log(`\n🗑️  Filtros que serão deletados (${filtersToDelete.length}):`);
    filtersToDelete.forEach(id => console.log(`  - ${id}`));
    
    if (filtersToDelete.length === 0) {
      console.log('✅ Nenhum filtro antigo encontrado!');
      return;
    }
    
    // Confirmar antes de deletar
    console.log('\n⚠️  CONFIRME: Deseja deletar os filtros antigos? Digite "SIM" para confirmar:');
    
    // Para script automatizado, vamos deletar automaticamente
    console.log('🚀 Procedendo com limpeza automática...');
    
    // Deletar filtros antigos em lotes
    let batch = firestore.batch();
    let batchCount = 0;
    
    for (const filterId of filtersToDelete) {
      const docRef = firestore.collection('filters').doc(filterId);
      batch.delete(docRef);
      batchCount++;
      
      if (batchCount >= 500) {
        await batch.commit();
        batch = firestore.batch();
        batchCount = 0;
        console.log(`💾 Deletado batch de filtros...`);
      }
    }
    
    if (batchCount > 0) {
      await batch.commit();
    }
    
    console.log(`✅ ${filtersToDelete.length} filtros antigos deletados!`);
    
    // Verificar subfilters órfãos
    const subfiltersSnapshot = await firestore.collection('subfilters').get();
    const orphanSubfilters: string[] = [];
    
    subfiltersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (!newFilterIds.includes(data.filterId)) {
        orphanSubfilters.push(doc.id);
      }
    });
    
    if (orphanSubfilters.length > 0) {
      console.log(`\n🗑️  Removendo ${orphanSubfilters.length} subfilters órfãos...`);
      
      batch = firestore.batch();
      batchCount = 0;
      
      for (const subId of orphanSubfilters) {
        const docRef = firestore.collection('subfilters').doc(subId);
        batch.delete(docRef);
        batchCount++;
        
        if (batchCount >= 500) {
          await batch.commit();
          batch = firestore.batch();
          batchCount = 0;
        }
      }
      
      if (batchCount > 0) {
        await batch.commit();
      }
      
      console.log(`✅ ${orphanSubfilters.length} subfilters órfãos removidos!`);
    }
    
    // Verificar resultado final
    const finalFiltersSnapshot = await firestore.collection('filters').get();
    const finalSubfiltersSnapshot = await firestore.collection('subfilters').get();
    
    console.log(`\n📊 RESULTADO FINAL:`);
    console.log(`   Filtros: ${finalFiltersSnapshot.size}`);
    console.log(`   Subfilters: ${finalSubfiltersSnapshot.size}`);
    
    console.log('\n✅ Limpeza concluída!');
    
  } catch (error) {
    console.error('❌ Erro na limpeza:', error);
  }
}

cleanOldFilters(); 