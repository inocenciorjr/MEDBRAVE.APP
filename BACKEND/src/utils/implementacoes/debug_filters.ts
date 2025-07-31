import { firestore } from '../../config/firebaseAdmin';

async function debugFilters() {
  console.log('🔍 Debugando filtros e subfilters...');
  
  try {
    // Buscar todos os filtros
    const filtersSnapshot = await firestore.collection('filters').get();
    console.log(`📊 Total de filtros: ${filtersSnapshot.size}`);
    
    // Buscar todos os subfilters
    const subfiltersSnapshot = await firestore.collection('subfilters').get();
    console.log(`📊 Total de subfilters: ${subfiltersSnapshot.size}`);
    
    console.log('\n--- FILTROS ---');
    filtersSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. ID: ${doc.id} | Nome: ${data.name}`);
    });
    
    console.log('\n--- SUBFILTERS (primeiros 10) ---');
    subfiltersSnapshot.docs.slice(0, 10).forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. ID: ${doc.id} | Nome: ${data.name} | FilterID: ${data.filterId} | ParentID: ${data.parentId} | Level: ${data.level}`);
    });
    
    // Verificar subfilters por filtro específico
    const firstFilter = filtersSnapshot.docs[0];
    if (firstFilter) {
      const filterData = firstFilter.data();
      console.log(`\n--- SUBFILTERS DO FILTRO "${filterData.name}" ---`);
      
      const subfiltersQuery = await firestore.collection('subfilters')
        .where('filterId', '==', firstFilter.id)
        .get();
      
      console.log(`Encontrados ${subfiltersQuery.size} subfilters para este filtro:`);
      
             subfiltersQuery.docs.forEach((doc, index) => {
         const data = doc.data();
         console.log(`  ${index + 1}. ${data.name} (Level: ${data.level}, ParentID: ${data.parentId || 'root'})`);
       });
    }
    
    // Verificar se há conflito com filtros antigos
    console.log('\n--- VERIFICAÇÃO DE DADOS ---');
    const allFilters = filtersSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name
    }));
    
    console.log('Filtros encontrados:');
    allFilters.forEach(filter => {
      console.log(`- ${filter.name} (${filter.id})`);
    });
    
  } catch (error) {
    console.error('❌ Erro no debug:', error);
  }
}

debugFilters(); 